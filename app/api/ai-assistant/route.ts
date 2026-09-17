import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { loadActor } from '@/lib/audit';
import { TOOLS, runTool } from '@/lib/ai-tools';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 6;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env to enable Ask Domi.');
  }
  client ??= new Anthropic({ maxRetries: 3 });
  return client;
}

const SYSTEM_PROMPT = `You are Domi, an AI property-management co-pilot inside Domio. You answer
questions about the current owner's rent collections, tenants, balances, and
occupancy using the tools available to you — never invent numbers.

When a user asks you to record a payment or a charge, first summarize what
you are about to do (tenant, amount, date) in plain text and ask them to
confirm. Only call create_payment or create_charge after the user has
clearly confirmed in a later message ("yes", "go ahead", "confirm", etc.).
Keep answers concise and use Indian Rupee formatting (₹) for amounts.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'messages array is required.' }, { status: 400 });
  }

  const incoming: { role: 'user' | 'assistant'; content: string }[] = body.messages
    .filter(
      (m: unknown): m is { role: string; content: string } =>
        !!m &&
        typeof m === 'object' &&
        (m as any).role &&
        typeof (m as any).content === 'string',
    )
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))
    .slice(-20); // cap history sent per request

  if (incoming.length === 0) {
    return NextResponse.json({ error: 'At least one message is required.' }, { status: 400 });
  }

  let ds;
  try {
    ds = await resolveDataScope(session.user);
  } catch (err) {
    console.error('Ask Domi: failed to resolve data scope:', err);
    return NextResponse.json({ error: 'Failed to resolve account scope.' }, { status: 500 });
  }

  // Managers see only their granted units unless the owner flagged them for
  // full portfolio read.
  let readSubPropertyIds: string[] | undefined;
  if (ds.isManager) {
    const fullRead = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { aiFullPortfolioRead: true },
    });
    if (!fullRead?.aiFullPortfolioRead) {
      readSubPropertyIds = ds.scope.subPropertyIds;
    }
  }

  let anthropic: Anthropic;
  try {
    anthropic = getClient();
  } catch (err) {
    console.error('Ask Domi is not configured:', err);
    return NextResponse.json(
      { reply: "Ask Domi isn't configured yet — add an ANTHROPIC_API_KEY to enable it." },
      { status: 200 },
    );
  }

  const actor = await loadActor(session.user.id);
  const conversation: Anthropic.MessageParam[] = incoming.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    let round = 0;
    let finalText = '';
    while (round < MAX_TOOL_ROUNDS) {
      round += 1;
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: conversation,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      );
      finalText = textBlocks.map((b) => b.text).join('\n').trim();

      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        break;
      }

      // Run every requested tool, then feed the results back for the next turn.
      conversation.push({ role: 'assistant', content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        const result = await runTool(
          use.name,
          (use.input ?? {}) as Record<string, unknown>,
          ds.ownerId,
          actor,
          readSubPropertyIds,
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: JSON.stringify(result),
        });
      }
      conversation.push({ role: 'user', content: toolResults });
    }

    return NextResponse.json({
      reply: finalText || 'I looked into that but didn’t find anything to report.',
    });
  } catch (err) {
    console.error('Ask Domi request failed:', err);
    return NextResponse.json(
      { reply: 'Sorry, I ran into an error answering that. Please try again in a moment.' },
      { status: 200 },
    );
  }
}
