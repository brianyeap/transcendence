// A tiny test for the trading maths. Run it with:  node engine-math.test.js
// It uses no database and no network — just checks the numbers come out right.

const { applyTrade, settlePlayer } = require("./engine-math");

let passed = 0;
let failed = 0;

// Simple check helper: compare a value to what we expect.
function check(label, actual, expected) {
  if (actual === expected) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}  (got ${actual}, expected ${expected})`);
  }
}

// A fresh player with 10,000 USDT and no position.
function freshPlayer() {
  return { availableBalance: 10000, realizedPnl: 0, side: "flat", notional: 0, avgEntry: null };
}

console.log("Test 1: open a long, then price rises 10%, settle -> +profit");
{
  const p = freshPlayer();
  // Open a 1000 USDT long at price 100.
  const r = applyTrade(p, "long", 1000, 100);
  const after = r.next;
  check("side is long", after.side, "long");
  check("notional is 1000", after.notional, 1000);
  check("balance reserved 1000", after.availableBalance, 9000);
  // Price goes to 110 (up 10%). Settle: profit = 1000 * 10% = 100.
  const finalCapital = settlePlayer(after, 110);
  check("final capital 10100", finalCapital, 10100);
}

console.log("Test 2: PRD example — short 50 then long 50 -> flat, no leftover");
{
  const p = freshPlayer();
  // Short 50 at price 100.
  const r1 = applyTrade(p, "short", 50, 100);
  check("after short: side short", r1.next.side, "short");
  check("after short: notional 50", r1.next.notional, 50);
  // Long 50 at the same price 100 -> fully closes the short, no profit, flat.
  const r2 = applyTrade(r1.next, "long", 50, 100);
  check("after offset: flat", r2.next.side, "flat");
  check("after offset: notional 0", r2.next.notional, 0);
  check("after offset: balance back to 10000", r2.next.availableBalance, 10000);
}

console.log("Test 3: short then price falls 10% -> profit realized on close");
{
  const p = freshPlayer();
  // Short 1000 at price 100.
  const r1 = applyTrade(p, "short", 1000, 100);
  // Buy back (long) 1000 at price 90 (down 10%). Short profit = 1000 * 10% = 100.
  const r2 = applyTrade(r1.next, "long", 1000, 90);
  check("realized pnl 100", r2.next.realizedPnl, 100);
  check("flat again", r2.next.side, "flat");
  check("balance 10100", r2.next.availableBalance, 10100);
}

console.log("Test 4: reject an order bigger than the balance");
{
  const p = freshPlayer();
  const r = applyTrade(p, "long", 20000, 100); // only have 10000
  check("order rejected", r.ok, false);
}

console.log("Test 5: flip — long 100, then short 150 -> ends up short 50");
{
  const p = freshPlayer();
  const r1 = applyTrade(p, "long", 100, 100); // long 100 @ 100
  const r2 = applyTrade(r1.next, "short", 150, 100); // close 100, open short 50
  check("flipped to short", r2.next.side, "short");
  check("new notional 50", r2.next.notional, 50);
}

console.log("");
console.log(`Result: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
