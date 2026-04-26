import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { pathPrefixForRole } from '@core/auth/role-portal-path';
import { AuthService } from '@core/services/auth/auth';

/** Authenticated users are sent to their portal; guests see the login page. */
export const loginGuestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getAccessToken();
  if (token === null || token.length === 0) {
    return true;
  }

  if (!auth.isAccessTokenPresentAndValid()) {
    auth.logout();
    return true;
  }

  const role = auth.getCurrentRole();
  if (role === null) {
    auth.logout();
    return true;
  }

  const prefix = pathPrefixForRole(role);
  return router.parseUrl(prefix);
};
