import { DatePipe } from '@angular/common';
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
import { DeliveryService } from '@core/services/delivery/delivery';
import { DeliveryDetailDto } from '@core/services/enum/delivery.types';
import {
  DeliveryStatus,
  normalizeDeliveryStatus,
  resolveDeliveryStatusPresentation,
} from '@shared/ui/public-api';
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
} from 'rxjs';
import { PageHeaderService } from '../../../../layout/page-header/page-header.service';
import {
  DeliveryStatusSnapshotDto,
  TrackingConnectionState,
  TrackingSocketEvent,
  TrackingViewModel,
} from '../../models/tracking.models';
import { CustomerDeliveryService } from '../../services/customer-delivery.service';
import { TrackingSocketService } from '../../services/tracking-socket.service';

interface LiveTrackingErrorState {
  title: string;
  message: string;
}

interface TrackingLogEntry {
  source: 'REST' | 'WS';
  status: string;
  updatedAt: string;
}

interface TrackingTimelineStep {
  status: DeliveryStatus;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  current: boolean;
  recordedAt: string | null;
}

type TrackingEntrySource = 'details' | 'active-deliveries' | null;

const TRACKING_PROGRESS_FLOW: readonly DeliveryStatus[] = [
  DeliveryStatus.CREATED,
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
];

const TRACKING_STEP_META: Readonly<
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
  selector: 'app-live-tracking-page',
  imports: [
    DatePipe,
    RouterLink,
    Card,
    Skeleton,
  ],
  templateUrl: './live-tracking.html',
  styleUrls: ['./live-tracking.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveTrackingPage {
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly POLLING_INTERVAL_MS = 5000;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly customerDeliveryService = inject(CustomerDeliveryService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly trackingSocketService = inject(TrackingSocketService);

  private pollingSubscription: Subscription | null = null;
  private socketSubscription: Subscription | null = null;

  protected readonly loading = signal(true);
  protected readonly error = signal<LiveTrackingErrorState | null>(null);
  protected readonly connectionState = signal<TrackingConnectionState>('offline');
  protected readonly fallbackPollingActive = signal(false);
  protected readonly warningText = signal<string | null>(null);
  protected readonly model = signal<TrackingViewModel | null>(null);
  protected readonly deliveryDetail = signal<DeliveryDetailDto | null>(null);
  protected readonly activeDeliveryId = signal<string | null>(null);
  protected readonly entrySource = signal<TrackingEntrySource>(null);
  protected readonly eventLog = signal<TrackingLogEntry[]>([]);
  protected readonly liveStatusTimestamps = signal<Record<string, string>>({});
  protected readonly skeletonRows = [0, 1, 2];

  protected readonly deliveryCode = computed(() => {
    const trackingCode = this.deliveryDetail()?.trackingCode?.trim();
    return trackingCode && trackingCode.length > 0 ? trackingCode : '-';
  });
  protected readonly etaLabel = computed(() => {
    const eta = this.model()?.etaMinutes;
    return eta === null || eta === undefined ? '--' : `${eta} min`;
  });
  protected readonly progressPercent = computed(() => {
    const value = this.model()?.progressPercent ?? 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  });
  protected readonly distanceLabel = computed(() => {
    const eta = this.model()?.etaMinutes;
    if (eta === null || eta === undefined) {
      return '--';
    }
    const distanceKm = (eta * 25) / 60;
    return `${distanceKm.toFixed(1)} km`;
  });
  protected readonly courierName = computed(() => {
    const fullName = this.deliveryDetail()?.courier?.fullName?.trim();
    return fullName && fullName.length > 0 ? fullName : 'Awaiting assignment';
  });
  protected readonly courierPhone = computed(() => {
    const value = this.deliveryDetail()?.courier?.phone?.trim();
    return value && value.length > 0 ? value : null;
  });
  protected readonly courierInitials = computed(() => {
    const name = this.courierName();
    if (name === 'Awaiting assignment') {
      return '--';
    }
    const parts = name.split(/\s+/).filter((part) => part.length > 0);
    if (parts.length === 0) {
      return '--';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });
  protected readonly pickupAddress = computed(
    () => this.deliveryDetail()?.pickup.line1 ?? 'Pickup address unavailable',
  );
  protected readonly destinationAddress = computed(
    () => this.deliveryDetail()?.destination.line1 ?? 'Destination unavailable',
  );
  protected readonly deliveryType = computed<'STANDARD' | 'EXPRESS'>(() => {
    const raw = this.deliveryDetail()?.deliveryType;
    return raw === 'EXPRESS' ? 'EXPRESS' : 'STANDARD';
  });
  protected readonly pickupCompleted = computed(() => {
    const status = normalizeDeliveryStatus(this.model()?.status ?? '');
    if (
      status === DeliveryStatus.PICKED_UP ||
      status === DeliveryStatus.IN_TRANSIT ||
      status === DeliveryStatus.DELIVERED
    ) {
      return true;
    }

    const detail = this.deliveryDetail();
    if (!detail) {
      return false;
    }

    return detail.timeline.some(
      (item) => normalizeDeliveryStatus(item.status) === DeliveryStatus.PICKED_UP,
    );
  });
  protected readonly destinationDelivered = computed(() => {
    const status = normalizeDeliveryStatus(this.model()?.status ?? '');
    if (status === DeliveryStatus.DELIVERED) {
      return true;
    }

    const detail = this.deliveryDetail();
    if (!detail) {
      return false;
    }

    return detail.timeline.some(
      (item) => normalizeDeliveryStatus(item.status) === DeliveryStatus.DELIVERED,
    );
  });
  protected readonly timelineSteps = computed<TrackingTimelineStep[]>(() => {
    const currentStatus = normalizeDeliveryStatus(this.model()?.status ?? 'CREATED');
    const currentIndex = TRACKING_PROGRESS_FLOW.indexOf(
      currentStatus as DeliveryStatus,
    );
    const historyByStatus = new Map<string, string>();
    const detail = this.deliveryDetail();
    if (detail) {
      for (const item of detail.timeline) {
        historyByStatus.set(normalizeDeliveryStatus(item.status), item.recordedAt);
      }
    }
    for (const [status, recordedAt] of Object.entries(this.liveStatusTimestamps())) {
      historyByStatus.set(status, recordedAt);
    }

    return TRACKING_PROGRESS_FLOW.map((status, index) => ({
      status,
      title: TRACKING_STEP_META[status].title,
      description: TRACKING_STEP_META[status].description,
      icon: TRACKING_STEP_META[status].icon,
      completed: currentIndex >= index,
      current: currentIndex === index,
      recordedAt: historyByStatus.get(status) ?? null,
    }));
  });
  protected readonly connectionLabel = computed(() => {
    const state = this.connectionState();
    if (state === 'live') {
      return 'Live';
    }
    if (state === 'connecting') {
      return 'Connecting';
    }
    if (state === 'reconnecting') {
      return 'Reconnecting';
    }
    return 'Offline';
  });
  protected readonly connectionSeverity = computed<
    'success' | 'info' | 'warn' | 'secondary'
  >(() => {
    const state = this.connectionState();
    if (state === 'live') {
      return 'success';
    }
    if (state === 'connecting') {
      return 'info';
    }
    if (state === 'reconnecting') {
      return 'warn';
    }
    return 'secondary';
  });
  protected readonly statusLabel = computed(() =>
    resolveDeliveryStatusPresentation(this.model()?.status ?? 'UNKNOWN').label,
  );

  constructor() {
    this.pageHeaderService.setOverride(
      'Delivery Tracking',
      'Real-time status updates',
    );
    this.destroyRef.onDestroy(() => {
      this.pageHeaderService.clearOverride();
      this.pageHeaderService.clearAction();
      this.stopPolling();
      this.unsubscribeSocket();
      this.trackingSocketService.clearActiveDelivery();
    });

    this.trackingSocketService.connectionState$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.connectionState.set(state);
        this.syncFallbackMode();
      });

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.handleRouteParams(params));
  }

  protected retry(): void {
    this.handleRouteParams(this.route.snapshot.paramMap);
  }

  protected goToDetails(): void {
    const deliveryId = this.deliveryDetail()?.id ?? this.activeDeliveryId();
    if (!deliveryId) {
      void this.router.navigate(['/customer']);
      return;
    }
    void this.router.navigate(['/customer/delivery', deliveryId]);
  }

  protected goToActiveDeliveries(): void {
    void this.router.navigate(['/customer/tracking']);
  }

  protected callCourier(): void {
    const phone = this.courierPhone();
    if (!phone) {
      return;
    }

    window.location.href = `tel:${phone}`;
  }

  protected sendMessageToCourier(): void {
    const phone = this.courierPhone();
    if (!phone) {
      return;
    }
    window.location.href = `sms:${phone}`;
  }

  protected asTimelineMessage(status: string): string {
    const normalized = normalizeDeliveryStatus(status);
    return TRACKING_STEP_META[normalized as DeliveryStatus]?.description ?? status;
  }

  protected eventDotClass(status: string): string {
    const normalized = normalizeDeliveryStatus(status);
    if (normalized === DeliveryStatus.DELIVERED) {
      return 'bg-emerald-500';
    }
    if (normalized === DeliveryStatus.IN_TRANSIT) {
      return 'bg-blue-500';
    }
    if (normalized === DeliveryStatus.PICKED_UP || normalized === DeliveryStatus.ASSIGNED) {
      return 'bg-cyan-500';
    }
    if (normalized === DeliveryStatus.CANCELLED || normalized === DeliveryStatus.FAILED) {
      return 'bg-red-500';
    }
    return 'bg-slate-400';
  }

  private handleRouteParams(params: ParamMap): void {
    const deliveryId = (params.get('id') ?? params.get('deliveryId') ?? '').trim();
    const nextEntrySource = this.resolveEntrySource();
    this.entrySource.set(nextEntrySource);
    this.pageHeaderService.clearAction();
    this.pageHeaderService.setOverride(
      'Delivery Tracking',
      'Real-time status updates',
    );
    this.loading.set(true);
    this.error.set(null);
    this.warningText.set(null);
    this.model.set(null);
    this.deliveryDetail.set(null);
    this.eventLog.set([]);
    this.liveStatusTimestamps.set({});
    this.stopPolling();
    this.unsubscribeSocket();
    this.trackingSocketService.clearActiveDelivery();
    this.activeDeliveryId.set(null);

    if (!LiveTrackingPage.UUID_PATTERN.test(deliveryId)) {
      this.error.set({
        title: 'Invalid delivery id',
        message: 'The tracking link is invalid.',
      });
      this.loading.set(false);
      return;
    }

    this.activeDeliveryId.set(deliveryId);
    this.applyHeaderAction(nextEntrySource);
    this.pageHeaderService.setOverride('Delivery Tracking', 'Real-time status updates');
    this.customerDeliveryService
      .getStatusSnapshot(deliveryId)
      .pipe(
        switchMap((snapshot) => {
          this.applySnapshot(snapshot, 'REST');
          this.startSocketTracking(deliveryId);
          return this.deliveryService.getById(deliveryId).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          const uiError = this.customerDeliveryService.toUiError(error);
          if (uiError.type === 'NOT_FOUND') {
            this.error.set({
              title: 'Delivery not found',
              message:
                uiError.detail ??
                'We could not find this delivery. It may have been removed.',
            });
          } else if (uiError.type === 'ACCESS_DENIED') {
            this.error.set({
              title: "You don't have access",
              message:
                uiError.detail ??
                'This delivery is not available for your account.',
            });
          } else {
            this.error.set({
              title: 'Could not load tracking',
              message: 'Please refresh the page and try again.',
            });
          }
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((detail) => {
        if (!detail || this.activeDeliveryId() !== deliveryId) {
          return;
        }
        this.deliveryDetail.set(detail);
        const trackingCode = detail.trackingCode?.trim() || '-';
        this.pageHeaderService.setOverride(
          'Delivery Tracking',
          `Delivery ${trackingCode} - Real-time status updates`,
        );
      });
  }

  private resolveEntrySource(): TrackingEntrySource {
    const currentNavigation = this.router.getCurrentNavigation();
    const rawStateSource =
      currentNavigation?.extras.state?.['trackingSource'] ??
      history.state?.trackingSource;
    if (rawStateSource === 'details') {
      return 'details';
    }
    if (rawStateSource === 'active-deliveries') {
      return 'active-deliveries';
    }
    return null;
  }

  private applyHeaderAction(source: TrackingEntrySource): void {
    if (source === 'details') {
      this.pageHeaderService.setAction({
        label: 'Back to details',
        icon: 'pi pi-arrow-left',
        run: () => this.goToDetails(),
      });
      return;
    }
    if (source === 'active-deliveries') {
      this.pageHeaderService.setAction({
        label: 'Back to active deliveries',
        icon: 'pi pi-arrow-left',
        run: () => this.goToActiveDeliveries(),
      });
      return;
    }
    this.pageHeaderService.clearAction();
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

    this.applySnapshot(
      {
        status: event.status,
        etaMinutes: event.etaMinutes,
        updatedAt: event.updatedAt,
        progressPercent: event.progressPercent,
      },
      'WS',
    );
  }

  private syncFallbackMode(): void {
    const deliveryId = this.activeDeliveryId();
    if (!deliveryId || this.error()) {
      this.stopPolling();
      this.warningText.set(null);
      return;
    }

    const state = this.connectionState();
    if (state === 'live') {
      this.stopPolling();
      this.warningText.set(null);
      return;
    }

    if (state === 'reconnecting' || state === 'offline') {
      this.warningText.set(
        'Real-time connection is unstable. Showing updates via periodic refresh.',
      );
      this.startPolling(deliveryId);
      return;
    }

    this.warningText.set('Connecting to live updates...');
  }

  private startPolling(deliveryId: string): void {
    if (this.pollingSubscription) {
      return;
    }

    this.fallbackPollingActive.set(true);
    this.pollingSubscription = interval(LiveTrackingPage.POLLING_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.customerDeliveryService
            .getStatusSnapshot(deliveryId)
            .pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((snapshot) => {
        if (!snapshot || this.activeDeliveryId() !== deliveryId) {
          return;
        }
        this.applySnapshot(snapshot, 'REST');
      });
  }

  private stopPolling(): void {
    this.fallbackPollingActive.set(false);
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

  private applySnapshot(
    snapshot: DeliveryStatusSnapshotDto,
    source: TrackingLogEntry['source'],
  ): void {
    const deliveryId = this.activeDeliveryId();
    if (!deliveryId) {
      return;
    }

    const nextProgress =
      snapshot.progressPercent !== null && snapshot.progressPercent !== undefined
        ? snapshot.progressPercent
        : this.deriveProgressFromStatus(snapshot.status);
    const nextModel: TrackingViewModel = {
      deliveryId,
      status: snapshot.status,
      updatedAt: snapshot.updatedAt,
      etaMinutes: snapshot.etaMinutes ?? null,
      progressPercent: nextProgress,
    };

    const current = this.model();
    if (current && this.isStale(current.updatedAt, nextModel.updatedAt)) {
      return;
    }
    if (
      current &&
      normalizeDeliveryStatus(current.status) === normalizeDeliveryStatus(nextModel.status) &&
      current.updatedAt === nextModel.updatedAt
    ) {
      return;
    }

    this.model.set(nextModel);
    const normalizedStatus = normalizeDeliveryStatus(nextModel.status);
    this.liveStatusTimestamps.update((current) => ({
      ...current,
      [normalizedStatus]: nextModel.updatedAt,
    }));
    this.pushEventLog(source, nextModel.status, nextModel.updatedAt);
  }

  private deriveProgressFromStatus(status: string): number {
    const normalized = normalizeDeliveryStatus(status);
    const map: Record<string, number> = {
      [DeliveryStatus.CREATED]: 10,
      [DeliveryStatus.ASSIGNED]: 35,
      [DeliveryStatus.PICKED_UP]: 60,
      [DeliveryStatus.IN_TRANSIT]: 85,
      [DeliveryStatus.DELIVERED]: 100,
      [DeliveryStatus.CANCELLED]: 100,
      [DeliveryStatus.FAILED]: 100,
    };
    return map[normalized] ?? 0;
  }

  private isStale(currentUpdatedAt: string, incomingUpdatedAt: string): boolean {
    const currentTs = Date.parse(currentUpdatedAt);
    const incomingTs = Date.parse(incomingUpdatedAt);
    if (Number.isNaN(currentTs) || Number.isNaN(incomingTs)) {
      return false;
    }
    return incomingTs < currentTs;
  }

  private pushEventLog(
    source: TrackingLogEntry['source'],
    status: string,
    updatedAt: string,
  ): void {
    const current = this.eventLog();
    const nextEntry: TrackingLogEntry = {
      source,
      status,
      updatedAt,
    };
    this.eventLog.set([nextEntry, ...current].slice(0, 8));
  }
}
