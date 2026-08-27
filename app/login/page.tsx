"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../components/duel/logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("trader@duel.gg");
  const [password, setPassword] = useState("password");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginWithGoogle() {
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (mode === "register" && username.trim().length < 3) {
      setError("Pick a username with at least 3 characters.");
      return;
    }

    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          email,
          username,
        });
      }
    }
    setLoading(false);
    router.push("/");
  }
  return (
    <main className="grid min-h-screen bg-[#090b10] text-[#eef2f8] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden border-r border-white/[.07] p-11 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_75%_15%,rgba(77,134,255,.12),transparent_56%),linear-gradient(115deg,rgba(31,203,131,.08),transparent_35%),linear-gradient(245deg,rgba(246,72,93,.08),transparent_35%)]" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/[.04]" />
        <div className="absolute left-[52%] top-0 h-full w-px bg-white/[.04]" />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative max-w-[470px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#4d86ff]/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[.04em] text-[#4d86ff]">
            <span className="size-2 rounded-full bg-[#4d86ff] shadow-[0_0_14px_#4d86ff]" />
            1v1 · live markets
          </div>
          <h1 className="text-5xl font-bold leading-[1.02] tracking-[-.03em]">
            Trade head-to-head.
            <br />
            <span className="text-[#5d6877]">Highest capital wins.</span>
          </h1>
          <p className="mt-5 max-w-[410px] text-[15.5px] leading-7 text-[#9aa6b6]">
            Two traders, one BTC/USDT stream, equal starting capital. Go long or short, manage the clock, and out-trade your opponent before the match ends.
          </p>
          <div className="mt-8 flex gap-8">
            {[
              ["Same capital", "Fair start"],
              ["Live price", "Real-time"],
              ["Short matches", "60–180s"],
            ].map(([title, copy]) => (
              <div key={title}>
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs text-[#5d6877]">{copy}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-[#3a434f]">Simulated markets · No real funds at risk</p>
      </section>

      <section className="grid min-h-screen place-items-center px-6 py-10">
        <form onSubmit={submit} className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold tracking-[-.01em]">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1.5 mb-7 text-sm text-[#9aa6b6]">{mode === "login" ? "Sign in to enter the lobby." : "Set up your trader profile to start dueling."}</p>

          {mode === "register" && (
            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-semibold text-[#9aa6b6]">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. candle_wick"
                className="h-12 w-full rounded-[7px] border border-white/[.07] bg-[#151b25] px-3.5 text-[14.5px] text-[#eef2f8] outline-none transition placeholder:text-[#3a434f] focus:border-[#4d86ff]/40"
              />
            </label>
          )}

          <label className="mb-4 block">
            <span className="mb-2 block text-xs font-semibold text-[#9aa6b6]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-[7px] border border-white/[.07] bg-[#151b25] px-3.5 text-[14.5px] text-[#eef2f8] outline-none transition placeholder:text-[#3a434f] focus:border-[#4d86ff]/40"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-xs font-semibold text-[#9aa6b6]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-[7px] border border-white/[.07] bg-[#151b25] px-3.5 text-[14.5px] text-[#eef2f8] outline-none transition placeholder:text-[#3a434f] focus:border-[#4d86ff]/40"
            />
          </label>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-[7px] bg-[#f6485d]/15 px-3 py-2.5 text-sm text-[#f6485d]">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="flex h-[50px] w-full items-center justify-center rounded-[7px] bg-[#4d86ff] text-[15px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(77,134,255,.4)] transition hover:brightness-110 active:translate-y-px disabled:opacity-60">
            {loading ? "Loading..." : mode === "login" ? "Log in" : "Create account"}
          </button>
          {/* google login */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[.07]" />
            <span className="text-xs text-[#5d6877]">OR</span>
            <div className="h-px flex-1 bg-white/[.07]" />
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="flex h-[50px] w-full items-center justify-center gap-3 rounded-[7px] border border-white/[.07] bg-[#151b25] text-[15px] font-semibold text-[#eef2f8] transition hover:bg-[#1b222e] disabled:opacity-60"
          >
            <svg
              className="h-5 w-5"
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

            Continue with Google
          </button>
          <p className="mt-5 text-center text-[13.5px] text-[#9aa6b6]">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="font-semibold text-[#4d86ff]">
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
