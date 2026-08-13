import { redirect } from "next/navigation";
import packageJson from "../../../package.json";
import { isDemoMode } from "@/lib/supabase/env";
import { loadJournalBootstrap } from "@/lib/bootstrap";
import { JournalApp } from "@/components/JournalApp";
import { WorkspaceRecovery } from "@/components/WorkspaceRecovery";

export default async function AppPage() {
  const bootstrap = await loadJournalBootstrap();

  if (!bootstrap.profile && !isDemoMode()) {
    redirect("/login");
  }

  if (bootstrap.workspaceUnavailable) {
    return <WorkspaceRecovery email={bootstrap.profile?.email ?? ""} />;
  }

  return <JournalApp initialData={bootstrap} appVersion={packageJson.version} />;
}
