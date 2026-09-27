"use client";

import { useEffect, useState } from "react";
import { dateLocaleFromAppLocale } from "./format";

export function LocalDateTime({
  iso,
  locale,
  mode = "datetime",
}: {
  iso: string | null | undefined; // the date as an ISO-format string or can be empty
  locale: string;
  mode?: "datetime" | "time";
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) { setText("—"); return; } // if iso is empty/undefined, just show a dash
    const date = new Date(iso); // converts ISO string to JS Date object
    if (Number.isNaN(date.getTime())) { setText("—"); return; }

    const dateLocale = dateLocaleFromAppLocale(locale);
    setText(
      mode === "time"
        ? date.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : date.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    );
  }, [iso, locale, mode]);

  return <>{text ?? "…"}</>;
}