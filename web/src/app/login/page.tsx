import { redirect } from "next/navigation";
import { Camera, Mail, Sparkles } from "lucide-react";
import packageJson from "../../../package.json";
import { appUrl, isDemoMode } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { magicLinkSentCopy } from "@/lib/auth-email-copy";

async function signIn(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/app");
  }

  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback`
    }
  });

  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const params = await searchParams;
  const sent = params.sent;
  const demo = isDemoMode();
  const sentCopy = sent ? magicLinkSentCopy(sent) : null;

  return (
    <main className="grid min-h-screen place-items-center px-3 py-4 sm:px-5 sm:py-10">
      <section className="w-full max-w-5xl overflow-hidden rounded-[26px] border border-journal-line bg-journal-surface shadow-journal sm:rounded-[34px]">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative min-h-[360px] bg-[linear-gradient(135deg,#8da38e,#e6c392_52%,#b96464)] p-6 text-white sm:min-h-[420px] sm:p-8 lg:min-h-[560px] lg:p-12">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.42))]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-3 text-sm font-bold">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/18">
                  <Camera aria-hidden="true" size={22} />
                </span>
                Photo Gratitude Journal
              </div>

              <div className="max-w-lg">
                <h1 className="text-[2.1rem] font-bold leading-[1.03] tracking-normal sm:text-6xl">
                  Notice the good stuff before it slips by.
                </h1>
                <p className="mt-4 max-w-md text-base leading-7 text-white/86 sm:mt-5 sm:text-lg">
                  A private, photo-first journal for daily gratitude, family memories, and tiny details worth finding again later.
                </p>
              </div>

              <div className="grid gap-2 text-sm text-white/88 sm:grid-cols-3 sm:gap-3">
                <span className="rounded-2xl bg-white/14 p-3 sm:p-4">One or two photos</span>
                <span className="rounded-2xl bg-white/14 p-3 sm:p-4">Private people tags</span>
                <span className="rounded-2xl bg-white/14 p-3 sm:p-4">Memory Lane</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-12">
            <div className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose/10 text-rose sm:mb-10">
              <Sparkles aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">Sign in to your journal</h2>
            <p className="mt-3 text-warm-gray">
              Use a magic link. No password to manage, and no public profile.
            </p>

            {sent ? (
              <div className="mt-8 rounded-journal border border-leaf/20 bg-leaf/10 p-5 text-leaf">
                <p className="font-bold">{sentCopy?.title}</p>
                <p className="mt-1 text-sm">{sentCopy?.body}</p>
                <p className="mt-2 text-xs font-semibold text-leaf/80">{sentCopy?.hint}</p>
              </div>
            ) : (
              <form action={signIn} className="mt-8 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-soft-ink">
                  Email address
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="min-h-12 rounded-2xl border border-journal-line bg-white px-4 text-base outline-none ring-rose/20 transition focus:ring-4"
                  />
                </label>
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-rose px-5 font-bold text-white shadow-photo">
                  <Mail aria-hidden="true" size={18} />
                  Send magic link
                </button>
              </form>
            )}

            {demo ? (
              <a
                href="/app"
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 font-bold text-white"
              >
                Open local demo
              </a>
            ) : null}

            <p className="mt-8 text-xs leading-5 text-warm-gray">
              Private beta: personal and household journals are visible only to invited members. · v{packageJson.version}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
