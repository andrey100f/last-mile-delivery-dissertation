import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageTopBarComponent } from '../../../../layout/page-top-bar/page-top-bar.component';
import {
  DeliveryStatus,
  StatusTagComponent,
  TableEmptyStateComponent,
} from '@shared/ui/public-api';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';

interface CustomerDeliveryRow {
  id: string;
  destination: string;
  destinationHint: string;
  courierName?: string;
  status: DeliveryStatus;
  eta: string;
}

@Component({
  selector: 'app-customer-home',
  imports: [
    PageTopBarComponent,
    TableModule,
    StatusTagComponent,
    TableEmptyStateComponent,
    Skeleton,
    RouterLink,
  ],
  templateUrl: './customer-home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerHome {
  protected readonly loading = signal(false);

  protected readonly deliveries: CustomerDeliveryRow[] = [
    {
      id: 'DLV-001',
      destination: '123 Main St, New York',
      destinationHint: 'to 456 Park Ave, Brooklyn',
      courierName: 'Mike Johnson',
      status: DeliveryStatus.ASSIGNED,
      eta: '15 min',
    },
    {
      id: 'DLV-002',
      destination: '789 Broadway, Manhattan',
      destinationHint: 'to 321 5th Ave, Queens',
      status: DeliveryStatus.CREATED,
      eta: 'Waiting for courier',
    },
    {
      id: 'DLV-003',
      destination: '555 Central Park West',
      destinationHint: 'to 888 Brooklyn Bridge',
      courierName: 'Sarah Williams',
      status: DeliveryStatus.IN_TRANSIT,
      eta: '25 min',
    },
  ];

  protected readonly loadingSkeletonRows = [0, 1, 2];
}
