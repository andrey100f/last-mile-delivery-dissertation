import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { catchError, throwError } from 'rxjs';
import { AuthRedirectService } from './auth-redirect.service';
import { isAuthSkipped } from './auth-skip';
import { sanitizeInternalReturnUrl } from './return-url';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const redirect = inject(AuthRedirectService);

  if (isAuthSkipped(req)) {
    return next(req);
  }

  const token = auth.getAccessToken();
  const outbound =
    token !== null && token.length > 0
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(outbound).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        auth.logout();
        const returnUrl = sanitizeInternalReturnUrl(router.url);
        redirect.scheduleLoginRedirect(returnUrl);
      }
      return throwError(() => err);
    }),
  );
};
