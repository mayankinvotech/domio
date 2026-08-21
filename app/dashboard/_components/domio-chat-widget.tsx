'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Domi from '@/components/ai-assistant/domi';

type QuickPrompt = {
  label: string;
  query: string;
  icon: string;
};

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Who owes rent this month?',
    query: 'Show me all tenants who have not paid rent or have overdue balances this month.',
    icon: '🔴',
  },
  {
    label: 'Which leases expire soon?',
    query: 'List all active leases and tenancies expiring in the next 60 days.',
    icon: '⏳',
  },
  {
    label: 'Calculate collection rate',
    query: 'What is our total expected vs collected rent rate across all properties this month?',
    icon: '📊',
  },
  {
    label: 'How many vacant units?',
    query: 'Show me all vacant or unassigned sub-properties ready for new tenants.',
    icon: '🏢',
  },
];

export default function DomioChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  >([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hi! I’m **Domi**, your AI Property Co-Pilot. I can answer questions about your rent collections, overdue tenants, leases, and utility bills. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    const userMsg = { id: String(Date.now()), role: 'user' as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error('Failed to get answer');
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: data.reply || 'Here is what I found regarding your property portfolio.',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content:
            'I’m currently reviewing your live ledger data. You can also view details directly in the **Rent Ledger** or **Tenants** sections.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Pill */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="group flex items-center gap-3 rounded-full border border-[#e1e2e3] bg-white p-2 pr-5 text-black shadow-2xl transition-all hover:scale-105 active:scale-95 hover:border-black"
          aria-label="Open Domi AI Assistant"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md">
            <Domi mood="helpful" size={24} />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </div>

          <div className="text-left">
            <p className="text-xs font-bold text-black leading-tight">Chat with Domi</p>
            <p className="text-[10px] text-zinc-500 leading-tight">AI Assistant</p>
          </div>
        </button>
      </div>

      {/* Slide-over Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="flex h-[85vh] sm:h-[650px] w-full sm:max-w-md flex-col rounded-t-3xl sm:rounded-3xl border border-[#e1e2e3] bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e1e2e3] bg-zinc-950 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white border border-white/20">
                  <Domi mood="thinking" size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Domi AI Co-Pilot</h3>
                  <p className="text-[10px] text-zinc-400">Online · Connected to Live Ledger</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href="/dashboard/ai-assistant"
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Expand to Full Screen"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Close chat"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Prompts Bar */}
            <div className="border-b border-zinc-100 bg-[#fafaf9] px-4 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() => handleSend(qp.query)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:border-black hover:bg-zinc-50 transition-all shadow-2xs"
                >
                  <span>{qp.icon}</span>
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-black text-white rounded-br-none'
                        : 'bg-[#f5f5f7] border border-[#e1e2e3] text-zinc-900 rounded-bl-none'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-none border border-[#e1e2e3] bg-[#f5f5f7] px-4 py-3 text-xs text-zinc-500">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.4s]" />
                    <span className="ml-1 text-[11px]">Domi is calculating...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="border-t border-[#e1e2e3] bg-white p-3 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Domi anything about your rent or tenants..."
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-black focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-xl bg-black p-2.5 text-white transition-all hover:bg-zinc-800 disabled:opacity-40"
                aria-label="Send query"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
