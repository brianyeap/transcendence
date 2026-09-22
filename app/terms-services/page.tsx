import { SectionLabel } from "../components/duel/section-label";

const LAST_UPDATED = "22 September 2026";

export default function TermsScreen() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-7">
      <Hero />
      <Section title="1. What this is">
        <p>
          This is a real-time, two-player trading simulation. You trade a
          simulated BTC/USDT market against another player using virtual
          capital only. No real money is used, deposited, withdrawn, or
          traded on this platform at any point. Nothing here is real
          financial trading, and nothing you do here has any monetary value
          outside the app.
        </p>
      </Section>

      <Section title="2. Your account">
        <p>
          You need an account to play. You're responsible for keeping your
          login credentials secure and for anything that happens under your
          account. Don't share your login with anyone else, and let us know
          if you think someone's accessed your account without permission.
        </p>
      </Section>

      <Section title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>Use bots, scripts, or automation to place trades on your behalf</li>
          <li>Exploit bugs, race conditions, or unintended behavior for an unfair advantage</li>
          <li>Coordinate with an opponent to manipulate a match's outcome</li>
          <li>Attempt to access another user's account or data</li>
          <li>Use the service for anything illegal, harmful, or disruptive to other players</li>
        </ul>
        <p className="mt-2">
          We may suspend or remove an account that violates these terms.
        </p>
      </Section>

      <Section title="4. Not financial advice">
        <p>
          Nothing on this platform (price data, match outcomes, statistics,
          or anything else) is financial, investment, or trading advice.
          The market data is a simulation intended for entertainment and
          practice. Performance here has no bearing on how any real asset
          would perform, and you should never make real financial decisions
          based on anything in this app.
        </p>
      </Section>

      <Section title="5. Service availability">
        <p>
          This is an actively developed project. Features, match rules,
          starting capital, and match durations may change as the product
          evolves. We don't guarantee the service will always be available,
          bug-free, or that match history and stats will be preserved
          indefinitely. We'll try to communicate meaningful changes, but we
          don't promise advance notice for every one.
        </p>
      </Section>

      <Section title="6. Limitation of liability">
        <p>
          Since no real money or real assets are ever at stake, our
          liability to you is limited to the fullest extent the law allows.
          We're not liable for lost match progress, lost stats, downtime, or
          any indirect or consequential loss arising from your use of the
          service.
        </p>
      </Section>

      <Section title="7. Changes to these terms">
        <p>
          We may update these terms as the product changes. If we make a
          material change, we'll update the date at the top of this document. 
		  Continuing to use the service after a change means you accept the updated terms.
        </p>
      </Section>

      <Section title="8. Contact">
        <p>
          Questions about these terms? Reach us at{" "}
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
        Terms of Services
      </h1>
      <p className="mt-2 text-[12.5px] text-[#5d6877]">
        Last updated: {LAST_UPDATED}
      </p>
      <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[#9aa6b6]">
        Please read this before playing. It's short, because the product is
        simple: virtual capital, no real money, and a couple of ground rules
        for fair play.
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