import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/supabase/env";
import { loadJournalBootstrap } from "@/lib/bootstrap";
import { JournalApp } from "@/components/JournalApp";

export default async function AppPage() {
  const bootstrap = await loadJournalBootstrap();

  if (!bootstrap.profile && !isDemoMode()) {
    redirect("/login");
  }

  return <JournalApp initialData={bootstrap} />;
}
