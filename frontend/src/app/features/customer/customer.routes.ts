import { Routes } from '@angular/router';

const loadStub = () =>
  import('@shared/pages/portal-route-stub/portal-route-stub').then(
    (m) => m.PortalRouteStub,
  );

export const customerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/customer-home/customer-home').then((m) => m.CustomerHome),
  },
  {
    path: 'create',
    loadComponent: loadStub,
    data: { pageTitle: 'Create New Delivery' },
  },
  {
    path: 'tracking',
    loadComponent: loadStub,
    data: { pageTitle: 'Track delivery' },
  },
  {
    path: 'history',
    loadComponent: loadStub,
    data: { pageTitle: 'History' },
  },
  {
    path: 'notifications',
    loadComponent: loadStub,
    data: { pageTitle: 'Notifications' },
  },
  {
    path: 'profile',
    loadComponent: loadStub,
    data: { pageTitle: 'Profile' },
  },
];
