// ---------------------------------------------------------------------------
// Questions, shuffling and scoring for GAMETOGENESIS CHALLENGE.
// All 10 questions and their options are 100% in English on purpose.
// ---------------------------------------------------------------------------

export interface RawQuestion {
  id: number;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export type ShuffledQuestion = RawQuestion;

// Exactly the 10 questions requested. correctIndex is 0-based:
// A=0, B=1, C=2, D=3.
// Expected correct answers (A/B/C/D): B, C, B, B, B, B, A, B, D, A
export const QUESTIONS: RawQuestion[] = [
  {
    id: 1,
    text: "What is gametogenesis?",
    options: ["The formation of tissues", "The formation of gametes", "The formation of organs", "The formation of blood cells"],
    correctIndex: 1,
  },
  {
    id: 2,
    text: "Where does spermatogenesis occur?",
    options: ["Ovaries", "Uterus", "Testes", "Kidneys"],
    correctIndex: 2,
  },
  {
    id: 3,
    text: "Where does oogenesis occur?",
    options: ["Testes", "Ovaries", "Uterus", "Prostate"],
    correctIndex: 1,
  },
  {
    id: 4,
    text: "What is the main product of spermatogenesis?",
    options: ["Female sex cells (eggs)", "Sperm cells", "Red blood cells", "Stem cells"],
    correctIndex: 1,
  },
  {
    id: 5,
    text: "What is the main product of oogenesis?",
    options: ["Sperm cells", "Egg cell", "Testosterone", "Platelets"],
    correctIndex: 1,
  },
  {
    id: 6,
    text: "How many chromosomes does a normal human gamete have?",
    options: ["46", "23", "44", "92"],
    correctIndex: 1,
  },
  {
    id: 7,
    text: "Which process is important in gametogenesis?",
    options: ["Meiosis", "Digestion", "Respiration", "Filtration"],
    correctIndex: 0,
  },
  {
    id: 8,
    text: "What is the main difference between spermatogenesis and oogenesis?",
    options: [
      "Both produce sperm cells.",
      "Spermatogenesis produces sperm cells and oogenesis produces egg cells.",
      "Both occur in the testes.",
      "Oogenesis produces sperm cells.",
    ],
    correctIndex: 1,
  },
  {
    id: 9,
    text: "How many sperm cells can result from one primary spermatocyte after meiosis?",
    options: ["1", "2", "3", "4"],
    correctIndex: 3,
  },
  {
    id: 10,
    text: "Why is gametogenesis important for human reproduction?",
    options: [
      "It produces the gametes needed for fertilization.",
      "It produces muscle cells.",
      "It produces only hormones.",
      "It produces blood cells.",
    ],
    correctIndex: 0,
  },
];

export const QUESTION_COUNT = QUESTIONS.length;
export const QUESTION_TIME_MS = 15_000;
export const MAX_POINTS_PER_QUESTION = 1_000;
export const MAX_PLAYERS = 27;
export const MAX_NAME_LENGTH = 24;

// ---------------------------------------------------------------------------
// Scoring: faster answer = more points. Max 1,000 per question.
// e.g. answered with 15s left -> 1000, 12s left -> 800, 3s left -> 200.
// ---------------------------------------------------------------------------
export function scoreForTimeLeftMs(timeLeftMs: number): number {
  const clamped = Math.min(QUESTION_TIME_MS, Math.max(0, timeLeftMs));
  return Math.round((clamped / QUESTION_TIME_MS) * MAX_POINTS_PER_QUESTION);
}

// ---------------------------------------------------------------------------
// Fisher-Yates shuffle
// ---------------------------------------------------------------------------
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type PreparedQuestion = {
  id: number;
  text: string;
  options: string[];
  correctIndex: number;
  originalIndex: number;
};

/**
 * Randomizes the question order AND the option order for every game,
 * always preserving the correct answer.
 */
export function prepareQuestions(): PreparedQuestion[] {
  return shuffle(QUESTIONS).map((q, originalIndex) => {
    const order = shuffle([0, 1, 2, 3] as const);
    const correct = order.indexOf(q.correctIndex);
    return {
      id: q.id,
      text: q.text,
      options: order.map((i) => q.options[i]),
      correctIndex: correct,
      originalIndex,
    };
  });
}

/** Prepare questions but keep only the ones not answered yet (used to resume after a refresh). */
export function prepareRemainingQuestions(answeredQuestionIds: Set<number>): PreparedQuestion[] {
  const remaining = QUESTIONS.filter((q) => !answeredQuestionIds.has(q.id));
  return remaining.map((q, originalIndex) => {
    const order = shuffle([0, 1, 2, 3] as const);
    const correct = order.indexOf(q.correctIndex);
    return {
      id: q.id,
      text: q.text,
      options: order.map((i) => q.options[i]),
      correctIndex: correct,
      originalIndex,
    };
  });
}

export const LETTERS = ["A", "B", "C", "D"] as const;

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatAvgSeconds(totalResponseTimeMs: number, answeredCount: number): string {
  if (answeredCount <= 0) return "0.0";
  return ((totalResponseTimeMs / answeredCount) / 1000).toFixed(1);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}