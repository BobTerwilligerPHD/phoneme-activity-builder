import type { Prisma } from "../generated/prisma/client";

export const wordRelations = {
  phonemes: { orderBy: { position: "asc" } },
} satisfies Prisma.WordInclude;

export function orderedPhonemeData(
  symbols: string[],
): Prisma.PhonemeCreateWithoutWordInput[] {
  return symbols.map((symbol, position) => ({ symbol, position }));
}
