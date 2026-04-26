import { UserRole } from '@core/services/enum/auth.types';
import { pathPrefixForRole } from './role-portal-path';

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

/**
 * After login, only allow deep links under the portal matching the authenticated role
 * (prevents a customer from being sent to `/admin` via crafted `returnUrl`).
 */
export function returnUrlAllowedForRole(
  sanitizedUrl: string | undefined,
  role: UserRole,
): string | undefined {
  if (!sanitizedUrl) {
    return undefined;
  }
  const prefix = pathPrefixForRole(role);
  if (
    sanitizedUrl === prefix ||
    sanitizedUrl.startsWith(`${prefix}/`) ||
    sanitizedUrl.startsWith(`${prefix}?`)
  ) {
    return sanitizedUrl;
  }
  return undefined;
}
