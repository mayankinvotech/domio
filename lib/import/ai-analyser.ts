import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

// Lazily construct the client so a missing ANTHROPIC_API_KEY surfaces as a
// caught runtime error (handled by the route) rather than crashing on import.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env to enable AI import analysis.',
    );
  }
  // maxRetries lets the SDK auto-retry 429s with backoff (honouring
  // retry-after), so transient per-minute output-token limits self-resolve.
  client ??= new Anthropic({ maxRetries: 8 });
  return client;
}

export interface TenantFound {
  name: string;
  estimatedMonthlyRent: number;
  currency: string;
  firstPaymentPeriod: string;
  lastPaymentPeriod: string;
  status: 'ACTIVE' | 'TERMINATED' | 'NEW';
  terminationReason?: string;
  notes?: string;
}

export interface PaymentRecord {
  tenantName: string;
  period: string;
  amount: number;
  paidDate: string | null;
  paymentMethod: string;
  status: 'PAID' | 'OVERDUE' | 'PARTIAL' | 'NIL';
  notes?: string;
  isCatchUp?: boolean;
  catchUpPeriods?: string[];
}

export interface AIAnalysisResult {
  importType: string;
  propertyName: string;
  totalPaymentRecords: number;
  periodFrom: string;
  periodTo: string;
  tenantsFound: TenantFound[];
  paymentRecords: PaymentRecord[];
  warnings: string[];
  gaps: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
}

// Extract the first complete, balanced JSON value of the given kind from text
// that may contain leading reasoning prose and/or trailing commentary. Tracks
// string literals + escapes so brackets inside strings don't break the scan.
function extractJson(text: string, kind: '[' | '{'): string | null {
  const close = kind === '[' ? ']' : '}';
  const start = text.indexOf(kind);
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === kind) {
      depth++;
    } else if (c === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export async function analyseFileWithClaude(
  rawText: string,
  fileName: string,
  importType: string,
): Promise<AIAnalysisResult> {
  const prompt = `You are a property management data analyst. Analyse this file and extract structured data for import into a property management system called Domio.

FILE NAME: ${fileName}
IMPORT TYPE: ${importType}

RAW FILE CONTENT:
${rawText}

TASK: Analyse this rent payment tracker and extract:
1. All tenant names from column headers
2. Monthly rent amounts per tenant
3. All payment records (amount + date + status)
4. Date format used (Excel serial numbers need conversion: serial 45335 = Jan 15 2024)
5. Special cases: NP = Not Paid, NIL = zero payment, catch-up payments like "80000/-(May&Jun)"

For Excel serial dates: base date is Dec 30 1899. Serial 45335 = Jan 15 2024.
For amounts: strip "/–" suffix, handle "16,100" with commas, handle "21000+1000" by summing.

IMPORTANT RULES:
- NP or "Not Paid" = status OVERDUE
- NIL = status OVERDUE
- Empty cell = status OVERDUE if date has passed, else FUTURE
- "80000/-(May&Jun)" = catch-up payment split across 2 months
- "ACCOUNT CLOSED" or "LEASED TO [NAME]" = tenant change event
- Amounts like "40000/-" = 40000 (strip the /-)
- Dates like "22/11/25" = 22 Nov 2025

Respond ONLY with a valid JSON object matching this exact structure:
{
  "importType": "FIRST_TIME_PROPERTY_LOAD",
  "propertyName": "extracted property name or filename",
  "totalPaymentRecords": number,
  "periodFrom": "YYYY-MM",
  "periodTo": "YYYY-MM",
  "tenantsFound": [
    {
      "name": "FULL NAME",
      "estimatedMonthlyRent": number,
      "currency": "INR",
      "firstPaymentPeriod": "YYYY-MM",
      "lastPaymentPeriod": "YYYY-MM",
      "status": "ACTIVE",
      "notes": "any special notes"
    }
  ],
  "paymentRecords": [
    {
      "tenantName": "name matching tenantsFound",
      "period": "YYYY-MM",
      "amount": number,
      "paidDate": "YYYY-MM-DD or null",
      "paymentMethod": "CASH or BANK_TRANSFER or CHEQUE or DIRECT_DEPOSIT or OTHER",
      "status": "PAID or OVERDUE or PARTIAL or NIL",
      "notes": "any notes like catch-up",
      "isCatchUp": false,
      "catchUpPeriods": []
    }
  ],
  "warnings": ["list of data quality warnings"],
  "gaps": ["list of missing data that needs user input"],
  "confidence": "HIGH",
  "summary": "brief human-readable summary of what was found"
}

Return ONLY the JSON, no other text.`;

  // Stream the response: large outputs (200+ records → ~14k tokens) can exceed
  // the SDK's 10-minute non-streaming ceiling, and streaming meters output
  // tokens as they generate so it self-throttles under per-minute rate limits.
  console.log('[ai-analyser] Using model:', MODEL);
  console.log('[ai-analyser] Starting Claude analysis…');
  const start = Date.now();
  const message = await getClient()
    .messages.stream({
      model: MODEL,
      max_tokens: 32000,
      messages: [{ role: 'user', content: prompt }],
    })
    .finalMessage();
  console.log(
    `[ai-analyser] Claude API took ${Date.now() - start}ms · output_tokens=${message.usage.output_tokens}`,
  );

  // If the model hit the token ceiling the JSON is incomplete — fail clearly
  // rather than throwing an opaque parse error.
  if (message.stop_reason === 'max_tokens') {
    throw new Error(
      'AI response was truncated (too many records for one pass). ' +
        'Try splitting the file or raising max_tokens.',
    );
  }

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // Tolerate any stray prose by extracting the JSON object from the response.
  const candidate = extractJson(text, '{') ?? text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(candidate) as AIAnalysisResult;
  } catch (e) {
    console.error(
      `[ai-analyser] JSON parse failed (${text.length} chars, stop_reason=${message.stop_reason}). Raw:\n${text}`,
    );
    throw new Error(
      `AI returned invalid JSON (${e instanceof Error ? e.message : 'parse error'}): ${candidate.substring(0, 200)}`,
    );
  }
}
