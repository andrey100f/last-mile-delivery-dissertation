/** Internal app paths only; blocks protocol-relative and absolute URLs (for #28 / open-redirect safety). */
export function sanitizeInternalReturnUrl(raw: string): string | undefined {
  const [pathAndQuery = raw] = raw.split('#');
  if (!pathAndQuery.startsWith('/')) {
    return undefined;
  }
  if (pathAndQuery.startsWith('//') || pathAndQuery.includes('//')) {
    return undefined;
  }
  const lower = pathAndQuery.toLowerCase();
  if (lower.includes('http:') || lower.includes('https:')) {
    return undefined;
  }
  const [pathOnly = pathAndQuery] = pathAndQuery.split('?');
  if (pathOnly === '/login' || pathOnly.endsWith('/login')) {
    return undefined;
  }
  return pathAndQuery;
}
