import type { Prisma } from "../generated/prisma/client";
import type { ValidationResult } from "./validation";
import { isNonArrayObject, unsupportedFields as getUnsupportedFields } from "./validation-helpers";

export type WordCreateData = Pick<Prisma.WordCreateInput, "text" | "hint"> & {
  phonemes: string[];
};

export type WordUpdateData = Partial<WordCreateData>;

const SUPPORTED_FIELDS = ["text", "hint", "phonemes"] as const;

export function validateWordInput(
  input: unknown,
  options: { partial: true },
): ValidationResult<WordUpdateData>;
export function validateWordInput(
  input: unknown,
  options?: { partial?: false },
): ValidationResult<WordCreateData>;
export function validateWordInput(
  input: unknown,
  { partial = false }: { partial?: boolean } = {},
): ValidationResult<WordUpdateData> {
  if (!isNonArrayObject(input)) {
    return { valid: false, errors: ["Request body must be a JSON object."] };
  }

  const body = input as Record<string, unknown>;
  const errors: string[] = [];
  const data: WordUpdateData = {};

  const unsupportedFields = getUnsupportedFields(body, SUPPORTED_FIELDS);

  if (unsupportedFields.length > 0) {
    errors.push(`Unsupported field(s): ${unsupportedFields.join(", ")}.`);
  }

  if (partial && !SUPPORTED_FIELDS.some((field) => Object.hasOwn(body, field))) {
    errors.push("At least one of text, hint or phonemes must be provided.");
  }

  if (!partial) {
    if (!Object.hasOwn(body, "text")) errors.push("Text is required.");
    if (!Object.hasOwn(body, "phonemes")) errors.push("Phonemes are required.");
  }

  if (Object.hasOwn(body, "text")) {
    if (typeof body.text !== "string") {
      errors.push("Text must be a string.");
    } else {
      const text = body.text.trim();
      if (text.length < 1 || text.length > 100) {
        errors.push("Text must contain between 1 and 100 characters.");
      } else {
        data.text = text;
      }
    }
  }

  if (Object.hasOwn(body, "hint")) {
    if (body.hint === null) {
      data.hint = null;
    } else if (typeof body.hint === "string") {
      const hint = body.hint.trim();
      if (hint.length > 500) {
        errors.push("Hint must contain no more than 500 characters.");
      } else {
        data.hint = hint;
      }
    } else {
      errors.push("Hint must be a string or null.");
    }
  }

  if (Object.hasOwn(body, "phonemes")) {
    if (!Array.isArray(body.phonemes) || body.phonemes.length < 1 || body.phonemes.length > 20) {
      errors.push("Phonemes must be an array containing 1 to 20 entries.");
    } else {
      const phonemes: string[] = [];
      body.phonemes.forEach((value: unknown, index: number) => {
        if (typeof value !== "string") {
          errors.push(`Phoneme ${index + 1} must be a string.`);
          return;
        }

        const symbol = value.trim();
        // Count Unicode code points, so supplementary characters count as one.
        const length = Array.from(symbol).length;
        if (length < 1 || length > 10) {
          errors.push(`Phoneme ${index + 1} must contain 1 to 10 Unicode code points.`);
        } else {
          phonemes.push(symbol);
        }
      });
      data.phonemes = phonemes;
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data };
}
