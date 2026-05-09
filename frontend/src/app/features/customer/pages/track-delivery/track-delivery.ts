import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DeliveryService } from '@core/services/delivery/delivery';
import {
  DeliverySummaryDto,
  PageDto,
} from '@core/services/enum/delivery.types';
import { StatusTagComponent, TableEmptyStateComponent } from '@shared/ui/public-api';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { catchError, finalize, of, Subscription } from 'rxjs';
import { TrackingSocketEvent } from '../../models/tracking.models';
import { TrackingSocketService } from '../../services/tracking-socket.service';

interface CustomerActiveDeliveryCard {
  id: string;
  shortId: string;
  status: string;
  deliveryType: 'STANDARD' | 'EXPRESS';
  pickup: string;
  destination: string;
  totalAmount: number;
  currency: string;
}

@Component({
  selector: 'app-track-delivery-page',
  imports: [Button, Skeleton, StatusTagComponent, TableEmptyStateComponent],
  templateUrl: './track-delivery.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackDeliveryPage {
  private static readonly TERMINAL_STATUSES = new Set<string>([
    'DELIVERED',
    'CANCELLED',
    'FAILED',
  ]);

  private readonly deliveryService = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly trackingSocketService = inject(TrackingSocketService);
  private readonly socketSubscriptions = new Map<string, Subscription>();

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeDeliveries = signal<CustomerActiveDeliveryCard[]>([]);
  protected readonly loadingSkeletonCards = [0, 1, 2, 3];

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanupSocketSubscriptions());
    this.loadActiveDeliveries();
  }

  protected openTracking(deliveryId: string): void {
    void this.router.navigate(['/customer/tracking', deliveryId], {
      state: { trackingSource: 'active-deliveries' },
    });
  }

  protected retry(): void {
    this.loadActiveDeliveries();
  }

  private loadActiveDeliveries(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.deliveryService
      .listForCurrentCustomer({
        page: 0,
        size: 24,
        sort: 'updatedAt,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError.set('Could not load active deliveries. Please retry.');
          return of<PageDto<DeliverySummaryDto>>({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
          });
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((response) => {
        const content = Array.isArray(response.content) ? response.content : [];
        const activeOnly = content.filter(
          (item) => !TrackDeliveryPage.TERMINAL_STATUSES.has((item.status || '').toUpperCase()),
        );
        const nextCards = activeOnly.map((item) => ({
          id: item.id,
          shortId: item.trackingCode?.trim() || '-',
          status: item.status || 'CREATED',
          deliveryType: item.deliveryType === 'EXPRESS' ? ('EXPRESS' as const) : ('STANDARD' as const),
          pickup: this.toDisplayPlace(item.pickupLine1),
          destination: this.toDisplayPlace(item.destinationLine1),
          totalAmount: Number.isFinite(item.totalAmount) ? item.totalAmount : 0,
          currency: item.currency || 'RON',
        }));
        this.activeDeliveries.set(nextCards);
        this.syncSocketSubscriptions(nextCards.map((item) => item.id));
      });
  }

  private toDisplayPlace(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : 'Address unavailable';
  }

  private syncSocketSubscriptions(deliveryIds: string[]): void {
    const incomingIds = new Set(deliveryIds.map((id) => id.trim()).filter((id) => id.length > 0));

    for (const [deliveryId, subscription] of this.socketSubscriptions) {
      if (incomingIds.has(deliveryId)) {
        continue;
      }
      subscription.unsubscribe();
      this.socketSubscriptions.delete(deliveryId);
      this.trackingSocketService.unwatchDelivery(deliveryId);
    }

    for (const deliveryId of incomingIds) {
      if (this.socketSubscriptions.has(deliveryId)) {
        continue;
      }
      const subscription = this.trackingSocketService
        .watchDelivery(deliveryId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => this.applyRealtimeUpdate(event));
      this.socketSubscriptions.set(deliveryId, subscription);
    }
  }

  private applyRealtimeUpdate(event: TrackingSocketEvent): void {
    const normalizedStatus = (event.status || '').toUpperCase();
    if (TrackDeliveryPage.TERMINAL_STATUSES.has(normalizedStatus)) {
      this.activeDeliveries.update((current) =>
        current.filter((delivery) => delivery.id !== event.deliveryId),
      );
      const subscription = this.socketSubscriptions.get(event.deliveryId);
      if (subscription) {
        subscription.unsubscribe();
        this.socketSubscriptions.delete(event.deliveryId);
      }
      this.trackingSocketService.unwatchDelivery(event.deliveryId);
      return;
    }

    this.activeDeliveries.update((current) =>
      current.map((delivery) =>
        delivery.id === event.deliveryId
          ? {
              ...delivery,
              status: event.status,
            }
          : delivery,
      ),
    );
  }

  private cleanupSocketSubscriptions(): void {
    for (const [deliveryId, subscription] of this.socketSubscriptions) {
      subscription.unsubscribe();
      this.trackingSocketService.unwatchDelivery(deliveryId);
      this.socketSubscriptions.delete(deliveryId);
    }
  }
}
