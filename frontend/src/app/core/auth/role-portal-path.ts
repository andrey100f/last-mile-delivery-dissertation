import { UserRole } from '@core/services/enum/auth.types';

export function pathPrefixForRole(role: UserRole): string {
  switch (role) {
    case UserRole.CUSTOMER:
      return '/customer';
    case UserRole.COURIER:
      return '/courier';
    case UserRole.ADMIN:
      return '/admin';
  }
}
