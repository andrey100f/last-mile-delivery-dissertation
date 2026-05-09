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
} from '@shared/ui/public-api';
import { PageHeaderService } from '../../../../layout/page-header/page-header.service';
import { Card } from 'primeng/card';
import { Skeleton } from 'primeng/skeleton';
import {
  catchError,
  finalize,
  interval,
  of,
  startWith,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import { TrackingConnectionState, TrackingSocketEvent } from '../../models/tracking.models';
import { TrackingSocketService } from '../../services/tracking-socket.service';

interface DeliveryDetailErrorState {
  title: string;
  message: string;
}

interface TimelineViewItem extends DeliveryStatusHistoryItemDto {
  completed: boolean;
  title: string;
  description: string;
  icon: string;
}

const TIMELINE_STATUS_META: Readonly<
  Record<
    DeliveryStatus,
    {
      title: string;
      description: string;
      icon: string;
    }
  >
> = {
  [DeliveryStatus.CREATED]: {
    title: 'Request Created',
    description: 'Delivery request submitted successfully.',
    icon: 'pi pi-plus-circle',
  },
  [DeliveryStatus.ASSIGNED]: {
    title: 'Courier Assigned',
    description: 'A courier accepted your delivery.',
    icon: 'pi pi-user-plus',
  },
  [DeliveryStatus.PICKED_UP]: {
    title: 'Package Picked Up',
    description: 'Package collected from pickup location.',
    icon: 'pi pi-box',
  },
  [DeliveryStatus.IN_TRANSIT]: {
    title: 'In Transit',
    description: 'Courier is en route to destination.',
    icon: 'pi pi-send',
  },
  [DeliveryStatus.DELIVERED]: {
    title: 'Delivered',
    description: 'Package delivered successfully.',
    icon: 'pi pi-check-circle',
  },
  [DeliveryStatus.CANCELLED]: {
    title: 'Cancelled',
    description: 'Delivery has been cancelled.',
    icon: 'pi pi-times-circle',
  },
  [DeliveryStatus.FAILED]: {
    title: 'Failed',
    description: 'Delivery could not be completed.',
    icon: 'pi pi-exclamation-triangle',
  },
};

@Component({
  selector: 'app-delivery-detail-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    Card,
    Skeleton,
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
  private static readonly POLLING_INTERVAL_MS = 5000;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly deliveryService = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly trackingSocketService = inject(TrackingSocketService);

  private pollingSubscription: Subscription | null = null;
  private socketSubscription: Subscription | null = null;

  protected readonly loading = signal(true);
  protected readonly delivery = signal<DeliveryDetailDto | null>(null);
  protected readonly error = signal<DeliveryDetailErrorState | null>(null);
  protected readonly activeDeliveryId = signal<string | null>(null);
  protected readonly connectionState = signal<TrackingConnectionState>('offline');
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
          title: TIMELINE_STATUS_META[status].title,
          description: TIMELINE_STATUS_META[status].description,
          icon: TIMELINE_STATUS_META[status].icon,
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
          title: this.timelineMeta(item.status).title,
          description: this.timelineMeta(item.status).description,
          icon: this.timelineMeta(item.status).icon,
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
      title: this.timelineMeta(item.status).title,
      description: this.timelineMeta(item.status).description,
      icon: this.timelineMeta(item.status).icon,
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
  protected readonly currentStatusPresentation = computed(() => {
    const detail = this.delivery();
    return resolveDeliveryStatusPresentation(detail?.status ?? 'UNKNOWN');
  });
  protected readonly statusChipClass = computed(() => {
    switch (this.currentStatusPresentation().severity) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700';
      case 'info':
        return 'bg-cyan-50 text-cyan-700';
      case 'warn':
        return 'bg-amber-50 text-amber-700';
      case 'danger':
        return 'bg-red-50 text-red-700';
      case 'contrast':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  });

  constructor() {
    this.pageHeaderService.setOverride(
      'Delivery details',
      'Complete delivery information and status',
    );
    this.pageHeaderService.setActions([
      {
        label: 'Go back',
        icon: 'pi pi-arrow-left',
        run: () => this.goBack(),
      },
    ]);
    this.destroyRef.onDestroy(() => {
      this.pageHeaderService.clearOverride();
      this.pageHeaderService.clearAction();
      this.stopPolling();
      this.unsubscribeSocket();
      this.trackingSocketService.clearActiveDelivery();
    });

    effect(() => {
      const canTrack = this.canTrackDelivery();
      if (!canTrack) {
        this.pageHeaderService.setActions([
          {
            label: 'Go back',
            icon: 'pi pi-arrow-left',
            run: () => this.goBack(),
          },
        ]);
        return;
      }
      this.pageHeaderService.setActions([
        {
          label: 'Go back',
          icon: 'pi pi-arrow-left',
          run: () => this.goBack(),
        },
        {
          label: 'Track Delivery',
          icon: 'pi pi-map-marker',
          run: () => this.openTrackDelivery(),
        },
      ]);
    });

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => this.loadDelivery(params)),
      )
      .subscribe();

    this.trackingSocketService.connectionState$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.connectionState.set(state);
        this.syncFallbackMode();
      });
  }

  protected openTrackDelivery(): void {
    const detail = this.delivery();
    if (!detail) {
      return;
    }
    void this.router.navigate(['/customer/tracking', detail.id], {
      state: { trackingSource: 'details' },
    });
  }

  protected goBack(): void {
    void this.router.navigate(['/customer']);
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

  protected isDeliveredTimelineStatus(status: string): boolean {
    return normalizeDeliveryStatus(status) === DeliveryStatus.DELIVERED;
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
    this.activeDeliveryId.set(null);
    this.stopPolling();
    this.unsubscribeSocket();
    this.trackingSocketService.clearActiveDelivery();

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
          this.activeDeliveryId.set(id);
          this.delivery.set(detail);
          const headerDeliveryCode = detail.trackingCode?.trim() || detail.id;
          this.pageHeaderService.setOverride(
            `Delivery ${headerDeliveryCode}`,
            'Complete delivery information and status',
          );
          this.startSocketTracking(id);
          this.syncFallbackMode();
        }
      }),
      finalize(() => this.loading.set(false)),
      switchMap(() => of(null)),
    );
  }

  private startSocketTracking(deliveryId: string): void {
    this.unsubscribeSocket();
    this.socketSubscription = this.trackingSocketService
      .watchDelivery(deliveryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handleSocketEvent(event));
  }

  private handleSocketEvent(event: TrackingSocketEvent): void {
    if (this.activeDeliveryId() !== event.deliveryId) {
      return;
    }
    this.refreshDelivery(event.deliveryId);
  }

  private syncFallbackMode(): void {
    const deliveryId = this.activeDeliveryId();
    if (!deliveryId || this.error()) {
      this.stopPolling();
      return;
    }

    const state = this.connectionState();
    if (state === 'live' || state === 'connecting') {
      this.stopPolling();
      return;
    }

    this.startPolling(deliveryId);
  }

  private startPolling(deliveryId: string): void {
    if (this.pollingSubscription) {
      return;
    }

    this.pollingSubscription = interval(DeliveryDetailPage.POLLING_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.deliveryService.getById(deliveryId).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((detail) => {
        if (!detail || this.activeDeliveryId() !== deliveryId) {
          return;
        }
        this.delivery.set(detail);
        const headerDeliveryCode = detail.trackingCode?.trim() || detail.id;
        this.pageHeaderService.setOverride(
          `Delivery ${headerDeliveryCode}`,
          'Complete delivery information and status',
        );
      });
  }

  private stopPolling(): void {
    if (!this.pollingSubscription) {
      return;
    }
    this.pollingSubscription.unsubscribe();
    this.pollingSubscription = null;
  }

  private unsubscribeSocket(): void {
    if (!this.socketSubscription) {
      return;
    }
    this.socketSubscription.unsubscribe();
    this.socketSubscription = null;
  }

  private refreshDelivery(deliveryId: string): void {
    this.deliveryService
      .getById(deliveryId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((detail) => {
        if (!detail || this.activeDeliveryId() !== deliveryId) {
          return;
        }
        this.delivery.set(detail);
        const headerDeliveryCode = detail.trackingCode?.trim() || detail.id;
        this.pageHeaderService.setOverride(
          `Delivery ${headerDeliveryCode}`,
          'Complete delivery information and status',
        );
      });
  }

  private isPositiveNumber(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

  private timelineMeta(status: string): {
    title: string;
    description: string;
    icon: string;
  } {
    const normalized = normalizeDeliveryStatus(status) as DeliveryStatus;
    const matched = TIMELINE_STATUS_META[normalized];
    if (matched) {
      return matched;
    }
    return {
      title: resolveDeliveryStatusPresentation(status).label,
      description: 'Delivery status updated.',
      icon: 'pi pi-clock',
    };
  }

}
