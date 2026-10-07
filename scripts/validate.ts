import {
  QUESTIONS,
  QUESTION_COUNT,
  prepareQuestions,
  scoreForTimeLeftMs,
  formatNumber,
  ordinal,
  normalizeName,
  MAX_POINTS_PER_QUESTION,
  QUESTION_TIME_MS,
} from "../src/lib/questions";

let failed = 0;
function check(cond: boolean, label: string) {
  if (!cond) {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("[1] There are exactly 10 questions, 4 options each, correctIndex in 0..3");
check(QUESTION_COUNT === 10, `QUESTION_COUNT === 10 (got ${QUESTION_COUNT})`);
for (const q of QUESTIONS) {
  check(Array.isArray(q.options) && q.options.length === 4, `Q${q.id} has 4 options`);
  check(q.correctIndex >= 0 && q.correctIndex <= 3, `Q${q.id} correctIndex in 0..3`);
}

console.log("[2] Every question + option is 100% English (printable ASCII only)");
for (const q of QUESTIONS) {
  const texts = [q.text, ...q.options];
  for (const t of texts) {
    const bad = [...t].filter((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) > 126);
    check(bad.length === 0, `Q${q.id} "${t.slice(0, 40)}" has no non-ASCII`);
  }
}

console.log("[3] Correct answers match the required list B,C,B,B,B,B,A,B,D,A");
const expected: Record<number, 0 | 1 | 2 | 3> = {
  1: 1, // B
  2: 2, // C
  3: 1, // B
  4: 1, // B
  5: 1, // B
  6: 1, // B
  7: 0, // A
  8: 1, // B
  9: 3, // D
  10: 0, // A
};
for (const q of QUESTIONS) {
  check(
    q.correctIndex === expected[q.id],
    `Q${q.id} correct is ${"ABCD"[q.correctIndex]}`,
  );
}

console.log("[4] Shuffle preserves the correct answer and question meaning (300 rounds)");
let shuffleErrors = 0;
for (let round = 0; round < 300; round++) {
  const qs = prepareQuestions();
  const errs: string[] = [];
  if (qs.length !== 10) errs.push("did not return 10 questions");
  if (new Set(qs.map((q) => q.id)).size !== 10) errs.push("duplicate question ids");
  for (const q of qs) {
    const original = QUESTIONS.find((x) => x.id === q.id)!;
    if (q.options.length !== 4) errs.push(`Q${q.id}: not 4 options`);
    if (q.options[q.correctIndex] !== original.options[original.correctIndex])
      errs.push(`Q${q.id}: correct option not preserved`);
    if ([...q.options].sort().join("\u0000") !== [...original.options].sort().join("\u0000"))
      errs.push(`Q${q.id}: option set changed`);
  }
  if (errs.length) {
    shuffleErrors += 1;
    console.error(`  ✗ round ${round}: ${errs.join("; ")}`);
  }
}
check(shuffleErrors === 0, "300 shuffle rounds: 10 questions, ids unique, correct + options preserved");

console.log("[5] Scoring: round(1000 * timeLeftMs / 15000)");
check(scoreForTimeLeftMs(QUESTION_TIME_MS) === 1000, "15s left -> 1000");
check(scoreForTimeLeftMs(12000) === 800, "12s left -> 800");
check(scoreForTimeLeftMs(7500) === 500, "7.5s left -> 500");
check(scoreForTimeLeftMs(3000) === 200, "3s left -> 200");
check(scoreForTimeLeftMs(0) === 0, "0s left -> 0");
check(scoreForTimeLeftMs(20000) === 1000, "clamped above -> 1000");
check(scoreForTimeLeftMs(-100) === 0, "clamped below -> 0");
check(MAX_POINTS_PER_QUESTION === 1000, "max points per question = 1000");
let monotonic = true;
for (let t = 15000; t >= 0; t -= 250) {
  if (scoreForTimeLeftMs(t) > scoreForTimeLeftMs(t + 250)) monotonic = false;
}
check(monotonic, "score is monotonic with remaining time");

console.log("[6] Formatting helpers");
check(normalizeName("  Santiago   Ruiz  ") === "Santiago Ruiz", "normalizeName collapses spaces");
check(formatNumber(8742) === "8,742", "formatNumber(8742) === 8,742");
const ord = [1, 2, 3, 4, 11, 21, 22, 23, 27].map(ordinal);
check(ord.join(",") === "1st,2nd,3rd,4th,11th,21st,22nd,23rd,27th", `ordinals ${ord.join(",")}`);

console.log("");
if (failed > 0) {
  console.error(`FAILED: ${failed} check(s)`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");