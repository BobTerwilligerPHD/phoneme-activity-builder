// Browser DTOs intentionally have no dependency on the Prisma client.
export type WordDto = {
  id: string;
  text: string;
  hint: string | null;
  wordListId: string;
  phonemes: { id: string; symbol: string; position: number; wordId: string }[];
};

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
      const error = payload?.error;
      if (typeof error?.message === "string") {
        const details = Array.isArray(error.details)
          ? error.details.filter((detail: unknown) => typeof detail === "string") : [];
        message = [error.message, ...details].join(" ");
      }
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
