import { Data } from '@angular/router';
import { UserRole } from '@core/auth/auth.models';

export interface AppRouteData extends Data {
  roles?: UserRole[];
}
