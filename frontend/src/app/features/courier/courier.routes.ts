import { Routes } from '@angular/router';

const loadStub = () =>
  import('@shared/pages/portal-route-stub/portal-route-stub').then(
    (m) => m.PortalRouteStub,
  );

export const courierRoutes: Routes = [
  {
    path: '',
    data: {
      pageTitle: 'Dashboard',
      subtitle: "Welcome back! Here's your work overview",
    },
    loadComponent: () =>
      import('./pages/courier-home/courier-home').then((m) => m.CourierHome),
  },
  {
    path: 'requests',
    loadComponent: () =>
      import('./pages/delivery-requests/delivery-requests').then(
        (m) => m.DeliveryRequestsPage,
      ),
    data: {
      pageTitle: 'Available Delivery Requests',
      subtitle: 'Browse and accept delivery requests',
    },
  },
  {
    path: 'delivery/:id',
    loadComponent: () =>
      import('./pages/courier-delivery-detail/courier-delivery-detail').then(
        (m) => m.CourierDeliveryDetailPage,
      ),
    data: {
      pageTitle: 'Delivery details',
      subtitle: 'Review route and payout before accepting',
    },
  },
  {
    path: 'active',
    loadComponent: () =>
      import('./pages/active-deliveries/active-deliveries').then(
        (m) => m.ActiveDeliveriesPage,
      ),
    data: {
      pageTitle: 'Active deliveries',
      subtitle: 'Track your ongoing jobs and priorities',
    },
  },
  {
    path: 'active/:id',
    loadComponent: () =>
      import('./pages/active-delivery/active-delivery').then(
        (m) => m.ActiveDeliveryPage,
      ),
    data: { pageTitle: 'Active delivery' },
  },
  {
    path: 'earnings',
    loadComponent: loadStub,
    data: { pageTitle: 'Earnings' },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/courier-profile/courier-profile').then(
        (m) => m.CourierProfilePage,
      ),
    data: {
      pageTitle: 'Profile & Availability',
      subtitle: 'Manage your account and work preferences',
    },
  },
];
