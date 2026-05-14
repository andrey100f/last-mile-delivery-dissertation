import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminUserManagementPageComponent } from '../user-management/admin-user-management-page.component';

@Component({
  selector: 'app-admin-couriers-page',
  imports: [AdminUserManagementPageComponent],
  templateUrl: './admin-couriers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCouriersComponent {}
