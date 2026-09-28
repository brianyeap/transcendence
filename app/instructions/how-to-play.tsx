"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionLabel } from "../components/duel/section-label";
import { ActionLink } from "../matches/[matchId]/message-screen";

export function HowToPlayScreen() {
  const t = useTranslations("HowToPlay");

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8 p-4 md:px-7 md:py-8">
      <Hero t={t} />
      <Flow t={t} />
      <Trading t={t} />
      <ScreenGuide t={t} />
      <Ending t={t} />
      <ReadyToPlay t={t} />
    </div>
  );
}

function Hero({
  t,
}: {
  t: ReturnType<typeof useTranslations<"HowToPlay">>;
}) {
  return (
    <header>
      <div className="-mx-4 mb-6 border-b border-line px-4 pb-4 md:-mx-7 md:mb-8 md:px-7">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-dim">{t("eyebrow")}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-ink">
          {t("title")}
        </h1>

        <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
          {t("intro")}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Fact
          icon={Users}
          label={t("facts.players")}
          value="2"
        />

        <Fact
          icon={Wallet}
          label={t("facts.startingCapital")}
          value={t("facts.startingCapitalValue")}
        />

        <Fact
          icon={Clock}
          label={t("facts.matchLength")}
          value={t("facts.matchLengthValue")}
        />

        <Fact
          icon={Trophy}
          label={t("facts.winsBy")}
          value={t("facts.winsByValue")}
        />
      </dl>
    </header>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] px-3.5 py-3">
      <Icon className="size-4 text-[#4d86ff]" />

      <dd className="mt-2 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
        {value}
      </dd>

      <dt className="mt-0.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
        {label}
      </dt>
    </div>
  );
}

function Flow({
  t,
}: {
  t: ReturnType<typeof useTranslations<"HowToPlay">>;
}) {
  const steps = [
    {
      title: t("flow.steps.createJoin.title"),
      detail: t("flow.steps.createJoin.detail"),
    },
    {
      title: t("flow.steps.countdown.title"),
      detail: t("flow.steps.countdown.detail"),
    },
    {
      title: t("flow.steps.live.title"),
      detail: t("flow.steps.live.detail"),
    },
    {
      title: t("flow.steps.settlement.title"),
      detail: t("flow.steps.settlement.detail"),
    },
  ];

  return (
    <section>
      <SectionLabel>{t("flow.title")}</SectionLabel>

      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-3.5 rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3.5"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#4d86ff]/30 font-mono text-[11px] font-semibold text-[#4d86ff]">
              {i + 1}
            </span>

            <div>
              <p className="text-[13.5px] font-semibold text-[#eef2f8]">
                {step.title}
              </p>

              <p className="mt-1 text-[12.5px] leading-relaxed text-[#9aa6b6]">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Trading({
  t,
}: {
  t: ReturnType<typeof useTranslations<"HowToPlay">>;
}) {
  return (
    <section>
      <SectionLabel>{t("trading.title")}</SectionLabel>

      <p className="mt-3 text-[13px] leading-relaxed text-[#9aa6b6]">
        {t("trading.intro")}
      </p>

      <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
        <SideCard
          icon={ArrowUpRight}
          side={t("trading.long.label")}
          tone="up"
          detail={t("trading.long.detail")}
        />

        <SideCard
          icon={ArrowDownRight}
          side={t("trading.short.label")}
          tone="down"
          detail={t("trading.short.detail")}
        />
      </div>

      <div className="mt-3.5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-4 py-3.5">
        <p className="text-[12.5px] font-semibold text-[#eef2f8]">
          {t("trading.positionTitle")}
        </p>

        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9aa6b6]">
          {t("trading.positionDetail")}
        </p>

        <p className="mt-2 font-mono text-[12px] text-[#5d6877]">
          {t("trading.positionExample")}
        </p>
      </div>
    </section>
  );
}

function SideCard({
  icon: Icon,
  side,
  tone,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  side: string;
  tone: "up" | "down";
  detail: string;
}) {
  const color = tone === "up" ? "#1fcb83" : "#f6485d";

  return (
    <div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3.5">
      <span
        className="inline-flex items-center gap-1.5 text-[13.5px] font-bold"
        style={{ color }}
      >
        <Icon className="size-4" />
        {side}
      </span>

      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9aa6b6]">
        {detail}
      </p>
    </div>
  );
}

function ScreenGuide({
  t,
}: {
  t: ReturnType<typeof useTranslations<"HowToPlay">>;
}) {
  const items = [
    {
      label: t("screenGuide.priceTimer.label"),
      detail: t("screenGuide.priceTimer.detail"),
    },
    {
      label: t("screenGuide.capital.label"),
      detail: t("screenGuide.capital.detail"),
    },
    {
      label: t("screenGuide.exposure.label"),
      detail: t("screenGuide.exposure.detail"),
    },
    {
      label: t("screenGuide.opponent.label"),
      detail: t("screenGuide.opponent.detail"),
    },
  ];

  return (
    <section>
      <SectionLabel>{t("screenGuide.title")}</SectionLabel>

      <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3.5"
          >
            <dt className="text-[12.5px] font-semibold text-[#eef2f8]">
              {item.label}
            </dt>

            <dd className="mt-1 text-[12px] leading-relaxed text-[#9aa6b6]">
              {item.detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Ending({
  t,
}: {
  t: ReturnType<typeof useTranslations<"HowToPlay">>;
}) {
  return (
    <section>
      <SectionLabel>{t("ending.title")}</SectionLabel>

      <p className="mt-3 text-[13px] leading-relaxed text-[#9aa6b6]">
        {t("ending.detail")}
      </p>
    </section>
  );
}

function ReadyToPlay({
  t,
}: {
  t: ReturnType<typeof useTranslations<"HowToPlay">>;
}) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-[#0f131b] p-5 text-center">
      <p className="text-[14px] font-semibold text-[#eef2f8]">
        {t("ready.title")}
      </p>

      <p className="mt-1 text-[12.5px] text-[#9aa6b6]">
        {t("ready.detail")}
      </p>

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <ActionLink href="/" tone="primary" className="sm:w-40">
          {t("ready.button")}
        </ActionLink>
      </div>
    </div>
  );
}
