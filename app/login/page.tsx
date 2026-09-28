"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Logo } from "../components/duel/logo";
import { Button } from "../components/duel/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateSafeRedirect } from "@/lib/auth/redirect";
import { authErrorKey } from "@/lib/auth/auth-error-key";
import { validateUsername, USERNAME_MAX_LENGTH } from "@/lib/validation/username";
import { isValidPassword, PASSWORD_MAX_LENGTH } from "@/lib/validation/password";
import { messageKeyFor } from "@/lib/i18n/error-codes";
import Link from "next/link";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = useTranslations("Login");
  const tAuth = useTranslations("AuthErrors");
  const tErrors = useTranslations("ApiErrors");
  const locale = useLocale();

  const rawNext = searchParams.get("next");
  const safeNext = useMemo(() => validateSafeRedirect(rawNext, "/"), [rawNext]);

  const isRegister = mode === "register";

  async function loginWithGoogle() {
    setError("");
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    if (oauthError) {
      setError(tAuth("oauthFailed"));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError(t("validEmail"));
      return;
    }

    // Same username rules as the settings page (3-20 chars, letters, numbers,
    // spaces, _ and -). The rules live in lib/validation/username.ts.
    const checked = validateUsername(username);
    if (isRegister && !checked.ok) {
      // The validator returns an error code; turn it into a translated message.
      setError(tErrors(messageKeyFor(checked.code) ?? "generic"));
      return;
    }
    // Password rules (8-72 characters, a letter and a number) live in
    // lib/validation/password.ts. Supabase Auth checks them again on its side.
    if (isRegister && !isValidPassword(password)) {
      setError(tAuth("weakPassword"));
      return;
    }

    // Trimmed version of the name, so no leading/trailing spaces get saved.
    const cleanUsername = checked.ok ? checked.username : "";

    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: cleanUsername } },
        });

        if (signUpError) {
          // Supabase messages are English only, so show our translated version.
          setError(tAuth(authErrorKey(signUpError)));
          return;
        }

        if (data.user) {
          await supabase
            .from("profiles")
            .upsert({ id: data.user.id, username: cleanUsername }, { onConflict: "id" });
        }

        toast.success(t("accountCreated"));
        router.push(safeNext);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(tAuth(authErrorKey(signInError)));
          return;
        }

        // Check if user has enrolled MFA and needs secondary factor verification
        const { data: aalData } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
          setLoading(false);
          router.push(`/auth/verify-mfa?next=${encodeURIComponent(safeNext)}`);
          return;
        }

        router.push(safeNext);
      }
    } catch {
      // Anything unexpected (e.g. no internet): never show the raw English error.
      setError(t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-base text-ink lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-line bg-panel p-12 lg:flex">
        <Logo />

        <h1 className="text-4xl font-bold">
          {t("tagline")}
          <br />
          <span className="text-dim">{t("highestCapitalWins")}</span>
        </h1>

        <p className="text-xs text-faint">{t("simulatedMarkets")}</p>
      </section>

      {/* Right side */}
      <section className="grid place-items-center p-6">

		{/* Language drop down */}
		  <div className="absolute right-6 top-6">
			<div className="pb-2">
			  <div className="flex items-center gap-2">
		        <Languages className="h-3.5 w-3.5 shrink-0 text-[#4d86ff]" />
			    <div className="leading-tight">
			      <div className="text-[12px] uppercase tracking-wide text-[#5d6877]">
				    {t("language")}
			      </div>
			    </div>
			  </div>
			</div>

			<select
			  value={locale}
			  onChange={(e) => {
				const newLocale = e.target.value;
				document.cookie = `locale=${newLocale}; path=/`;
				window.location.reload();
			  }}
			  className="ml-1 cursor-pointer rounded-[7px] border border-white/[.07] bg-[#151a23] px-3 py-2 text-sm text-[#eef2f8] outline-none transition-colors hover:border-white/[.14]"
			>

			  <option value="en">English</option>
			  <option value="ms">Malay</option>
			  <option value="zh-CN">Chinese (Simplified)</option>
			</select>
		  </div>

        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-bold">
            {isRegister ? t("createAccountTitle") : t("welcomeBack")}
          </h2>
          <p className="mb-6 mt-1 text-sm text-muted">
            {isRegister ? t("createAccountDescription") : t("signInDescription")}
          </p>

          {isRegister && (
            <Field
              label={t("username")}
              value={username}
              onChange={setUsername}
              placeholder={t("usernamePlaceholder")}
              maxLength={USERNAME_MAX_LENGTH}
            />
          )}

          <Field
            label={t("email")}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t("emailPlaceholder")}
          />

          <Field
            label={t("password")}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={t("passwordPlaceholder")}
            maxLength={PASSWORD_MAX_LENGTH}
          />

          {/* Show the password rules while creating an account. */}
          {isRegister && (
            <p className="-mt-2 mb-4 text-xs text-muted">{t("passwordRules")}</p>
          )}

          {error && (
            <p className="mb-4 rounded-md border border-loss px-3 py-2 text-sm text-loss">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? t("loading") : isRegister ? t("createAccount") : t("logIn")}
          </Button>

		  <p className="mt-3 text-left text-xs text-muted">
            {t("termsIntro")}{" "}
            <Link href="/terms-services" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
              {t("termsOfService")}
            </Link>{" "}
            {t("and")}{" "}
            <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
              {t("privacyPolicy")}
            </Link>
            .
          </p>

          {/* google login */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">{t("or")}</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-line bg-raised text-sm font-semibold text-ink transition hover:bg-panel disabled:opacity-50 cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
              />
              <path
                fill="currentColor"
                d="M12 21.6c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.6Z"
              />
              <path
                fill="currentColor"
                d="M6.53 13.7a5.85 5.85 0 0 1 0-3.4V7.77H3.29a9.75 9.75 0 0 0 0 8.46l3.24-2.53Z"
              />
              <path
                fill="currentColor"
                d="M12 6.27c1.43 0 2.72.49 3.74 1.46l2.8-2.8C16.83 3.39 14.62 2.4 12 2.4a9.74 9.74 0 0 0-8.71 5.37l3.24 2.53C7.3 7.99 9.46 6.27 12 6.27Z"
              />
            </svg>
            {t("continueWithGoogle")}
          </button>

          <p className="mt-5 text-center text-sm text-muted">
            {isRegister ? t("alreadyHaveAccount") : t("newHere")}{" "}
            <button
              type="button"
              onClick={() => setMode(isRegister ? "login" : "register")}
              className="font-semibold text-brand"
            >
              {isRegister ? t("logIn") : t("createAnAccount")}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <LoginForm />
    </Suspense>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  // Optional: stops the browser from letting you type past this many characters.
  maxLength?: number;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-semibold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        suppressHydrationWarning
        className="h-12 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none placeholder:text-faint focus:border-brand"
      />
    </label>
  );
}