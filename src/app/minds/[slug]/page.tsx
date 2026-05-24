import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getGreatMindBySlug,
  isMindUnlocked,
  getMindChatHistory,
} from "@/lib/great-minds";
import { TopNav } from "@/components/top-nav";
import { MindChat } from "./mind-chat";

export const dynamic = "force-dynamic";

export default async function GreatMindChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireUser();

  const mind = await getGreatMindBySlug(slug);
  if (!mind) notFound();

  const unlocked = await isMindUnlocked(session.user.id, mind.id);
  if (!unlocked) redirect("/minds");

  const history = await getMindChatHistory(session.user.id, mind.id);
  const messages = history.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-6">
        <MindChat
          mindSlug={mind.slug}
          mindName={mind.name}
          mindYears={mind.years}
          mindBio={mind.shortBio}
          starters={mind.starters}
          initialMessages={messages}
        />
      </main>
    </div>
  );
}
