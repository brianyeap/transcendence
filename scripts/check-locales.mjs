//  Check that every language file in messages/ has the same keys as en.json.
//
//  en.json is the "source of truth". When you add, rename or remove a key
//  there, every other language must get the same change, or that language
//  shows the raw key (e.g. "RoomErrors.roomNameTooLong") instead of a message.
//
//  Run it with:  npm run check:locales
//  It also runs before every `npm run build`, so a missing translation stops
//  the build instead of reaching players.

import { readFileSync, readdirSync } from "node:fs";

const MESSAGES_DIR = new URL("../messages/", import.meta.url);
const SOURCE = "en.json";

//  Read one language file.
function load(file) {
  return JSON.parse(readFileSync(new URL(file, MESSAGES_DIR), "utf8"));
}

//  Turn nested messages into flat "path -> text" pairs, e.g.
//  { RoomErrors: { roomNameTooLong: "..." } }  ->  "RoomErrors.roomNameTooLong" -> "..."
function flatten(messages, prefix = "") {
  const result = new Map();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix + key;
    if (typeof value === "object" && value !== null) {
      for (const [innerPath, text] of flatten(value, path + ".")) {
        result.set(innerPath, text);
      }
    } else {
      result.set(path, value);
    }
  }
  return result;
}

//  The {placeholders} a message uses, e.g. "The smallest order is {amount}."
//  -> "amount", and "{count, plural, ...}" -> "count". A translation must use
//  the same ones, or the value the code passes in never shows up.
function placeholders(text) {
  const names = [...String(text).matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]);
  return [...new Set(names)].sort().join(", ");
}

const source = flatten(load(SOURCE));
const otherFiles = readdirSync(MESSAGES_DIR).filter(
  (file) => file.endsWith(".json") && file !== SOURCE
);

let problemCount = 0;

for (const file of otherFiles) {
  const translation = flatten(load(file));
  const problems = [];

  // 1. Keys in en.json that this language does not have yet.
  for (const [path, text] of source) {
    if (!translation.has(path)) {
      problems.push(`missing:    ${path}`);
    } else if (placeholders(translation.get(path)) !== placeholders(text)) {
      // 2. The key exists but uses different {placeholders}.
      problems.push(
        `wrong {}:   ${path}  (en.json has {${placeholders(text)}}, ` +
          `${file} has {${placeholders(translation.get(path))}})`
      );
    }
  }

  // 3. Keys this language has but en.json does not (left over from a rename
  //    or a delete).
  for (const path of translation.keys()) {
    if (!source.has(path)) problems.push(`extra:      ${path}`);
  }

  if (problems.length > 0) {
    console.error(`\n${file}: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  ${problem}`);
  }
  problemCount += problems.length;
}

if (problemCount > 0) {
  console.error(`\nLocale check failed. Update the files above to match ${SOURCE}.`);
  process.exit(1);
}

console.log(`Locale check passed: ${otherFiles.join(", ")} match ${SOURCE} (${source.size} keys).`);
