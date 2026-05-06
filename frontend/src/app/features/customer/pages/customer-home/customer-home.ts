import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DeliveryService } from '@core/services/delivery/delivery';
import { DeliverySummaryDto } from '@core/services/enum/delivery.types';
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
    const pickup = this.toDisplayPlace(
      delivery.pickupLine1,
      'Pickup address',
    );
    const destination = this.toDisplayPlace(
      delivery.destinationLine1,
      'Destination address',
    );

    return {
      id: this.toDeliveryCode(delivery.id),
      destination,
      destinationHint: `from ${pickup}`,
      courierName: undefined,
      status: delivery.status,
      eta: this.toEtaLabel(delivery),
    };
  }

  private toEtaLabel(delivery: DeliverySummaryDto): string {
    switch (delivery.status) {
      case DeliveryStatus.CREATED:
        return 'Waiting for courier';
      case DeliveryStatus.ASSIGNED:
        return 'Courier en route';
      case DeliveryStatus.PICKED_UP:
      case DeliveryStatus.IN_TRANSIT:
        return delivery.deliveryType === 'EXPRESS' ? '1 hour' : '2-4 hours';
      case DeliveryStatus.DELIVERED:
        return 'Delivered';
      case DeliveryStatus.CANCELLED:
        return 'Cancelled';
      case DeliveryStatus.FAILED:
        return 'Delivery issue';
      default:
        return 'To be confirmed';
    }
  }

  private toDisplayPlace(
    value: string | null | undefined,
    fallback: string,
  ): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : fallback;
  }

  private toDeliveryCode(id: string): string {
    return `DLV-${id.replaceAll('-', '').slice(0, 6).toUpperCase()}`;
  }
}
