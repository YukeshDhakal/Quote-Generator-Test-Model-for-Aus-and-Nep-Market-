/** Rejects a request body containing any key not in `allowed` - "validate at the boundary,
 * reject unknown fields rather than passing them through." A client sending an unexpected field
 * (stale UI, typo, or a deliberate probe) gets a clear 400 instead of the extra field being
 * silently dropped. Only guards against *extra* keys; missing/required fields stay each route's
 * own concern. Returns an error message to send as {error: message}, or null if the body is clean. */
export function rejectUnknownFields(body: unknown, allowed: readonly string[]): string | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(body).filter((key) => !allowedSet.has(key));
  return unknown.length > 0 ? `unexpected field(s): ${unknown.join(', ')}` : null;
}
