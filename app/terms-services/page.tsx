"use client";

import { useTranslations } from "next-intl";
import { SectionLabel } from "../components/duel/section-label";

const LAST_UPDATED = "22 September 2026";

export default function TermsScreen() {
  const t = useTranslations("TermsOfServices");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-7">
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
          <li>{t("section3Items.exploits")}</li>
          <li>{t("section3Items.coordinate")}</li>
          <li>{t("section3Items.access")}</li>
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
        <p>
          {t("section8")}{" "}
          <span className="font-mono text-[#4d86ff]">
            {t("email")}
          </span>
          *.
        </p>

        <p className="mt-2 text-[12px] text-[#5d6877]">
          {t("emailNote")}
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
  return (
    <header>
      <h1 className="text-[27px] font-bold tracking-[-.02em] text-[#eef2f8]">
        {t("title")}
      </h1>

      <p className="mt-2 text-[12.5px] text-[#5d6877]">
        {t("lastUpdated", { date: LAST_UPDATED })}
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
