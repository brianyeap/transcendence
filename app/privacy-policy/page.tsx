"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { SectionLabel } from "../components/duel/section-label";

const LAST_UPDATED = new Date("2026-09-28");

export default function PrivacyScreen() {
  const t = useTranslations("PrivacyPolicy");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-7">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-[12.5px] text-[#4d86ff] hover:underline"
      >
        <span aria-hidden>←</span>
        {t("backToApp")}
      </Link>

      <Hero t={t} />

      <Section title={t("section1Title")}>
        <p>{t("section1Intro")}</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>{t("section1Items.account")}</li>
          <li>{t("section1Items.google")}</li>
          <li>{t("section1Items.profile")}</li>
          <li>{t("section1Items.social")}</li>
          <li>{t("section1Items.game")}</li>
          <li>{t("section1Items.technical")}</li>
          <li>{t("section1Items.support")}</li>
        </ul>
      </Section>

      <Section title={t("section2Title")}>
        <p>{t("section2")}</p>
      </Section>

      <Section title={t("section3Title")}>
        <p>{t("section3Intro")}</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>{t("section3Items.account")}</li>
          <li>{t("section3Items.play")}</li>
          <li>{t("section3Items.social")}</li>
          <li>{t("section3Items.support")}</li>
          <li>{t("section3Items.security")}</li>
          <li>{t("section3Items.legal")}</li>
        </ul>
      </Section>

      <Section title={t("section4Title")}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>{t("section4Items.players")}</li>
          <li>{t("section4Items.friends")}</li>
          <li>{t("section4Items.match")}</li>
          <li>{t("section4Items.sharing")}</li>
        </ul>
      </Section>

      <Section title={t("section5Title")}>
        <p>{t("section5Intro")}</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>{t("section5Items.supabase")}</li>
          <li>{t("section5Items.google")}</li>
          <li>{t("section5Items.coinbase")}</li>
          <li>{t("section5Items.vercel")}</li>
          <li>{t("section5Items.monitoring")}</li>
        </ul>
      </Section>

      <Section title={t("section6Title")}>
        <p>{t("section6")}</p>
      </Section>

      <Section title={t("section7Title")}>
        <p>{t("section7")}</p>
      </Section>

      <Section title={t("section8Title")}>
        <p>{t("section8")}</p>
      </Section>

      <Section title={t("section9Title")}>
        <p>{t("section9")}</p>
      </Section>

      <Section title={t("section10Title")}>
        <p>{t("section10")}</p>
      </Section>

      <Section title={t("section11Title")}>
        <p>{t("section11")}</p>
      </Section>

      <Section title={t("section12Title")}>
        <p>
          {t("section12")}{" "}
          <a
            href={`mailto:${t("email")}`}
            className="font-mono text-[#4d86ff] hover:underline">
            {t("email")}
		  </a>
          .
        </p>
        <p className="mt-2">{t("section12Note")}</p>
      </Section>
    </div>
  );
}

function Hero({
  t,
}: {
  t: ReturnType<typeof useTranslations<"PrivacyPolicy">>;
}) {
	const format = useFormatter();

  return (
    <header>
      <h1 className="text-[27px] font-bold tracking-[-.02em] text-[#eef2f8]">
        {t("title")}
      </h1>

      <p className="mt-2 text-[12.5px] text-[#5d6877]">
        {t("lastUpdated", {
			date: format.dateTime(LAST_UPDATED, {
				dateStyle: "long",
				timeZone: "UTC",
			})
		})}
      </p>

      <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[#9aa6b6]">
        {t("intro")}
      </p>
    </header>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <SectionLabel>{title}</SectionLabel>

      <div className="mt-3 rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3.5 text-[13px] leading-relaxed text-[#9aa6b6]">
        {children}
      </div>
    </section>
  );
}