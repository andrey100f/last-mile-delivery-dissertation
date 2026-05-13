import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { catchError, finalize, interval, of, switchMap } from 'rxjs';
import { CustomerNotificationDto } from '../../models/notification.models';
import { NotificationService } from '../../services/notification.service';
import { resolveNotificationTypePresentation } from '../../utils/notification-type.mapper';

interface NotificationPageState {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

type NotificationViewFilter = 'ALL' | 'UNREAD' | 'DELIVERIES' | 'COMPLETED';

interface NotificationViewFilterChip {
  label: string;
  value: NotificationViewFilter;
}

const DEFAULT_PAGE_SIZE = 20;
const NOTIFICATIONS_REFRESH_INTERVAL_MS = 10000;
const DELIVERY_CODE_GLOBAL_PATTERN = /\b(?:DLV|DH)-[A-Z0-9-]+\b/gi;
const STATUS_TEXT_PATTERN =
  /\b(picked up|in transit|delivered|completed|cancelled|canceled|failed|assigned|accepted|created|delayed)\b/gi;
const HIGHLIGHT_TEXT_PATTERN =
  /\b(?:DLV|DH)-[A-Z0-9-]+\b|\b(picked up|in transit|delivered|completed|cancelled|canceled|failed|assigned|accepted|created|delayed)\b/gi;

interface HighlightTextPart {
  text: string;
  className: string;
}

@Component({
  selector: 'app-customer-notifications-page',
  imports: [Button, Skeleton],
  templateUrl: './customer-notifications.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerNotificationsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly messageService = inject(MessageService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly selectedFilter = signal<NotificationViewFilter>('ALL');
  protected readonly items = signal<CustomerNotificationDto[]>([]);
  protected readonly pageState = signal<NotificationPageState>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  protected readonly markAllInFlight = signal(false);
  protected readonly pendingActionIds = signal<Set<string>>(new Set());
  protected readonly loadingSkeletonRows = [0, 1, 2, 3, 4];
  protected readonly viewFilters: readonly NotificationViewFilterChip[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Unread', value: 'UNREAD' },
    { label: 'Deliveries', value: 'DELIVERIES' },
    { label: 'Completed', value: 'COMPLETED' },
  ];
  protected readonly visibleItems = computed(() =>
    this.items().filter((item) => this.shouldDisplayInFilter(item, this.selectedFilter())),
  );

  constructor() {
    this.applyQueryState(this.route.snapshot.queryParamMap);
    this.loadNotifications();
    this.startNotificationsPolling();
  }

  protected retry(): void {
    this.loadNotifications();
  }

  protected selectFilter(filter: NotificationViewFilter): void {
    if (this.selectedFilter() === filter) {
      return;
    }
    this.selectedFilter.set(filter);
    this.resetToFirstPageAndReload();
  }

  protected markAsRead(item: CustomerNotificationDto): void {
    if (item.read || this.isActionPending(item.id)) {
      return;
    }

    const previousItems = this.items();
    const previousPage = this.pageState();
    this.setActionPending(item.id, true);
    this.actionError.set(null);
    this.applyMarkOneOptimistic(item.id);

    this.notificationService
      .markAsRead(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.setActionPending(item.id, false)),
      )
      .subscribe({
        next: () => {
          this.notificationService
            .refreshUnreadCount()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
          if (this.selectedFilter() !== 'UNREAD') {
            return;
          }
          this.recoverPageAfterUnreadRemoval();
        },
        error: () => {
          this.items.set(previousItems);
          this.pageState.set(previousPage);
          this.actionError.set('Could not mark notification as read. Please retry.');
          this.messageService.add({
            severity: 'error',
            summary: 'Mark as read failed',
            detail: 'Notification state was restored.',
            life: 4500,
          });
        },
      });
  }

  protected markAllAsRead(): void {
    if (this.markAllInFlight()) {
      return;
    }

    const previousItems = this.items();
    const previousPage = this.pageState();
    this.markAllInFlight.set(true);
    this.actionError.set(null);
    this.applyMarkAllOptimistic();

    this.notificationService
      .markAllAsRead()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.markAllInFlight.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.notificationService.setUnreadCount(0);
          this.messageService.add({
            severity: response.updatedCount > 0 ? 'success' : 'info',
            summary:
              response.updatedCount > 0 ? 'Notifications updated' : 'Everything was already read',
            detail:
              response.updatedCount > 0
                ? `${response.updatedCount} notifications marked as read.`
                : 'No unread notifications needed updating.',
            life: 3500,
          });
          this.loadNotifications();
        },
        error: () => {
          this.items.set(previousItems);
          this.pageState.set(previousPage);
          this.actionError.set('Could not mark all notifications as read. Please retry.');
          this.messageService.add({
            severity: 'error',
            summary: 'Mark all failed',
            detail: 'Unread notifications were not changed.',
            life: 4500,
          });
        },
      });
  }

  protected openDelivery(deliveryId: string): void {
    void this.router.navigate(['/customer/delivery', deliveryId]);
  }

  protected goToPreviousPage(): void {
    const current = this.pageState();
    if (current.page <= 0 || this.loading()) {
      return;
    }
    this.pageState.set({
      ...current,
      page: current.page - 1,
    });
    this.syncQueryParams();
    this.loadNotifications();
  }

  protected goToNextPage(): void {
    const current = this.pageState();
    if (!this.hasNextPage() || this.loading()) {
      return;
    }
    this.pageState.set({
      ...current,
      page: current.page + 1,
    });
    this.syncQueryParams();
    this.loadNotifications();
  }

  protected hasNextPage(): boolean {
    const current = this.pageState();
    if (current.totalPages <= 1) {
      return false;
    }
    return current.page + 1 < current.totalPages;
  }

  protected isActionPending(notificationId: string): boolean {
    return this.pendingActionIds().has(notificationId);
  }

  protected isFilterSelected(filter: NotificationViewFilter): boolean {
    return this.selectedFilter() === filter;
  }

  protected notificationIcon(item: CustomerNotificationDto): string {
    if (this.isCompletedNotification(item)) {
      return 'pi pi-check-circle';
    }
    return resolveNotificationTypePresentation(item.type).icon;
  }

  protected notificationIconColorClass(item: CustomerNotificationDto): string {
    if (this.isCompletedNotification(item)) {
      return 'text-emerald-600';
    }
    return resolveNotificationTypePresentation(item.type).iconClass;
  }

  protected notificationIconContainerClass(item: CustomerNotificationDto): string {
    if (this.isCompletedNotification(item)) {
      return 'bg-emerald-50';
    }
    switch (item.type) {
      case 'STATUS_UPDATED':
        return 'bg-blue-50';
      case 'DELIVERY_ASSIGNED':
        return 'bg-teal-50';
      case 'DELIVERY_CREATED':
        return 'bg-cyan-50';
      case 'EXCEPTION_REPORTED':
        return 'bg-amber-50';
      case 'DELIVERY_CANCELLED':
        return 'bg-rose-50';
      case 'SYSTEM_ANNOUNCEMENT':
        return 'bg-violet-50';
      default:
        return 'bg-slate-100';
    }
  }

  protected openNotification(item: CustomerNotificationDto): void {
    if (item.deliveryId) {
      this.openDelivery(item.deliveryId);
    }
  }

  protected highlightedTextParts(text: string): HighlightTextPart[] {
    if (!text || text.trim().length === 0) {
      return [{ text, className: 'text-inherit' }];
    }

    const parts: HighlightTextPart[] = [];
    let lastIndex = 0;
    HIGHLIGHT_TEXT_PATTERN.lastIndex = 0;

    for (const match of text.matchAll(HIGHLIGHT_TEXT_PATTERN)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, index),
          className: 'text-inherit',
        });
      }

      const token = match[0];
      parts.push({
        text: token,
        className: this.highlightClassForToken(token),
      });
      lastIndex = index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push({
        text: text.slice(lastIndex),
        className: 'text-inherit',
      });
    }

    return parts.length > 0 ? parts : [{ text, className: 'text-inherit' }];
  }

  private highlightClassForToken(token: string): string {
    DELIVERY_CODE_GLOBAL_PATTERN.lastIndex = 0;
    if (DELIVERY_CODE_GLOBAL_PATTERN.test(token)) {
      return 'text-blue-600 font-semibold';
    }

    const normalized = token.toLowerCase();
    if (normalized === 'assigned') {
      return 'text-p-text-primary font-medium';
    }
    if (normalized === 'accepted') {
      return 'text-emerald-700 font-medium';
    }
    if (normalized === 'picked up') {
      return 'text-cyan-700 font-medium';
    }
    if (normalized === 'in transit') {
      return 'text-violet-700 font-medium';
    }
    if (normalized === 'completed') {
      return '!text-emerald-600 font-semibold';
    }
    if (normalized === 'delivered') {
      return 'text-emerald-700 font-medium';
    }
    if (
      normalized === 'cancelled' ||
      normalized === 'canceled' ||
      normalized === 'failed' ||
      normalized === 'delayed'
    ) {
      return 'text-rose-700 font-medium';
    }
    if (normalized === 'created') {
      return 'text-sky-700 font-medium';
    }
    return 'text-inherit';
  }

  protected pageNumberLabel(): number {
    return this.pageState().page + 1;
  }

  protected totalPagesLabel(): number {
    return Math.max(this.pageState().totalPages, 1);
  }

  private loadNotifications(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);

    const pageState = this.pageState();
    this.notificationService
      .getNotifications({
        page: pageState.page,
        size: pageState.size,
        sort: 'createdAt,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(Array.isArray(response.content) ? response.content : []);
          this.pageState.set({
            page:
              typeof response.number === 'number' && Number.isFinite(response.number)
                ? Math.max(response.number, 0)
                : 0,
            size:
              typeof response.size === 'number' &&
              Number.isFinite(response.size) &&
              response.size > 0
                ? response.size
                : pageState.size,
            totalElements:
              typeof response.totalElements === 'number' && Number.isFinite(response.totalElements)
                ? Math.max(response.totalElements, 0)
                : 0,
            totalPages:
              typeof response.totalPages === 'number' && Number.isFinite(response.totalPages)
                ? Math.max(response.totalPages, 0)
                : 0,
          });
        },
        error: () => {
          this.loadError.set('Could not load notifications. Please retry.');
          this.items.set([]);
        },
      });
  }

  private startNotificationsPolling(): void {
    interval(NOTIFICATIONS_REFRESH_INTERVAL_MS)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          if (
            this.loading() ||
            this.markAllInFlight() ||
            this.pendingActionIds().size > 0
          ) {
            return of(null);
          }
          return this.notificationService
            .getNotifications({
              page: this.pageState().page,
              size: this.pageState().size,
              sort: 'createdAt,desc',
            })
            .pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.items.set(Array.isArray(response.content) ? response.content : []);
        this.pageState.set({
          page:
            typeof response.number === 'number' && Number.isFinite(response.number)
              ? Math.max(response.number, 0)
              : this.pageState().page,
          size:
            typeof response.size === 'number' &&
            Number.isFinite(response.size) &&
            response.size > 0
              ? response.size
              : this.pageState().size,
          totalElements:
            typeof response.totalElements === 'number' && Number.isFinite(response.totalElements)
              ? Math.max(response.totalElements, 0)
              : this.pageState().totalElements,
          totalPages:
            typeof response.totalPages === 'number' && Number.isFinite(response.totalPages)
              ? Math.max(response.totalPages, 0)
              : this.pageState().totalPages,
        });
      });
  }

  private setActionPending(notificationId: string, pending: boolean): void {
    this.pendingActionIds.update((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(notificationId);
      } else {
        next.delete(notificationId);
      }
      return next;
    });
  }

  private applyMarkOneOptimistic(notificationId: string): void {
    const currentPage = this.pageState();
    const currentItems = this.items();

    if (this.selectedFilter() === 'UNREAD') {
      this.items.set(currentItems.filter((item) => item.id !== notificationId));
      const updatedTotal = Math.max(currentPage.totalElements - 1, 0);
      this.pageState.set({
        ...currentPage,
        totalElements: updatedTotal,
        totalPages: this.calculateTotalPages(updatedTotal, currentPage.size),
      });
      return;
    }

    this.items.set(
      currentItems.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              read: true,
              readAt: item.readAt ?? new Date().toISOString(),
            }
          : item,
      ),
    );
  }

  private applyMarkAllOptimistic(): void {
    const currentPage = this.pageState();
    if (this.selectedFilter() === 'UNREAD') {
      this.items.set([]);
      this.pageState.set({
        ...currentPage,
        page: 0,
        totalElements: 0,
        totalPages: 0,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    this.items.update((items) =>
      items.map((item) => ({
        ...item,
        read: true,
        readAt: item.readAt ?? nowIso,
      })),
    );
  }

  private recoverPageAfterUnreadRemoval(): void {
    const currentPage = this.pageState();
    if (this.items().length > 0) {
      return;
    }

    if (currentPage.page > 0) {
      this.pageState.set({
        ...currentPage,
        page: currentPage.page - 1,
      });
      this.syncQueryParams();
    }

    if (currentPage.totalElements > 0) {
      this.loadNotifications();
    }
  }

  private resetToFirstPageAndReload(): void {
    this.pageState.update((current) => ({
      ...current,
      page: 0,
    }));
    this.syncQueryParams();
    this.loadNotifications();
  }

  private applyQueryState(queryParamMap: ActivatedRoute['snapshot']['queryParamMap']): void {
    const page = this.parsePositiveInt(queryParamMap.get('page'), 0);
    const size = this.parsePositiveInt(queryParamMap.get('size'), DEFAULT_PAGE_SIZE);
    const filterParam = queryParamMap.get('filter');
    const selectedFilter = this.toFilterValue(filterParam);

    this.selectedFilter.set(selectedFilter);
    this.pageState.set({
      ...this.pageState(),
      page,
      size,
    });
  }

  private syncQueryParams(): void {
    const pageState = this.pageState();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: pageState.page || null,
        size: pageState.size !== DEFAULT_PAGE_SIZE ? pageState.size : null,
        filter: this.selectedFilter() !== 'ALL' ? this.selectedFilter() : null,
      },
    });
  }

  private parsePositiveInt(rawValue: string | null, fallback: number): number {
    if (!rawValue || rawValue.trim().length === 0) {
      return fallback;
    }
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return fallback;
    }
    return parsed;
  }

  private calculateTotalPages(totalElements: number, pageSize: number): number {
    if (pageSize <= 0) {
      return 0;
    }
    return Math.ceil(totalElements / pageSize);
  }

  private shouldDisplayInFilter(
    item: CustomerNotificationDto,
    filter: NotificationViewFilter,
  ): boolean {
    if (!this.isAllowedType(item.type)) {
      return false;
    }

    switch (filter) {
      case 'ALL':
        return true;
      case 'UNREAD':
        return !item.read;
      case 'DELIVERIES':
        return this.isDeliveryNotification(item);
      case 'COMPLETED':
        return this.isCompletedNotification(item);
      default:
        return true;
    }
  }

  private isAllowedType(type: string): boolean {
    return (
      type === 'DELIVERY_ASSIGNED' ||
      type === 'STATUS_UPDATED' ||
      type === 'EXCEPTION_REPORTED' ||
      type === 'DELIVERY_CREATED' ||
      type === 'DELIVERY_CANCELLED' ||
      type === 'SYSTEM_ANNOUNCEMENT'
    );
  }

  private isDeliveryNotification(item: CustomerNotificationDto): boolean {
    return (
      item.type === 'DELIVERY_ASSIGNED' ||
      item.type === 'DELIVERY_CREATED' ||
      item.type === 'DELIVERY_CANCELLED' ||
      item.type === 'STATUS_UPDATED'
    );
  }

  private isCompletedNotification(item: CustomerNotificationDto): boolean {
    if (item.type !== 'STATUS_UPDATED') {
      return false;
    }
    const text = `${item.title} ${item.message}`.toLowerCase();
    return text.includes('completed') || text.includes('delivered');
  }

  private toFilterValue(rawValue: string | null): NotificationViewFilter {
    return rawValue === 'UNREAD' ||
      rawValue === 'DELIVERIES' ||
      rawValue === 'COMPLETED'
      ? rawValue
      : 'ALL';
  }

}
