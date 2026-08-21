'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatMoney } from '@/lib/tenancy-types';
import Domi from './domi';

export type DomiMood = 'default' | 'happy' | 'thinking' | 'alert';

// Anthropic message shape (mirrors the API route).
type ImageBlock = {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
};
type DocBlock = {
  type: 'document';
  source: { type: 'base64'; media_type: 'application/pdf'; data: string };
  title?: string;
};
type Block =
  | { type: 'text'; text: string }
  | ImageBlock
  | DocBlock
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };
export type Msg = { role: 'user' | 'assistant'; content: string | Block[] };
type Pending = { id: string; name: string; input: Record<string, unknown> };

// A file the user has attached but not yet sent.
type Attachment = {
  id: string;
  kind: 'image' | 'pdf' | 'text';
  name: string;
  mediaType: string;
  dataUrl?: string; // for image preview
  base64?: string; // for image / pdf blocks
  text?: string; // for csv / txt
};

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(file);
  });
}
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read failed'));
    r.readAsText(file);
  });
}
// data:<mime>;base64,<payload> → the payload only (Anthropic wants no prefix).
const stripDataUrl = (d: string) => d.slice(d.indexOf(',') + 1);

const SUGGESTIONS = [
  "Who hasn't paid this month?",
  'Show all balances',
  "Zafar's outstanding amount",
];

// ── Speech recognition (browser, no API) ─────────────────────────────────────
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ── Markdown rendering for Domi's replies ────────────────────────────────────
const mdComponents = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-1 leading-relaxed" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-1 list-disc pl-5" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-1 list-decimal pl-5" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="my-0.5" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-zinc-500 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="rounded bg-[rgba(255,255,255,0.08)] px-1 py-0.5 font-mono text-[0.85em]"
      {...props}
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="my-2 overflow-x-auto rounded-lg bg-[rgba(0,0,0,0.35)] p-3 text-xs"
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs" {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-left font-medium"
      {...props}
    />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border border-zinc-200 px-2 py-1" {...props} />
  ),
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-1 mt-2 text-base font-semibold text-white" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-1 mt-2 text-sm font-semibold text-white" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold text-white" {...props} />
  ),
};

type Bubble = {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[]; // data URLs
  files?: string[]; // filenames
};

function bubblesFrom(convo: Msg[]): Bubble[] {
  const out: Bubble[] = [];
  convo.forEach((m, i) => {
    if (m.role === 'user') {
      if (typeof m.content === 'string') {
        out.push({ key: `u${i}`, role: 'user', text: m.content });
        return;
      }
      // Array content: a typed message with text + attachments. Skip pure
      // tool_result arrays (internal).
      const blocks = m.content;
      const isToolResult = blocks.some((b) => b.type === 'tool_result');
      if (isToolResult) return;
      const text = blocks
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      const images = blocks
        .filter((b): b is ImageBlock => b.type === 'image')
        .map((b) => `data:${b.source.media_type};base64,${b.source.data}`);
      const files = blocks
        .filter((b): b is DocBlock => b.type === 'document')
        .map((b) => b.title ?? 'document.pdf');
      if (text || images.length || files.length) {
        out.push({ key: `u${i}`, role: 'user', text, images, files });
      }
      return;
    }
    const text = Array.isArray(m.content)
      ? m.content
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
      : String(m.content);
    if (text) out.push({ key: `a${i}`, role: 'assistant', text });
  });
  return out;
}

// Replace attachment bytes with lightweight text placeholders before saving —
// keeps stored rows small (we don't persist image/PDF bytes).
function stripForSave(convo: Msg[]): Msg[] {
  return convo.map((m) => {
    if (!Array.isArray(m.content)) return m;
    return {
      ...m,
      content: m.content.map((b): Block => {
        if (b.type === 'image') return { type: 'text', text: '[image attachment]' };
        if (b.type === 'document')
          return { type: 'text', text: `[file: ${b.title ?? 'document.pdf'}]` };
        return b;
      }),
    };
  });
}
function firstUserText(convo: Msg[]): string {
  for (const m of convo) {
    if (m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    const t = m.content.find((b): b is { type: 'text'; text: string } => b.type === 'text');
    if (t) return t.text;
  }
  return 'New chat';
}

export default function AssistantChat({
  variant = 'panel',
  onMoodChange,
  persist = false,
  initialConversationId = null,
  initialMessages,
  onConversationSaved,
}: {
  variant?: 'panel' | 'page';
  onMoodChange?: (mood: DomiMood) => void;
  persist?: boolean;
  initialConversationId?: string | null;
  initialMessages?: Msg[];
  onConversationSaved?: (id: string, title: string) => void;
}) {
  const [convo, setConvo] = useState<Msg[]>(initialMessages ?? []);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [pending, setPending] = useState<Pending | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState<DomiMood>('default');
  const [listening, setListening] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechAvailable = useMemo(() => getSpeechRecognition() !== null, []);
  const ttsAvailable = useMemo(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
    [],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [convo, loading, pending]);

  useEffect(() => {
    onMoodChange?.(mood);
  }, [mood, onMoodChange]);

  useEffect(
    () => () => {
      if (happyTimer.current) clearTimeout(happyTimer.current);
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  function flashHappy() {
    setMood('happy');
    if (happyTimer.current) clearTimeout(happyTimer.current);
    happyTimer.current = setTimeout(() => setMood('default'), 3000);
  }

  async function post(payload: object) {
    const res = await fetch('/api/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error ?? 'Assistant request failed.');
    }
    return res.json();
  }

  async function saveConversation(next: Msg[]) {
    if (!persist || next.length === 0) return;
    try {
      const res = await fetch('/api/ai-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conversationId,
          title: firstUserText(next),
          messages: stripForSave(next),
        }),
      });
      if (res.ok) {
        const { conversation } = await res.json();
        if (!conversationId) setConversationId(conversation.id);
        onConversationSaved?.(conversation.id, conversation.title);
      }
    } catch {
      /* saving is best-effort — never block the chat on it */
    }
  }

  async function runTurn(next: Msg[]) {
    setError(null);
    setConvo(next);
    setLoading(true);
    setMood('thinking');
    try {
      const data = await post({ messages: next });
      setConvo(data.messages);
      const isConfirm = data.status === 'confirm';
      setPending(isConfirm ? data.pending : null);
      if (isConfirm) setMood('default');
      else flashHappy();
      void saveConversation(data.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setMood('alert');
    } finally {
      setLoading(false);
    }
  }

  // ── Attachments (images, PDFs, CSV/text) ──
  const addFiles = useCallback(async (files: FileList | File[]) => {
    setAttachError(null);
    const list = Array.from(files);
    const added: Attachment[] = [];
    for (const file of list) {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${file.name}-${file.size}`;
      try {
        if (IMAGE_TYPES.includes(file.type)) {
          if (file.size > 5 * 1024 * 1024) {
            setAttachError(`${file.name} is too large (max 5MB).`);
            continue;
          }
          const dataUrl = await readAsDataUrl(file);
          added.push({
            id,
            kind: 'image',
            name: file.name,
            mediaType: file.type,
            dataUrl,
            base64: stripDataUrl(dataUrl),
          });
        } else if (file.type === 'application/pdf') {
          if (file.size > 20 * 1024 * 1024) {
            setAttachError(`${file.name} is too large (max 20MB).`);
            continue;
          }
          const dataUrl = await readAsDataUrl(file);
          added.push({
            id,
            kind: 'pdf',
            name: file.name,
            mediaType: 'application/pdf',
            base64: stripDataUrl(dataUrl),
          });
        } else {
          // CSV / plain text / markdown — read as text.
          if (file.size > 1 * 1024 * 1024) {
            setAttachError(`${file.name} is too large (max 1MB).`);
            continue;
          }
          const text = await readAsText(file);
          added.push({ id, kind: 'text', name: file.name, mediaType: file.type || 'text/plain', text });
        }
      } catch {
        setAttachError(`Could not read ${file.name}.`);
      }
    }
    if (added.length) setAttachments((a) => [...a, ...added]);
  }, []);

  function removeAttachment(id: string) {
    setAttachments((a) => a.filter((x) => x.id !== id));
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    let content: string | Block[];
    if (attachments.length === 0) {
      content = trimmed;
    } else {
      const blocks: Block[] = [];
      for (const a of attachments) {
        if (a.kind === 'image' && a.base64) {
          blocks.push({
            type: 'image',
            source: { type: 'base64', media_type: a.mediaType, data: a.base64 },
          });
        } else if (a.kind === 'pdf' && a.base64) {
          blocks.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: a.base64 },
            title: a.name,
          });
        } else if (a.kind === 'text' && a.text !== undefined) {
          blocks.push({
            type: 'text',
            text: `Attached file "${a.name}":\n\n${a.text}`,
          });
        }
      }
      blocks.push({ type: 'text', text: trimmed || 'Please review the attached file(s).' });
      content = blocks;
    }

    setDraft('');
    setAttachments([]);
    setAttachError(null);
    await runTurn([...convo, { role: 'user', content }]);
  }

  // Re-ask the last user message (drop everything after it).
  async function regenerate() {
    if (loading) return;
    let lastUser = -1;
    for (let i = convo.length - 1; i >= 0; i--) {
      if (convo[i].role === 'user' && typeof convo[i].content === 'string') {
        lastUser = i;
        break;
      }
    }
    if (lastUser === -1) return;
    setPending(null);
    await runTurn(convo.slice(0, lastUser + 1));
  }

  async function decide(approved: boolean) {
    if (!pending || loading) return;
    setError(null);
    setLoading(true);
    setMood('thinking');
    const id = pending.id;
    setPending(null);
    try {
      const data = await post({ messages: convo, confirm: { id, approved } });
      setConvo(data.messages);
      const isConfirm = data.status === 'confirm';
      setPending(isConfirm ? data.pending : null);
      if (isConfirm) setMood('default');
      else if (approved) flashHappy();
      else setMood('default');
      void saveConversation(data.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setMood('alert');
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setConvo([]);
    setConversationId(null);
    setPending(null);
    setError(null);
    setDraft('');
    setAttachments([]);
    setMood('default');
    stopSpeaking();
  }

  // ── Voice input ──
  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        // The Web Speech API marks finalized results, but the minimal typing
        // above omits isFinal; append everything and let the last event win.
        interim += t;
      }
      finalText = interim;
      setDraft(finalText);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  // ── Voice output ──
  function stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingKey(null);
  }
  function speak(key: string, text: string) {
    if (!ttsAvailable) return;
    if (speakingKey === key) {
      stopSpeaking();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => setSpeakingKey(null);
    u.onerror = () => setSpeakingKey(null);
    setSpeakingKey(key);
    window.speechSynthesis.speak(u);
  }

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const bubbles = bubblesFrom(convo);
  const empty = bubbles.length === 0;
  const lastAssistantKey = [...bubbles].reverse().find((b) => b.role === 'assistant')?.key;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {empty && !loading && (
          <div className="mt-2 flex flex-col items-center text-center">
            <Domi mood="happy" size={80} />
            <p className="mt-3 text-sm text-[#E8E8F2]">
              Hi! I&apos;m Domi, your property assistant. Ask me anything about
              your portfolio!
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {bubbles.map((b) =>
          b.role === 'user' ? (
            <div key={b.key} className="flex justify-end">
              <div className="flex max-w-[85%] flex-col items-end gap-1.5">
                {b.images && b.images.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {b.images.map((src, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={idx}
                        src={src}
                        alt="attachment"
                        className="max-h-40 rounded-xl border border-zinc-200 object-cover"
                      />
                    ))}
                  </div>
                )}
                {b.files && b.files.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {b.files.map((name, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2 py-1 text-xs text-zinc-500"
                      >
                        📄 {name}
                      </span>
                    ))}
                  </div>
                )}
                {b.text && (
                  <div className="whitespace-pre-wrap rounded-2xl bg-zinc-900 px-3.5 py-2 text-sm text-white">
                    {b.text}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={b.key} className="flex items-end justify-start gap-2">
              <Domi mood="default" size={24} className="mb-1 shrink-0" />
              <div className="group max-w-[85%]">
                <div className="rounded-2xl border border-zinc-200 bg-[#0E0C22] px-3.5 py-2 text-sm text-[#E8E8F2]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {b.text}
                  </ReactMarkdown>
                </div>
                {/* Per-reply actions */}
                <div className="mt-1 flex items-center gap-2 pl-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => copy(b.key, b.text)}
                    className="text-[11px] text-[#6A6A8A] transition-colors hover:text-zinc-500"
                  >
                    {copiedKey === b.key ? 'Copied' : 'Copy'}
                  </button>
                  {ttsAvailable && (
                    <button
                      type="button"
                      onClick={() => speak(b.key, b.text)}
                      className="text-[11px] text-[#6A6A8A] transition-colors hover:text-zinc-500"
                    >
                      {speakingKey === b.key ? 'Stop' : 'Read aloud'}
                    </button>
                  )}
                  {b.key === lastAssistantKey && !pending && (
                    <button
                      type="button"
                      onClick={regenerate}
                      disabled={loading}
                      className="text-[11px] text-[#6A6A8A] transition-colors hover:text-zinc-500 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ),
        )}

        {/* Confirmation card */}
        {pending && (
          <div className="rounded-2xl border border-[rgba(232,160,32,0.4)] bg-[rgba(232,160,32,0.06)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#E8A020]">
              {pending.name === 'create_payment' ? 'Confirm Payment' : 'Confirm Charge'}
            </p>
            <dl className="mt-2 space-y-1 text-sm text-[#E8E8F2]">
              <div className="flex justify-between gap-3">
                <dt className="text-[#6A6A8A]">Tenant</dt>
                <dd className="font-medium">{String(pending.input.tenantName ?? '')}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6A6A8A]">Amount</dt>
                <dd className="font-semibold">
                  {formatMoney(Math.abs(Number(pending.input.amount) || 0))}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6A6A8A]">Date</dt>
                <dd>{String(pending.input.date ?? '')}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6A6A8A]">Description</dt>
                <dd className="text-right">{String(pending.input.description ?? '')}</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => decide(false)}
                disabled={loading}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-1.5 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => decide(true)}
                disabled={loading}
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end justify-start gap-2">
            <Domi mood="thinking" size={24} className="domi-bob mb-1 shrink-0" />
            <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-[#0E0C22] px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-zinc-200 p-3">
        {!empty && (
          <button
            type="button"
            onClick={clear}
            className="mb-2 text-xs text-[#6A6A8A] transition-colors hover:text-zinc-500"
          >
            Clear chat
          </button>
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="group/att relative flex items-center gap-1.5 rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2 py-1 text-xs text-zinc-500"
              >
                {a.kind === 'image' && a.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.dataUrl} alt="" className="h-6 w-6 rounded object-cover" />
                ) : (
                  <span>{a.kind === 'pdf' ? '📄' : '📎'}</span>
                )}
                <span className="max-w-[120px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="text-[#6A6A8A] hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {attachError && (
          <p className="mb-2 text-xs text-red-400">{attachError}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/csv,text/plain,.csv,.txt,.md"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach a file or image"
            title="Attach an image, PDF, or CSV"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#B0B0C8] transition-colors hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          {speechAvailable && (
            <button
              type="button"
              onClick={toggleListening}
              aria-label={listening ? 'Stop dictation' : 'Dictate'}
              title={listening ? 'Stop dictation' : 'Speak your message'}
              className={
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ' +
                (listening
                  ? 'animate-pulse border-red-500/50 bg-red-500/15 text-red-400'
                  : 'border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#B0B0C8] hover:text-white')
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </button>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length) {
                e.preventDefault();
                addFiles(files);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={variant === 'page' ? 2 : 1}
            placeholder={listening ? 'Listening…' : 'Ask about rent, balances, payments…'}
            className="max-h-32 flex-1 resize-none rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#6A6A8A] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20"
          />
          <button
            type="submit"
            disabled={loading || (!draft.trim() && attachments.length === 0)}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
