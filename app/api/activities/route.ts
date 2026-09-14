import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { errorResponse } from "../../lib/api-response";
import { activityRelations } from "../../lib/activity-query";
import { validateActivityInput } from "../../lib/activity-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      include: activityRelations,
    });
    return Response.json(activities);
  } catch (error: unknown) {
    console.error("Failed to retrieve activities:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to retrieve activities.");
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const validation = validateActivityInput(body);
  if (validation.valid === false) {
    return errorResponse(400, "VALIDATION_ERROR", "The activity data is invalid.", validation.errors);
  }
  try {
    const { wordListId, ...fields } = validation.data;
    const parent = await prisma.wordList.findUnique({ where: { id: wordListId }, select: { id: true } });
    if (!parent) return errorResponse(404, "NOT_FOUND", "Word list not found.");

    const data = { ...fields, wordList: { connect: { id: wordListId } } } satisfies Prisma.ActivityCreateInput;
    const activity = await prisma.activity.create({ data, include: activityRelations });
    return Response.json(activity, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025" || error.code === "P2003") {
        return errorResponse(404, "NOT_FOUND", "Word list not found.");
      }
      if (error.code === "P2002") {
        return errorResponse(409, "CONFLICT", "An activity with those details already exists.");
      }
    }
    console.error("Failed to create activity:", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to create activity.");
  }
}
