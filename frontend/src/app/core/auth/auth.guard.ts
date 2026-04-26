import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthRedirectService } from '@core/auth/auth-redirect.service';
import { AuthService } from '@core/services/auth/auth';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const redirect = inject(AuthRedirectService);

  if (!auth.isAccessTokenPresentAndValid()) {
    auth.logout();
    redirect.persistReturnUrlMirror(state.url);
    return router.createUrlTree(['/login']);
  }

  return true;
};
