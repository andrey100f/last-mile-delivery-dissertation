import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { provideUserBootstrapInitializer } from '@core/services/user/user.initializer';
import { provideRouter, withViewTransitions } from '@angular/router';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import DeliveryPreset from './core/theme/delivery.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideUserBootstrapInitializer(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(routes, withViewTransitions()),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: DeliveryPreset,
        options: {
          darkModeSelector: '.dark',
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng, utilities',
          },
        },
      },
    }),
  ],
};
