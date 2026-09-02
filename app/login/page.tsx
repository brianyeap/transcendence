"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Logo } from "../components/duel/logo";
import { Button } from "../components/duel/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    //  check the form before we call supabas
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (isRegister && username.trim().length < 3) {
      setError("Pick a username with at least 3 characters.");
      return;
    }

    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    try {
      if (isRegister) {
        //  Create the account, then save the username in our profiles table.
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });

        if (signUpError) throw new Error(signUpError.message);

        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({ id: data.user.id, email, username });

          if (profileError) throw new Error(profileError.message);
        }

        toast.success("Account created.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw new Error(signInError.message);
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong."); // making sure err is actually Error and setting the message
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-base text-ink lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-line bg-panel p-12 lg:flex">  {/* flex veritcally  */}
        <Logo />

        <h1 className="text-4xl font-bold">
          Trade head-to-head.
          <br />
          <span className="text-dim">Highest capital wins.</span>
        </h1>

        <p className="text-xs text-faint">Simulated markets - No real funds at risk</p>
      </section>

      {/* Right side */}
      <section className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-bold">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mb-6 mt-1 text-sm text-muted">
            {isRegister ? "Set up your trader profile to start dueling." : "Sign in to enter the lobby."}
          </p>

          {isRegister && (
            <Field
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="e.g. candle_wick"
            />
          )}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
          />

          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
          />

          {error && (
            <p className="mb-4 rounded-md border border-loss px-3 py-2 text-sm text-loss">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? "Loading..." : isRegister ? "Create account" : "Log in"}
          </Button>

          <p className="mt-5 text-center text-sm text-muted">
            {isRegister ? "Already have an account? " : "New here? "}
            <button
              type="button"
              onClick={() => setMode(isRegister ? "login" : "register")}
              className="font-semibold text-brand"
            >
              {isRegister ? "Log in" : "Create an account"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-semibold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        suppressHydrationWarning
        className="h-12 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none placeholder:text-faint focus:border-brand"
      />
    </label>
  );
}
