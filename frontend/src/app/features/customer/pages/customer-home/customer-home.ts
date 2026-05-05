import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DeliveryService } from '@core/services/delivery/delivery';
import { DeliverySummaryDto } from '@core/services/enum/delivery.types';
import { PageTopBarComponent } from '../../../../layout/page-top-bar/page-top-bar.component';
import {
  DeliveryStatus,
  StatusTagComponent,
  TableEmptyStateComponent,
} from '@shared/ui/public-api';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { catchError, finalize, of } from 'rxjs';

interface CustomerDeliveryRow {
  id: string;
  destination: string;
  destinationHint: string;
  courierName?: string;
  status: string | DeliveryStatus;
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
  private readonly deliveryService = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly deliveries = signal<CustomerDeliveryRow[]>([]);

  protected readonly loadingSkeletonRows = [0, 1, 2];

  constructor() {
    this.loadCustomerDeliveries();
  }

  private loadCustomerDeliveries(): void {
    this.loading.set(true);
    this.deliveryService
      .listForCurrentCustomer({ page: 0, size: 10 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() =>
          of({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
          }),
        ),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((response) => {
        this.deliveries.set(
          response.content.map((delivery) => this.mapDeliveryRow(delivery)),
        );
      });
  }

  private mapDeliveryRow(delivery: DeliverySummaryDto): CustomerDeliveryRow {
    return {
      id: this.toDeliveryCode(delivery.id),
      destination: delivery.pickupCity,
      destinationHint: `to ${delivery.destinationCity}`,
      courierName: undefined,
      status: delivery.status,
      eta: 'N/A',
    };
  }

  private toDeliveryCode(id: string): string {
    return `DLV-${id.replaceAll('-', '').slice(0, 6).toUpperCase()}`;
  }
}
