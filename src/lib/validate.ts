import { MAX_NAME_LENGTH, normalizeName } from "./questions";

export type NameError = "empty" | "too-long";

export function validateName(raw: string): NameError | null {
  const name = normalizeName(raw);
  if (!name) return "empty";
  if (name.length > MAX_NAME_LENGTH) return "too-long";
  return null;
}

export function samePlayerName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}