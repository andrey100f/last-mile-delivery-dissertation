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
import { Router } from '@angular/router';
import { DeliveryService } from '@core/services/delivery/delivery';
import {
  CustomerHistorySummaryDto,
  DeliverySummaryDto,
} from '@core/services/enum/delivery.types';
import { StatusTagComponent, TableEmptyStateComponent } from '@shared/ui/public-api';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { catchError, finalize, of } from 'rxjs';

type HistoryStatusFilter = 'all' | 'completed';

interface CustomerHistoryRow {
  id: string;
  shortId: string;
  status: string;
  createdAt: string;
  pickup: string;
  destination: string;
  amount: number;
  currency: string;
}

@Component({
  selector: 'app-customer-history-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    TableModule,
    Button,
    Skeleton,
    StatusTagComponent,
    TableEmptyStateComponent,
  ],
  templateUrl: './customer-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerHistoryPage {
  private static readonly PAGE_SIZE = 8;
  private static readonly DEFAULT_SUMMARY: CustomerHistorySummaryDto = {
    totalDeliveries: 0,
    deliveredDeliveries: 0,
    totalSpent: 0,
    totalSpentCurrency: 'RON',
  };

  private readonly destroyRef = inject(DestroyRef);
  private readonly deliveryService = inject(DeliveryService);
  private readonly router = inject(Router);

  protected readonly initialLoading = signal(false);
  protected readonly tableLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly statusFilter = signal<HistoryStatusFilter>('all');

  protected readonly activePage = signal(0);
  protected readonly pageFirst = signal(0);
  protected readonly rowsPerPage = CustomerHistoryPage.PAGE_SIZE;
  protected readonly loadingSkeletonRows = [0, 1, 2, 3];
  protected readonly rows = signal<CustomerHistoryRow[]>([]);
  protected readonly totalRecords = signal(0);

  private readonly summary = signal<CustomerHistorySummaryDto>(
    CustomerHistoryPage.DEFAULT_SUMMARY,
  );

  protected readonly totalDeliveries = computed(
    () => this.summary().totalDeliveries,
  );
  protected readonly completedDeliveries = computed(
    () => this.summary().deliveredDeliveries,
  );
  protected readonly totalSpent = computed(() => this.summary().totalSpent);
  protected readonly spendCurrency = computed(
    () => this.summary().totalSpentCurrency || 'RON',
  );

  constructor() {
    this.loadSummary();
    this.loadHistoryData();
  }

  protected setStatusFilter(filter: HistoryStatusFilter): void {
    if (this.statusFilter() === filter) {
      return;
    }
    this.statusFilter.set(filter);
    this.activePage.set(0);
    this.pageFirst.set(0);
    this.loadHistoryData(0, this.rowsPerPage);
  }

  protected isStatusFilterActive(filter: HistoryStatusFilter): boolean {
    return this.statusFilter() === filter;
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    if (!this.hasLoadedAtLeastOnce() || this.initialLoading() || this.tableLoading()) {
      return;
    }

    const rows =
      typeof event.rows === 'number' && event.rows > 0
        ? event.rows
        : this.rowsPerPage;
    const first =
      typeof event.first === 'number' && event.first >= 0
        ? event.first
        : this.pageFirst();
    const page = Math.floor(first / rows);

    if (page === this.activePage() && rows === this.rowsPerPage && first === this.pageFirst()) {
      return;
    }

    this.activePage.set(page);
    this.pageFirst.set(first);
    this.loadHistoryData(page, rows);
  }

  protected openDeliveryDetails(deliveryId: string): void {
    void this.router.navigate(['/customer/delivery', deliveryId]);
  }

  protected retry(): void {
    this.loadSummary();
    this.loadHistoryData(this.activePage(), this.rowsPerPage);
  }

  private loadSummary(): void {
    this.deliveryService
      .getCustomerHistorySummary()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(CustomerHistoryPage.DEFAULT_SUMMARY)),
      )
      .subscribe((summary) => {
        this.summary.set({
          totalDeliveries: this.toNonNegative(summary.totalDeliveries),
          deliveredDeliveries: this.toNonNegative(summary.deliveredDeliveries),
          totalSpent: this.toNonNegative(summary.totalSpent),
          totalSpentCurrency: this.toCurrency(summary.totalSpentCurrency),
        });
      });
  }

  private loadHistoryData(page = 0, size = this.rowsPerPage): void {
    if (this.initialLoading() || this.tableLoading()) {
      return;
    }

    const isInitial = !this.hasLoadedAtLeastOnce();
    if (isInitial) {
      this.initialLoading.set(true);
    } else {
      this.tableLoading.set(true);
    }
    this.loadError.set(null);

    this.deliveryService
      .listForCurrentCustomer({
        page,
        size,
        sort: 'createdAt,desc',
        status: this.statusFilter() === 'completed' ? 'DELIVERED' : undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError.set('Could not load delivery history. Please retry.');
          return of({
            content: [] as DeliverySummaryDto[],
            totalElements: 0,
          });
        }),
        finalize(() => {
          this.initialLoading.set(false);
          this.tableLoading.set(false);
        }),
      )
      .subscribe((response) => {
        const deliveries = Array.isArray(response.content) ? response.content : [];
        this.activePage.set(page);
        this.pageFirst.set(page * size);
        this.rows.set(deliveries.map((delivery) => this.mapRow(delivery)));
        this.totalRecords.set(this.toNonNegative(response.totalElements));
        this.hasLoadedAtLeastOnce.set(true);
      });
  }

  private mapRow(delivery: DeliverySummaryDto): CustomerHistoryRow {
    return {
      id: delivery.id,
      shortId: this.toShortId(delivery),
      status: delivery.status ?? 'CREATED',
      createdAt: delivery.createdAt,
      pickup: this.toDisplayAddress(delivery.pickupLine1),
      destination: this.toDisplayAddress(delivery.destinationLine1),
      amount: Number.isFinite(delivery.totalAmount) ? delivery.totalAmount : 0,
      currency: delivery.currency?.trim() || 'RON',
    };
  }

  private toShortId(delivery: DeliverySummaryDto): string {
    const tracking = delivery.trackingCode?.trim();
    if (tracking) {
      return tracking;
    }
    const raw = delivery.id.replaceAll('-', '').toUpperCase().slice(0, 6);
    return `DLV-${raw || '000000'}`;
  }

  private toDisplayAddress(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : '-';
  }

  private toNonNegative(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, value);
  }

  private toCurrency(value: unknown): string {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim().toUpperCase()
      : 'RON';
  }
}
