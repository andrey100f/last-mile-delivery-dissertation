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
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { DeliveryDetailDto } from '@core/services/enum/delivery.types';
import { DeliveryStatus, normalizeDeliveryStatus } from '@shared/ui/public-api';
import { formatDeliveryCode } from '@shared/utils/delivery-code';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Skeleton } from 'primeng/skeleton';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';
import { PageHeaderService } from '../../../../layout/page-header/page-header.service';
import { CourierDeliveryService } from '../../services/courier-delivery.service';

interface CourierDetailErrorState {
  title: string;
  message: string;
}

@Component({
  selector: 'app-courier-delivery-detail',
  imports: [
    CurrencyPipe,
    RouterLink,
    Card,
    Button,
    Skeleton,
  ],
  templateUrl: './courier-delivery-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourierDeliveryDetailPage {
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courierDeliveryService = inject(CourierDeliveryService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageHeaderService = inject(PageHeaderService);

  protected readonly loading = signal(true);
  protected readonly accepting = signal(false);
  protected readonly detail = signal<DeliveryDetailDto | null>(null);
  protected readonly error = signal<CourierDetailErrorState | null>(null);
  protected readonly skeletonRows = [0, 1, 2];
  protected readonly canAccept = computed(() => {
    const delivery = this.detail();
    if (!delivery) {
      return false;
    }
    return normalizeDeliveryStatus(delivery.status) === DeliveryStatus.CREATED;
  });

  constructor() {
    this.pageHeaderService.setOverride(
      'Delivery Request',
      'Review delivery details before accepting',
    );
    this.destroyRef.onDestroy(() => this.pageHeaderService.clearOverride());

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => this.loadDetail(params)),
      )
      .subscribe();
  }

  protected goBack(): void {
    void this.router.navigate(['/courier/requests']);
  }

  protected declineRequest(): void {
    this.goBack();
  }

  protected acceptDelivery(): void {
    const delivery = this.detail();
    if (!delivery || this.accepting() || !this.canAccept()) {
      return;
    }

    this.accepting.set(true);
    this.courierDeliveryService
      .acceptDelivery(delivery.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.accepting.set(false)),
      )
      .subscribe({
        next: async (response) => {
          const acceptedId = response.id ?? delivery.id;
          this.messageService.add({
            severity: 'success',
            summary: 'Delivery accepted',
            detail: 'You can continue from active delivery view.',
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
            this.loadCurrentDetail();
            return;
          }
          if (uiError.type === 'COURIER_UNAVAILABLE') {
            this.messageService.add({
              severity: 'warn',
              summary: 'You are unavailable',
              detail: 'Enable "Available now" in profile before accepting deliveries.',
              life: 5000,
            });
            void this.router.navigate(['/courier/profile']);
            return;
          }
          if (uiError.type === 'EXPRESS_NOT_CAPABLE') {
            this.messageService.add({
              severity: 'warn',
              summary: 'Express disabled',
              detail: 'Enable express deliveries in profile to accept this request.',
              life: 5000,
            });
            void this.router.navigate(['/courier/profile']);
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

  private loadCurrentDetail(): void {
    this.loadDetail(this.route.snapshot.paramMap).subscribe();
  }

  private loadDetail(params: ParamMap) {
    const id = params.get('id')?.trim() ?? '';
    this.loading.set(true);
    this.error.set(null);
    this.detail.set(null);

    if (!CourierDeliveryDetailPage.UUID_PATTERN.test(id)) {
      this.error.set({
        title: 'Invalid delivery id',
        message: 'The request link is invalid.',
      });
      this.loading.set(false);
      return of(null);
    }

    return this.courierDeliveryService.getDeliveryDetail(id).pipe(
      catchError((error: { status?: number }) => {
        if (error.status === 404) {
          this.error.set({
            title: 'Delivery unavailable',
            message: 'The delivery is no longer available.',
          });
        } else if (error.status === 403) {
          this.error.set({
            title: "You don't have access",
            message: 'This delivery is not available for your account.',
          });
        } else {
          this.error.set({
            title: 'Could not load delivery',
            message: 'Please refresh and try again.',
          });
        }
        return of(null);
      }),
      tap((detail) => {
        this.detail.set(detail);
        if (!detail) {
          return;
        }
        this.pageHeaderService.setOverride(
          `Delivery Request ${formatDeliveryCode(detail.id)}`,
          'Review delivery details before accepting',
        );
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  private async navigateToActiveDelivery(deliveryId: string): Promise<void> {
    const navigated = await this.router.navigate(['/courier/active', deliveryId]);
    if (!navigated) {
      await this.router.navigate(['/courier/delivery', deliveryId]);
    }
  }
}
