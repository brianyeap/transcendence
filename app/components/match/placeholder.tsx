// Stand-ins for the live-Match panels that tickets 08-13 will fill in.
//
// These exist so ticket 14 can settle the LAYOUT of the live Match screen before
// any of the panels are real. Each one names the ticket that replaces it, so the
// screen never pretends to be finished and nobody has to guess what is missing.
//
// Deleting a Placeholder is the last step of the ticket it names.

/** A panel-sized stand-in. Use where a whole panel is still to be built. */
export function Placeholder({
  ticket,
  title,
  hint,
  className = "",
}: {
  ticket: string;
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[.12] bg-[#0f131b] p-5 text-center ${className}`}
    >
      <span className="rounded-full border border-[#4d86ff]/25 bg-[#4d86ff]/10 px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[.04em] text-[#4d86ff]">
        Ticket {ticket}
      </span>
      <p className="text-sm font-semibold text-[#9aa6b6]">{title}</p>
      {hint ? <p className="max-w-[38ch] text-xs leading-relaxed text-[#5d6877]">{hint}</p> : null}
    </div>
  );
}

/**
 * A single value the server has not wired up yet — a price, a balance, a clock.
 * Keeps the surrounding layout honest at its real width instead of collapsing.
 */
export function Pending({ className = "" }: { className?: string }) {
  return (
    <span title="Not wired up yet" className={`font-mono text-[#3a434f] ${className}`}>
      ——
    </span>
  );
}
