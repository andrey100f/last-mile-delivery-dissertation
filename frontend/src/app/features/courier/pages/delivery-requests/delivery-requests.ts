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
import { PageHeaderService } from '../../../../layout/page-header/page-header.service';
import { CourierProfileService } from '../../services/courier-profile.service';
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

type DeliveryRequestsEntrySource = 'dashboard' | null;

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
  private readonly courierProfileService = inject(CourierProfileService);
  private readonly pageHeaderService = inject(PageHeaderService);

  protected readonly loading = signal(false);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly acceptingDeliveryId = signal<string | null>(null);
  protected readonly requests = signal<CourierRequestCardView[]>([]);
  protected readonly selectedDeliveryType = signal<DeliveryType | null>(null);
  protected readonly courierAvailableNow = signal(true);
  protected readonly courierExpressCapable = signal(true);
  protected readonly profileLoaded = signal(false);
  protected readonly profileLoadError = signal<string | null>(null);
  protected readonly entrySource = signal<DeliveryRequestsEntrySource>(null);
  protected readonly loadingSkeletonCards = [0, 1, 2, 3];
  protected readonly filterChips: readonly DeliveryTypeFilterChip[] = [
    { label: 'All Requests', value: null },
    { label: 'Standard', value: 'STANDARD' },
    { label: 'Express', value: 'EXPRESS' },
  ];

  constructor() {
    const source = this.resolveEntrySource();
    this.entrySource.set(source);
    this.applyHeaderAction(source);
    this.destroyRef.onDestroy(() => this.pageHeaderService.clearAction());
    this.loadCourierAvailability();
  }

  protected setDeliveryTypeFilter(deliveryType: DeliveryType | null): void {
    if (deliveryType === 'EXPRESS' && !this.courierExpressCapable()) {
      return;
    }
    if (this.selectedDeliveryType() === deliveryType) {
      return;
    }
    this.selectedDeliveryType.set(deliveryType);
    this.loadRequests();
  }

  protected openDetails(request: CourierRequestCardView): void {
    void this.router.navigate(['/courier/delivery', request.id], {
      state: { requestDetailSource: 'available-requests' },
    });
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
          if (uiError.type === 'COURIER_UNAVAILABLE') {
            this.messageService.add({
              severity: 'warn',
              summary: 'You are unavailable',
              detail: 'Enable "Available now" in profile before accepting deliveries.',
              life: 5000,
            });
            this.courierAvailableNow.set(false);
            this.requests.set([]);
            return;
          }
          if (uiError.type === 'EXPRESS_NOT_CAPABLE') {
            this.messageService.add({
              severity: 'warn',
              summary: 'Express disabled',
              detail: 'Enable express deliveries in profile to accept this request.',
              life: 5000,
            });
            this.loadCourierAvailability();
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

  protected visibleFilterChips(): DeliveryTypeFilterChip[] {
    if (this.courierExpressCapable()) {
      return [...this.filterChips];
    }
    return this.filterChips.filter((chip) => chip.value !== 'EXPRESS');
  }

  protected goToProfile(): void {
    void this.router.navigate(['/courier/profile']);
  }

  protected retryProfileLoad(): void {
    this.loadCourierAvailability();
  }

  protected expressFeatureDisabled(): boolean {
    return this.courierAvailableNow() && !this.courierExpressCapable();
  }

  private loadRequests(): void {
    if (!this.profileLoaded()) {
      return;
    }
    if (!this.courierAvailableNow()) {
      this.requests.set([]);
      this.hasLoadedAtLeastOnce.set(true);
      this.loading.set(false);
      return;
    }

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
        const filteredContent =
          !this.courierExpressCapable() && this.selectedDeliveryType() !== 'EXPRESS'
            ? content.filter((item) => (item.deliveryType ?? 'STANDARD') !== 'EXPRESS')
            : content;
        this.requests.set(
          filteredContent.map((item) => ({
            id: item.id,
            shortId: item.trackingCode?.trim() || '-',
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

  private loadCourierAvailability(): void {
    this.loading.set(true);
    this.profileLoadError.set(null);
    this.courierProfileService
      .getMyProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profileLoaded.set(true);
          const availableNow = profile?.availability.availableNow === true;
          const expressCapable = profile?.availability.expressCapable === true;
          this.courierAvailableNow.set(availableNow);
          this.courierExpressCapable.set(expressCapable);

          if (!expressCapable && this.selectedDeliveryType() === 'EXPRESS') {
            this.selectedDeliveryType.set(null);
          }

          this.loadRequests();
        },
        error: () => {
          this.profileLoaded.set(false);
          this.profileLoadError.set(
            'Could not load courier profile settings. Please try again.',
          );
          this.requests.set([]);
          this.hasLoadedAtLeastOnce.set(true);
          this.loading.set(false);
        },
      });
  }

  private toDisplayPlace(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : 'Address unavailable';
  }

  private async navigateToActiveDelivery(deliveryId: string): Promise<void> {
    const source = this.entrySource();
    const navigated = await this.router.navigate(['/courier/active', deliveryId], {
      state: {
        activeDeliverySource: source === 'dashboard' ? 'dashboard' : 'available-requests',
      },
    });
    if (!navigated) {
      await this.router.navigate(['/courier/delivery', deliveryId]);
    }
  }

  private resolveEntrySource(): DeliveryRequestsEntrySource {
    const currentNavigation = this.router.getCurrentNavigation();
    const rawStateSource =
      currentNavigation?.extras.state?.['requestsSource'] ?? history.state?.requestsSource;
    if (rawStateSource === 'dashboard') {
      return 'dashboard';
    }
    return null;
  }

  private applyHeaderAction(source: DeliveryRequestsEntrySource): void {
    if (source !== 'dashboard') {
      this.pageHeaderService.clearAction();
      return;
    }
    this.pageHeaderService.setAction({
      label: 'Back to dashboard',
      icon: 'pi pi-arrow-left',
      run: () => void this.router.navigate(['/courier']),
    });
  }
}
