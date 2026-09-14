import { Prisma } from "../../../../generated/prisma/client";
import { errorResponse } from "../../../../lib/api-response";
import { prisma } from "../../../../lib/prisma";
import { orderedPhonemeData, wordRelations } from "../../../../lib/word-query";
import { validateWordInput } from "../../../../lib/word-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateWordInput(body);
  if (validation.valid === false) {
    return errorResponse(400, "VALIDATION_ERROR", "The word data is invalid.", validation.errors);
  }

  try {
    const wordList = await prisma.wordList.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!wordList) {
      return errorResponse(404, "NOT_FOUND", "Word list not found.");
    }

    const { phonemes, ...fields } = validation.data;
    const data = {
      ...fields,
      wordList: { connect: { id } },
      phonemes: { create: orderedPhonemeData(phonemes) },
    } satisfies Prisma.WordCreateInput;
    const word = await prisma.word.create({ data, include: wordRelations });
    return Response.json(word, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return errorResponse(409, "CONFLICT", "This word already exists in the word list.");
      }
      // The parent may have been deleted after the existence check.
      if (error.code === "P2025" || error.code === "P2003") {
        return errorResponse(404, "NOT_FOUND", "Word list not found.");
      }
    }
    console.error("Failed to create word:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to create word.");
  }
}
