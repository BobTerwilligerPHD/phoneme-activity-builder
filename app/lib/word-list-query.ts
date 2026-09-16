import type { Prisma } from "../generated/prisma/client";

export const wordListRelations = {
  words: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      phonemes: {
        orderBy: { position: "asc" },
      },
    },
  },
} satisfies Prisma.WordListInclude;
