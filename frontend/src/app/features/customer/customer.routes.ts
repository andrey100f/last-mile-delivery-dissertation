import { Routes } from '@angular/router';

const loadStub = () =>
  import('@shared/pages/portal-route-stub/portal-route-stub').then(
    (m) => m.PortalRouteStub,
  );

export const customerRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
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
    loadComponent: () =>
      import('./pages/track-delivery/track-delivery').then(
        (m) => m.TrackDeliveryPage,
      ),
    data: {
      pageTitle: 'Track delivery',
      subtitle: 'Select an active delivery to open live tracking',
    },
  },
  {
    path: 'tracking/:id',
    loadComponent: () =>
      import('./pages/live-tracking/live-tracking').then(
        (m) => m.LiveTrackingPage,
      ),
    data: {
      pageTitle: 'Track delivery',
      subtitle: 'Live delivery status and ETA updates',
    },
  },
  {
    path: 'delivery/:id',
    loadComponent: () =>
      import('./pages/delivery-detail/delivery-detail').then(
        (m) => m.DeliveryDetailPage,
      ),
    data: {
      pageTitle: 'Delivery details',
      subtitle: 'Complete delivery information and status',
    },
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
