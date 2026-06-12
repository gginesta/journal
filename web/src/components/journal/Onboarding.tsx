import { useState } from "react";
import clsx from "clsx";
import { ArrowRight, CheckCircle2, Clock3, Sparkles, X } from "lucide-react";
import type { JournalBootstrap, PersonTag, ReminderPreferences, RitualCadence } from "@/types/journal";
import {
  findPersonalizedPersonName,
  onboardingFocusOptions,
  splitFlexibleTags,
  type OnboardingFocus,
  type OnboardingSetup
} from "@/lib/onboarding";
import { shortDisplayName } from "@/components/journal/helpers";
import { SectionTitle } from "@/components/journal/shared";

type OnboardingStepKind = "welcome" | "people" | "reminders" | "payoff";

export function OnboardingOverlay({
  profile,
  people,
  mode,
  workspaceName,
  reminders,
  onComplete,
  onClose
}: {
  profile: JournalBootstrap["profile"];
  people: PersonTag[];
  mode: "setup" | "welcome-only";
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

  const welcomeStep = {
    kind: "welcome" as OnboardingStepKind,
    title: firstName === "there" ? "Welcome." : `Welcome, ${firstName}.`,
    heading: mode === "welcome-only" ? `You've joined ${workspaceName}.` : "This is a quiet place to keep one good moment from today.",
    body:
      mode === "welcome-only"
        ? "Everything here is already set up. The ritual is intentionally tiny: one photo or one line is enough to keep a day."
        : "We'll set this up together in under a minute. The ritual is intentionally tiny: one photo or one line is enough."
  };
  const payoffStep = {
    kind: "payoff" as OnboardingStepKind,
    title: "The payoff",
    heading: "Memory Lane starts sooner than you think.",
    body: "After a few kept days, the app brings back yesterday, last week, and one month ago, then three months and yearly moments as your archive grows."
  };

  const steps =
    mode === "welcome-only"
      ? [welcomeStep, payoffStep]
      : [
          welcomeStep,
          {
            kind: "people" as OnboardingStepKind,
            title: "Who is this for?",
            heading: "Let's make this yours.",
            body: "Add the people or themes you want to remember. These stay private — they just make memories searchable later, and you can change them anytime."
          },
          {
            kind: "reminders" as OnboardingStepKind,
            title: "A gentle nudge",
            heading: "Want a quiet reminder?",
            body: "Pick a rhythm that fits your day. It's completely optional, never naggy, and easy to change or turn off in Settings."
          },
          payoffStep
        ];
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
      reminders: reminderPrefs
    });
  }

  function next() {
    if (!isLastStep) {
      setStep((currentStep) => currentStep + 1);
      return;
    }
    finish();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-journal-surface sm:bg-ink/45 sm:px-4 sm:py-5 sm:backdrop-blur-md lg:items-center">
      <section className="min-h-dvh w-full max-w-full overflow-hidden bg-journal-surface shadow-none sm:min-h-0 sm:max-w-5xl sm:rounded-[32px] sm:shadow-photo">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid min-w-0 content-start gap-5 p-4 sm:p-8 lg:min-h-[640px] lg:content-between lg:gap-8 lg:p-10">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {steps.map((item, index) => (
                    <span
                      key={item.title}
                      className={clsx("h-2.5 rounded-full transition-all", index === step ? "w-9 bg-rose" : "w-2.5 bg-journal-line")}
                    />
                  ))}
                </div>
                <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-journal-raised text-warm-gray" aria-label="Close welcome">
                  <X aria-hidden="true" size={17} />
                </button>
              </div>

              <p className="mt-6 break-words text-[0.7rem] font-bold uppercase tracking-[0.12em] text-rose sm:mt-10 sm:text-sm">{current.title}</p>
              <h1 className="mt-3 max-w-2xl text-[2rem] font-bold leading-[1.04] tracking-normal text-ink sm:text-5xl">{current.heading}</h1>
              <p className="mt-4 max-w-xl text-[0.96rem] leading-6 text-warm-gray sm:text-base sm:leading-7">{current.body}</p>

              {current.kind === "people" ? (
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {onboardingFocusOptions.map((option) => {
                      const active = focus === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setFocus(option.id)}
                          aria-pressed={active}
                          className={clsx(
                            "rounded-[20px] border p-3 text-left transition sm:p-4",
                            active ? "border-rose/30 bg-rose/10" : "border-journal-line bg-white hover:border-rose/20"
                          )}
                        >
                          <span className="flex items-center gap-2 font-bold text-ink">
                            {active ? <CheckCircle2 aria-hidden="true" size={16} className="text-rose" /> : null}
                            {option.title}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-warm-gray">{option.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-[22px] border border-journal-line bg-white p-4">
                    <p className="font-bold text-soft-ink">{focus === "other" ? "What should we call these?" : "What should we call them?"}</p>
                    <p className="mt-1 text-sm leading-5 text-warm-gray">
                      {focus === "other" ? "Add people, places, projects, or themes. Commas work too." : "Leave anything blank — you can add or rename people anytime."}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                        className="mt-3 rounded-full bg-journal-raised px-4 py-2 text-sm font-bold text-soft-ink"
                      >
                        Add another child
                      </button>
                    ) : null}
                    {focus === "other" && otherNames.length < 5 ? (
                      <button
                        type="button"
                        onClick={() => setOtherNames((current) => [...current, ""])}
                        className="mt-3 rounded-full bg-journal-raised px-4 py-2 text-sm font-bold text-soft-ink"
                      >
                        Add another tag
                      </button>
                    ) : null}
                  </div>

                  <p className="text-sm leading-5 text-warm-gray">
                    Want to keep a journal together? You can create or join a shared household anytime in Settings.
                  </p>
                </div>
              ) : null}

              {current.kind === "reminders" ? (
                <OnboardingReminderStep value={reminderPrefs} onChange={setReminderPrefs} />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={next} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-rose px-5 text-sm font-bold text-white shadow-sm sm:min-h-12 sm:flex-none sm:text-base">
                {isLastStep ? (mode === "welcome-only" ? "Start today" : "Add your first memory") : "Continue"}
                <ArrowRight aria-hidden="true" size={17} />
              </button>
              <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-full bg-journal-raised px-5 text-sm font-bold text-warm-gray sm:min-h-12 sm:flex-none sm:text-base">
                Skip tour
              </button>
            </div>
          </div>

          <div className="min-w-0 bg-[linear-gradient(150deg,#f9ece6,#f7fbf2_48%,#fff7f1)] p-3 sm:p-8">
            {current.kind === "welcome" ? <OnboardingTodayPreview /> : null}
            {current.kind === "people" ? <OnboardingPeoplePreview focus={focus} meName={meName} partnerName={partnerName} childNames={childNames} otherNames={otherNames} /> : null}
            {current.kind === "reminders" ? <OnboardingTodayPreview /> : null}
            {current.kind === "payoff" ? <OnboardingMemoryPreview focus={focus} childNames={childNames} partnerName={partnerName} otherNames={otherNames} /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function OnboardingReminderStep({
  value,
  onChange
}: {
  value: ReminderPreferences;
  onChange: (value: ReminderPreferences) => void;
}) {
  const cadenceOptions: Array<{ id: RitualCadence; label: string }> = [
    { id: "evening", label: "Evening" },
    { id: "once_daily", label: "Once daily" },
    { id: "morning_evening", label: "Morning + evening" },
    { id: "anytime", label: "Anytime" }
  ];
  const showMorning = value.cadence === "morning_evening";
  const showEvening = value.cadence === "evening" || value.cadence === "once_daily" || value.cadence === "morning_evening";

  return (
    <div className="mt-5 grid gap-4">
      <label className="flex items-center justify-between gap-4 rounded-[22px] border border-journal-line bg-white p-4">
        <span>
          <span className="block font-bold text-soft-ink">Remind me to keep a moment</span>
          <span className="mt-1 block text-sm leading-5 text-warm-gray">A soft, optional nudge. No streaks lost, no guilt.</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={value.remindersEnabled}
          aria-label="Enable reminders"
          onClick={() => onChange({ ...value, remindersEnabled: !value.remindersEnabled })}
          className={clsx(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition",
            value.remindersEnabled ? "bg-rose" : "bg-journal-line"
          )}
        >
          <span className={clsx("inline-block h-5 w-5 transform rounded-full bg-white shadow transition", value.remindersEnabled ? "translate-x-6" : "translate-x-1")} />
        </button>
      </label>

      {value.remindersEnabled ? (
        <div className="rounded-[22px] border border-journal-line bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-bold text-soft-ink">
              Rhythm
              <select
                value={value.cadence}
                onChange={(event) => onChange({ ...value, cadence: event.target.value as RitualCadence })}
                className="min-h-11 rounded-2xl border border-journal-line bg-journal-raised px-3 font-normal outline-none focus:ring-4 focus:ring-rose/15"
              >
                {cadenceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {showMorning ? (
              <label className="grid gap-1 text-sm font-bold text-soft-ink">
                Morning
                <input
                  type="time"
                  value={value.morningTime}
                  onChange={(event) => onChange({ ...value, morningTime: event.target.value })}
                  className="min-h-11 rounded-2xl border border-journal-line bg-journal-raised px-3 font-normal outline-none focus:ring-4 focus:ring-rose/15"
                />
              </label>
            ) : null}
            {showEvening ? (
              <label className="grid gap-1 text-sm font-bold text-soft-ink">
                Evening
                <input
                  type="time"
                  value={value.eveningTime}
                  onChange={(event) => onChange({ ...value, eveningTime: event.target.value })}
                  className="min-h-11 rounded-2xl border border-journal-line bg-journal-raised px-3 font-normal outline-none focus:ring-4 focus:ring-rose/15"
                />
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
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
    <label className="grid gap-1 text-sm font-bold text-soft-ink">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 rounded-2xl border border-journal-line bg-journal-raised px-3 font-normal outline-none focus:ring-4 focus:ring-rose/15"
      />
    </label>
  );
}

function OnboardingTodayPreview() {
  return (
    <div className="grid h-full content-center gap-3 sm:gap-4">
      <div className="overflow-hidden rounded-[24px] bg-white shadow-sm sm:rounded-[30px]">
        <div className="grid min-h-44 content-end bg-[linear-gradient(135deg,#8da38e,#e6c392_54%,#70413c)] p-4 text-white sm:min-h-64 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em]">Photo of the day</p>
          <h2 className="mt-3 text-[1.45rem] font-bold leading-tight sm:text-2xl">One moment can hold the whole day.</h2>
        </div>
        <div className="grid gap-2 p-3 sm:gap-3 sm:p-5">
          {["A good cup of tea", "Sun on the walk home", "One kind text"].map((line, index) => (
            <div key={line} className="flex items-center gap-3 rounded-2xl bg-journal-raised p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose/10 text-sm font-bold text-rose">{index + 1}</span>
              <span className="text-sm font-semibold text-soft-ink">{line}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="rounded-[20px] bg-white/75 p-3 text-sm leading-6 text-warm-gray sm:rounded-[24px] sm:p-4">
        The first screen becomes much simpler when you know the rule: one good thing is already a complete entry.
      </p>
    </div>
  );
}

function OnboardingPeoplePreview({
  focus,
  meName,
  partnerName,
  childNames,
  otherNames
}: {
  focus: OnboardingFocus;
  meName: string;
  partnerName: string;
  childNames: string[];
  otherNames: string[];
}) {
  const examples: Record<OnboardingFocus, string[]> = {
    self: ["Morning run felt easier", "Finished the thing I kept delaying"],
    partner: ["A quiet coffee together", "Made each other laugh in the kitchen"],
    family: ["Still says 'lellow'", "Asked for the dinosaur spoon again"],
    other: ["A generous client note", "The blue door in Lisbon"]
  };
  const namedChildren = childNames.map((name) => name.trim()).filter(Boolean);
  const otherTags = splitFlexibleTags(otherNames);
  const chipsByFocus: Record<OnboardingFocus, string[]> = {
    self: [meName.trim() || "Me"],
    partner: [meName.trim() || "Me", partnerName.trim() || "Partner"],
    family: [meName.trim() || "Me", ...namedChildren, partnerName.trim() || "Partner", "Family"],
    other: otherTags.length > 0 ? otherTags : ["Friends", "Travel", "Work wins"]
  };
  const chips = chipsByFocus[focus];

  return (
    <div className="grid h-full content-center gap-4">
      <div className="rounded-[30px] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {chips.map((person, index) => (
            <span key={`${person}-${index}`} className={clsx("rounded-full px-3 py-2 text-xs font-bold", index === 1 || person === "Family" ? "bg-rose/10 text-rose" : "bg-journal-raised text-warm-gray")}>
              {person}
            </span>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {examples[focus].map((example) => (
            <div key={example} className="rounded-2xl bg-journal-raised p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose">Little detail</p>
              <p className="mt-2 font-semibold text-soft-ink">{example}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="rounded-[24px] bg-white/75 p-4 text-sm leading-6 text-warm-gray">
        Tags are private labels, not social sharing. They make memories searchable by the people woven into them.
      </p>
    </div>
  );
}

function OnboardingMemoryPreview({
  focus,
  childNames,
  partnerName,
  otherNames
}: {
  focus: OnboardingFocus;
  childNames: string[];
  partnerName: string;
  otherNames: string[];
}) {
  const childName = childNames.find((name) => name.trim())?.trim() || "someone little";
  const partner = partnerName.trim() || "your partner";
  const theme = splitFlexibleTags(otherNames)[0] ?? "a favorite thread";
  const memoriesByFocus: Record<OnboardingFocus, string[][]> = {
    self: [
      ["1 week ago", "A small win you might have already forgotten."],
      ["1 month ago", "Took the long walk and felt clear-headed after."],
      ["3 months ago", "Proof that ordinary good days have been adding up."]
    ],
    partner: [
      ["1 week ago", `A small exchange with ${partner} worth keeping.`],
      ["1 month ago", `A quiet coffee with ${partner} before the day got loud.`],
      ["3 months ago", "The kind of ordinary dinner worth finding again."]
    ],
    family: [
      ["1 week ago", `${childName} had a tiny phase you almost missed.`],
      ["1 month ago", `${childName} insisted the moon was following the car.`],
      ["3 months ago", "A family routine that already feels like a little era."]
    ],
    other: [
      ["1 week ago", `A recent thread from ${theme} that still matters.`],
      ["1 month ago", `A small note from ${theme} that made the day brighter.`],
      ["3 months ago", "A place, person, or project you almost forgot to write down."]
    ]
  };

  return (
    <div className="grid h-full content-center gap-4">
      <div className="rounded-[30px] bg-white p-5 shadow-sm">
        <SectionTitle icon={Clock3} title="Memory Lane" subtitle="A little window back to days like this one." />
        {memoriesByFocus[focus].map(([label, text]) => (
          <div key={label} className="mt-3 flex gap-3 rounded-2xl bg-journal-raised p-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-warm-gray">
              <Sparkles aria-hidden="true" size={18} />
            </span>
            <div>
              <p className="font-bold">{label}</p>
              <p className="mt-1 text-sm leading-5 text-soft-ink">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="rounded-[24px] bg-white/75 p-4 text-sm leading-6 text-warm-gray">
        This is the payoff: short look-backs begin within days, then become month, season, and anniversary moments over time.
      </p>
    </div>
  );
}
