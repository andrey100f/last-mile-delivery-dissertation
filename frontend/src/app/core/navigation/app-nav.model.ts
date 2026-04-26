import { UserRole } from '@core/services/enum/auth.types';

export interface NavSection {
  readonly label: string;
  readonly items: readonly NavItem[];
}

export interface NavItem {
  readonly label: string;
  /** Passed to `RouterLink` as a command array, e.g. `['customer', 'create']`. */
  readonly routerCommands: readonly (string | number)[];
  readonly icon?: string;
  readonly roles: readonly UserRole[];
  /** When true, `routerLinkActive` uses `{ exact: true }`. */
  readonly linkActiveExact?: boolean;
}
