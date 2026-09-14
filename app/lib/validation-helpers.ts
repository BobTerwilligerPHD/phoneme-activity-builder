export function isNonArrayObject(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}

export function unsupportedFields(
  input: Record<string, unknown>,
  supported: readonly string[],
): string[] {
  return Object.keys(input).filter((field) => !supported.includes(field));
}
