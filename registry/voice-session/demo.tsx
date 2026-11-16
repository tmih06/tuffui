"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useMockRun, wait, type MockStep } from "@/registry/use-mock-run/use-mock-run";
import {
  VoiceSession,
  type VoiceActivity,
  type VoiceOption,
  type VoiceTurn,
} from "./voice-session";

const VOICES: VoiceOption[] = [
  { value: "ember", label: "Ember", hint: "warm" },
  { value: "slate", label: "Slate", hint: "calm" },
  { value: "juniper", label: "Juniper", hint: "bright" },
  { value: "basalt", label: "Basalt", hint: "low" },
];

const EARLIER: VoiceTurn[] = [
  {
    id: "t1",
    speaker: "agent",
    text: "Hi Maya, this is Wren from billing. What can I help with?",
  },
  {
    id: "t2",
    speaker: "user",
    text: "I was charged twice for the Pro plan this month.",
  },
];

const ANSWER =
  "I can see two charges of $24 on November 3. The second is a pending hold from your card update, and it usually drops off within five business days, so you won't need to do anything.";
/** Words Wren gets out before Maya talks over her. */
const CUT_AT = 21;
const BARGE = "Can you just refund it now? Rent comes out Friday.";
const FIX =
  "Of course. I've refunded the duplicate $24 to your Visa ending 4417. It should show up in three to five days.";

type State = { activity: VoiceActivity; turns: VoiceTurn[] };

const count = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** One step per word, with an uneven cadence like real speech. */
function speak(
  id: string,
  speaker: "user" | "agent",
  text: string,
  { upTo = count(text), pace = 210 } = {},
): MockStep<State>[] {
  const steps: MockStep<State>[] = [
    {
      delay: 0,
      apply: (s) => ({
        activity: speaker,
        turns: [...s.turns, { id, speaker, text, spoken: 0 }],
      }),
    },
  ];
  for (let w = 1; w <= upTo; w++) {
    steps.push({
      delay:
        pace +
        ((w * 7919) % 5) * 22 +
        (/[.,?]$/.test(text.split(" ")[w - 2] ?? "") ? 180 : 0),
      apply: (s) => ({
        ...s,
        turns: s.turns.map((t) => (t.id === id ? { ...t, spoken: w } : t)),
      }),
    });
  }
  return steps;
}

const finish = (id: string, patch: Partial<VoiceTurn> = {}): MockStep<State> => ({
  delay: 260,
  apply: (s) => ({
    ...s,
    turns: s.turns.map((t) => (t.id === id ? { ...t, spoken: undefined, ...patch } : t)),
  }),
});

const set = (activity: VoiceActivity, delay = 0): MockStep<State> => ({
  delay,
  apply: (s) => ({ ...s, activity }),
});

function script(): MockStep<State>[] {
  return [
    set("thinking", 600),
    wait(1100),
    ...speak("t3", "agent", ANSWER, { upTo: CUT_AT }),
    // Maya talks over Wren: the line is cut where it was and marked.
    {
      delay: 160,
      apply: (s) => ({
        activity: "user",
        turns: s.turns.map((t) =>
          t.id === "t3"
            ? {
                ...t,
                text: ANSWER.split(" ").slice(0, CUT_AT).join(" "),
                spoken: undefined,
                interrupted: true,
              }
            : t,
        ),
      }),
    },
    wait(120),
    ...speak("t4", "user", BARGE, { pace: 250 }),
    finish("t4"),
    set("thinking", 200),
    wait(1000),
    ...speak("t5", "agent", FIX),
    finish("t5"),
    set("listening", 100),
  ];
}

/** The barge-in moment, for the still thumbnail. */
const STILL: State = {
  activity: "user",
  turns: [
    ...EARLIER,
    {
      id: "t3",
      speaker: "agent",
      text: ANSWER.split(" ").slice(0, CUT_AT).join(" "),
      interrupted: true,
    },
    { id: "t4", speaker: "user", text: BARGE, spoken: 6 },
  ],
};

/** A believable speech envelope: syllables, phrase swells and short gaps. */
function speech(t: number, seed: number) {
  const syllable = Math.abs(Math.sin(t / 88 + seed));
  const phrase = 0.6 + 0.4 * Math.sin(t / 640 + seed * 2);
  const gap = Math.sin(t / 410 + seed * 3) > 0.88 ? 0.12 : 1;
  return Math.min(1, (0.2 + 0.8 * syllable) * phrase * gap + Math.random() * 0.08);
}

export default function VoiceSessionDemo({
  autoplay = true,
  thumbnail = false,
}: {
  variant?: string;
  autoplay?: boolean;
  thumbnail?: boolean;
}) {
  const { state } = useMockRun<State>(
    autoplay ? { activity: "listening", turns: EARLIER } : STILL,
    autoplay ? script() : [],
    { autoplay },
  );
  const [startedAt] = useState(() => Date.now() - 154_000);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);

  // The level source reads the latest activity without re-creating itself.
  const activity = useRef(state.activity);
  useLayoutEffect(() => {
    activity.current = state.activity;
  });
  const [getLevel] = useState(() => () => {
    const t = performance.now();
    const a = activity.current;
    if (a === "user") return speech(t, 1.7);
    if (a === "agent") return speech(t, 0.4) * 0.92;
    // Room noise on an open mic.
    return 0.12 + Math.random() * 0.1;
  });

  return (
    <VoiceSession
      agentName="Wren"
      title="Billing call"
      activity={state.activity}
      getLevel={getLevel}
      turns={thumbnail ? state.turns.slice(1) : state.turns}
      startedAt={startedAt}
      muted={muted}
      onMutedChange={setMuted}
      held={held}
      onHeldChange={setHeld}
      voices={VOICES}
      defaultVoice="ember"
      onEnd={() => {}}
    />
  );
}
