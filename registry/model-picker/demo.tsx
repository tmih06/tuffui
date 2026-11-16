"use client";

import { ArrowUp, Image as ImageIcon, Plus } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/action-button";
import { Panel, Shell } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import { useMockRun, wait, type MockStep } from "@/registry/use-mock-run/use-mock-run";
import { ModelPicker, type ModelRequirement, type PickerModel } from "./model-picker";

const MODELS: PickerModel[] = [
  {
    id: "halo-3",
    name: "Halo 3",
    provider: "Northwind",
    speed: 64,
    price: { input: 5, output: 25 },
    context: 400_000,
    capabilities: ["vision", "tools", "reasoning"],
  },
  {
    id: "halo-3-mini",
    name: "Halo 3 Mini",
    provider: "Northwind",
    speed: 210,
    price: { input: 0.4, output: 1.6 },
    context: 200_000,
    capabilities: ["vision", "tools"],
  },
  {
    id: "vela",
    name: "Vela",
    provider: "Meridian",
    speed: 140,
    price: { input: 1.25, output: 5 },
    context: 256_000,
    capabilities: ["vision", "tools"],
  },
  {
    id: "vela-code",
    name: "Vela Code",
    provider: "Meridian",
    speed: 118,
    price: { input: 1.5, output: 6 },
    context: 256_000,
    capabilities: ["tools", "reasoning"],
  },
  {
    id: "flint-2",
    name: "Flint 2",
    provider: "Quarry",
    speed: 92,
    price: { input: 2, output: 8 },
    context: 1_000_000,
    capabilities: ["tools", "reasoning"],
  },
  {
    id: "flint-2-lite",
    name: "Flint 2 Lite",
    provider: "Quarry",
    speed: 340,
    price: { input: 0.1, output: 0.4 },
    context: 128_000,
    capabilities: ["tools"],
  },
  {
    id: "hollow-70b",
    name: "Hollow 70B",
    provider: "Hollow Labs",
    speed: 185,
    price: { input: 0.6, output: 0.6 },
    context: 64_000,
    capabilities: ["tools"],
  },
];

const REQUIRES: ModelRequirement[] = [
  { capability: "vision", reason: "can't read the 3 screenshots in this chat" },
];

const RECOMMENDED = {
  id: "vela",
  reason: "reads screenshots, ¼ the cost of Halo 3",
};

type State = { open: boolean; highlighted: string | null; value: string };

const to = (highlighted: string, delay: number): MockStep<State> => ({
  delay,
  apply: (s) => ({ ...s, highlighted }),
});

function script(): MockStep<State>[] {
  return [
    wait(700),
    { delay: 0, apply: (s) => ({ ...s, open: true, highlighted: "halo-3" }) },
    to("vela", 1000),
    to("halo-3", 1300),
    to("halo-3-mini", 800),
    to("vela", 800),
    to("vela-code", 800),
    to("flint-2", 900),
    to("vela-code", 1200),
    to("vela", 600),
    { delay: 1300, apply: (s) => ({ ...s, value: "vela", open: false }) },
  ];
}

export default function ModelPickerDemo({
  autoplay = true,
  thumbnail = false,
}: {
  variant?: string;
  autoplay?: boolean;
  thumbnail?: boolean;
}) {
  const { state, setState } = useMockRun<State>(
    autoplay
      ? { open: false, highlighted: null, value: "halo-3" }
      : { open: true, highlighted: "vela", value: "halo-3" },
    autoplay ? script() : [],
    { autoplay },
  );

  return (
    // Room above the composer for the panel, which opens upward.
    <div
      className={cn(
        "flex w-full max-w-xl flex-col justify-end",
        thumbnail ? "pt-[21rem]" : "pt-[19.5rem]",
      )}
    >
      <Shell>
        <Panel className="px-3.5 pt-3 pb-2.5">
          {!thumbnail && (
            <div className="mb-2.5 flex gap-1.5">
              {["checkout-1.png", "checkout-2.png", "checkout-3.png"].map((name) => (
                <span
                  key={name}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-foreground/[0.05] pr-2.5 pl-2 text-xs text-muted-foreground"
                >
                  <ImageIcon weight="fill" aria-hidden="true" className="size-3.5" />
                  {name}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm">
            Review the checkout flow in these screenshots and file an issue for anything
            broken.
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <IconButton
              icon={Plus}
              iconWeight="bold"
              label="Attach"
              className="-ml-1.5"
            />
            <ModelPicker
              models={MODELS}
              value={state.value}
              onValueChange={(value) => setState((s) => ({ ...s, value }))}
              open={state.open}
              onOpenChange={(open) => setState((s) => ({ ...s, open }))}
              highlighted={state.highlighted}
              onHighlightChange={(highlighted) =>
                setState((s) => ({ ...s, highlighted }))
              }
              recommended={RECOMMENDED}
              requires={REQUIRES}
              usage={{ input: 182_400, output: 9_350 }}
            />
            <IconButton
              icon={ArrowUp}
              iconWeight="bold"
              variant="primary"
              label="Send"
              className="ml-auto"
            />
          </div>
        </Panel>
      </Shell>
    </div>
  );
}
