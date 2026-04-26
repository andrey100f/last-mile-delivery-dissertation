import { HttpRequest } from '@angular/common/http';

/**
 * Keep in sync with public API list; Bearer on login breaks nothing server-side but
 * confuses debugging and violates acceptance (GH-12 / #27).
 */
export function isAuthSkipped(req: HttpRequest<unknown>): boolean {
  const url = req.url.toLowerCase();
  if (url.includes('/auth/login')) {
    return true;
  }
  if (url.includes('/auth/register')) {
    return true;
  }
  if (url.includes('/actuator/health')) {
    return true;
  }
  return false;
}
