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
import { TableEmptyStateComponent } from '@shared/ui/public-api';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { catchError, finalize, of } from 'rxjs';
import { CourierDeliveryService } from '../../services/courier-delivery.service';

interface DeliveryTypeFilterChip {
  label: string;
  value: DeliveryType | null;
}

interface CourierRequestCardView {
  id: string;
  shortId: string;
  status: string;
  deliveryType: DeliveryType;
  pickupLine1: string;
  destinationLine1: string;
  baseAmount: number;
  feeAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

@Component({
  selector: 'app-delivery-requests-page',
  imports: [
    CurrencyPipe,
    Button,
    Skeleton,
    TableEmptyStateComponent,
  ],
  templateUrl: './delivery-requests.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryRequestsPage {
  private readonly courierDeliveryService = inject(CourierDeliveryService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly acceptingDeliveryId = signal<string | null>(null);
  protected readonly requests = signal<CourierRequestCardView[]>([]);
  protected readonly selectedDeliveryType = signal<DeliveryType | null>(null);
  protected readonly loadingSkeletonCards = [0, 1, 2, 3];
  protected readonly filterChips: DeliveryTypeFilterChip[] = [
    { label: 'All Requests', value: null },
    { label: 'Standard', value: 'STANDARD' },
    { label: 'Express', value: 'EXPRESS' },
  ];

  constructor() {
    this.loadRequests();
  }

  protected setDeliveryTypeFilter(deliveryType: DeliveryType | null): void {
    if (this.selectedDeliveryType() === deliveryType) {
      return;
    }
    this.selectedDeliveryType.set(deliveryType);
    this.loadRequests();
  }

  protected openDetails(request: CourierRequestCardView): void {
    void this.router.navigate(['/courier/delivery', request.id]);
  }

  protected acceptDelivery(deliveryId: string): void {
    if (this.acceptingDeliveryId()) {
      return;
    }

    this.acceptingDeliveryId.set(deliveryId);
    this.courierDeliveryService
      .acceptDelivery(deliveryId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.acceptingDeliveryId.set(null)),
      )
      .subscribe({
        next: async (response) => {
          const acceptedId = response.id ?? deliveryId;
          this.requests.update((current) =>
            current.filter((item) => item.id !== acceptedId),
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Delivery accepted',
            detail: 'The delivery was assigned to you.',
            life: 4000,
          });
          await this.navigateToActiveDelivery(acceptedId);
        },
        error: (error: unknown) => {
          const uiError = this.courierDeliveryService.toUiError(error);
          if (uiError.type === 'DELIVERY_TAKEN') {
            this.messageService.add({
              severity: 'warn',
              summary: 'Delivery already accepted',
              detail: 'This delivery was already accepted.',
              life: 5000,
            });
            this.loadRequests();
            return;
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Could not accept delivery',
            detail: uiError.detail ?? 'Please try again.',
            life: 5000,
          });
        },
      });
  }

  protected isAccepting(deliveryId: string): boolean {
    return this.acceptingDeliveryId() === deliveryId;
  }

  protected isFilterActive(deliveryType: DeliveryType | null): boolean {
    return this.selectedDeliveryType() === deliveryType;
  }

  protected isExpress(deliveryType: DeliveryType): boolean {
    return deliveryType === 'EXPRESS';
  }

  private loadRequests(): void {
    this.loading.set(true);
    this.courierDeliveryService
      .getAvailable({
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
        deliveryType: this.selectedDeliveryType() ?? undefined,
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
        finalize(() => this.loading.set(false)),
      )
      .subscribe((response) => {
        const content = Array.isArray(response.content) ? response.content : [];
        this.requests.set(
          content.map((item) => ({
            id: item.id,
            shortId: this.toDeliveryCode(item.id),
            status: item.status || 'CREATED',
            deliveryType: item.deliveryType ?? 'STANDARD',
            pickupLine1: this.toDisplayPlace(item.pickupLine1),
            destinationLine1: this.toDisplayPlace(item.destinationLine1),
            baseAmount: Number.isFinite(item.baseAmount) ? item.baseAmount : 0,
            feeAmount: Number.isFinite(item.feeAmount) ? item.feeAmount : 0,
            taxAmount: Number.isFinite(item.taxAmount) ? item.taxAmount : 0,
            totalAmount: Number.isFinite(item.totalAmount) ? item.totalAmount : 0,
            currency: item.currency || 'USD',
          })),
        );
        this.hasLoadedAtLeastOnce.set(true);
      });
  }

  private toDisplayPlace(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : 'Address unavailable';
  }

  private toDeliveryCode(id: string): string {
    return `DLV-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
  }

  private async navigateToActiveDelivery(deliveryId: string): Promise<void> {
    const navigated = await this.router.navigate(['/courier/active', deliveryId]);
    if (!navigated) {
      await this.router.navigate(['/courier/delivery', deliveryId]);
    }
  }
}
