import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { DeliveryType } from '@core/services/enum/delivery.types';
import { TableEmptyStateComponent } from '@shared/ui/public-api';
import { formatDeliveryCode } from '@shared/utils/delivery-code';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { catchError, finalize, of } from 'rxjs';
import { CourierDeliveryService } from '../../services/courier-delivery.service';

interface CourierRequestRow {
  id: string;
  shortId: string;
  destination: string;
  destinationHint: string;
  deliveryType: DeliveryType;
  totalAmount: number;
  currency: string;
}

@Component({
  selector: 'app-courier-home',
  imports: [
    CurrencyPipe,
    RouterLink,
    TableModule,
    TableEmptyStateComponent,
    Skeleton,
  ],
  templateUrl: './courier-home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourierHome {
  private readonly courierDeliveryService = inject(CourierDeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly availableRequests = signal<CourierRequestRow[]>([]);
  protected readonly loadingSkeletonRows = [0, 1, 2];

  constructor() {
    this.loadAvailableRequests();
  }

  private loadAvailableRequests(): void {
    this.loading.set(true);
    this.courierDeliveryService
      .getAvailable({
        page: 0,
        size: 5,
        sort: 'createdAt,desc',
      })
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
        this.availableRequests.set(
          response.content.map((item) => ({
            id: item.id,
            shortId: formatDeliveryCode(item.id),
            destination: this.toDisplayPlace(item.destinationLine1),
            destinationHint: `from ${this.toDisplayPlace(item.pickupLine1)}`,
            deliveryType: this.normalizeDeliveryType(item.deliveryType),
            totalAmount: Number.isFinite(item.totalAmount) ? item.totalAmount : 0,
            currency: item.currency || 'USD',
          })),
        );
      });
  }

  protected openDetails(deliveryId: string): void {
    void this.router.navigate(['/courier/delivery', deliveryId]);
  }

  protected onRowSpace(event: Event, deliveryId: string): void {
    event.preventDefault();
    this.openDetails(deliveryId);
  }

  private normalizeDeliveryType(value: unknown): DeliveryType {
    return typeof value === 'string' && value.trim().toUpperCase() === 'EXPRESS'
      ? 'EXPRESS'
      : 'STANDARD';
  }

  private toDisplayPlace(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : 'Address unavailable';
  }
}
