import type { Prisma } from "../generated/prisma/client";

export const activityRelations = {
  wordList: {
    include: {
      words: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { phonemes: { orderBy: { position: "asc" } } },
      },
    },
  },
} satisfies Prisma.ActivityInclude;
