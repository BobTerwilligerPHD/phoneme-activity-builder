// Browser DTOs intentionally have no dependency on the Prisma client.
export type PhonemeDto = { id: string; symbol: string; position: number; wordId: string };

export type WordDto = {
  id: string;
  text: string;
  hint: string | null;
  wordListId: string;
  phonemes: PhonemeDto[];
};

export type ActivityType = "WORDLE" | "WORD_SEARCH";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type ActivitySettings = {
  title: string;
  wordListId: string;
  activityType: ActivityType;
  difficulty: Difficulty;
  showHints: boolean;
  includeAnswerKey: boolean;
  outputFilename: string | null;
  maxGuesses: number | null;
  gridRows: number | null;
  gridColumns: number | null;
};
export type ActivityDto = ActivitySettings & {
  id: string;
  updatedAt: string;
  wordList: WordListDto;
};
export type ApiError = { code: string; message: string; details?: string[] };

function parseApiError(payload: unknown): ApiError | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return null;
  const error = payload.error;
  if (!error || typeof error !== "object" || !("message" in error) || typeof error.message !== "string") return null;
  return {
    code: "code" in error && typeof error.code === "string" ? error.code : "REQUEST_ERROR",
    message: error.message,
    details: "details" in error && Array.isArray(error.details)
      ? error.details.filter((detail: unknown): detail is string => typeof detail === "string") : [],
  };
}

export type WordListDto = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  words: WordDto[];
};

export async function wordListRequest<T>(
  path: string,
  signal: AbortSignal,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method, signal, cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    // Never display raw server errors or a non-JSON server response.
    let message = "Unable to complete the request. Please try again.";
    if (response.status < 500) {
      const payload = await response.json().catch(() => null);
      const error = parseApiError(payload);
      if (error) {
        message = [error.message, ...(error.details ?? [])].join(" ");
      }
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
