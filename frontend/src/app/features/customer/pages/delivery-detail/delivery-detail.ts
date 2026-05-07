import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  RouterLink,
} from '@angular/router';
import { DeliveryService } from '@core/services/delivery/delivery';
import {
  DeliveryDetailDto,
  DeliveryStatusHistoryItemDto,
} from '@core/services/enum/delivery.types';
import {
  DeliveryStatus,
  normalizeDeliveryStatus,
  resolveDeliveryStatusPresentation,
  StatusTagComponent,
} from '@shared/ui/public-api';
import { PageHeaderService } from '../../../../layout/page-header/page-header.service';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Skeleton } from 'primeng/skeleton';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';

interface DeliveryDetailErrorState {
  title: string;
  message: string;
}

interface TimelineViewItem extends DeliveryStatusHistoryItemDto {
  completed: boolean;
}

@Component({
  selector: 'app-delivery-detail-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    StatusTagComponent,
    Card,
    Skeleton,
    Button,
  ],
  templateUrl: './delivery-detail.html',
  styleUrl: './delivery-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryDetailPage {
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly MAIN_STATUS_FLOW = [
    DeliveryStatus.CREATED,
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.IN_TRANSIT,
    DeliveryStatus.DELIVERED,
  ];
  private static readonly TERMINAL_STATUSES = new Set<string>([
    DeliveryStatus.DELIVERED,
    DeliveryStatus.CANCELLED,
    DeliveryStatus.FAILED,
  ]);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly deliveryService = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageHeaderService = inject(PageHeaderService);

  protected readonly loading = signal(true);
  protected readonly delivery = signal<DeliveryDetailDto | null>(null);
  protected readonly error = signal<DeliveryDetailErrorState | null>(null);
  protected readonly skeletonRows = [0, 1, 2];

  protected readonly timeline = computed<TimelineViewItem[]>(() => {
    const detail = this.delivery();
    if (!detail) {
      return [];
    }

    const sorted = [...detail.timeline].sort((a, b) =>
      a.recordedAt.localeCompare(b.recordedAt),
    );
    const currentStatus = normalizeDeliveryStatus(detail.status);
    const flow = DeliveryDetailPage.MAIN_STATUS_FLOW;
    const currentFlowIndex = flow.indexOf(currentStatus as DeliveryStatus);
    const timelineByStatus = new Map<string, DeliveryStatusHistoryItemDto>();
    for (const item of sorted) {
      timelineByStatus.set(normalizeDeliveryStatus(item.status), item);
    }

    if (currentFlowIndex >= 0) {
      const flowItems: TimelineViewItem[] = flow.map((status, index) => {
        const historyItem = timelineByStatus.get(status);
        return {
          status,
          recordedAt: historyItem?.recordedAt ?? '',
          completed: index <= currentFlowIndex,
        };
      });

      for (const item of sorted) {
        const normalized = normalizeDeliveryStatus(item.status);
        if (flow.includes(normalized as DeliveryStatus)) {
          continue;
        }
        flowItems.push({
          status: item.status,
          recordedAt: item.recordedAt,
          completed: true,
        });
      }

      return flowItems;
    }

    const source =
      sorted.length > 0
        ? sorted
        : [
            {
              status: detail.status,
              recordedAt: '',
            },
          ];
    return source.map((item) => ({
      ...item,
      completed: true,
    }));
  });

  protected readonly canTrackDelivery = computed(() => {
    const detail = this.delivery();
    if (!detail) {
      return false;
    }
    return !DeliveryDetailPage.TERMINAL_STATUSES.has(
      normalizeDeliveryStatus(detail.status),
    );
  });

  protected readonly deliveryCode = computed(() => {
    const detail = this.delivery();
    if (!detail) {
      return '-';
    }

    const trackingCode = detail.trackingCode?.trim();
    if (trackingCode) {
      return trackingCode;
    }
    return detail.id;
  });

  protected readonly firstTimelineAt = computed(() => {
    const items = this.timeline();
    const firstWithDate = items.find((item) => item.recordedAt);
    return firstWithDate?.recordedAt ?? null;
  });

  protected readonly latestTimelineAt = computed(() => {
    const items = this.timeline();
    const withDate = items.filter((item) => item.recordedAt);
    return withDate.length > 0 ? withDate[withDate.length - 1].recordedAt : null;
  });

  constructor() {
    this.pageHeaderService.setOverride(
      'Delivery details',
      'Complete delivery information and status',
    );
    this.destroyRef.onDestroy(() => this.pageHeaderService.clearOverride());

    effect(() => {
      const detail = this.delivery();
      const canTrack = this.canTrackDelivery();

      if (detail && canTrack) {
        this.pageHeaderService.setAction({
          label: 'Track Delivery',
          icon: 'pi pi-map-marker',
          run: () => this.openTrackDelivery(),
        });
        return;
      }

      this.pageHeaderService.clearAction();
    });

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => this.loadDelivery(params)),
      )
      .subscribe();
  }

  protected openTrackDelivery(): void {
    const detail = this.delivery();
    if (!detail) {
      return;
    }
    void this.router.navigate(['/customer/tracking', detail.id]);
  }

  protected goBack(): void {
    void this.router.navigate(['/customer']);
  }

  protected statusLabel(status: string): string {
    return resolveDeliveryStatusPresentation(status).label;
  }

  protected courierInitials(fullName: string | null | undefined): string {
    const normalized = fullName?.trim();
    if (!normalized) {
      return '?';
    }

    const parts = normalized.split(/\s+/).filter((part) => part.length > 0);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  protected hasDimensions(delivery: DeliveryDetailDto): boolean {
    return (
      this.isPositiveNumber(delivery.package.lengthCm) &&
      this.isPositiveNumber(delivery.package.widthCm) &&
      this.isPositiveNumber(delivery.package.heightCm)
    );
  }

  protected dimensionsText(delivery: DeliveryDetailDto): string {
    if (!this.hasDimensions(delivery)) {
      return 'Not specified';
    }

    return `${delivery.package.lengthCm} x ${delivery.package.widthCm} x ${delivery.package.heightCm} cm`;
  }

  private loadDelivery(params: ParamMap) {
    const id = params.get('id')?.trim() ?? '';
    this.loading.set(true);
    this.error.set(null);
    this.delivery.set(null);

    if (!DeliveryDetailPage.UUID_PATTERN.test(id)) {
      this.error.set({
        title: 'Invalid delivery id',
        message: 'The requested delivery link is invalid.',
      });
      this.loading.set(false);
      return of(null);
    }

    return this.deliveryService.getById(id).pipe(
      catchError((error: { status?: number }) => {
        if (error.status === 404) {
          this.error.set({
            title: 'Delivery not found',
            message: 'We could not find this delivery. It may have been removed.',
          });
        } else if (error.status === 403) {
          this.error.set({
            title: "You don't have access",
            message: 'This delivery is not available for your account.',
          });
        } else {
          this.error.set({
            title: 'Could not load delivery',
            message: 'Please refresh the page and try again.',
          });
        }
        return of(null);
      }),
      tap((detail) => {
        if (detail) {
          this.delivery.set(detail);
          this.pageHeaderService.setOverride(
            `Delivery ${this.deliveryCode()}`,
            'Complete delivery information and status',
          );
        }
      }),
      finalize(() => this.loading.set(false)),
      switchMap(() => of(null)),
    );
  }

  private isPositiveNumber(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

}
