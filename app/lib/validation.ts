import type { Prisma } from "../generated/prisma/client";
import { isNonArrayObject, unsupportedFields as getUnsupportedFields } from "./validation-helpers";

export type WordListCreateData = Pick<
  Prisma.WordListCreateInput,
  "name" | "description"
>;

export type WordListUpdateData = Partial<WordListCreateData>;

type WordListRequestBody = Record<string, unknown> & {
  name?: unknown;
  description?: unknown;
};

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: string[] };

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const SUPPORTED_FIELDS = ["name", "description"] as const;

export function validateWordListInput(
  input: unknown,
  options: { partial: true },
): ValidationResult<WordListUpdateData>;
export function validateWordListInput(
  input: unknown,
  options?: { partial?: false },
): ValidationResult<WordListCreateData>;
export function validateWordListInput(
  input: unknown,
  { partial = false }: { partial?: boolean } = {},
): ValidationResult<WordListCreateData | WordListUpdateData> {
  if (!isNonArrayObject(input)) {
    return {
      valid: false,
      errors: ["Request body must be a JSON object."],
    };
  }

  const body = input as WordListRequestBody;
  const errors: string[] = [];
  const providedFields = SUPPORTED_FIELDS.filter((field) =>
    Object.hasOwn(body, field),
  );
  const unsupportedFields = getUnsupportedFields(body, SUPPORTED_FIELDS);

  if (unsupportedFields.length > 0) {
    errors.push(`Unsupported field(s): ${unsupportedFields.join(", ")}.`);
  }

  if (partial && providedFields.length === 0) {
    errors.push("At least one of name or description must be provided.");
  }

  if (!partial && !Object.hasOwn(body, "name")) {
    errors.push("Name is required.");
  }

  const data: WordListUpdateData = {};

  if (Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string") {
      errors.push("Name must be a string.");
    } else {
      const name = body.name.trim();

      if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
        errors.push("Name must contain between 1 and 100 characters.");
      } else {
        data.name = name;
      }
    }
  }

  if (Object.hasOwn(body, "description")) {
    const descriptionValue = body.description;

    if (descriptionValue === null) {
      data.description = null;
    } else if (typeof descriptionValue === "string") {
      const description = descriptionValue.trim();

      if (description.length > DESCRIPTION_MAX_LENGTH) {
        errors.push("Description must contain no more than 500 characters.");
      } else {
        data.description = description;
      }
    } else {
      errors.push("Description must be a string or null.");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (partial) {
    return { valid: true, data };
  }

  return { valid: true, data: data as WordListCreateData };
}
