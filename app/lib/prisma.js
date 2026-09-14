import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to connect to the database.");
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });

// Preserve the client across development hot reloads.
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
