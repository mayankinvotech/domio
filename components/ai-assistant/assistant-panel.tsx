'use client';

import { useEffect, useState } from 'react';
import AssistantChat, { type DomiMood } from './assistant-chat';
import Domi from './domi';

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  // Drives the enter transition (off-screen → in) without leaving an
  // off-viewport element in the DOM while the panel is closed.
  const [shown, setShown] = useState(false);
  const [mood, setMood] = useState<DomiMood>('default');

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {/* Floating button — Domi peeking out of a circular badge (legs cropped). */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Domi, the Domio Assistant"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-[#0E0C22] to-[#1a1440] shadow-lg transition-transform hover:scale-105"
        >
          <Domi mood="happy" size={50} className="absolute left-1/2 top-1.5 -translate-x-1/2" />
        </button>
      )}

      {/* Mounted only while open → nothing sits off-screen when closed. */}
      {open && (
        <>
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className={
              'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ' +
              (shown ? 'opacity-100' : 'opacity-0')
            }
          />
          <aside
            role="dialog"
            aria-label="Domi Assistant"
            className={
              'fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-zinc-200 bg-[#0A0A0F] shadow-2xl transition-transform duration-300 ' +
              (shown ? 'translate-x-0' : 'translate-x-full')
            }
          >
            <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Domi
                  mood={mood}
                  size={48}
                  className={mood === 'thinking' ? 'domi-bob shrink-0' : 'shrink-0'}
                />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-white">Ask Domi</p>
                  <p className="text-xs text-[#6A6A8A]">
                    Ask me anything about your portfolio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#B0B0C8] transition-colors hover:bg-zinc-50 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>
            <AssistantChat variant="panel" onMoodChange={setMood} />
          </aside>
        </>
      )}
    </>
  );
}
