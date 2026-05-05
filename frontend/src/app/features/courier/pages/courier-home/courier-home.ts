import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PageTopBarComponent } from '../../../../layout/page-top-bar/page-top-bar.component';
import {
  DeliveryStatus,
  StatusTagComponent,
  TableEmptyStateComponent,
} from '@shared/ui/public-api';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';

interface CourierRequestRow {
  id: string;
  pickup: string;
  dropoff: string;
  status: DeliveryStatus;
}

@Component({
  selector: 'app-courier-home',
  imports: [
    PageTopBarComponent,
    StatusTagComponent,
    TableModule,
    TableEmptyStateComponent,
    Skeleton,
  ],
  templateUrl: './courier-home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourierHome {
  protected readonly loading = signal(false);
  protected readonly currentStatus = DeliveryStatus.IN_TRANSIT;
  protected readonly availableRequests: CourierRequestRow[] = [];
  protected readonly loadingSkeletonRows = [0, 1, 2];
}
