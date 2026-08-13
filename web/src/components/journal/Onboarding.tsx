import { useState } from "react";
import clsx from "clsx";
import { Camera, Moon, Sparkles, Sun, X } from "lucide-react";
import type { JournalBootstrap, PersonTag, ReminderPreferences, RitualCadence } from "@/types/journal";
import type { ExperienceMode } from "@/lib/experience-mode";
import {
  findPersonalizedPersonName,
  onboardingFocusOptions,
  type OnboardingFocus,
  type OnboardingSetup
} from "@/lib/onboarding";
import { shortDisplayName } from "@/components/journal/helpers";

// Warm Album first-run flow (docs/DESIGN_HANDOFF.md): exactly four steps —
// welcome → people → rhythm → mode — designed to finish in under a minute.
// Invited members ("welcome-only") get a two-step tour instead: welcome plus
// the look-back promise, with no setup writes into the shared workspace.
type OnboardingStepKind = "welcome" | "people" | "rhythm" | "mode" | "lookback";

// Shared motion voice: slow-out, collapses for prefers-reduced-motion.
const slowOut = "transition duration-200 ease-[cubic-bezier(.3,0,.2,1)] motion-reduce:transition-none";

export function OnboardingOverlay({
  profile,
  people,
  mode,
  experienceMode,
  workspaceName,
  reminders,
  onComplete,
  onClose
}: {
  profile: JournalBootstrap["profile"];
  people: PersonTag[];
  mode: "setup" | "welcome-only";
  experienceMode: ExperienceMode;
  workspaceName: string;
  reminders: ReminderPreferences;
  onComplete: (setup: OnboardingSetup) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<OnboardingFocus>("self");
  const firstName = shortDisplayName(profile);
  const [meName, setMeName] = useState(firstName === "there" ? "" : firstName);
  const [partnerName, setPartnerName] = useState(() => findPersonalizedPersonName(people, "Partner"));
  const [childNames, setChildNames] = useState(() => {
    const seeded = [findPersonalizedPersonName(people, "Kid 1"), findPersonalizedPersonName(people, "Kid 2")].filter(Boolean);
    return seeded.length > 0 ? seeded : [""];
  });
  const [otherNames, setOtherNames] = useState([""]);
  const [reminderPrefs, setReminderPrefs] = useState<ReminderPreferences>(reminders);
  // Step 4 pre-selection: new accounts arrive with SPEC-7's Simple default, so
  // Simple is pre-selected for them; a replayed tour (or the Full-mode demo)
  // pre-selects whatever the user already has instead of silently downsizing.
  const [chosenMode, setChosenMode] = useState<ExperienceMode>(experienceMode);

  const steps: OnboardingStepKind[] = mode === "welcome-only" ? ["welcome", "lookback"] : ["welcome", "people", "rhythm", "mode"];
  const current = steps[step];
  const isLastStep = step === steps.length - 1;

  function finish() {
    if (mode === "welcome-only") {
      onClose();
      return;
    }
    onComplete({
      focus,
      names: { me: meName, partner: partnerName, children: childNames, others: otherNames },
      reminders: reminderPrefs,
      experienceMode: chosenMode
    });
  }

  function next() {
    if (!isLastStep) {
      setStep((currentStep) => currentStep + 1);
      return;
    }
    finish();
  }

  const ctaLabel =
    current === "welcome" && mode === "setup"
      ? "Begin"
      : current === "mode"
        ? "Start with tonight"
        : current === "lookback"
          ? "Start today"
          : "Continue";

  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome tour" className="fixed inset-0 z-50 overflow-y-auto bg-journal-bg">
      {/* Warm dawn glow, token-only (no hex): quiet, static, theme-friendly. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 w-80 rounded-full bg-dawn/25 blur-3xl" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-6 pt-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close welcome"
            className={clsx(
              "grid h-11 w-11 place-items-center rounded-full bg-journal-surface text-warm-gray shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/25",
              slowOut
            )}
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>

        <div className={clsx("flex flex-1 flex-col gap-4 py-4", current === "welcome" || current === "lookback" ? "justify-center text-center" : "justify-start")}>
          {current === "welcome" ? (
            <WelcomeStep mode={mode} workspaceName={workspaceName} />
          ) : null}

          {current === "people" ? (
            <PeopleStep
              focus={focus}
              setFocus={setFocus}
              meName={meName}
              setMeName={setMeName}
              partnerName={partnerName}
              setPartnerName={setPartnerName}
              childNames={childNames}
              setChildNames={setChildNames}
              otherNames={otherNames}
              setOtherNames={setOtherNames}
            />
          ) : null}

          {current === "rhythm" ? <RhythmStep value={reminderPrefs} onChange={setReminderPrefs} /> : null}

          {current === "mode" ? <ModeStep chosenMode={chosenMode} onChoose={setChosenMode} /> : null}

          {current === "lookback" ? (
            <>
              <h1 className="text-[1.75rem] font-bold leading-[1.12] tracking-[-0.01em] text-ink">Tonight becomes tomorrow&rsquo;s look-back.</h1>
              <p className="mx-auto max-w-sm text-[0.9375rem] leading-relaxed text-soft-ink">
                After a few kept days, the app brings back yesterday, last week, and one month ago — then seasons and years as the journal grows.
              </p>
            </>
          ) : null}
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={next}
            className={clsx(
              "inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-rose px-8 text-base font-bold text-white shadow-journal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/35 active:bg-rose-pressed",
              slowOut
            )}
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              "min-h-11 w-full rounded-full text-sm font-bold text-warm-gray focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/25",
              slowOut
            )}
          >
            Skip tour
          </button>
        </div>

        <div className="mt-3 flex justify-center gap-1.5 pb-2" role="img" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((kind, index) => (
            <span
              key={kind}
              className={clsx(
                "h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(.3,0,.2,1)] motion-reduce:transition-none",
                index === step ? "w-[18px] bg-rose" : "w-1.5 bg-ink/15"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ mode, workspaceName }: { mode: "setup" | "welcome-only"; workspaceName: string }) {
  return (
    <>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-journal border border-journal-line bg-journal-surface text-rose shadow-journal">
        <Camera aria-hidden="true" size={30} strokeWidth={1.8} />
      </span>
      <h1 className="text-[1.75rem] font-bold leading-[1.12] tracking-[-0.01em] text-ink">
        {mode === "welcome-only" ? `You've joined ${workspaceName}.` : "A photo journal for noticing good moments"}
      </h1>
      <p className="mx-auto max-w-sm text-[0.9375rem] leading-relaxed text-soft-ink">
        {mode === "welcome-only"
          ? "Everything here is already set up. The ritual is intentionally tiny: one photo or one line is enough to keep a day."
          : "End the day with a photo and a few nice things. One line is enough. Private, always — no feed, no followers."}
      </p>
    </>
  );
}

function PeopleStep({
  focus,
  setFocus,
  meName,
  setMeName,
  partnerName,
  setPartnerName,
  childNames,
  setChildNames,
  otherNames,
  setOtherNames
}: {
  focus: OnboardingFocus;
  setFocus: (focus: OnboardingFocus) => void;
  meName: string;
  setMeName: (value: string) => void;
  partnerName: string;
  setPartnerName: (value: string) => void;
  childNames: string[];
  setChildNames: React.Dispatch<React.SetStateAction<string[]>>;
  otherNames: string[];
  setOtherNames: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <>
      <h1 className="text-[1.5625rem] font-bold leading-[1.12] tracking-[-0.01em] text-ink">Who&rsquo;s in your story?</h1>
      <p className="text-sm leading-normal text-warm-gray">Pick a starting shape — you can change everything later.</p>

      <div className="grid grid-cols-2 gap-2">
        {onboardingFocusOptions.map((option) => {
          const active = focus === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFocus(option.id)}
              aria-pressed={active}
              className={clsx(
                "min-h-[52px] rounded-card border-[1.5px] px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/25",
                slowOut,
                active ? "border-rose/40 bg-rose/5 text-rose" : "border-journal-line bg-journal-surface text-soft-ink hover:border-rose/30"
              )}
            >
              {option.title}
              <span className="sr-only">. {option.text}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[18px] border border-journal-line bg-journal-surface p-4">
        <p className="text-[0.8125rem] font-bold text-soft-ink">Names you&rsquo;ll want to find later</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {focus !== "other" ? <OnboardingNameField label="You" value={meName} onChange={setMeName} placeholder="Your name" /> : null}
          {focus === "partner" || focus === "family" ? (
            <OnboardingNameField label="Partner" value={partnerName} onChange={setPartnerName} placeholder="Their name" />
          ) : null}
          {focus === "family"
            ? childNames.map((name, index) => (
                <OnboardingNameField
                  key={index}
                  label={index === 0 ? "Child" : `Child ${index + 1}`}
                  value={name}
                  onChange={(value) => setChildNames((current) => current.map((candidate, candidateIndex) => (candidateIndex === index ? value : candidate)))}
                  placeholder={index === 0 ? "Their name" : "Optional"}
                />
              ))
            : null}
          {focus === "other"
            ? otherNames.map((name, index) => (
                <OnboardingNameField
                  key={index}
                  label={index === 0 ? "Person or theme" : `Person or theme ${index + 1}`}
                  value={name}
                  onChange={(value) => setOtherNames((current) => current.map((candidate, candidateIndex) => (candidateIndex === index ? value : candidate)))}
                  placeholder={index === 0 ? "Friends, travel, work wins" : "Optional"}
                />
              ))
            : null}
        </div>
        {focus === "family" && childNames.length < 4 ? (
          <button
            type="button"
            onClick={() => setChildNames((current) => [...current, ""])}
            className={clsx("mt-3 min-h-11 rounded-full bg-journal-raised px-4 text-sm font-bold text-soft-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/25", slowOut)}
          >
            Add another child
          </button>
        ) : null}
        {focus === "other" && otherNames.length < 5 ? (
          <button
            type="button"
            onClick={() => setOtherNames((current) => [...current, ""])}
            className={clsx("mt-3 min-h-11 rounded-full bg-journal-raised px-4 text-sm font-bold text-soft-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/25", slowOut)}
          >
            Add another tag
          </button>
        ) : null}
        <p className="mt-3 text-xs leading-normal text-warm-gray">Private labels, just for you. Never contacts, never shared.</p>
      </div>
    </>
  );
}

// Step 3: rhythm as a proper radio group (three big targets) plus the optional
// nudge toggle. "Once daily" stays available later in Settings; here it renders
// as Evenings so an existing preference still shows a checked option.
function RhythmStep({ value, onChange }: { value: ReminderPreferences; onChange: (value: ReminderPreferences) => void }) {
  const cadenceOptions: Array<{ id: RitualCadence; label: string; icon: typeof Moon }> = [
    { id: "evening", label: "Evenings", icon: Moon },
    { id: "morning_evening", label: "Mornings and evenings", icon: Sun },
    { id: "anytime", label: "Anytime it fits", icon: Sparkles }
  ];
  const displayCadence: RitualCadence = value.cadence === "once_daily" ? "evening" : value.cadence;
  const showMorning = displayCadence === "morning_evening";
  const showEvening = displayCadence === "evening" || displayCadence === "morning_evening";
  const nudgeTime = showEvening ? formatNudgeTime(value.eveningTime) : null;

  return (
    <>
      <h1 className="text-[1.5625rem] font-bold leading-[1.12] tracking-[-0.01em] text-ink">When&rsquo;s your moment?</h1>
      <p className="text-sm leading-normal text-warm-gray">The ritual works whenever — most people end the day with it.</p>

      <div role="radiogroup" aria-label="Rhythm" className="grid gap-2">
        {cadenceOptions.map((option) => {
          const active = displayCadence === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ ...value, cadence: option.id })}
              className={clsx(
                "flex min-h-[56px] items-center gap-3 rounded-card border-[1.5px] px-4 text-left text-[0.90625rem] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/25",
                slowOut,
                active ? "border-rose/40 bg-rose/5 text-rose" : "border-journal-line bg-journal-surface text-soft-ink hover:border-rose/30"
              )}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={2} />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-[18px] border border-journal-line bg-journal-surface p-4">
        <div className="flex-1">
          <p className="text-sm font-bold text-ink">{nudgeTime ? `A gentle nudge at ${nudgeTime}` : "A gentle nudge"}</p>
          <p className="mt-0.5 text-xs leading-normal text-warm-gray">Optional, easy to change. It reminds — it never nags.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.remindersEnabled}
          aria-label="Enable reminders"
          onClick={() => onChange({ ...value, remindersEnabled: !value.remindersEnabled })}
          className={clsx(
            "relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/25",
            slowOut,
            value.remindersEnabled ? "bg-leaf" : "bg-journal-line"
          )}
        >
          <span
            className={clsx(
              "inline-block h-6 w-6 transform rounded-full bg-white shadow transition motion-reduce:transition-none",
              value.remindersEnabled ? "translate-x-[23px]" : "translate-x-[3px]"
            )}
          />
        </button>
      </div>

      {value.remindersEnabled && (showMorning || showEvening) ? (
        <div className="grid gap-3 rounded-[18px] border border-journal-line bg-journal-surface p-4 sm:grid-cols-2">
          {showMorning ? (
            <label className="grid gap-1 text-[0.8125rem] font-bold text-soft-ink">
              Morning
              <input
                type="time"
                value={value.morningTime}
                onChange={(event) => onChange({ ...value, morningTime: event.target.value })}
                className="min-h-11 rounded-control border border-journal-line bg-journal-raised px-3 text-base font-normal text-ink outline-none focus:ring-4 focus:ring-rose/15"
              />
            </label>
          ) : null}
          {showEvening ? (
            <label className="grid gap-1 text-[0.8125rem] font-bold text-soft-ink">
              Evening
              <input
                type="time"
                value={value.eveningTime}
                onChange={(event) => onChange({ ...value, eveningTime: event.target.value })}
                className="min-h-11 rounded-control border border-journal-line bg-journal-raised px-3 text-base font-normal text-ink outline-none focus:ring-4 focus:ring-rose/15"
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// Step 4: the Simple/Full choice as a labeled radio group — two sizes of the
// same journal, never a demo vs the real thing. SPEC-7 semantics unchanged.
function ModeStep({ chosenMode, onChoose }: { chosenMode: ExperienceMode; onChoose: (mode: ExperienceMode) => void }) {
  const options: Array<{ id: ExperienceMode; title: string; text: string }> = [
    { id: "simple", title: "Simple", text: "A photo, three lines, done — about a minute a day." },
    { id: "full", title: "Full", text: "Adds mood, people tags, Little Details, a gratitude guide, Calendar, and Insights." }
  ];

  return (
    <>
      <h1 className="text-[1.5625rem] font-bold leading-[1.12] tracking-[-0.01em] text-ink">How much journal do you want?</h1>
      <p className="text-sm leading-normal text-warm-gray">Both keep the same journal. Switch anytime in Settings.</p>

      <div role="radiogroup" aria-label="Journal mode" className="grid gap-2.5">
        {options.map((option) => {
          const active = chosenMode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChoose(option.id)}
              className={clsx(
                "flex items-start gap-3 rounded-[18px] border-[1.5px] p-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/25",
                slowOut,
                active ? "border-rose/40 bg-rose/5" : "border-journal-line bg-journal-surface hover:border-rose/30"
              )}
            >
              <span
                aria-hidden="true"
                className={clsx("mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2", active ? "border-rose" : "border-ink/25")}
              >
                {active ? <span className="h-2.5 w-2.5 rounded-full bg-rose" /> : null}
              </span>
              <span>
                <span className="block text-base font-bold text-ink">{option.title}</span>
                <span className="mt-0.5 block text-[0.84375rem] leading-normal text-soft-ink">{option.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[0.8125rem] leading-normal text-warm-gray">Tonight becomes tomorrow&rsquo;s look-back.</p>
    </>
  );
}

function OnboardingNameField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1 text-[0.8125rem] font-bold text-soft-ink">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 rounded-control border border-journal-line bg-journal-raised px-3 text-base font-normal text-ink outline-none focus:ring-4 focus:ring-rose/15"
      />
    </label>
  );
}

// "21:00" → "9:00 pm". Null when the stored time isn't parseable.
function formatNudgeTime(time: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23) return null;
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}
