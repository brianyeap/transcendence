"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/app/components/duel/logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateSafeRedirect } from "@/lib/auth/redirect";
import { Shield, KeyRound, AlertCircle, RefreshCw, LogOut } from "lucide-react";

function VerifyMfaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const safeNext = validateSafeRedirect(rawNext, "/");

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  // Initialize factor and prepare challenge
  useEffect(() => {
    let isMounted = true;

    async function initFactor() {
      setLoading(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();

      // Check current auth status
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push(`/login?next=${encodeURIComponent(safeNext)}`);
        return;
      }

      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      // If user already satisfied aal2 or does not need it, redirect directly
      if (aalData?.currentLevel === "aal2" || aalData?.nextLevel !== "aal2") {
        router.push(safeNext);
        return;
      }

      // Fetch factors
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        if (isMounted) {
          setError("Failed to retrieve security factors. Please check your network.");
          setLoading(false);
        }
        return;
      }

      const totpFactor = factorsData?.totp?.[0];

      if (!totpFactor) {
        // No verified TOTP factor exists
        router.push(safeNext);
        return;
      }

      if (isMounted) {
        setFactorId(totpFactor.id);
        setLoading(false);
      }
    }

    initFactor();

    return () => {
      isMounted = false;
    };
  }, [router, safeNext]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanCode = code.trim().replace(/\s+/g, "");

    if (!factorId) {
      setError("No active two-factor authentication factor found.");
      return;
    }

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError("Please enter a valid 6-digit authentication code.");
      return;
    }

    setError(null);
    setVerifying(true);

    const supabase = createSupabaseBrowserClient();

    try {
      // Step 1: Create a challenge (or use existing active challenge if available)
      let activeChallengeId = challengeId;

      if (!activeChallengeId) {
        const challengeRes = await supabase.auth.mfa.challenge({ factorId });

        if (challengeRes.error) {
          if (challengeRes.error.message?.toLowerCase().includes("network")) {
            setError("Network error while creating challenge. Please check your connection.");
          } else {
            setError(challengeRes.error.message || "Failed to initialize verification challenge.");
          }
          setVerifying(false);
          return;
        }

        activeChallengeId = challengeRes.data.id;
        setChallengeId(activeChallengeId);
      }

      // Step 2: Verify the challenge with the entered code
      const verifyRes = await supabase.auth.mfa.verify({
        factorId,
        challengeId: activeChallengeId,
        code: cleanCode,
      });

      if (verifyRes.error) {
        const msg = verifyRes.error.message?.toLowerCase() ?? "";

        // Reset challenge if expired or invalidated
        if (msg.includes("expired")) {
          setChallengeId(null);
          setError("Verification challenge expired. A fresh challenge will be generated on your next try.");
        } else if (msg.includes("invalid") || msg.includes("code")) {
          setError("Invalid verification code. Please check your authenticator app.");
        } else if (msg.includes("network")) {
          setError("Network connection issue. Please verify your internet and try again.");
        } else {
          setError(verifyRes.error.message || "Verification failed. Please try again.");
        }

        setVerifying(false);
        return;
      }

      // Success: session is now elevated to AAL2!
      router.push(safeNext);
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setVerifying(false);
    }
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#090b10] px-6 py-10 text-[#eef2f8]">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-6 shadow-xl">
          <div className="mb-6 flex items-center gap-3 border-b border-white/[.05] pb-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#4d86ff]/15 text-[#4d86ff]">
              <Shield className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Two-Factor Authentication</h1>
              <p className="text-xs text-[#5d6877]">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-[#5d6877]">
              <RefreshCw className="mb-3 size-6 animate-spin text-[#4d86ff]" />
              Checking security status...
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#9aa6b6]">
                  <KeyRound className="size-3.5 text-[#4d86ff]" />
                  Authentication Code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="h-12 w-full rounded-[7px] border border-white/[.07] bg-[#151b25] px-3.5 text-center font-mono text-xl tracking-[0.3em] text-[#eef2f8] outline-none transition placeholder:text-[#3a434f] focus:border-[#4d86ff]/50"
                />
              </label>

              {error && (
                <div className="flex items-start gap-2.5 rounded-[7px] bg-[#f6485d]/15 p-3 text-xs text-[#f6485d]">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifying || code.trim().length !== 6}
                className="flex h-[46px] w-full items-center justify-center rounded-[7px] bg-[#4d86ff] text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(77,134,255,.4)] transition hover:brightness-110 active:translate-y-px disabled:opacity-50"
              >
                {verifying ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="size-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify and Continue"
                )}
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 text-xs text-[#5d6877] transition hover:text-[#f6485d]"
                >
                  <LogOut className="size-3.5" />
                  Cancel and sign out
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyMfaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090b10]" />}>
      <VerifyMfaContent />
    </Suspense>
  );
}
