import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminUserManagementPageComponent } from '../user-management/admin-user-management-page.component';

@Component({
  selector: 'app-admin-customers-page',
  imports: [AdminUserManagementPageComponent],
  templateUrl: './admin-customers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCustomersComponent {}
