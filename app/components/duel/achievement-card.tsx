"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

//  The accent of an achievement: which Tailwind colour family paints the
//  unlocked state, plus the tier key in the "profile.tiers" messages and the
//  hex used for the tier chip text (the "[#eef2f8]" / "[#9aa6b6]" trick has to
//  stay a literal class string for Tailwind's scanner to pick it up).
export type AchievementAccent = {
  chip: string;        // tier chip when unlocked, e.g. "border-orange-500/30 text-orange-400 bg-orange-500/10"
  chipLocked: string;  // tier chip when locked, e.g. "border-gray-700 text-gray-500 bg-gray-800/20"
  card: string;        // card border/background/glow when unlocked
  cardLocked: string;  // card border/background when locked
  iconBox: string;     // icon container when unlocked
  iconBoxLocked: string;
  badge: string;       // "Unlocked" badge colours
  unlockedTitle: string; // literal class, e.g. "!text-[#eef2f8]"
  lockedTitle: string;   // literal class, e.g. "!text-[#9aa6b6]"
  ring: string;          // mobile collapsed badge overlay border/text
  glow?: string;         // extra class on the icon container when unlocked (chest glow)
};

export const ACCENTS = {
  orange: {
    chip: "border-orange-500/30 text-orange-400 bg-orange-500/10",
    chipLocked: "border-gray-700 text-gray-500 bg-gray-800/20",
    card: "bg-orange-500/[0.03] border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]",
    cardLocked: "bg-white/[0.01] border-white/5",
    iconBox: "bg-orange-500/10 border-orange-500/30",
    iconBoxLocked: "bg-white/[0.02] border-white/10 grayscale opacity-60",
    badge: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    unlockedTitle: "!text-[#eef2f8]",
    lockedTitle: "!text-[#9aa6b6]",
    ring: "border-orange-500/30 text-orange-400 bg-orange-500/20",
  },
  bronze: {
    chip: "border-amber-600/30 text-amber-500 bg-amber-600/10",
    chipLocked: "border-gray-700 text-gray-500 bg-gray-800/20",
    card: "bg-amber-600/[0.03] border-amber-600/30 shadow-[0_0_15px_rgba(217,119,6,0.1)]",
    cardLocked: "bg-white/[0.01] border-white/5",
    iconBox: "bg-amber-600/10 border-amber-600/30",
    iconBoxLocked: "bg-white/[0.02] border-white/10 grayscale opacity-60",
    badge: "text-amber-500 bg-amber-600/10 border-amber-600/20",
    unlockedTitle: "!text-[#eef2f8]",
    lockedTitle: "!text-[#9aa6b6]",
    ring: "border-amber-600/30 text-amber-500 bg-amber-600/20",
  },
  silver: {
    chip: "border-slate-500/30 text-slate-300 bg-slate-500/10",
    chipLocked: "border-gray-700 text-gray-500 bg-gray-800/20",
    card: "bg-slate-500/[0.03] border-slate-500/30 shadow-[0_0_15px_rgba(148,163,184,0.1)]",
    cardLocked: "bg-white/[0.01] border-white/5",
    iconBox: "bg-slate-500/10 border-slate-500/30",
    iconBoxLocked: "bg-white/[0.02] border-white/10 grayscale opacity-60",
    badge: "text-slate-300 bg-slate-500/10 border-slate-500/20",
    unlockedTitle: "!text-[#eef2f8]",
    lockedTitle: "!text-[#9aa6b6]",
    ring: "border-slate-500/30 text-slate-300 bg-slate-500/20",
  },
  emerald: {
    chip: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    chipLocked: "border-gray-700 text-gray-500 bg-gray-800/20",
    card: "bg-emerald-500/[0.04] border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    cardLocked: "bg-white/[0.01] border-white/5",
    iconBox: "bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]",
    iconBoxLocked: "bg-white/[0.02] border-white/10 grayscale opacity-60",
    badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    unlockedTitle: "!text-[#eef2f8]",
    lockedTitle: "!text-[#9aa6b6]",
    ring: "border-emerald-500/30 text-emerald-400 bg-emerald-500/20",
  },
  amber: {
    chip: "border-amber-500/30 text-amber-400 bg-amber-500/10",
    chipLocked: "border-gray-700 text-gray-500 bg-gray-800/20",
    card: "bg-amber-500/[0.04] border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    cardLocked: "bg-white/[0.01] border-white/5",
    iconBox: "bg-amber-500/10 border-amber-500/30 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]",
    iconBoxLocked: "bg-white/[0.02] border-white/10 grayscale opacity-60",
    badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    unlockedTitle: "!text-[#eef2f8]",
    lockedTitle: "!text-[#9aa6b6]",
    ring: "border-amber-500/30 text-amber-400 bg-amber-500/20",
  },
  yellow: {
    chip: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
    chipLocked: "border-gray-700 text-gray-500 bg-gray-800/20",
    card: "bg-yellow-500/[0.04] border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)]",
    cardLocked: "bg-white/[0.01] border-white/5",
    iconBox: "bg-yellow-500/10 border-yellow-500/30",
    iconBoxLocked: "bg-white/[0.02] border-white/10 grayscale opacity-60",
    badge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    unlockedTitle: "!text-[#eef2f8]",
    lockedTitle: "!text-[#9aa6b6]",
    ring: "border-yellow-500/30 text-yellow-400 bg-yellow-500/20",
    glow: "animate-chest-glow",
  },
} satisfies Record<string, AchievementAccent>;

export type AchievementAccentName = keyof typeof ACCENTS;

export function AchievementCard({
  icon,
  name,
  description,
  tier,
  requirement,
  wins,
  unlocked,
  accent,
}: {
  icon: (props: { unlocked: boolean }) => React.ReactNode;
  name: string;
  description: string;
  tier: string;
  requirement: number;
  wins: number;
  unlocked: boolean;
  accent: AchievementAccentName;
}) {
  //  Mobile only: phones show icon + title by default, and tapping the card
  //  reveals the description. On sm+ the card is always expanded, so this
  //  state simply has no effect (see the `sm:` classes below).
  const [open, setOpen] = useState(false);
  const t = useTranslations("profile");
  const a = ACCENTS[accent];

  const winsLeft = Math.max(requirement - wins, 0);

  //  It is a <button> only so phones can tap it open. On sm+ tapping does
  //  nothing, so `sm:cursor-default!` drops the pointer cursor there. The `!`
  //  is needed because globals.css gives every button `cursor: pointer`.
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen((wasOpen) => !wasOpen)}
      className={`flex flex-col gap-3 rounded-lg border p-4 text-left transition-all duration-300 sm:cursor-default! sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 ${
        unlocked ? a.card : a.cardLocked
      }`}
    >
      {/* ---------- Top row: icon + title (never pushed out of shape) ---------- */}
      <div className="flex min-w-0 items-center gap-4">
        {/* ICON CONTAINER
            - shrink-0: the icon keeps its size, the text is what gives way
            - unlocked/grayscale styling is unchanged from the old cards */}
        <div
          aria-hidden="true"
          className={`relative shrink-0 overflow-visible rounded-lg border p-2.5 ${
            unlocked ? `${a.iconBox} ${"glow" in a ? a.glow : ""}` : a.iconBoxLocked
          }`}
        >
          {icon({ unlocked })}

          {/* Mobile collapsed state: the badge lives as a corner overlay on the
              icon, so it can never compete with the title for horizontal space.
              sm+ puts the badge back inline on the right. */}
          <span
            className={`absolute -right-2 -top-2 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold leading-none sm:hidden ${
              unlocked ? a.ring : "border-white/10 text-gray-500 bg-[#0a0c10]"
            }`}
          >
            {unlocked ? t("unlockedShort") : `${winsLeft}${t("lockedShort")}`}
          </span>
        </div>

        {/* TITLE & TIER & DESCRIPTION
            - min-w-0: lets this flex child shrink below its content width
            - truncate: long names ellipsize instead of pushing the layout */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h3
              className={`min-w-0 truncate font-semibold text-sm sm:text-base ${
                unlocked ? a.unlockedTitle : a.lockedTitle
              }`}
            >
              {name}
            </h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                unlocked ? a.chip : a.chipLocked
              }`}
            >
              {tier}
            </span>
          </div>

          {/* Description: collapsed on phones until the card is tapped,
              always visible from sm upwards. */}
          <p
            className={`line-clamp-2 text-xs text-gray-400 sm:mt-0.5 ${
              open ? "mt-1.5 block" : "hidden sm:block"
            }`}
          >
            {description}
          </p>
        </div>
      </div>

      {/* ---------- Badge row ----------
          On mobile it is a status line under a dividing rule (the card itself is
          what gets tapped, so this stays non-interactive text). From sm up it
          collapses back to a right-aligned inline pill — the same split RoomCard
          uses for its action row. */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
        {unlocked ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${a.badge}`}
          >
            {t("unlocked")}
          </span>
        ) : (
          <span className="rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1 font-mono text-xs text-gray-500">
            {t("winsLeft", { count: winsLeft })}
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Icon renderers. They are plain SVG, so they move with the card now that the
// card is a client component — profile/page.tsx stays a server component.
// ---------------------------------------------------------------------------

// Box 1: Special Fire
export function fireIcon({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) {
    return (
      <svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-8 h-8">
      {/* Animated glowy thinggy particles */}
      <span className="absolute -top-1 left-2 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ember-1 pointer-events-none" />
      <span className="absolute -top-2 right-2 w-1 h-1 bg-orange-500 rounded-full animate-ember-2 pointer-events-none" />
      <span className="absolute -top-1.5 left-4 w-1 h-1 bg-yellow-300 rounded-full animate-ember-3 pointer-events-none" />

      {/* Glowing Orange flame */}
      <svg className="w-7 h-7 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" viewBox="0 0 24 24" fill="none">
        <path
          d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
          className="fill-gradient"
          fill="url(#flameGradient)"
        />
        <defs>
          <linearGradient id="flameGradient" x1="12" y1="2" x2="12" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Box 2: Bronze Medal (5 Wins)
export function bronzeMedalIcon({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) {
    return (
      <svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-9 h-9">
      {/* DUAL SPARKLE STAR ANIMATION (Using existing animate-medal-sparkle) */}
      {/* Star 1: Top-Right (Larger) */}
      <div className="absolute -top-0.0 -right-0.5 w-3.5 h-3.5 animate-medal-sparkle pointer-events-none z-10">
        <svg viewBox="0 0 24 24" fill="#fbbf24" className="w-full h-full drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </div>

      {/* Star 2: Bottom-Left (Smaller with 1s delay for asynchronous sparkle) */}
      <div className="absolute bottom-[-0px] -left-[1px] w-2.5 h-2.5 animate-ember-2 [animation-delay:700ms] pointer-events-none z-10">
        <svg viewBox="0 0 24 24" fill="#f59e0b" className="w-full h-full drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </div>

      {/* METALLIC BRONZE MEDAL SVG */}
      <svg className="w-8 h-8 drop-shadow-[0_4px_12px_rgba(180,83,9,0.45)]" viewBox="0 0 24 24" fill="none">
        {/* WIDER FLAT BLUE RIBBON WITH DARK NAVY STRIPES */}
        <path d="M5 1.5 L8.5 11 H15.5 L19 1.5 Z" fill="url(#blueRibbonBase)" stroke="#1e3a8a" strokeWidth="0.5" strokeLinejoin="miter" />
        <path d="M7.5 1.5 L10 11 H11 L9 1.5 Z" fill="#0f172a" opacity="0.6" />
        <path d="M16.5 1.5 L14 11 H13 L15 1.5 Z" fill="#0f172a" opacity="0.6" />
        <path d="M11.5 1.5 L11.8 11 H12.2 L12.5 1.5 Z" fill="#0f172a" opacity="0.4" />

        {/* OUTER BRONZE MEDAL RIM */}
        <circle cx="12" cy="15.5" r="6.5" fill="url(#trueBronzeGradient)" stroke="#f97316" strokeWidth="0.5" />
        <circle cx="12" cy="15.5" r="5.8" fill="none" stroke="#451a03" strokeWidth="0.5" opacity="0.6" />

        {/* INNER DOTTED BRONZE RING DETAIL */}
        <circle cx="12" cy="15.5" r="4.6" fill="none" stroke="#7c2d12" strokeWidth="0.65" strokeDasharray="1 1" />

        {/* EMBOSSED BRONZE CENTER STAR */}
        <path d="M12 12.2L12.8 14.1L14.8 14.3L13.3 15.7L13.7 17.7L12 16.6L10.3 17.7L10.7 15.7L9.2 14.3L11.2 14.1L12 12.2Z" fill="#451a03" />

        {/* GRADIENT DEFINITIONS */}
        <defs>
          <linearGradient id="trueBronzeGradient" x1="6" y1="9" x2="18" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="45%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
          <linearGradient id="blueRibbonBase" x1="12" y1="1.5" x2="12" y2="11" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}// Box 3: Silver Medal (10 Wins)
export function silverMedalIcon({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) {
    return (
      <svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-9 h-9">
      {/* DUAL SPARKLE STAR ANIMATION */}
      {/* Star 1: Top-Right (Cool White / Silver Sparkle) */}
      <div className="absolute top-[7px] -right-[1px] w-3.5 h-3.5 animate-medal-sparkle pointer-events-none z-10">
        <svg viewBox="0 0 24 24" fill="#f8fafc" className="w-full h-full drop-shadow-[0_0_6px_rgba(248,250,252,0.9)]">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </div>

      {/* Star 2: Bottom-Left (Cyan-Tinted Sparkle with emberTwo drift) */}
      <div className="absolute bottom-[-0px] -left-[1px] w-2.5 h-2.5 animate-ember-2 [animation-delay:700ms] pointer-events-none z-10">
        <svg viewBox="0 0 24 24" fill="#38bdf8" className="w-full h-full drop-shadow-[0_0_4px_rgba(56,189,248,0.8)]">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </div>

      {/* METALLIC SILVER MEDAL SVG */}
      <svg className="w-8 h-8 drop-shadow-[0_4px_12px_rgba(148,163,184,0.45)]" viewBox="0 0 24 24" fill="none">
        {/* WIDER FLAT RED/CRIMSON RIBBON WITH DARK STRIPES */}
        <path d="M5 1.5 L8.5 11 H15.5 L19 1.5 Z" fill="url(#silverRibbonBase)" stroke="#991b1b" strokeWidth="0.5" strokeLinejoin="miter" />
        <path d="M7.5 1.5 L10 11 H11 L9 1.5 Z" fill="#450a0a" opacity="0.6" />
        <path d="M16.5 1.5 L14 11 H13 L15 1.5 Z" fill="#450a0a" opacity="0.6" />
        <path d="M11.5 1.5 L11.8 11 H12.2 L12.5 1.5 Z" fill="#450a0a" opacity="0.4" />

        {/* OUTER SILVER MEDAL RIM */}
        <circle cx="12" cy="15.5" r="6.5" fill="url(#trueSilverGradient)" stroke="#e2e8f0" strokeWidth="0.5" />
        <circle cx="12" cy="15.5" r="5.8" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />

        {/* INNER DOTTED SILVER RING DETAIL */}
        <circle cx="12" cy="15.5" r="4.6" fill="none" stroke="#475569" strokeWidth="0.65" strokeDasharray="1 1" />

        {/* EMBOSSED SILVER CENTER STAR */}
        <path d="M12 12.2L12.8 14.1L14.8 14.3L13.3 15.7L13.7 17.7L12 16.6L10.3 17.7L10.7 15.7L9.2 14.3L11.2 14.1L12 12.2Z" fill="#334155" />

        {/* GRADIENT DEFINITIONS */}
        <defs>
          {/* Authentic Metallic Silver Gradient */}
          <linearGradient id="trueSilverGradient" x1="6" y1="9" x2="18" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Deep Red Ribbon Gradient */}
          <linearGradient id="silverRibbonBase" x1="5" y1="1.5" x2="19" y2="11" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Box 4: Official 42 Geometric Logo (Traced from actual logo — pixel-accurate)
export function fortyTwoIcon({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) {
    return (
      <svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-9 h-9">
      {/* 42 BLUE ELECTRIC GLOW AURA */}
      <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md animate-pulse pointer-events-none" />

      {/* EXACT 42 SVG — traced from the real logo, viewBox matches its true 840x590 proportions */}
      <svg className="w-8 h-8 drop-shadow-[0_0_10px_rgba(6,182,212,0.7)] z-10 overflow-visible" viewBox="0 0 840 590" fill="none">

        {/* --- "4" --- */}
        <path
          d="M463 0 L309 0 L0 310 L0 434 L309 434 L309 589 L463 589 L463 310 L154 310 Z"
          fill="url(#official42Gradient)"
        />

        {/* --- "2" (main Z-body + the two corner wedges that create the faceted cut look) --- */}
        <path
          d="M839 0 L685 0 L685 155 L531 310 L531 464 L685 464 L685 310 L839 155 Z
             M685 0 L531 0 L531 155 Z
             M839 310 L685 464 L839 464 Z"
          fill="url(#official42Gradient)"
        />

        {/* SHORT CIRCUIT 1: leftmost edge of "4" (its true extremity is the vertical edge at x=0, y 310–434) */}
        <g className="animate-short-circuit-1">
          <path d="M0 372 L-70 322 M0 372 L-100 372 M0 372 L-70 422" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" />
          <circle cx="0" cy="372" r="18" fill="#ffffff" />
        </g>

        {/* SHORT CIRCUIT 2: top-right corner of "2" — a genuine sharp vertex at (839, 0) */}
        <g className="animate-short-circuit-2">
          <path d="M839 0 L909 -70 M839 0 L939 0 M839 0 L889 84" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" />
          <circle cx="839" cy="0" r="18" fill="#ffffff" />
        </g>

        {/* GRADIENT DEFINITIONS */}
        <defs>
          <linearGradient id="official42Gradient" x1="0" y1="0" x2="840" y2="590" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Box 5: Floating Bitcoin Icon for Achievement 5.
export function bitcoinIcon({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) {
    return (
      <svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }

  // Coin geometry — change these two and everything else recalculates
  const SIZE = 32;      // coin diameter in px (matches w-8/h-8)
  const THICKNESS = 7;  // how chunky the rim is — bump this up for an even thicker coin
  const SEGMENTS = 16;  // rim slices — more = smoother curve, more DOM nodes
  const RADIUS = SIZE / 2;
  const angleStep = 360 / SEGMENTS;
  // chord length of each flat slice, padded slightly so slices overlap and hide seams
  const segmentWidth = 2 * RADIUS * Math.sin(Math.PI / SEGMENTS) * 1.2;

  const CoinFace = () => (
    <svg className="w-8 h-8 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="46" fill="url(#bitcoinGoldGradient)" stroke="#fde68a" strokeWidth="3" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#78350f" strokeWidth="1.5" opacity="0.5" />
      <circle cx="50" cy="50" r="39" stroke="#78350f" strokeWidth="1.5" strokeDasharray="3 2.5" opacity="0.55" />
      <circle cx="50" cy="50" r="34" stroke="#fde68a" strokeWidth="1" strokeDasharray="1 3" opacity="0.4" />

      <path
        d="M38 22 H57 C65 22 71 27 71 35 C71 41 67 45 61 46 C68 48 73 53 73 60 C73 69 66 76 56 76 H38 V22 Z
            M47 30 V43 H56 C61 43 63 40 63 36 C63 32 61 30 56 30 H47 Z
            M47 50 V68 H57 C63 68 65 64 65 59 C65 54 63 50 57 50 H47 Z"
        fill="#fffbeb"
      />
      <path d="M50 10 V19 M50 79 V88" stroke="#fffbeb" strokeWidth="3.5" strokeLinecap="round" />

      <defs>
        <linearGradient id="bitcoinGoldGradient" x1="10" y1="5" x2="95" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
    </svg>
  );

  return (
    <div className="relative flex items-center justify-center w-9 h-9 animate-float" style={{ perspective: "600px" }}>
      {/* Glow — now phase-locked to the same 3s cycle as the bounce, peaking at the bottom */}
      <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-md animate-coin-glow pointer-events-none" />

      {/* The 3D coin — front face, back face, and a rim built from thin slices */}
      <div
        className="coin-stage relative animate-coin-revolve z-10"
        style={{ width: SIZE, height: SIZE }}
      >
        {/* FRONT */}
        <div className="coin-face" style={{ transform: `translateZ(${THICKNESS / 2}px)` }}>
          <CoinFace />
        </div>

        {/* BACK — flipped 180° so it lands facing the opposite way, mirrored to read correctly */}
        <div
          className="coin-face"
          style={{ transform: `rotateY(180deg) translateZ(${THICKNESS / 2}px)` }}
        >
          <CoinFace />
        </div>

        {/* RIM — a ring of flat slices standing between the two faces */}
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <div
            key={i}
            className="coin-edge-segment"
            style={{
              width: segmentWidth,
              height: THICKNESS,
              marginLeft: -segmentWidth / 2,
              marginTop: -THICKNESS / 2,
              transform: `rotateZ(${i * angleStep}deg) rotateX(90deg) translateZ(${RADIUS}px)`,
              background: i % 2 === 0 ? "#d97706" : "#92400e", // alternating tone = milled-edge look
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Box 6: Treasure Chest (Tycoon / Ultimate Wealth)
export function treasureChestIcon({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) {
    return (
      <svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }

  return (
    <div className={`relative w-10 h-10 ${unlocked ? "" : "opacity-50 grayscale"}`}>
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <defs>
          <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#713f12" />
          </linearGradient>
          <linearGradient id="woodLid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#5c2808" />
          </linearGradient>
          <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="55%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          <radialGradient id="coinGrad" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="55%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>
        </defs>

        {/* LID — open dome */}
        <path d="M7 22 A17 14 0 0 1 41 22 Z" fill="url(#woodLid)" />
        <path d="M15 22 A9 9.5 0 0 1 33 22" fill="none" stroke="#292524" strokeWidth="2.6" />
        <path d="M24 8.2 V22" stroke="#292524" strokeWidth="2.6" />
        <path d="M7 22 A17 14 0 0 1 41 22" fill="none" stroke="#eab308" strokeWidth="1" opacity="0.7" />

        {/* dark interior */}
        <rect x="7" y="20.5" width="34" height="3" rx="1.5" fill="#1c0a02" />

        {/* coin pile spilling out */}
        <g stroke="#a16207" strokeWidth="0.6">
          <circle cx="12"   cy="19.5" r="2.6" fill="url(#coinGrad)" />
          <circle cx="17"   cy="18.6" r="2.8" fill="url(#coinGrad)" />
          <circle cx="22.5" cy="18"   r="3"   fill="url(#coinGrad)" />
          <circle cx="28"   cy="18.4" r="2.9" fill="url(#coinGrad)" />
          <circle cx="33"   cy="19.2" r="2.7" fill="url(#coinGrad)" />
          <circle cx="37"   cy="20.4" r="2.2" fill="url(#coinGrad)" />
          <circle cx="14.5" cy="21"   r="2.4" fill="url(#coinGrad)" />
          <circle cx="20"   cy="21.4" r="2.3" fill="url(#coinGrad)" />
          <circle cx="24"   cy="20.6" r="2.7" fill="url(#coinGrad)" />
          <circle cx="30.5" cy="21.2" r="2.4" fill="url(#coinGrad)" />
        </g>

        {/* chest body */}
        <rect x="6" y="22" width="36" height="17" rx="2.5" fill="url(#wood)" />
        <line x1="6" y1="28"   x2="42" y2="28"   stroke="#5c2808" strokeWidth="0.8" opacity="0.8" />
        <line x1="6" y1="33.5" x2="42" y2="33.5" stroke="#5c2808" strokeWidth="0.8" opacity="0.8" />

        {/* metal bands + rivets */}
        <rect x="10.5" y="22" width="4" height="17" fill="#292524" />
        <rect x="33.5" y="22" width="4" height="17" fill="#292524" />
        <g fill="#57534e">
          <circle cx="12.5" cy="25"   r="0.7" /><circle cx="12.5" cy="30.5" r="0.7" /><circle cx="12.5" cy="36" r="0.7" />
          <circle cx="35.5" cy="25"   r="0.7" /><circle cx="35.5" cy="30.5" r="0.7" /><circle cx="35.5" cy="36" r="0.7" />
        </g>

        {/* gold rim + lock */}
        <rect x="6" y="21.4" width="36" height="2.6" rx="1.3" fill="url(#brass)" />
        <rect x="20.6" y="24.5" width="6.8" height="7.5" rx="1.2" fill="url(#brass)" stroke="#a16207" strokeWidth="0.6" />
        <circle cx="24" cy="27.2" r="1.3" fill="#713f12" />
        <rect x="23.5" y="27.2" width="1" height="2.6" fill="#713f12" />
      </svg>

      {/* ✦ sparkles */}
      {unlocked && (
        <>
          <span className="sparkle animate-coin-shine-1" style={{ top: "-8%", left: "2%" }}>✦</span>
          <span className="sparkle animate-coin-shine-2" style={{ top: "36%", right: "-12%" }}>✦</span>
        </>
      )}

      {/* falling coins */}
      {unlocked && (
        <>
          <span className="falling-coin fc-1" style={{ left: "18%", top: "88%" }} />
          <span className="falling-coin fc-2" style={{ left: "48%", top: "94%" }} />
          <span className="falling-coin fc-3" style={{ left: "74%", top: "86%" }} />
        </>
      )}
    </div>
  );
}