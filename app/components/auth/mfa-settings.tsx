"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

interface TotpFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: "verified" | "unverified";
  created_at: string;
  updated_at: string;
}

export function MfaSettings() {
  const t = useTranslations("MfaSettings");
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Enrollment states
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Unenroll confirmation modal state
  const [unenrollFactorId, setUnenrollFactorId] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const loadFactors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        setError(factorsError.message || t("failedToLoadSecurityFactors"));
        return;
      }

      const verifiedTotp = (data?.totp as unknown as TotpFactor[]) || [];
      setFactors(verifiedTotp);
    } catch {
      setError(t("networkErrorChecking2FA"));
    } finally {
      setLoading(false);
    }
  }, [supabase, t]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const { data, error: factorsError } =
          await supabase.auth.mfa.listFactors();

        if (!isMounted) return;

        if (factorsError) {
          setError(factorsError.message || t("failedToLoadSecurityFactors"));
          return;
        }

        const verifiedTotp = (data?.totp as unknown as TotpFactor[]) || [];
        setFactors(verifiedTotp);
      } catch {
        if (isMounted) {
          setError(t("networkErrorChecking2FA"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [supabase, t]);

  async function startEnrollment() {
    setError(null);
    setSuccess(null);
    setActionLoading(true);

    try {
      // First clean up any leftover unverified factors
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified =
        existing?.all?.filter(
          (f) => f.factor_type === "totp" && f.status === "unverified"
        ) || [];
      for (const factor of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      // Start enrollment
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Duel Authenticator",
      });

      if (enrollError || !data) {
        setError(enrollError?.message || t("failedToStartEnrollment"));
        setActionLoading(false);
        return;
      }

      setPendingFactorId(data.id);
      setManualSecret(data.totp.secret);

      // Handle QR code SVG or data URL
      const rawQr = data.totp.qr_code;
      const formattedQr = rawQr.startsWith("data:")
        ? rawQr
        : `data:image/svg+xml;utf-8,${encodeURIComponent(rawQr)}`;
      setQrCodeUrl(formattedQr);

      setVerifyCode("");
      setIsEnrolling(true);
    } catch {
      setError(t("networkErrorEnrollment"));
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelEnrollment() {
    setError(null);
    setActionLoading(true);

    if (pendingFactorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
      } catch {
        // Ignore unenroll errors during cancellation cleanup
      }
    }

    setPendingFactorId(null);
    setQrCodeUrl(null);
    setManualSecret(null);
    setVerifyCode("");
    setIsEnrolling(false);
    setActionLoading(false);
  }

  async function handleVerifyEnrollment(e: React.FormEvent) {
    e.preventDefault();

    const cleanCode = verifyCode.trim().replace(/\s+/g, "");

    if (!pendingFactorId) {
      setError(t("noPendingEnrollment"));
      return;
    }

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError(t("invalidSixDigitCode"));
      return;
    }

    setError(null);
    setActionLoading(true);

    try {
      // 1. Create a challenge
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: pendingFactorId });

      if (challengeError || !challengeData) {
        if (challengeError?.message?.toLowerCase().includes("network")) {
          setError(t("networkErrorChallenge"));
        } else {
          setError(challengeError?.message || t("failedToCreateChallenge"));
        }
        setActionLoading(false);
        return;
      }

      // 2. Verify challenge with user's code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: challengeData.id,
        code: cleanCode,
      });

      if (verifyError) {
        const msg = verifyError.message?.toLowerCase() || "";
        if (msg.includes("expired")) {
          setError(t("challengeExpired"));
        } else if (msg.includes("invalid") || msg.includes("code")) {
          setError(t("invalidCode"));
        } else if (msg.includes("network")) {
          setError(t("networkErrorVerify"));
        } else {
          setError(verifyError.message || t("failedToVerify"));
        }
        setActionLoading(false);
        return;
      }

      // Successfully enrolled!
      setIsEnrolling(false);
      setPendingFactorId(null);
      setQrCodeUrl(null);
      setManualSecret(null);
      setVerifyCode("");
      setSuccess(t("twoFactorEnabled"));

      await loadFactors();
    } catch {
      setError(t("unexpectedNetworkError"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnenroll(factorId: string) {
    setError(null);
    setSuccess(null);
    setActionLoading(true);

    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (unenrollError) {
        const msg = unenrollError.message?.toLowerCase() || "";
        if (msg.includes("aal2")) {
          setError(t("aal2Required"));
        } else if (msg.includes("network")) {
          setError(t("networkErrorRemoving"));
        } else {
          setError(unenrollError.message || t("failedToRemove"));
        }
        setActionLoading(false);
        return;
      }

      setUnenrollFactorId(null);
      setSuccess(t("twoFactorRemoved"));
      await loadFactors();
    } catch {
      setError(t("unexpectedNetworkErrorRemoving"));
    } finally {
      setActionLoading(false);
    }
  }

  function copySecret() {
    if (!manualSecret) return;
    navigator.clipboard.writeText(manualSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isMfaActive = factors.length > 0;

  return (
    <div className="px-4 py-4">
      {/* Notifications */}
      {error && (
        <div className="mb-4 flex items-start justify-between gap-2.5 rounded-[7px] bg-[#f6485d]/15 p-3 text-xs text-[#f6485d]">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[#f6485d]/80 hover:text-[#f6485d]"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start justify-between gap-2.5 rounded-[7px] bg-emerald-500/15 p-3 text-xs text-emerald-400">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="text-emerald-400/80 hover:text-emerald-400"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main Factor Status View */}
      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-[#5d6877]">
          <RefreshCw className="size-3.5 animate-spin text-[#4d86ff]" />
          {t("loadingSecuritySettings")}
        </div>
      ) : isEnrolling ? (
        /* Enrollment Form */
        <div className="rounded-[7px] border border-white/[.07] bg-[#151b25] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/[.05] pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-[#4d86ff]" />
              <h3 className="text-sm font-semibold text-[#eef2f8]">
                {t("setupTwoFactor")}
              </h3>
            </div>
            <button
              type="button"
              onClick={cancelEnrollment}
              disabled={actionLoading}
              className="text-xs text-[#5d6877] hover:text-[#eef2f8]"
            >
              {t("cancel")}
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-[180px_1fr]">
            {/* QR Code */}
            <div className="flex flex-col items-center justify-center rounded-[7px] bg-white p-3">
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeUrl}
                  alt={t("qrCodeAlt")}
                  className="size-36 select-none"
                />
              ) : (
                <div className="flex size-36 items-center justify-center text-xs text-black/50">
                  {t("generatingQr")}
                </div>
              )}
            </div>

            {/* Steps & Manual Secret */}
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-semibold text-[#9aa6b6]">
                  {t("scanWithAuthenticator")}
                </p>
                <p className="mt-0.5 text-[#5d6877]">
                  {t("authenticatorApps")}
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#9aa6b6]">
                  {t("enterSecretManually")}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="rounded bg-[#090b10] px-2.5 py-1.5 font-mono text-[11px] text-[#4d86ff] select-all">
                    {manualSecret || "..."}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="flex items-center gap-1 rounded border border-white/[.07] bg-white/[.03] px-2 py-1.5 text-[11px] text-[#9aa6b6] transition hover:bg-white/[.08] hover:text-[#eef2f8]"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span className="text-emerald-400">{t("copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>{t("copy")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Verify input */}
              <form onSubmit={handleVerifyEnrollment} className="pt-2">
                <label className="block">
                  <span className="font-semibold text-[#9aa6b6]">
                    {t("enterConfirmationCode")}
                  </span>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={verifyCode}
                      onChange={(e) =>
                        setVerifyCode(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="000000"
                      className="h-10 w-44 rounded-[7px] border border-white/[.12] bg-[#090b10] px-3 text-center font-mono text-lg font-bold tracking-[0.25em] text-[#eef2f8] outline-none transition placeholder:text-[#3a434f] focus:border-[#4d86ff] focus:ring-1 focus:ring-[#4d86ff]/50"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || verifyCode.trim().length !== 6}
                      className="flex h-10 items-center justify-center rounded-[7px] bg-[#4d86ff] px-4 text-xs font-semibold text-white shadow-[0_4px_14px_-4px_rgba(77,134,255,.4)] transition hover:brightness-110 active:translate-y-px disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="size-3.5 animate-spin" />
                          {t("verifying")}
                        </span>
                      ) : (
                        t("verifyActivate")
                      )}
                    </button>
                  </div>
                </label>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Status Display */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMfaActive ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-[#5d6877]" />
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-0.5">
                  {t("twoFactorAuthentication")}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {isMfaActive ? t("enabled") : t("notEnabled")}
                  </span>
                  <span
                    className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${
                      isMfaActive
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/[.05] text-[#5d6877]"
                    }`}
                  >
                    {isMfaActive ? t("protected") : t("recommended")}
                  </span>
                </div>
              </div>
            </div>

            <div>
              {isMfaActive ? (
                <button
                  type="button"
                  onClick={() => setUnenrollFactorId(factors[0].id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-[7px] border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-xs font-medium text-[#f6485d] transition hover:bg-[#f6485d]/10 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  {t("disable2FA")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startEnrollment}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-[7px] bg-[#4d86ff] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_12px_-4px_rgba(77,134,255,.4)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : null}
                  {t("enable2FA")}
                </button>
              )}
            </div>
          </div>

          {/* If factors enrolled, show factor metadata */}
          {isMfaActive && (
            <div className="mt-1 rounded-[7px] border border-white/[.04] bg-white/[.01] p-3 text-xs text-[#5d6877]">
              {factors.map((factor) => (
                <div key={factor.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span className="font-mono text-[11px] text-[#9aa6b6]">
                      {factor.friendly_name || t("authenticatorApp")}
                    </span>
                  </div>
                  <span className="text-[10px]">
                    {t("enrolled", {
                      date: new Date(factor.created_at).toLocaleDateString(),
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unenroll Confirmation Dialog */}
      {unenrollFactorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-[360px] rounded-[10px] border border-white/[.08] bg-[#0f131b] p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#f6485d]">
              <AlertCircle className="size-5" />
              <h4 className="text-sm font-bold">
                {t("disableTwoFactorQuestion")}
              </h4>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#9aa6b6]">
              {t("disableWarning")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setUnenrollFactorId(null)}
                className="rounded-[6px] border border-white/[.07] px-3 py-1.5 text-xs text-[#9aa6b6] hover:bg-white/[.04] hover:text-[#eef2f8]"
              >
                {t("keepEnabled")}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUnenroll(unenrollFactorId)}
                className="flex items-center gap-1.5 rounded-[6px] bg-[#f6485d] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : null}
                {t("yesDisable")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
