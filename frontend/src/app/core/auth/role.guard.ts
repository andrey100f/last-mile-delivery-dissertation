import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthRedirectService } from '@core/auth/auth-redirect.service';
import type { AppRouteData } from '../../app.routes.types';
import { AuthService } from '@core/services/auth/auth';
import { MessageService } from 'primeng/api';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const messages = inject(MessageService);
  const redirect = inject(AuthRedirectService);

  const data = route.data as AppRouteData;
  const roles = data['roles'];
  if (roles === undefined || roles.length === 0) {
    return true;
  }

  const userRole = auth.getCurrentRole();
  if (userRole === null) {
    auth.logout();
    redirect.persistReturnUrlMirror(state.url);
    return router.createUrlTree(['/login']);
  }

  if (roles.includes(userRole)) {
    return true;
  }

  messages.add({
    severity: 'warn',
    summary: 'Access denied',
    detail: 'You do not have permission to open this area.',
    life: 5000,
  });

  return router.createUrlTree(['/forbidden']);
};
