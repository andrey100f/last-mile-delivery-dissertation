import type { UserRole } from '@core/services/enum/auth.types';

export { UserRole } from '@core/services/enum/auth.types';

export interface AuthUser {
  role: UserRole;
}
