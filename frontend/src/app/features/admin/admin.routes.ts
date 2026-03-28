import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/admin-home/admin-home').then((m) => m.AdminHome),
  },
];
