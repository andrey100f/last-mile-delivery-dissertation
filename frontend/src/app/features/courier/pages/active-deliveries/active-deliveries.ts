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
  PageDto,
} from '@core/services/enum/delivery.types';
import { StatusTagComponent, TableEmptyStateComponent } from '@shared/ui/public-api';
import { formatDeliveryCode } from '@shared/utils/delivery-code';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { catchError, finalize, of } from 'rxjs';
import { CourierDeliveryService } from '../../services/courier-delivery.service';

interface CourierActiveDeliveryCard {
  id: string;
  shortId: string;
  status: string;
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

  protected readonly activeLoading = signal(false);
  protected readonly activeDeliveries = signal<CourierActiveDeliveryCard[]>([]);
  protected readonly activeLoadingSkeletonCards = [0, 1, 2, 3];

  constructor() {
    this.loadActiveDeliveries();
  }

  protected openActiveDelivery(deliveryId: string): void {
    void this.router.navigate(['/courier/active', deliveryId]);
  }

  private loadActiveDeliveries(): void {
    this.activeLoading.set(true);
    this.courierDeliveryService
      .getActive({
        page: 0,
        size: 12,
        sort: 'updatedAt,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() =>
          of<PageDto<CourierAvailableDeliveryDto>>({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
          }),
        ),
        finalize(() => this.activeLoading.set(false)),
      )
      .subscribe((response) => {
        const content = Array.isArray(response.content) ? response.content : [];
        this.activeDeliveries.set(
          content.map((item) => ({
            id: item.id,
            shortId: formatDeliveryCode(item.id),
            status: item.status || 'ASSIGNED',
            pickup: this.toDisplayPlace(item.pickupLine1),
            destination: this.toDisplayPlace(item.destinationLine1),
            totalAmount: Number.isFinite(item.totalAmount) ? item.totalAmount : 0,
            currency: item.currency || 'USD',
          })),
        );
      });
  }

  private toDisplayPlace(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : 'Address unavailable';
  }
}
