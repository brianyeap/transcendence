import { SectionLabel } from "../components/duel/section-label";

const LAST_UPDATED = "22 September 2026";

export default function PrivacyScreen() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-7">
      <Hero />

      <Section title="1. What we collect">
        <p>When you create an account and play, we store:</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>Your email address and password, handled by our authentication provider (Supabase Auth) — we never see or store your raw password ourselves</li>
          <li>A public username, shown to other players</li>
          <li>Match records: rooms you've created or joined, match settings, start/end times</li>
          <li>Trading activity: your trades within a match — side, amount, entry price, and timing</li>
          <li>Match outcomes and aggregate stats: games played, wins, losses, draws, win percentage</li>
        </ul>
      </Section>

      <Section title="2. What we don't collect">
        <p>
          We don't collect payment details, banking information, or anything
          related to real money — this platform uses virtual capital only,
          and no real financial transactions happen through it. We don't run
          third-party ad tracking.
        </p>
      </Section>

      <Section title="3. How we use it">
        <p>We use the data above to:</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>Run matches - matching you with an opponent, streaming market data, computing balances and results</li>
          <li>Show your username and stats to other players, and to you</li>
          <li>Keep match history so you can review past games</li>
          <li>Keep the platform secure and prevent abuse</li>
        </ul>
      </Section>

      <Section title="4. Who can see your data">
        <p>
          Your opponent in a live match sees your username and your live
          capital total, but not your individual trades until the match ends.
		  After the match, both players' full trade history for that match
          becomes visible to each other, as part of match history. Your
          email address is never shown to other players.
        </p>
      </Section>

      <Section title="5. How long we keep it">
        <p>
          We keep your account and match history for as long as your account
          exists. If you delete your account, we'll remove your personal
          data, though some anonymized match records may be retained for
          platform integrity.
        </p>
        <p className="mt-2 text-[12px] text-[#5d6877]">
          TODO: confirm actual deletion behavior once account deletion is
          implemented — this section should match what the code actually
          does, not just what's intended.
        </p>
      </Section>

      <Section title="6. Your choices">
        <p>
          You can update your username and log out at any time from
          settings. You can contact us to request a copy of your data or to
          have your account deleted.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          Authentication and password handling are managed by Supabase Auth.
          Database access is protected by Row Level Security policies, so
          you can only read or modify data your account is authorized to
          access.
        </p>
      </Section>

      <Section title="8. Changes to this policy">
        <p>
          We may update this policy as the product changes. If we make a
          material change, we'll update the date at the top of this document.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Questions about your data or this policy? Reach us at{" "}
          <span className="font-mono text-[#4d86ff]">support@duel.com</span>*.
        </p>
		<p className="mt-2 text-[12px] text-[#5d6877]">
			*Note: The email above is not a real and is only a placeholder for project purposes.
			Please do not contact that email.
		</p>
      </Section>
    </div>
  );
}

function Hero() {
  return (
    <header>
      <h1 className="text-[27px] font-bold tracking-[-.02em] text-[#eef2f8]">
        Privacy Policy
      </h1>
      <p className="mt-2 text-[12.5px] text-[#5d6877]">
        Last updated: {LAST_UPDATED}
      </p>
      <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[#9aa6b6]">
        A short summary of what we collect, why, and who can see it. No real
        money and no payment details are ever involved.
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