/**
 * What may be logged about an error: its name and first line. Google client
 * errors carry the request (with the Authorization header) and Prisma errors
 * can echo the query's arguments (tokens, event text), so the object itself
 * is never logged.
 */
export function errorSummary(error: unknown): string {
  if (!(error instanceof Error)) return typeof error;
  const firstLine = error.message.split("\n").find((line) => line.trim()) ?? "";
  return `${error.name}: ${firstLine.trim().slice(0, 200)}`;
}
