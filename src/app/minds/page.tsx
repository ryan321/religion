import { requireUser } from "@/lib/auth";
import { getGreatMindsForUser } from "@/lib/great-minds";
import { TopNav } from "@/components/top-nav";
import { MindsGrid } from "./minds-grid";

export const dynamic = "force-dynamic";

export default async function GreatMindsPage() {
  const session = await requireUser();
  const minds = await getGreatMindsForUser(session.user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Great Minds
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Unlock conversations with history's greatest thinkers by completing
            chapter 7 in their related workbooks.
          </p>
        </div>
        <MindsGrid minds={minds} />
      </main>
    </div>
  );
}
