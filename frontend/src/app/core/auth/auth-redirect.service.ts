import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { sanitizeInternalReturnUrl } from './return-url';

/**
 * Session mirror for post-login deep links. No `?returnUrl=` in the URL — login reads this key
 * (and still accepts a legacy `returnUrl` query param if present). Cleared before each new write.
 */
export const AUTH_RETURN_URL_SESSION_KEY = 'deliveryhub.returnUrl';

@Injectable({
  providedIn: 'root',
})
export class AuthRedirectService {
  private readonly router = inject(Router);
  private loginRedirectInFlight = false;

  /**
   * Clears any previous value, then stores a sanitized internal path for use after login.
   * Never puts `returnUrl` in the address bar (login reads this key second, after query).
   */
  persistReturnUrlMirror(returnUrl: string | undefined): void {
    sessionStorage.removeItem(AUTH_RETURN_URL_SESSION_KEY);
    const safeReturn = returnUrl ? sanitizeInternalReturnUrl(returnUrl) : undefined;
    if (safeReturn) {
      sessionStorage.setItem(AUTH_RETURN_URL_SESSION_KEY, safeReturn);
    }
  }

  scheduleLoginRedirect(returnUrl: string | undefined): void {
    const [current = this.router.url] = this.router.url.split('?');
    if (current === '/login' || current.endsWith('/login')) {
      return;
    }
    if (this.loginRedirectInFlight) {
      return;
    }
    this.loginRedirectInFlight = true;

    this.persistReturnUrlMirror(returnUrl);

    void this.router
      .navigate(['/login'], { replaceUrl: true })
      .finally(() => {
        this.loginRedirectInFlight = false;
      });
  }
}
