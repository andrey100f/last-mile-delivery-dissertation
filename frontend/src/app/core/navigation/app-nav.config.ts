import { UserRole } from '@core/services/enum/auth.types';
import type { NavSection } from './app-nav.model';

/**
 * Single source of truth for shell navigation: each item declares which roles may see it.
 * The template must only render {@link navSectionsForRole} output so disallowed routes never
 * appear in the DOM (e.g. no `/admin` links for customers).
 */
export const APP_NAV_SECTIONS: readonly NavSection[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        routerCommands: ['customer'],
        icon: 'pi pi-home',
        roles: [UserRole.CUSTOMER],
        linkActiveExact: true,
      },
      {
        label: 'Dashboard',
        routerCommands: ['courier'],
        icon: 'pi pi-home',
        roles: [UserRole.COURIER],
        linkActiveExact: true,
      },
      {
        label: 'Dashboard',
        routerCommands: ['admin', 'dashboard'],
        icon: 'pi pi-home',
        roles: [UserRole.ADMIN],
        linkActiveExact: true,
      },
    ],
  },
  {
    label: 'Work',
    items: [
      {
        label: 'Create delivery',
        routerCommands: ['customer', 'create'],
        icon: 'pi pi-plus-circle',
        roles: [UserRole.CUSTOMER],
      },
      {
        label: 'Track delivery',
        routerCommands: ['customer', 'tracking'],
        icon: 'pi pi-map-marker',
        roles: [UserRole.CUSTOMER],
        linkActiveExact: true,
      },
      {
        label: 'History',
        routerCommands: ['customer', 'history'],
        icon: 'pi pi-history',
        roles: [UserRole.CUSTOMER],
      },
      {
        label: 'Available Requests',
        routerCommands: ['courier', 'requests'],
        icon: 'pi pi-inbox',
        roles: [UserRole.COURIER],
      },
      {
        label: 'Active Deliveries',
        routerCommands: ['courier', 'active'],
        icon: 'pi pi-send',
        roles: [UserRole.COURIER],
        linkActiveExact: true,
      },
      {
        label: 'Earnings',
        routerCommands: ['courier', 'earnings'],
        icon: 'pi pi-dollar',
        roles: [UserRole.COURIER],
      },
      {
        label: 'Couriers',
        routerCommands: ['admin', 'couriers'],
        icon: 'pi pi-users',
        roles: [UserRole.ADMIN],
      },
      {
        label: 'Customers',
        routerCommands: ['admin', 'customers'],
        icon: 'pi pi-user',
        roles: [UserRole.ADMIN],
      },
    ],
  },
  {
    label: 'Insights & alerts',
    items: [
      {
        label: 'Reports',
        routerCommands: ['admin', 'reports'],
        icon: 'pi pi-chart-bar',
        roles: [UserRole.ADMIN],
      },
      {
        label: 'System notifications',
        routerCommands: ['admin', 'notifications'],
        icon: 'pi pi-bell',
        roles: [UserRole.ADMIN],
      },
    ],
  },
  {
    label: 'You',
    items: [
      {
        label: 'Notifications',
        routerCommands: ['customer', 'notifications'],
        icon: 'pi pi-bell',
        roles: [UserRole.CUSTOMER],
      },
      {
        label: 'Profile',
        routerCommands: ['customer', 'profile'],
        icon: 'pi pi-id-card',
        roles: [UserRole.CUSTOMER],
      },
      {
        label: 'Profile & Availability',
        routerCommands: ['courier', 'profile'],
        icon: 'pi pi-id-card',
        roles: [UserRole.COURIER],
      },
    ],
  },
] as const;
