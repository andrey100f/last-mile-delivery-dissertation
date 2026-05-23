import { Routes } from '@angular/router';

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
    loadComponent: () =>
      import('./pages/history/customer-history').then(
        (m) => m.CustomerHistoryPage,
      ),
    data: {
      pageTitle: 'Delivery History',
      subtitle: 'View and manage your delivery history',
    },
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/customer-notifications').then(
        (m) => m.CustomerNotificationsPage,
      ),
    data: {
      pageTitle: 'Notifications',
      subtitle: 'Stay updated on your deliveries',
    },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/customer-profile/customer-profile').then(
        (m) => m.CustomerProfilePage,
      ),
    data: {
      pageTitle: 'Profile & Settings',
      subtitle: 'Manage your account and preferences',
    },
  },
];
