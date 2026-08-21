'use client';

import { useCallback, useEffect, useState } from 'react';
import AssistantChat, { type Msg } from './assistant-chat';

type ConvoSummary = { id: string; title: string; updatedAt: string };

export default function AssistantWorkspace() {
  const [list, setList] = useState<ConvoSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Msg[] | undefined>();
  const [chatKey, setChatKey] = useState(0);
  const [loadingList, setLoadingList] = useState(true);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-conversations');
      if (res.ok) {
        const data = await res.json();
        setList(data.conversations as ConvoSummary[]);
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  function newChat() {
    setActiveId(null);
    setActiveMessages(undefined);
    setChatKey((k) => k + 1);
  }

  async function openConversation(id: string) {
    if (id === activeId) return;
    const res = await fetch(`/api/ai-conversations/${id}`);
    if (!res.ok) return;
    const { conversation } = await res.json();
    setActiveId(conversation.id);
    setActiveMessages(conversation.messages as Msg[]);
    setChatKey((k) => k + 1);
  }

  async function deleteConversation(id: string) {
    if (!window.confirm('Delete this conversation?')) return;
    const res = await fetch(`/api/ai-conversations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setList((l) => l.filter((c) => c.id !== id));
      if (id === activeId) newChat();
    }
  }

  const onConversationSaved = useCallback(
    (id: string, title: string) => {
      setActiveId(id);
      setList((l) => {
        const rest = l.filter((c) => c.id !== id);
        return [{ id, title, updatedAt: new Date().toISOString() }, ...rest];
      });
    },
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      {/* History sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] sm:flex">
        <div className="border-b border-zinc-200 p-3">
          <button
            type="button"
            onClick={newChat}
            className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + New chat
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loadingList ? (
            <p className="px-2 py-3 text-xs text-[#6A6A8A]">Loading…</p>
          ) : list.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[#6A6A8A]">
              No saved chats yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {list.map((c) => (
                <li key={c.id} className="group/item relative">
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={
                      'w-full truncate rounded-lg px-2.5 py-2 pr-7 text-left text-xs transition-colors ' +
                      (c.id === activeId
                        ? 'bg-zinc-50 text-white'
                        : 'text-zinc-500 hover:bg-zinc-50')
                    }
                    title={c.title}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(c.id)}
                    aria-label="Delete conversation"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#6A6A8A] opacity-0 transition-opacity hover:text-red-400 group-hover/item:opacity-100"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Chat */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)]">
        <AssistantChat
          key={chatKey}
          variant="page"
          persist
          initialConversationId={activeId}
          initialMessages={activeMessages}
          onConversationSaved={onConversationSaved}
        />
      </div>
    </div>
  );
}
