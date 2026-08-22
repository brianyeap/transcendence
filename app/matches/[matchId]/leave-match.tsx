"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionButton } from "./message-screen";

export function LeaveMatch({
  needsConfirm,
  className = "",
}: {
  needsConfirm: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);

  function leave() {
    router.push("/");
  }

  function handleTrigger() {
    if (needsConfirm) {
      setAsking(true);
      return;
    }
    leave();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (!needsConfirm) return;
      setAsking((open) => !open);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [needsConfirm]);

  useEffect(() => {
    if (asking) {
      stayRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [asking]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTrigger}
        className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-2.5 text-[12.5px] font-semibold text-[#9aa6b6] transition hover:border-white/[.12] hover:text-[#eef2f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff] ${className}`}
      >
        <LogOut className="size-3.5" />
        Leave
      </button>

      {asking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-xl border border-white/[.07] bg-[#0f131b] p-6 shadow-2xl"
          >
            <h2 id="leave-match-heading" className="text-[17px] font-bold tracking-[-.01em]">
              Leave this match?
            </h2>
            <p id="leave-match-detail" className="mt-2 text-[13px] leading-relaxed text-[#9aa6b6]">
              The match keeps running without you. Any exposure you are holding stays open and
              is settled at the closing price when the clock runs out — leaving does not close
              it.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <ActionButton buttonRef={stayRef} onClick={() => setAsking(false)} tone="primary">
                Stay in the match
              </ActionButton>
              <ActionButton onClick={leave} tone="secondary">
                <LogOut className="size-4" />
                Leave anyway
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
