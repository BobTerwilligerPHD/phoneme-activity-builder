export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: string[],
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}
