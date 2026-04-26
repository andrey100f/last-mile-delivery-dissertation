import { Routes } from '@angular/router';
import { UserRole } from '@core/auth/auth.models';
import { authGuard } from '@core/auth/auth.guard';
import { loginGuestGuard } from '@core/auth/login-guest.guard';
import { roleGuard } from '@core/auth/role.guard';
import { AppRouteData } from './app.routes.types';

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
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.CUSTOMER] } satisfies AppRouteData,
    loadChildren: () => import('./features/customer/customer.routes').then((m) => m.customerRoutes),
  },
  {
    path: 'courier',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.COURIER] } satisfies AppRouteData,
    loadChildren: () => import('./features/courier/courier.routes').then((m) => m.courierRoutes),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.ADMIN] } satisfies AppRouteData,
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./pages/forbidden/forbidden').then((m) => m.ForbiddenPage),
  },
  {
    path: 'login',
    canActivate: [loginGuestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: '**',
    redirectTo: 'welcome',
  },
];
