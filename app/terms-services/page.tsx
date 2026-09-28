"use client";

import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";
import { SectionLabel } from "../components/duel/section-label";

const LAST_UPDATED = new Date("2026-09-28");

export default function TermsScreen() {
  const t = useTranslations("TermsOfServices");

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
        <p>{t("section1")}</p>
      </Section>

      <Section title={t("section2Title")}>
        <p>{t("section2")}</p>
      </Section>

      <Section title={t("section3Title")}>
        <p>{t("section3Intro")}</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>{t("section3Items.bots")}</li>
          <li>{t("section3Items.manipulate")}</li>
          <li>{t("section3Items.access")}</li>
          <li>{t("section3Items.interfere")}</li>
          <li>{t("section3Items.content")}</li>
          <li>{t("section3Items.illegal")}</li>
        </ul>
        <p className="mt-2">{t("section3Footer")}</p>
      </Section>

      <Section title={t("section4Title")}>
        <p>{t("section4")}</p>
      </Section>

      <Section title={t("section5Title")}>
        <p>{t("section5")}</p>
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
        <p>
          {t("section11")}{" "}
          <Link href="/privacy-policy" className="text-[#4d86ff] hover:underline">
            {t("section11Link")}
          </Link>
          .
        </p>
      </Section>

      <Section title={t("section12Title")}>
        <p>{t("section12")}</p>
      </Section>

      <Section title={t("section13Title")}>
        <p>{t("section13")}</p>
      </Section>

      <Section title={t("section14Title")}>
        <p>
          {t("section14")}{" "}
          <a
            href={`mailto:${t("email")}`}
            className="font-mono text-[#4d86ff] hover:underline"
          >
            {t("email")}
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function Hero({
  t,
}: {
  t: ReturnType<typeof useTranslations<"TermsOfServices">>;
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