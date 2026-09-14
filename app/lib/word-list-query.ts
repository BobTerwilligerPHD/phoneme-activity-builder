import type { Prisma } from "../generated/prisma/client";

export const wordListRelations = {
  words: {
    include: {
      phonemes: {
        orderBy: { position: "asc" },
      },
    },
  },
} satisfies Prisma.WordListInclude;
