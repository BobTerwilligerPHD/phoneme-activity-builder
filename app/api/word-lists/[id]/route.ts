import { Prisma } from "../../../generated/prisma/client";
import { errorResponse } from "../../../lib/api-response";
import { prisma } from "../../../lib/prisma";
import { validateWordListInput } from "../../../lib/validation";
import { wordListRelations } from "../../../lib/word-list-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const wordList = await prisma.wordList.findUnique({
      where: { id },
      include: wordListRelations,
    });

    if (!wordList) {
      return errorResponse(404, "NOT_FOUND", "Word list not found.");
    }

    return Response.json(wordList);
  } catch (error: unknown) {
    console.error("Failed to retrieve word list:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to retrieve word list.");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateWordListInput(body, { partial: true });

  if (validation.valid === false) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "The word list data is invalid.",
      validation.errors,
    );
  }

  try {
    const wordList = await prisma.wordList.update({
      where: { id },
      data: validation.data,
      include: wordListRelations,
    });

    return Response.json(wordList);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return errorResponse(404, "NOT_FOUND", "Word list not found.");
    }

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

    console.error("Failed to update word list:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to update word list.");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    await prisma.wordList.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return errorResponse(404, "NOT_FOUND", "Word list not found.");
    }

    console.error("Failed to delete word list:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to delete word list.");
  }
}
