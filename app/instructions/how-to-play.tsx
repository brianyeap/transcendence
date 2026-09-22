import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { SectionLabel } from "../components/duel/section-label";
import { ActionLink } from "../matches/[matchId]/message-screen";

export function HowToPlayScreen() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-7">
      <Hero />
      <Flow />
      <Trading />
      <ScreenGuide />
      <Ending />
      <ReadyToPlay />
    </div>
  );
}

function Hero() {
  return (
    <header>
      <h1 className="text-[27px] font-bold tracking-[-.02em] text-[#eef2f8]">
        How to play
      </h1>
      <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-[#9aa6b6]">
        Two players, one BTC/USDT chart, equal starting capital. Whoever
        finishes the match with more capital wins.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Fact icon={Users} label="Players" value="2" />
        <Fact icon={Wallet} label="Starting capital" value="5K - 20K" />
        <Fact icon={Clock} label="Match length" value="1 min" />
        <Fact icon={Trophy} label="Wins by" value="Higher capital" />
      </dl>
    </header>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] px-3.5 py-3">
      <Icon className="size-4 text-[#4d86ff]" />
      <dd className="mt-2 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
        {value}
      </dd>
      <dt className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
        {label}
      </dt>
    </div>
  );
}

function Flow() {
  const steps = [
    {
      title: "Create or join a room",
      detail:
        "Create a room and you're automatically seated as player one. Join an open room and you're seated as player two. Either way, the match settings (symbol, duration, starting capital) are locked in.",
    },
    {
      title: "Countdown",
      detail:
        "Once both seats are filled, a short countdown starts. Nobody can trade yet. This is just enough time to get ready before the chart goes live.",
    },
    {
      title: "The match goes live",
      detail:
        "Both players see the exact same price stream. From here you can place Long or Short trades until the clock runs out.",
    },
    {
      title: "Settlement",
      detail:
        "The moment the timer hits zero, any exposure you're still holding is automatically closed at the final price. Nothing carries over.",
    },
  ];

  return (
    <section>
      <SectionLabel>The flow</SectionLabel>
      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-3.5 rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3.5"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#4d86ff]/30 font-mono text-[11px] font-semibold text-[#4d86ff]">
              {i + 1}
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[#eef2f8]">
                {step.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#9aa6b6]">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Trading() {
  return (
    <section>
      <SectionLabel>Placing a trade</SectionLabel>
      <p className="mt-3 text-[13px] leading-relaxed text-[#9aa6b6]">
        Every trade is a market order. You pick an amount and a direction,
        and it fills instantly at the current streamed price. There's no
        limit order, no leverage, and no fees.
      </p>

      <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
        <SideCard
          icon={ArrowUpRight}
          side="Long"
          tone="up"
          detail="You profit if the price rises above your entry price by the time you offset or the match ends."
        />
        <SideCard
          icon={ArrowDownRight}
          side="Short"
          tone="down"
          detail="You profit if the price falls below your entry price by the time you offset or the match ends."
        />
      </div>

      <div className="mt-3.5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-4 py-3.5">
        <p className="text-[12.5px] font-semibold text-[#eef2f8]">
          You only ever hold one position
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9aa6b6]">
          There's no separate &ldquo;close&rdquo; button. An opposite-side
          trade offsets your existing exposure first, and any leftover amount
          opens a new position in the other direction.
        </p>
        <p className="mt-2 font-mono text-[12px] text-[#5d6877]">
          e.g. holding a $50 Short → a $50 Long trade fully closes it. A $80
          Long would close the $50 Short and open a new $30 Long.
        </p>
      </div>
    </section>
  );
}

function SideCard({
  icon: Icon,
  side,
  tone,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  side: string;
  tone: "up" | "down";
  detail: string;
}) {
  const color = tone === "up" ? "#1fcb83" : "#f6485d";
  return (
    <div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3.5">
      <span
        className="inline-flex items-center gap-1.5 text-[13.5px] font-bold"
        style={{ color }}
      >
        <Icon className="size-4" />
        {side}
      </span>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9aa6b6]">
        {detail}
      </p>
    </div>
  );
}

function ScreenGuide() {
  const items = [
    {
      label: "Price & timer",
      detail: "Top bar — current price and time left in the match.",
    },
    {
      label: "Your capital",
      detail: "Available balance plus whatever's tied up in an open position.",
    },
    {
      label: "Exposure panel",
      detail:
        "Your current side, entry price, and unrealised profit or loss if you offset right now.",
    },
    {
      label: "Opponent",
      detail:
        "You'll see their capital total live. Their individual trades stay hidden until the match ends.",
    },
  ];

  return (
    <section>
      <SectionLabel>Reading the match screen</SectionLabel>
      <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3.5"
          >
            <dt className="text-[12.5px] font-semibold text-[#eef2f8]">
              {item.label}
            </dt>
            <dd className="mt-1 text-[12px] leading-relaxed text-[#9aa6b6]">
              {item.detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Ending() {
  return (
    <section>
      <SectionLabel>How a match ends</SectionLabel>
      <p className="mt-3 text-[13px] leading-relaxed text-[#9aa6b6]">
        When the timer runs out, the server closes any open position at the
        final price. You never have to remember to close a trade yourself.
        Whoever ends up with more capital wins. If you're tied exactly, it's
        a draw. Full trade-by-trade detail is available afterward from the
        match history.
      </p>
    </section>
  );
}

function ReadyToPlay() {
  return (
    <div className="rounded-xl border border-white/[.07] bg-[#0f131b] p-5 text-center">
      <p className="text-[14px] font-semibold text-[#eef2f8]">Ready?</p>
      <p className="mt-1 text-[12.5px] text-[#9aa6b6]">
        Jump into an open room, or start your own.
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <ActionLink href="/" tone="primary" className="sm:w-40">
          Find a match
        </ActionLink>
      </div>
    </div>
  );
}