import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  CourierAvailableDeliveryDto,
  DeliveryType,
  PageDto,
} from '@core/services/enum/delivery.types';
import { StatusTagComponent, TableEmptyStateComponent } from '@shared/ui/public-api';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { catchError, finalize, of } from 'rxjs';
import { CourierDeliveryService } from '../../services/courier-delivery.service';

interface CourierActiveDeliveryCard {
  id: string;
  shortId: string;
  status: string;
  deliveryType: DeliveryType;
  pickup: string;
  destination: string;
  totalAmount: number;
  currency: string;
}

@Component({
  selector: 'app-active-deliveries-page',
  imports: [CurrencyPipe, Button, Skeleton, StatusTagComponent, TableEmptyStateComponent],
  templateUrl: './active-deliveries.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveDeliveriesPage {
  private readonly courierDeliveryService = inject(CourierDeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  protected readonly activeLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeDeliveries = signal<CourierActiveDeliveryCard[]>([]);
  protected readonly activeLoadingSkeletonCards = [0, 1, 2, 3];

  constructor() {
    this.loadActiveDeliveries();
  }

  protected openActiveDelivery(deliveryId: string): void {
    void this.router.navigate(['/courier/active', deliveryId], {
      state: { activeDeliverySource: 'active-deliveries' },
    });
  }

  protected retry(): void {
    this.loadActiveDeliveries();
  }

  private loadActiveDeliveries(): void {
    this.activeLoading.set(true);
    this.loadError.set(null);
    this.courierDeliveryService
      .getActive({
        page: 0,
        size: 12,
        sort: 'updatedAt,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError.set('Could not load active deliveries. Please retry.');
          this.messageService.add({
            severity: 'error',
            summary: 'Active deliveries unavailable',
            detail: 'Please retry in a few moments.',
            life: 4000,
          });
          return of<PageDto<CourierAvailableDeliveryDto>>({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
          });
        }),
        finalize(() => this.activeLoading.set(false)),
      )
      .subscribe((response) => {
        const content = Array.isArray(response.content) ? response.content : [];
        const prioritized = this.prioritizeExpressFirst(content);
        this.activeDeliveries.set(
          prioritized.map((item) => ({
            id: item.id,
            shortId: item.trackingCode?.trim() || '-',
            status: item.status || 'ASSIGNED',
            deliveryType: item.deliveryType ?? 'STANDARD',
            pickup: this.toDisplayPlace(item.pickupLine1),
            destination: this.toDisplayPlace(item.destinationLine1),
            totalAmount: Number.isFinite(item.totalAmount) ? item.totalAmount : 0,
            currency: item.currency || 'USD',
          })),
        );
      });
  }

  private prioritizeExpressFirst(
    deliveries: CourierAvailableDeliveryDto[],
  ): CourierAvailableDeliveryDto[] {
    return deliveries
      .map((delivery, index) => ({ delivery, index }))
      .sort((left, right) => {
        const priorityDelta =
          this.deliveryTypePriority(left.delivery.deliveryType) -
          this.deliveryTypePriority(right.delivery.deliveryType);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        // Preserve API order for deliveries in the same priority bucket.
        return left.index - right.index;
      })
      .map((entry) => entry.delivery);
  }

  private deliveryTypePriority(deliveryType: DeliveryType | undefined): number {
    return deliveryType === 'EXPRESS' ? 0 : 1;
  }

  private toDisplayPlace(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : 'Address unavailable';
  }
}
