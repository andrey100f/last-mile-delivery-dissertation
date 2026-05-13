import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { DeliveryService } from '@core/services/delivery/delivery';
import {
  DeliverySummaryDto,
  PageDto,
} from '@core/services/enum/delivery.types';
import {
  DeliveryStatus,
  normalizeDeliveryStatus,
  StatusTagComponent,
  TableEmptyStateComponent,
} from '@shared/ui/public-api';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { catchError, finalize, interval, of, switchMap } from 'rxjs';

interface CustomerDeliveryRow {
  id: string;
  shortId: string;
  status: string | DeliveryStatus;
  deliveryType: 'STANDARD' | 'EXPRESS';
  destination: string;
  destinationHint: string;
  courierName: string;
  totalAmount: number;
  currency: string;
}

interface DashboardStatCard {
  label: string;
  value: string;
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
}

@Component({
  selector: 'app-customer-home',
  imports: [
    CurrencyPipe,
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
  private static readonly TERMINAL_STATUSES = new Set<string>([
    DeliveryStatus.DELIVERED,
    DeliveryStatus.CANCELLED,
    DeliveryStatus.FAILED,
  ]);
  private static readonly ACTIVE_DELIVERIES_REFRESH_INTERVAL_MS = 10000;

  private readonly deliveryService = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly deliveries = signal<CustomerDeliveryRow[]>([]);
  protected readonly pageDeliveries = signal<DeliverySummaryDto[]>([]);
  protected readonly totalDeliveries = signal(0);
  protected readonly loadingSkeletonRows = [0, 1, 2, 3];

  protected readonly statCards = computed<DashboardStatCard[]>(() => {
    const activeDeliveries = this.deliveries().length;
    const fetched = this.pageDeliveries();
    const pendingPickup = fetched.filter(
      (delivery) =>
        normalizeDeliveryStatus(delivery.status) === DeliveryStatus.CREATED,
    ).length;

    return [
      {
        label: 'Active deliveries',
        value: String(activeDeliveries),
        icon: 'pi pi-box',
        iconColorClass: 'text-blue-600',
        iconBgClass: 'bg-blue-100',
      },
      {
        label: 'Pending Pickup',
        value: String(pendingPickup),
        icon: 'pi pi-clock',
        iconColorClass: 'text-amber-600',
        iconBgClass: 'bg-amber-100',
      },
      {
        label: 'Total Deliveries',
        value: String(this.totalDeliveries()),
        icon: 'pi pi-chart-line',
        iconColorClass: 'text-cyan-600',
        iconBgClass: 'bg-cyan-100',
      },
    ];
  });

  constructor() {
    this.loadCustomerDeliveries();
    this.startActiveDeliveriesPolling();
  }

  protected openDeliveryDetails(deliveryId: string): void {
    void this.router.navigate(['/customer/delivery', deliveryId]);
  }

  protected onRowSpace(event: Event, deliveryId: string): void {
    event.preventDefault();
    this.openDeliveryDetails(deliveryId);
  }

  private loadCustomerDeliveries(): void {
    this.loading.set(true);
    this.deliveryService
      .list({ page: 0, size: 10, sort: 'createdAt,desc' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(this.emptyPage())),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((response) => this.applyDeliveriesResponse(response));
  }

  private startActiveDeliveriesPolling(): void {
    interval(CustomerHome.ACTIVE_DELIVERIES_REFRESH_INTERVAL_MS)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() =>
          this.deliveryService
            .list({ page: 0, size: 10, sort: 'createdAt,desc' })
            .pipe(catchError(() => of(this.emptyPage()))),
        ),
      )
      .subscribe((response) => this.applyDeliveriesResponse(response));
  }

  private applyDeliveriesResponse(response: PageDto<DeliverySummaryDto>): void {
    this.pageDeliveries.set(response.content);
    this.totalDeliveries.set(response.totalElements);
    const activeDeliveries = response.content.filter((delivery) =>
      this.isActiveDeliveryStatus(delivery.status),
    );
    this.deliveries.set(
      activeDeliveries.map((delivery) => this.mapDeliveryRow(delivery)),
    );
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
      id: delivery.id,
      shortId: delivery.trackingCode?.trim() || '-',
      status: delivery.status,
      deliveryType: delivery.deliveryType === 'EXPRESS' ? 'EXPRESS' : 'STANDARD',
      destination,
      destinationHint: `from ${pickup}`,
      courierName: delivery.courierName?.trim() || 'Not assigned',
      totalAmount: delivery.totalAmount,
      currency: delivery.currency,
    };
  }

  private isActiveDeliveryStatus(status: string | DeliveryStatus): boolean {
    return !CustomerHome.TERMINAL_STATUSES.has(normalizeDeliveryStatus(status));
  }

  private emptyPage(): PageDto<DeliverySummaryDto> {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 0,
      number: 0,
    };
  }

  private toDisplayPlace(
    value: string | null | undefined,
    fallback: string,
  ): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : fallback;
  }
}
