"use client";

import type React from "react";
import Link from "next/link";

export function MessageScreen({
  badge,
  heading,
  children,
  actions,
}: {
  badge?: React.ReactNode;
  heading: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <CentredScreen>
      <div className="w-full max-w-md rounded-xl border border-white/[.07] bg-[#0f131b] p-8 text-center">
        {badge}
        <h1
          className={`text-[21px] font-bold tracking-[-.01em] ${badge === undefined ? "" : "mt-3.5"}`}
        >
          {heading}
        </h1>
        <p className="mt-2 text-[13px] text-[#9aa6b6]">{children}</p>
        {actions === undefined ? null : (
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">{actions}</div>
        )}
      </div>
    </CentredScreen>
  );
}

export function CentredScreen({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`flex flex-1 items-center justify-center px-5 py-5 ${className}`}>
      {children}
    </div>
  );
}

export function LoadingLine({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <CentredScreen>
      <p className="flex items-center gap-2.5 text-sm text-[#5d6877]">
        <span className="size-2 animate-pulse rounded-full bg-[#4d86ff]" />
        {children}
      </p>
    </CentredScreen>
  );
}

const TONE = {
  primary:
    "bg-[#4d86ff] text-white hover:brightness-110 focus-visible:outline-[#4d86ff]",
  secondary:
    "border border-white/[.1] bg-gray-800 text-[#eef2f8] hover:bg-gray-700 focus-visible:outline-[#4d86ff]",
} as const;

const SHARED =
  "flex items-center justify-center gap-2 rounded-[7px] px-4 py-2.5 text-[13.5px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export type ActionTone = keyof typeof TONE;

export function ActionLink({
  href,
  tone,
  className = "flex-1",
  children,
}: {
  href: string;
  tone: ActionTone;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} className={`${SHARED} ${TONE[tone]} ${className}`}>
      {children}
    </Link>
  );
}

export function ActionButton({
  onClick,
  tone,
  className = "flex-1",
  buttonRef,
  children,
}: {
  onClick: () => void;
  tone: ActionTone;
  className?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className={`${SHARED} ${TONE[tone]} cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}
