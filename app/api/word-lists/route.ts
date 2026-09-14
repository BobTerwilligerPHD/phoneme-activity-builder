import { Prisma } from "../../generated/prisma/client";
import { errorResponse } from "../../lib/api-response";
import { prisma } from "../../lib/prisma";
import { validateWordListInput } from "../../lib/validation";
import { wordListRelations } from "../../lib/word-list-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const wordLists = await prisma.wordList.findMany({
      orderBy: { updatedAt: "desc" },
      include: wordListRelations,
    });

    return Response.json(wordLists);
  } catch (error: unknown) {
    console.error("Failed to retrieve word lists:", error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Unable to retrieve word lists.",
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateWordListInput(body);

  if (validation.valid === false) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "The word list data is invalid.",
      validation.errors,
    );
  }

  try {
    const wordList = await prisma.wordList.create({
      data: validation.data,
      include: wordListRelations,
    });

    return Response.json(wordList, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse(
        409,
        "CONFLICT",
        "A word list with those details already exists.",
      );
    }

    console.error("Failed to create word list:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to create word list.");
  }
}
