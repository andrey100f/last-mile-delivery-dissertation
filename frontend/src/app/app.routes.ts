import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'welcome',
    loadComponent: () => import('./features/placeholder/placeholder').then((m) => m.Placeholder),
  },
  {
    path: 'customer',
    loadChildren: () => import('./features/customer/customer.routes').then((m) => m.customerRoutes),
  },
  {
    path: 'courier',
    loadChildren: () => import('./features/courier/courier.routes').then((m) => m.courierRoutes),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: '**',
    redirectTo: 'welcome',
  },
];
