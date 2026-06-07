import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock3,
  Heart,
  Lock,
  type LucideIcon,
  Moon,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { isDemoMode } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Photo Gratitude Journal | Science-backed private photo journaling",
  description:
    "A private, photo-first ritual for noticing the good before it slips by, built around evidence-informed gratitude, savoring, and reminiscence practices."
};

type ResearchPillar = {
  title: string;
  icon: LucideIcon;
  takeaway: string;
  citations: Array<{ label: string; href: string }>;
};

const researchPillars: ResearchPillar[] = [
  {
    title: "Gratitude practice",
    icon: Heart,
    takeaway:
      "Small gratitude lists and Three Good Things exercises have randomized-trial and meta-analysis support for modest wellbeing gains.",
    citations: [
      { label: "Emmons & McCullough, 2003", href: "https://pubmed.ncbi.nlm.nih.gov/12585811/" },
      { label: "Seligman et al., 2005", href: "https://pubmed.ncbi.nlm.nih.gov/16045394/" },
      { label: "Davis et al., 2016", href: "https://pubmed.ncbi.nlm.nih.gov/26575348/" },
      { label: "Cunha et al., 2023", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10393216/" }
    ]
  },
  {
    title: "Savoring and noticing",
    icon: Sparkles,
    takeaway:
      "The product is designed around noticing and appreciating positive moments while they are still close enough to feel specific.",
    citations: [
      { label: "Bryant, 2021", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8712667/" },
      { label: "Savoring background", href: "https://www.internationaljournalofwellbeing.org/index.php/ijow/article/view/18" }
    ]
  },
  {
    title: "Photos and memory",
    icon: Camera,
    takeaway:
      "A small number of intentional photos can support engagement, while passive or excessive capture can weaken unaided recall.",
    citations: [
      {
        label: "Diehl, Zauberman & Barasch, 2016",
        href: "https://www.ovid.com/journals/jpspy/abstract/10.1037/pspa0000055~how-taking-photos-increases-enjoyment-of-experiences"
      },
      { label: "Soares & Storm, 2022", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9296013/" }
    ]
  },
  {
    title: "Reminiscence and retrieval",
    icon: Clock3,
    takeaway:
      "Personally meaningful images and gentle look-backs can help people retrieve positive autobiographical memories with richer context.",
    citations: [
      { label: "Personal-image RCT", href: "https://link.springer.com/article/10.1007/s12144-023-04582-5" },
      { label: "Life review meta-analysis", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10603902/" },
      { label: "Photo reminiscence review", href: "https://arxiv.org/abs/2411.00351" }
    ]
  }
];

const loopSteps = [
  {
    title: "Add one or two photos",
    text: "Let the image carry most of the story without turning the ritual into a camera roll chore.",
    icon: Camera
  },
  {
    title: "Name three nice things",
    text: "Use the default gratitude prompt, write one line, or keep it photo-only on full days.",
    icon: CheckCircle2
  },
  {
    title: "Keep tiny details",
    text: "Save a phrase, favorite, routine, milestone, or quote before it becomes hard to search for.",
    icon: Quote
  },
  {
    title: "Find it again later",
    text: "Memory Lane, Calendar, Memories, and private tags turn small entries into a retrievable archive.",
    icon: Search
  }
];

export default function HomePage() {
  const demo = isDemoMode();
  const primaryCta = demo ? "Open the demo" : "Open the beta";

  return (
    <main className="min-h-screen overflow-hidden text-ink">
      <section className="relative px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 font-bold text-ink" aria-label="Photo Gratitude Journal home">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-rose text-white shadow-sm">
              <Camera aria-hidden="true" size={21} />
            </span>
            <span>Photo Gratitude Journal</span>
          </Link>
          <nav aria-label="Homepage navigation" className="hidden items-center gap-6 text-sm font-bold text-warm-gray sm:flex">
            <a href="#science" className="transition hover:text-ink">
              Science
            </a>
            <a href="#privacy" className="transition hover:text-ink">
              Privacy
            </a>
            <Link href="/login" className="transition hover:text-ink">
              Sign in
            </Link>
          </nav>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 pt-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(430px,1fr)] lg:items-center lg:pt-20">
          <div>
            <h1 className="max-w-4xl text-[3.25rem] font-bold leading-[0.96] tracking-normal text-ink sm:text-[5.5rem] lg:text-[6.3rem]">
              Photo Gratitude Journal
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-soft-ink sm:text-2xl sm:leading-9">
              A private, photo-first ritual for noticing the good before it slips by.
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-warm-gray sm:text-lg">
              Built for private beta testers who want a small wellbeing ritual grounded in research-backed practices: gratitude, savoring, meaningful photos, and gentle reminiscence.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-rose px-6 font-bold text-white shadow-photo transition hover:-translate-y-0.5 hover:bg-[#b93b51]"
              >
                {primaryCta}
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-journal-line bg-journal-surface px-6 font-bold text-soft-ink shadow-sm transition hover:-translate-y-0.5 hover:border-rose/25"
              >
                Sign in
              </Link>
            </div>

            <dl className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["1-2", "intentional photos"],
                ["3", "nice things prompt"],
                ["0", "public profiles"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-[22px] border border-journal-line bg-journal-surface/78 p-4 shadow-sm backdrop-blur">
                  <dt className="text-2xl font-bold text-rose">{value}</dt>
                  <dd className="mt-1 text-sm font-semibold leading-5 text-warm-gray">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroJournalMockup />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <h2 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">The product loop is intentionally small.</h2>
              <p className="mt-4 max-w-xl text-lg leading-8 text-warm-gray">
                The app avoids turning gratitude into homework. A kept memory can be a single photo, one line, or a few details that future-you can actually find.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {loopSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="rounded-[24px] border border-journal-line bg-journal-surface p-5 shadow-sm">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-rose/10 text-rose">
                      <Icon aria-hidden="true" size={20} />
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-ink">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-warm-gray">{step.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="science" className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[32px] bg-ink p-5 text-white shadow-journal sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <h2 className="text-4xl font-bold leading-tight sm:text-5xl">Backed by practices researchers actually study.</h2>
              <p className="mt-4 text-base leading-7 text-white/72">
                The promise is careful on purpose: this is not therapy, diagnosis, or medical advice; it is a small habit designed around well-studied reflection practices.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {researchPillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <article key={pillar.title} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-dawn">
                        <Icon aria-hidden="true" size={19} />
                      </span>
                      <h3 className="text-lg font-bold">{pillar.title}</h3>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-white/76">{pillar.takeaway}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {pillar.citations.map((citation) => (
                        <a
                          key={citation.href}
                          href={citation.href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/82 transition hover:border-dawn/40 hover:text-white"
                        >
                          {citation.label}
                        </a>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="privacy" className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div className="rounded-[32px] border border-journal-line bg-journal-surface p-6 shadow-journal sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <TrustTile icon={ShieldCheck} title="Private beta workspaces" text="Personal and household journals are scoped to accepted workspace members." />
              <TrustTile icon={Lock} title="Protected photo storage" text="Web beta photos live behind Supabase private Storage and workspace-aware access rules." />
              <TrustTile icon={Users} title="Private tags, not profiles" text="People tags are labels for your own memories, not contacts, accounts, or a social graph." />
              <TrustTile icon={BookOpen} title="Native path stays personal" text="The iOS product direction remains local-first, with private iCloud sync as the Apple-native model." />
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">Privacy is part of the product, not a buried setting.</h2>
            <p className="mt-5 text-lg leading-8 text-warm-gray">
              Photo Gratitude Journal is for memories you would rather keep close: a child&apos;s phrase, a hard-day comfort, a partner routine, a solo milestone, or one ordinary photo that mattered.
            </p>
            <p className="mt-4 text-base leading-7 text-warm-gray">
              The beta supports solo, partner, family, and custom memory shapes without forcing the app to become a public album or a clinical tracker.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[34px] border border-journal-line bg-journal-surface shadow-journal">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div
              className="min-h-[320px] bg-cover bg-center"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 74% 28%, rgba(255,255,255,0.34) 0 13%, transparent 14%), linear-gradient(140deg, #8da38e 0%, #e6c392 46%, #b96464 100%)"
              }}
              aria-hidden="true"
            />
            <div className="p-6 sm:p-8 lg:p-12">
              <h2 className="max-w-xl text-4xl font-bold leading-tight text-ink sm:text-5xl">For a private beta, the bar is simple: does it make the good easier to keep?</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-warm-gray">
                Open the demo, make one memory, and see whether the ritual feels calm enough to repeat. One photo or one line is a valid first pass.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-rose px-6 font-bold text-white shadow-photo transition hover:-translate-y-0.5 hover:bg-[#b93b51]"
                >
                  {primaryCta}
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-journal-raised px-6 font-bold text-soft-ink transition hover:-translate-y-0.5"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroJournalMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] lg:mr-0">
      <div className="absolute -left-6 top-14 hidden h-28 w-28 rounded-full bg-dawn/30 blur-3xl sm:block" />
      <div className="absolute -right-8 bottom-10 hidden h-36 w-36 rounded-full bg-leaf/20 blur-3xl sm:block" />
      <div className="relative overflow-hidden rounded-[34px] border border-journal-line bg-journal-surface p-4 shadow-journal sm:p-5">
        <div className="overflow-hidden rounded-[28px] bg-white">
          <div
            className="grid min-h-[360px] content-end bg-cover bg-center p-5 text-white sm:min-h-[430px] sm:p-7"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(33,33,40,0.06), rgba(33,33,40,0.62)), radial-gradient(circle at 72% 24%, rgba(255,255,255,0.32) 0 13%, transparent 14%), linear-gradient(135deg, #8da38e 0%, #e6c392 48%, #70413c 100%)"
            }}
          >
            <div className="max-w-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/74">Memory Lane</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight">First beach day of the season.</h2>
              <p className="mt-3 text-sm leading-6 text-white/80">Around this day last year, saved with Family and Partner.</p>
            </div>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-[1fr_0.85fr] sm:p-5">
            <div className="rounded-[22px] bg-journal-raised p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-rose">
                <Moon aria-hidden="true" size={16} />
                Today
              </div>
              <h3 className="mt-3 text-xl font-bold text-ink">What felt good today?</h3>
              <ol className="mt-4 grid gap-2 text-sm font-semibold text-soft-ink">
                <li className="rounded-2xl bg-white px-3 py-2">A good cup of tea</li>
                <li className="rounded-2xl bg-white px-3 py-2">Sun on the walk home</li>
                <li className="rounded-2xl bg-white px-3 py-2">One kind text</li>
              </ol>
            </div>
            <div className="rounded-[22px] bg-rose/10 p-4">
              <p className="text-sm font-bold text-rose">Little Details</p>
              <p className="mt-3 text-sm leading-6 text-soft-ink">Still says &apos;lellow&apos; instead of yellow.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-warm-gray">
                <span className="rounded-full bg-white px-3 py-1.5">phrase</span>
                <span className="rounded-full bg-white px-3 py-1.5">Mia</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustTile({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="rounded-[24px] bg-journal-raised p-5">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-leaf/10 text-leaf">
        <Icon aria-hidden="true" size={20} />
      </span>
      <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-warm-gray">{text}</p>
    </article>
  );
}
