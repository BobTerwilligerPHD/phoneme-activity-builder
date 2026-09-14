import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { errorResponse } from "../../../lib/api-response";
import { activityRelations } from "../../../lib/activity-query";
import { validateActivityInput } from "../../../lib/activity-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const activity = await prisma.activity.findUnique({ where: { id }, include: activityRelations });
    if (!activity) return errorResponse(404, "NOT_FOUND", "Activity not found.");
    return Response.json(activity);
  } catch (error: unknown) {
    console.error("Failed to retrieve activity:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to retrieve activity.");
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
  try {
    // Read, merge, validate and write together so PATCH uses a consistent state.
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.activity.findUnique({ where: { id } });
      if (!existing) return errorResponse(404, "NOT_FOUND", "Activity not found.");
      const validation = validateActivityInput(body, existing);
      if (validation.valid === false) {
        return errorResponse(400, "VALIDATION_ERROR", "The activity data is invalid.", validation.errors);
      }
      const { wordListId, ...fields } = validation.data;
      const parent = await tx.wordList.findUnique({ where: { id: wordListId }, select: { id: true } });
      if (!parent) return errorResponse(404, "NOT_FOUND", "Word list not found.");
      const data = { ...fields, wordList: { connect: { id: wordListId } } } satisfies Prisma.ActivityUpdateInput;
      const activity = await tx.activity.update({ where: { id }, data, include: activityRelations });
      return Response.json(activity);
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return errorResponse(404, "NOT_FOUND", "Activity or word list not found.");
      if (error.code === "P2003") return errorResponse(404, "NOT_FOUND", "Word list not found.");
      if (error.code === "P2002") return errorResponse(409, "CONFLICT", "An activity with those details already exists.");
    }
    console.error("Failed to update activity:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to update activity.");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    await prisma.activity.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorResponse(404, "NOT_FOUND", "Activity not found.");
    }
    console.error("Failed to delete activity:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to delete activity.");
  }
}
