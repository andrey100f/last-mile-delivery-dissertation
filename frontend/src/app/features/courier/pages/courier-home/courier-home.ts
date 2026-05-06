import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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
  protected readonly availableRequests = signal<CourierRequestRow[]>([]);
  protected readonly currentStatus = computed<string | DeliveryStatus | null>(
    () => this.availableRequests()[0]?.status ?? null,
  );
  protected readonly loadingSkeletonRows = [0, 1, 2];
}
