/**
 * Class join codes.
 *
 * Read off a whiteboard and typed by a student who has never seen it written
 * down, so the alphabet drops every character that is ambiguous in a common
 * font: no I or 1, no O or 0. Six characters from the remaining 32 give around
 * a billion combinations, far more than a code that lives for one semester
 * needs.
 */

/** Deliberately missing I, O, 0 and 1. Matches the CHECK on classes.join_code. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function generateJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.min(ALPHABET.length - 1, Math.floor(random() * ALPHABET.length))];
  }
  return code;
}

/**
 * What the student typed, tidied.
 *
 * Case and the separators people add when reading aloud are corrected, because
 * they are certainly not what was meant. An excluded character is left alone
 * rather than guessed at: a typed O could be a Q or a D, and silently picking
 * one would enrol someone in the wrong class instead of telling them the code
 * is wrong.
 */
export function normaliseJoinCode(input: string): string {
  return String(input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidJoinCode(code: string): boolean {
  return new RegExp(`^[A-HJ-NP-Z2-9]{${CODE_LENGTH}}$`).test(code);
}

/** Why a code was rejected, phrased for the person who typed it. */
export function joinCodeProblem(raw: string): string | null {
  const code = normaliseJoinCode(raw);
  if (!code) return null; // Empty is not an error; the field is optional.
  if (code.length !== CODE_LENGTH) {
    return `A join code is ${CODE_LENGTH} characters. You entered ${code.length}.`;
  }
  if (/[IO01]/.test(code)) {
    return "Join codes never contain I, O, zero or one - check for a J, Q, 2 or 7.";
  }
  return isValidJoinCode(code) ? null : "That is not a valid join code.";
}
