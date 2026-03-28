import { Routes } from '@angular/router';

export const courierRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/courier-home/courier-home').then((m) => m.CourierHome),
  },
];
