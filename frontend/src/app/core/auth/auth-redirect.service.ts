import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { sanitizeInternalReturnUrl } from './return-url';

/**
 * Session mirror for `returnUrl` when the query string is dropped. Cleared on each 401 redirect
 * before writing a new value so a stale entry cannot survive. Read on successful login in
 * `LoginPage` (query param takes precedence).
 */
export const AUTH_RETURN_URL_SESSION_KEY = 'deliveryhub.returnUrl';

@Injectable({
  providedIn: 'root',
})
export class AuthRedirectService {
  private readonly router = inject(Router);
  private loginRedirectInFlight = false;

  scheduleLoginRedirect(returnUrl: string | undefined): void {
    const [current = this.router.url] = this.router.url.split('?');
    if (current === '/login' || current.endsWith('/login')) {
      return;
    }
    if (this.loginRedirectInFlight) {
      return;
    }
    this.loginRedirectInFlight = true;

    sessionStorage.removeItem(AUTH_RETURN_URL_SESSION_KEY);

    const safeReturn = returnUrl ? sanitizeInternalReturnUrl(returnUrl) : undefined;
    if (safeReturn) {
      sessionStorage.setItem(AUTH_RETURN_URL_SESSION_KEY, safeReturn);
    }

    const queryParams = safeReturn ? { returnUrl: safeReturn } : undefined;

    void this.router
      .navigate(['/login'], { queryParams, replaceUrl: true })
      .finally(() => {
        this.loginRedirectInFlight = false;
      });
  }
}
