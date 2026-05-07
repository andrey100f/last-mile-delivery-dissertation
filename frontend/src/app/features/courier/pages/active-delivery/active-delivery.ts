import { CurrencyPipe, DatePipe } from '@angular/common';
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
import {
  DeliveryDetailDto,
  DeliveryStatusAction,
} from '@core/services/enum/delivery.types';
import {
  DeliveryStatus,
  normalizeDeliveryStatus,
  StatusTagComponent,
} from '@shared/ui/public-api';
import { formatDeliveryCode } from '@shared/utils/delivery-code';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Skeleton } from 'primeng/skeleton';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';
import { PageHeaderService } from '../../../../layout/page-header/page-header.service';
import { CourierDeliveryService } from '../../services/courier-delivery.service';

interface ActiveDeliveryErrorState {
  title: string;
  message: string;
}

interface CourierAction {
  id: 'MARK_PICKED_UP' | 'START_TRANSIT' | 'MARK_DELIVERED';
  label: string;
  icon: string;
  severity: 'primary' | 'success';
  apiAction: DeliveryStatusAction;
  requiresConfirmation?: boolean;
}

interface DeliveryProgressStep {
  status: DeliveryStatus;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  current: boolean;
  recordedAt: string | null;
}

const COURIER_ACTIONS: Readonly<
  Record<CourierAction['id'], Readonly<CourierAction>>
> = {
  MARK_PICKED_UP: {
    id: 'MARK_PICKED_UP',
    label: 'Mark as picked up',
    icon: 'pi pi-box',
    severity: 'primary',
    apiAction: 'PICKED_UP',
  },
  START_TRANSIT: {
    id: 'START_TRANSIT',
    label: 'Start transit',
    icon: 'pi pi-send',
    severity: 'primary',
    apiAction: 'IN_TRANSIT',
  },
  MARK_DELIVERED: {
    id: 'MARK_DELIVERED',
    label: 'Mark as delivered',
    icon: 'pi pi-check-circle',
    severity: 'success',
    apiAction: 'DELIVERED',
    requiresConfirmation: true,
  },
};

const STATUS_TO_ACTION_IDS: Readonly<Record<string, CourierAction['id'][]>> = {
  [DeliveryStatus.ASSIGNED]: ['MARK_PICKED_UP'],
  [DeliveryStatus.PICKED_UP]: ['START_TRANSIT'],
  [DeliveryStatus.IN_TRANSIT]: ['MARK_DELIVERED'],
};

const DELIVERY_PROGRESS_FLOW: readonly DeliveryStatus[] = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
];

const DELIVERY_PROGRESS_META: Readonly<
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
    title: 'Created',
    description: 'Waiting to be accepted by a courier.',
    icon: 'pi pi-plus-circle',
  },
  [DeliveryStatus.ASSIGNED]: {
    title: 'Assigned',
    description: 'Courier has accepted this delivery.',
    icon: 'pi pi-user-plus',
  },
  [DeliveryStatus.PICKED_UP]: {
    title: 'Package picked up',
    description: 'Package collected from pickup contact.',
    icon: 'pi pi-box',
  },
  [DeliveryStatus.IN_TRANSIT]: {
    title: 'In transit',
    description: 'Courier is on the way to destination.',
    icon: 'pi pi-send',
  },
  [DeliveryStatus.DELIVERED]: {
    title: 'Delivered',
    description: 'Package delivered successfully.',
    icon: 'pi pi-check-circle',
  },
  [DeliveryStatus.CANCELLED]: {
    title: 'Cancelled',
    description: 'Delivery was cancelled.',
    icon: 'pi pi-times-circle',
  },
  [DeliveryStatus.FAILED]: {
    title: 'Failed',
    description: 'Delivery could not be completed.',
    icon: 'pi pi-exclamation-triangle',
  },
};

function getAllowedActions(status: string): CourierAction[] {
  const normalized = normalizeDeliveryStatus(status);
  const actionIds = STATUS_TO_ACTION_IDS[normalized] ?? [];
  return actionIds.map((actionId) => COURIER_ACTIONS[actionId]);
}

@Component({
  selector: 'app-active-delivery-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    Card,
    Button,
    Skeleton,
    StatusTagComponent,
    ConfirmDialog,
  ],
  providers: [ConfirmationService],
  templateUrl: './active-delivery.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveDeliveryPage {
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courierDeliveryService = inject(CourierDeliveryService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly actionPending = signal(false);
  protected readonly pendingActionId = signal<CourierAction['id'] | null>(null);
  protected readonly detail = signal<DeliveryDetailDto | null>(null);
  protected readonly error = signal<ActiveDeliveryErrorState | null>(null);
  protected readonly skeletonRows = [0, 1, 2];
  protected readonly allowedActions = computed(() =>
    getAllowedActions(this.detail()?.status ?? ''),
  );
  protected readonly deliveryCode = computed(() => {
    const delivery = this.detail();
    if (!delivery) {
      return '-';
    }
    return formatDeliveryCode(delivery.id);
  });
  protected readonly currentStatus = computed(() =>
    normalizeDeliveryStatus(this.detail()?.status ?? ''),
  );
  protected readonly currentProgressIndex = computed(() =>
    DELIVERY_PROGRESS_FLOW.indexOf(this.currentStatus() as DeliveryStatus),
  );
  protected readonly completionPercent = computed(() => {
    const index = this.currentProgressIndex();
    if (index < 0) {
      return 0;
    }
    return Math.round(((index + 1) / DELIVERY_PROGRESS_FLOW.length) * 100);
  });
  protected readonly timelineSteps = computed<DeliveryProgressStep[]>(() => {
    const delivery = this.detail();
    if (!delivery) {
      return [];
    }

    const historyByStatus = new Map<string, string>();
    for (const item of delivery.timeline) {
      historyByStatus.set(normalizeDeliveryStatus(item.status), item.recordedAt);
    }

    const currentIndex = this.currentProgressIndex();
    return DELIVERY_PROGRESS_FLOW.map((status, index) => ({
      status,
      title: DELIVERY_PROGRESS_META[status].title,
      description: DELIVERY_PROGRESS_META[status].description,
      icon: DELIVERY_PROGRESS_META[status].icon,
      completed: currentIndex >= index,
      current: currentIndex === index,
      recordedAt: historyByStatus.get(status) ?? null,
    }));
  });
  protected readonly pickupCompleted = computed(() => {
    const status = this.currentStatus();
    if (
      status === DeliveryStatus.PICKED_UP ||
      status === DeliveryStatus.IN_TRANSIT ||
      status === DeliveryStatus.DELIVERED
    ) {
      return true;
    }

    const delivery = this.detail();
    if (!delivery) {
      return false;
    }

    return delivery.timeline.some(
      (item) => normalizeDeliveryStatus(item.status) === DeliveryStatus.PICKED_UP,
    );
  });
  protected readonly destinationDelivered = computed(() => {
    const status = this.currentStatus();
    if (status === DeliveryStatus.DELIVERED) {
      return true;
    }

    const delivery = this.detail();
    if (!delivery) {
      return false;
    }

    return delivery.timeline.some(
      (item) => normalizeDeliveryStatus(item.status) === DeliveryStatus.DELIVERED,
    );
  });

  constructor() {
    this.pageHeaderService.setOverride(
      'Active delivery',
      'Update status as you progress the route',
    );
    this.destroyRef.onDestroy(() => this.pageHeaderService.clearOverride());

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => this.loadDetail(params)),
      )
      .subscribe();
  }

  protected onActionClick(action: CourierAction): void {
    if (this.actionPending()) {
      return;
    }
    if (action.requiresConfirmation) {
      this.confirmationService.confirm({
        header: 'Mark delivery as completed?',
        message:
          'This action finalizes the delivery and cannot be undone from courier flow.',
        icon: 'pi pi-check-circle',
        rejectLabel: 'Cancel',
        acceptLabel: 'Confirm delivery',
        acceptButtonStyleClass:
          'p-button-success p-button-sm !rounded-md !px-4 !py-2',
        rejectButtonStyleClass:
          'p-button-text p-button-sm !rounded-md !px-4 !py-2',
        accept: () => this.executeAction(action),
      });
      return;
    }

    this.executeAction(action);
  }

  protected reload(): void {
    this.loadDetail(this.route.snapshot.paramMap)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected goToRequests(): void {
    void this.router.navigate(['/courier/requests']);
  }

  protected goToActiveDeliveries(): void {
    void this.router.navigate(['/courier/active']);
  }

  private executeAction(action: CourierAction): void {
    const delivery = this.detail();
    if (!delivery || this.actionPending()) {
      return;
    }

    this.actionPending.set(true);
    this.pendingActionId.set(action.id);

    this.courierDeliveryService
      .updateStatus(delivery.id, { action: action.apiAction })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.actionPending.set(false);
          this.pendingActionId.set(null);
        }),
      )
      .subscribe({
        next: (updatedDetail) => {
          this.detail.set(updatedDetail);
          this.pageHeaderService.setOverride(
            `Active delivery ${formatDeliveryCode(updatedDetail.id)}`,
            'Update status as you progress the route',
          );
          this.messageService.add({
            severity: action.id === 'MARK_DELIVERED' ? 'success' : 'info',
            summary:
              action.id === 'MARK_DELIVERED'
                ? 'Delivery completed'
                : 'Status updated',
            detail:
              action.id === 'MARK_DELIVERED'
                ? 'Delivery was marked as delivered successfully.'
                : `Delivery moved to ${normalizeDeliveryStatus(updatedDetail.status).replaceAll('_', ' ')}.`,
            life: 4000,
          });
        },
        error: (error: unknown) => {
          const uiError = this.courierDeliveryService.toUiError(error);
          if (uiError.type === 'INVALID_STATUS_TRANSITION') {
            this.messageService.add({
              severity: 'warn',
              summary: 'Transition not allowed',
              detail:
                uiError.detail ?? 'This status change is no longer allowed.',
              life: 5000,
            });
            this.reload();
            return;
          }

          if (uiError.type === 'ACCESS_DENIED' || uiError.type === 'NOT_FOUND') {
            this.messageService.add({
              severity: 'warn',
              summary: 'Delivery is no longer available',
              detail:
                uiError.detail ??
                'You no longer have access to this delivery. Returning to requests.',
              life: 5000,
            });
            this.goToRequests();
            return;
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Could not update status',
            detail: uiError.detail ?? 'Please try again in a few moments.',
            life: 5000,
          });
        },
      });
  }

  private loadDetail(params: ParamMap) {
    const id = params.get('id')?.trim() ?? '';
    this.loading.set(true);
    this.error.set(null);
    this.detail.set(null);

    if (!ActiveDeliveryPage.UUID_PATTERN.test(id)) {
      this.error.set({
        title: 'Invalid delivery id',
        message: 'The active delivery link is invalid.',
      });
      this.loading.set(false);
      return of(null);
    }

    return this.courierDeliveryService.getDeliveryDetail(id).pipe(
      catchError((error: unknown) => {
        const uiError = this.courierDeliveryService.toUiError(error);
        if (uiError.type === 'ACCESS_DENIED' || uiError.type === 'NOT_FOUND') {
          this.messageService.add({
            severity: 'warn',
            summary: 'Delivery unavailable',
            detail:
              uiError.detail ??
              'Delivery is no longer available for your account.',
            life: 5000,
          });
          this.goToRequests();
        } else {
          this.error.set({
            title: 'Could not load active delivery',
            message: 'Please refresh and try again.',
          });
        }
        return of(null);
      }),
      tap((detail) => {
        if (!detail) {
          return;
        }
        this.detail.set(detail);
        this.pageHeaderService.setOverride(
          `Active delivery ${formatDeliveryCode(detail.id)}`,
          'Update status as you progress the route',
        );
      }),
      finalize(() => this.loading.set(false)),
    );
  }
}
