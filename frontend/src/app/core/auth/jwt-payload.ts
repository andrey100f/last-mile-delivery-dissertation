/** Best-effort JWT payload read for `exp` checks; does not verify signature. */
export function readJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2 || parts[1] === undefined) {
    return null;
  }
  try {
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** JWT `sub` (user id), as issued by the backend. */
export function readJwtSubject(token: string): string | null {
  const v = readJwtPayload(token)?.['sub'];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function isJwtExpired(token: string, nowMs = Date.now()): boolean {
  const payload = readJwtPayload(token);
  const exp = payload?.['exp'];
  if (typeof exp !== 'number') {
    return false;
  }
  return exp * 1000 <= nowMs;
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return atob(padded + '='.repeat(padLen));
}
