import type { Activity } from "../generated/prisma/client";
import type { ValidationResult } from "./validation";
import { isNonArrayObject, unsupportedFields } from "./validation-helpers";

export type ActivityData = Pick<Activity,
  "title" | "wordListId" | "activityType" | "difficulty" | "showHints" |
  "includeAnswerKey" | "outputFilename" | "maxGuesses" | "gridRows" | "gridColumns"
>;

const SUPPORTED_FIELDS = [
  "title", "wordListId", "activityType", "difficulty", "showHints",
  "includeAnswerKey", "outputFilename", "maxGuesses", "gridRows", "gridColumns",
] as const;

function integerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

// Passing the existing record enables PATCH and validation of the merged state.
export function validateActivityInput(
  input: unknown,
  existing?: ActivityData,
): ValidationResult<ActivityData> {
  if (!isNonArrayObject(input)) {
    return { valid: false, errors: ["Request body must be a JSON object."] };
  }

  const errors: string[] = [];
  const rejected = unsupportedFields(input, SUPPORTED_FIELDS);
  if (rejected.length > 0) {
    errors.push(`Unsupported field(s): ${rejected.join(", ")}.`);
  }
  if (existing && !SUPPORTED_FIELDS.some((field) => Object.hasOwn(input, field))) {
    errors.push("At least one supported activity field must be provided.");
  }

  const merged: Record<string, unknown> = {
    showHints: true,
    includeAnswerKey: false,
    outputFilename: null,
    ...existing,
    ...input,
  };

  if (typeof merged.title !== "string" || merged.title.trim().length < 1 || merged.title.trim().length > 100) {
    errors.push("Title must contain between 1 and 100 characters.");
  } else {
    merged.title = merged.title.trim();
  }
  if (typeof merged.wordListId !== "string" || merged.wordListId.trim().length === 0) {
    errors.push("Word list ID must be a non-empty string.");
  } else {
    merged.wordListId = merged.wordListId.trim();
  }
  if (merged.activityType !== "WORDLE" && merged.activityType !== "WORD_SEARCH") {
    errors.push("Activity type must be WORDLE or WORD_SEARCH.");
  }
  if (merged.difficulty !== "EASY" && merged.difficulty !== "MEDIUM" && merged.difficulty !== "HARD") {
    errors.push("Difficulty must be EASY, MEDIUM or HARD.");
  }
  for (const field of ["showHints", "includeAnswerKey"] as const) {
    if (typeof merged[field] !== "boolean") errors.push(`${field} must be a boolean.`);
  }
  if (merged.outputFilename !== null) {
    if (typeof merged.outputFilename !== "string" ||
        merged.outputFilename.trim().length < 1 || merged.outputFilename.trim().length > 100 ||
        /[/\\]/.test(merged.outputFilename)) {
      errors.push("Output filename must be null or a non-empty string of at most 100 characters without path separators.");
    } else {
      merged.outputFilename = merged.outputFilename.trim();
    }
  }

  // Validate every supplied setting, even if the selected type will clear it.
  for (const field of ["maxGuesses", "gridRows", "gridColumns"] as const) {
    const min = field === "maxGuesses" ? 1 : 5;
    const max = field === "maxGuesses" ? 10 : 20;
    if (Object.hasOwn(input, field) && !integerInRange(input[field], min, max)) {
      errors.push(`${field} must be an integer from ${min} to ${max}.`);
    }
  }

  const creatingOrSwitching = !existing || existing.activityType !== merged.activityType;
  if (merged.activityType === "WORDLE") {
    if (!Object.hasOwn(input, "maxGuesses") && creatingOrSwitching &&
        !integerInRange(merged.maxGuesses, 1, 10)) {
      merged.maxGuesses = 6;
    }
    if (!Object.hasOwn(input, "maxGuesses") && !integerInRange(merged.maxGuesses, 1, 10)) {
      errors.push("maxGuesses must be an integer from 1 to 10.");
    }
    merged.gridRows = null;
    merged.gridColumns = null;
  } else if (merged.activityType === "WORD_SEARCH") {
    for (const field of ["gridRows", "gridColumns"] as const) {
      if (!Object.hasOwn(input, field) && creatingOrSwitching && !integerInRange(merged[field], 5, 20)) {
        merged[field] = 10;
      }
      if (!Object.hasOwn(input, field) && !integerInRange(merged[field], 5, 20)) {
        errors.push(`${field} must be an integer from 5 to 20.`);
      }
    }
    merged.maxGuesses = null;
  }

  if (errors.length > 0) return { valid: false, errors };

  // Return only supported fields, never record IDs, timestamps or relations.
  const data = Object.fromEntries(SUPPORTED_FIELDS.map((field) => [field, merged[field]]));
  return { valid: true, data: data as ActivityData };
}
