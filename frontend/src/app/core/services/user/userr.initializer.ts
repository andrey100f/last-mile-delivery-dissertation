import {inject, provideAppInitializer} from '@angular/core';
import {UserService} from '@core/services/user/user';
import {catchError, of} from 'rxjs';

export function provideUserBootstrapInitializer() {
  return provideAppInitializer(() => {
    const userService = inject(UserService);

    return userService.ensureLoaded().pipe(catchError(() => of(null)));
  })
}
