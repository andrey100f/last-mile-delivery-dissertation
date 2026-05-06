import { Routes } from '@angular/router';

const loadStub = () =>
  import('@shared/pages/portal-route-stub/portal-route-stub').then(
    (m) => m.PortalRouteStub,
  );

export const customerRoutes: Routes = [
  {
    path: '',
    data: {
      pageTitle: 'Dashboard',
      subtitle: "Welcome back! Here's your delivery overview",
    },
    loadComponent: () =>
      import('./pages/customer-home/customer-home').then((m) => m.CustomerHome),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/create-delivery/create-delivery').then(
        (m) => m.CreateDeliveryPage,
      ),
    data: {
      pageTitle: 'Create New Delivery',
      subtitle: 'Fill in the delivery details below',
    },
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
