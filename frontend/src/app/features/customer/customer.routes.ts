import { Routes } from '@angular/router';

export const customerRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/customer-home/customer-home').then((m) => m.CustomerHome),
  },
];
