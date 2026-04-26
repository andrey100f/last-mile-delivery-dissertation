import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { sanitizeInternalReturnUrl } from './return-url';

/** Session key written on 401 redirect; login / guards (#28) may read this if query params are stripped. */
export const AUTH_RETURN_URL_SESSION_KEY = 'deliveryhub.returnUrl';

@Injectable({
  providedIn: 'root',
})
export class AuthRedirectService {
  private readonly router = inject(Router);
  private loginRedirectInFlight = false;

  scheduleLoginRedirect(returnUrl: string | undefined): void {
    const current = this.router.url.split('?')[0] ?? this.router.url;
    if (current === '/login' || current.endsWith('/login')) {
      return;
    }
    if (this.loginRedirectInFlight) {
      return;
    }
    this.loginRedirectInFlight = true;

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
