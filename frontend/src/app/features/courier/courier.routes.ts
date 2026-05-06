import { Routes } from '@angular/router';

const loadStub = () =>
  import('@shared/pages/portal-route-stub/portal-route-stub').then(
    (m) => m.PortalRouteStub,
  );

export const courierRoutes: Routes = [
  {
    path: '',
    data: { pageTitle: 'Dashboard' },
    loadComponent: () =>
      import('./pages/courier-home/courier-home').then((m) => m.CourierHome),
  },
  {
    path: 'requests',
    loadComponent: loadStub,
    data: { pageTitle: 'Requests' },
  },
  {
    path: 'active',
    loadComponent: loadStub,
    data: { pageTitle: 'Active delivery' },
  },
  {
    path: 'earnings',
    loadComponent: loadStub,
    data: { pageTitle: 'Earnings' },
  },
  {
    path: 'profile',
    loadComponent: loadStub,
    data: { pageTitle: 'Profile' },
  },
];
