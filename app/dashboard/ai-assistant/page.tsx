import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AssistantWorkspace from '@/components/ai-assistant/assistant-workspace';
import Domi from '@/components/ai-assistant/domi';

export default async function AiAssistantPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl flex-col">
      <header className="mb-4 flex items-center gap-3">
        <Domi mood="happy" size={56} className="shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-white">Ask Domi</h1>
          <p className="mt-1 text-sm text-[#6A6A8A]">
            Ask me anything about your portfolio
          </p>
        </div>
      </header>
      <AssistantWorkspace />
    </div>
  );
}
