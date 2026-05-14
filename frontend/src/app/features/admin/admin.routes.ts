import { Routes } from '@angular/router';

const loadStub = () =>
  import('@shared/pages/portal-route-stub/portal-route-stub').then(
    (m) => m.PortalRouteStub,
  );

export const adminRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    data: {
      pageTitle: 'Dashboard',
      subtitle: 'System overview and key performance indicators',
    },
    loadComponent: () =>
      import('./pages/dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
  },
  {
    path: 'deliveries',
    loadComponent: loadStub,
    data: { pageTitle: 'Deliveries monitoring' },
  },
  {
    path: 'couriers',
    loadComponent: loadStub,
    data: { pageTitle: 'Couriers' },
  },
  {
    path: 'customers',
    loadComponent: loadStub,
    data: { pageTitle: 'Customers' },
  },
  {
    path: 'exceptions',
    loadComponent: loadStub,
    data: { pageTitle: 'Exceptions' },
  },
  {
    path: 'reports',
    loadComponent: loadStub,
    data: { pageTitle: 'Reports' },
  },
  {
    path: 'notifications',
    loadComponent: loadStub,
    data: { pageTitle: 'System notifications' },
  },
];
