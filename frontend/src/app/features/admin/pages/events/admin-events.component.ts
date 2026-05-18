import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { finalize, Subject, takeUntil } from 'rxjs';
import {
  AdminSystemEventDto,
  AdminSystemEventsPageDto,
} from '../../models/admin-events.models';
import { AdminEventsService } from '../../services/admin-events.service';

type LoadMode = 'initial' | 'filter' | 'paginate' | 'retry';
type EventViewFilter = 'ALL' | 'UNREAD';

interface EventViewFilterChip {
  label: string;
  value: EventViewFilter;
}

interface EventSummaryCard {
  label: string;
  value: number;
  icon: string;
  iconClass: string;
}

interface EventFeedRow {
  id: string;
  title: string;
  subtitlePrefix: string;
  deliveryCode: string | null;
  subtitleSuffix: string;
  relativeTime: string;
  type: string;
  deliveryId: string | null;
  read: boolean;
  icon: string;
  iconContainerClass: string;
  iconColorClass: string;
}

const ADMIN_EVENTS_READ_STORAGE_KEY = 'admin-events-read-ids';

@Component({
  selector: 'app-admin-events',
  imports: [Button, Skeleton],
  templateUrl: './admin-events.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEventsComponent implements OnDestroy {
  private readonly adminEventsService = inject(AdminEventsService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly hardError = signal<string | null>(null);
  protected readonly transientError = signal<string | null>(null);

  protected readonly selectedViewFilter = signal<EventViewFilter>('ALL');
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected readonly snapshot = signal<AdminSystemEventsPageDto | null>(null);
  protected readonly localReadIds = signal<Set<string>>(new Set<string>());

  protected readonly viewFilters: ReadonlyArray<EventViewFilterChip> = [
    { label: 'All', value: 'ALL' },
    { label: 'Unread', value: 'UNREAD' },
  ];

  protected readonly pageLabel = computed(() => {
    const data = this.snapshot();
    if (!data || data.totalElements === 0) {
      return 'No events';
    }
    const start = data.page * data.size + 1;
    const end = Math.min((data.page + 1) * data.size, data.totalElements);
    return `${start}-${end} of ${data.totalElements}`;
  });

  protected readonly eventRows = computed(() => {
    const readIds = this.localReadIds();
    const selectedFilter = this.selectedViewFilter();
    return (this.snapshot()?.items ?? [])
      .map((event) => this.toFeedRow(event, readIds))
      .filter((row) => this.matchesFilter(row, selectedFilter));
  });

  protected readonly summaryCards = computed<ReadonlyArray<EventSummaryCard>>(() => {
    const items = this.snapshot()?.items ?? [];
    return [
      {
        label: 'Deliveries',
        value: items.filter((event) =>
          ['DELIVERY_ASSIGNED', 'DELIVERY_STATUS_CHANGED'].includes(event.type),
        ).length,
        icon: 'pi pi-send',
        iconClass: 'bg-blue-50 text-blue-600',
      },
      {
        label: 'Total today',
        value: items.filter((event) => this.isTodayUtc(event.createdAt)).length,
        icon: 'pi pi-calendar',
        iconClass: 'bg-emerald-50 text-emerald-700',
      },
    ];
  });

  constructor() {
    this.localReadIds.set(this.loadPersistedReadIds());
    this.load('initial');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected retry(): void {
    this.load('retry');
  }

  protected nextPage(): void {
    const data = this.snapshot();
    if (!data?.hasNext) {
      return;
    }
    this.page.update((current) => current + 1);
    this.load('paginate');
  }

  protected previousPage(): void {
    const data = this.snapshot();
    if (!data?.hasPrevious) {
      return;
    }
    this.page.update((current) => Math.max(0, current - 1));
    this.load('paginate');
  }

  protected isFilterSelected(filter: EventViewFilter): boolean {
    return this.selectedViewFilter() === filter;
  }

  protected selectFilter(filter: EventViewFilter): void {
    if (this.selectedViewFilter() === filter) {
      return;
    }
    this.selectedViewFilter.set(filter);
    this.page.set(0);
    this.load('filter');
  }

  protected markAsRead(row: EventFeedRow): void {
    if (row.read) {
      return;
    }
    this.localReadIds.update((current) => {
      const next = new Set(current);
      next.add(row.id);
      this.persistReadIds(next);
      return next;
    });
  }

  protected markAllAsRead(): void {
    const allIds = (this.snapshot()?.items ?? []).map((item) => item.id);
    const next = new Set(this.localReadIds());
    for (const id of allIds) {
      next.add(id);
    }
    this.localReadIds.set(next);
    this.persistReadIds(next);
  }

  protected openDelivery(row: EventFeedRow): void {
    if (!row.deliveryId) {
      return;
    }
    void this.router.navigate(['/admin', 'deliveries', row.deliveryId]);
  }

  protected formatDateTime(value: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return '-';
    }
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(parsed));
  }

  private load(mode: LoadMode): void {
    if (this.loading() || this.refreshing()) {
      return;
    }
    const hasSnapshot = this.snapshot() !== null;
    this.hardError.set(null);
    this.transientError.set(null);
    if (hasSnapshot || mode !== 'initial') {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.adminEventsService
      .getEvents({
        type: this.activeFilterTypesForQuery(),
        from: null,
        to: null,
        page: this.page(),
        size: this.size(),
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (payload) => {
          this.snapshot.set(payload);
          this.hasLoadedAtLeastOnce.set(true);
        },
        error: (error: unknown) => {
          const uiError = this.adminEventsService.toUiError(error);
          const detail =
            uiError.detail ??
            'System events could not be loaded. Please retry in a few moments.';
          if (hasSnapshot) {
            this.transientError.set(detail);
            return;
          }
          this.hardError.set(detail);
          this.hasLoadedAtLeastOnce.set(true);
        },
      });
  }

  private activeFilterTypesForQuery(): string[] {
    return [];
  }

  private toFeedRow(event: AdminSystemEventDto, readIds: Set<string>): EventFeedRow {
    const metadata = event.metadata ?? {};
    const deliveryId = event.targetType === 'DELIVERY' ? event.targetId : null;
    const targetRef = this.shortId(deliveryId || event.id);
    const read = readIds.has(event.id);
    if (event.type === 'DELIVERY_ASSIGNED') {
      return {
        id: event.id,
        title: `Delivery assigned (${targetRef})`,
        subtitlePrefix: 'Delivery',
        deliveryCode: targetRef !== '-' ? targetRef : null,
        subtitleSuffix: 'was accepted by a courier.',
        relativeTime: this.toRelativeTime(event.createdAt),
        type: event.type,
        deliveryId,
        read,
        icon: 'pi pi-send',
        iconContainerClass: 'bg-blue-50',
        iconColorClass: 'text-blue-600',
      };
    }
    if (event.type === 'DELIVERY_STATUS_CHANGED') {
      const fromStatus = this.toText(metadata['fromStatus']) ?? 'UNKNOWN';
      const toStatus = this.toText(metadata['toStatus']) ?? 'UNKNOWN';
      const statusSuffix =
        fromStatus !== 'UNKNOWN' && toStatus !== 'UNKNOWN'
          ? `moved from ${fromStatus} to ${toStatus}.`
          : toStatus !== 'UNKNOWN'
            ? `is now ${toStatus}.`
            : fromStatus !== 'UNKNOWN'
              ? `left ${fromStatus}.`
              : 'status transition was recorded.';
      return {
        id: event.id,
        title: `Delivery status updated (${targetRef})`,
        subtitlePrefix: 'Delivery',
        deliveryCode: targetRef !== '-' ? targetRef : null,
        subtitleSuffix: statusSuffix,
        relativeTime: this.toRelativeTime(event.createdAt),
        type: event.type,
        deliveryId,
        read,
        icon: 'pi pi-sync',
        iconContainerClass: 'bg-cyan-50',
        iconColorClass: 'text-cyan-700',
      };
    }
    if (event.type === 'EXCEPTION_CREATED') {
      return {
        id: event.id,
        title: `Exception created (${targetRef})`,
        subtitlePrefix: 'Delivery',
        deliveryCode: targetRef !== '-' ? targetRef : null,
        subtitleSuffix: 'reported an exception and requires review.',
        relativeTime: this.toRelativeTime(event.createdAt),
        type: event.type,
        deliveryId,
        read,
        icon: 'pi pi-exclamation-triangle',
        iconContainerClass: 'bg-amber-50',
        iconColorClass: 'text-amber-700',
      };
    }
    if (event.type === 'EXCEPTION_RESOLVED') {
      return {
        id: event.id,
        title: `Exception resolved (${targetRef})`,
        subtitlePrefix: 'Delivery',
        deliveryCode: targetRef !== '-' ? targetRef : null,
        subtitleSuffix: 'exception workflow was closed.',
        relativeTime: this.toRelativeTime(event.createdAt),
        type: event.type,
        deliveryId,
        read,
        icon: 'pi pi-check-circle',
        iconContainerClass: 'bg-emerald-50',
        iconColorClass: 'text-emerald-700',
      };
    }
    const emailDomain = this.toText(metadata['emailDomain']) ?? 'unknown domain';
    return {
      id: event.id,
      title: 'Failed login attempt detected',
      subtitlePrefix: 'Authentication',
      deliveryCode: null,
      subtitleSuffix: `rejected for account domain ${emailDomain}.`,
      relativeTime: this.toRelativeTime(event.createdAt),
      type: event.type,
      deliveryId,
      read,
      icon: 'pi pi-shield',
      iconContainerClass: 'bg-red-50',
      iconColorClass: 'text-red-700',
    };
  }

  private matchesFilter(row: EventFeedRow, filter: EventViewFilter): boolean {
    if (filter === 'UNREAD') {
      return !row.read;
    }
    return true;
  }

  private toRelativeTime(value: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return '-';
    }
    const now = Date.now();
    const diffMs = Math.max(0, now - parsed);
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) {
      return 'just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  private shortId(id: string | null): string {
    if (!id) {
      return '-';
    }
    return id.slice(0, 8).toUpperCase();
  }

  private isTodayUtc(value: string): boolean {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return false;
    }
    const date = new Date(parsed);
    const now = new Date();
    return (
      date.getUTCFullYear() === now.getUTCFullYear() &&
      date.getUTCMonth() === now.getUTCMonth() &&
      date.getUTCDate() === now.getUTCDate()
    );
  }

  private toText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private loadPersistedReadIds(): Set<string> {
    try {
      const raw = localStorage.getItem(ADMIN_EVENTS_READ_STORAGE_KEY);
      if (!raw) {
        return new Set<string>();
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return new Set<string>();
      }
      const ids = parsed.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.trim().length > 0,
      );
      return new Set(ids);
    } catch {
      return new Set<string>();
    }
  }

  private persistReadIds(ids: Set<string>): void {
    try {
      localStorage.setItem(
        ADMIN_EVENTS_READ_STORAGE_KEY,
        JSON.stringify(Array.from(ids)),
      );
    } catch {
      // Ignore storage persistence errors; UI state still updates in-memory.
    }
  }
}
