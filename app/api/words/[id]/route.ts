import { Prisma } from "../../../generated/prisma/client";
import { errorResponse } from "../../../lib/api-response";
import { prisma } from "../../../lib/prisma";
import { orderedPhonemeData, wordRelations } from "../../../lib/word-query";
import { validateWordInput } from "../../../lib/word-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const word = await prisma.word.findUnique({ where: { id }, include: wordRelations });
    if (!word) return errorResponse(404, "NOT_FOUND", "Word not found.");
    return Response.json(word);
  } catch (error: unknown) {
    console.error("Failed to retrieve word:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to retrieve word.");
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

  const validation = validateWordInput(body, { partial: true });
  if (validation.valid === false) {
    return errorResponse(400, "VALIDATION_ERROR", "The word data is invalid.", validation.errors);
  }

  const { phonemes, ...fields } = validation.data;
  try {
    const word = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (phonemes !== undefined) {
        // Delete first to avoid collisions on the unique wordId/position pair.
        // Both deletion and recreation roll back if the word update fails.
        await tx.phoneme.deleteMany({ where: { wordId: id } });
      }
      const data: Prisma.WordUpdateInput = { ...fields };
      if (phonemes !== undefined) {
        data.phonemes = { create: orderedPhonemeData(phonemes) };
      }
      return tx.word.update({ where: { id }, data, include: wordRelations });
    });
    return Response.json(word);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return errorResponse(404, "NOT_FOUND", "Word not found.");
      }
      if (error.code === "P2002") {
        return errorResponse(409, "CONFLICT", "This word already exists in the word list.");
      }
    }
    console.error("Failed to update word:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to update word.");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    await prisma.word.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorResponse(404, "NOT_FOUND", "Word not found.");
    }
    console.error("Failed to delete word:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to delete word.");
  }
}
