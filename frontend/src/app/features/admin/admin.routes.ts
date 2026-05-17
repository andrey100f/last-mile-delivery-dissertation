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
    data: {
      pageTitle: 'Courier Management',
      subtitle: 'Manage courier accounts and performance',
    },
    loadComponent: () =>
      import('./pages/couriers/admin-couriers.component').then(
        (m) => m.AdminCouriersComponent,
      ),
  },
  {
    path: 'customers',
    data: {
      pageTitle: 'Customer Management',
      subtitle: 'Manage customer accounts and activity',
    },
    loadComponent: () =>
      import('./pages/customers/admin-customers.component').then(
        (m) => m.AdminCustomersComponent,
      ),
  },
  {
    path: 'exceptions',
    loadComponent: loadStub,
    data: { pageTitle: 'Exceptions' },
  },
  {
    path: 'reports',
    data: {
      pageTitle: 'Reports & Analytics',
      subtitle: 'Historical delivery, revenue and exception trends',
    },
    loadComponent: () =>
      import('./pages/reports/admin-reports.component').then(
        (m) => m.AdminReportsComponent,
      ),
  },
  {
    path: 'notifications',
    loadComponent: loadStub,
    data: { pageTitle: 'System notifications' },
  },
];
