import { inject, provideAppInitializer } from '@angular/core';
import { AuthService } from '@core/services/auth/auth';
import { UserService } from '@core/services/user/user';
import { catchError, firstValueFrom, of } from 'rxjs';

export function provideUserBootstrapInitializer() {
  return provideAppInitializer(() => {
    const auth = inject(AuthService);
    const userService = inject(UserService);

    if (!auth.isAccessTokenPresentAndValid()) {
      userService.clearCurrentUser();
      return;
    }

    return firstValueFrom(
      userService.refreshCurrentUser().pipe(catchError(() => of(null))),
    );
  });
}
