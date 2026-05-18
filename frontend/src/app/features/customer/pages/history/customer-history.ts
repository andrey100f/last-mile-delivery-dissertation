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
  DeliverySummaryDto,
  PageDto,
} from '@core/services/enum/delivery.types';
import { StatusTagComponent, TableEmptyStateComponent } from '@shared/ui/public-api';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

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
  private static readonly FETCH_PAGE_SIZE = 200;

  private readonly deliveryService = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly statusFilter = signal<HistoryStatusFilter>('all');

  protected readonly pageFirst = signal(0);
  protected readonly rowsPerPage = CustomerHistoryPage.PAGE_SIZE;
  protected readonly loadingSkeletonRows = [0, 1, 2, 3];

  private readonly allRows = signal<CustomerHistoryRow[]>([]);

  protected readonly filteredRows = computed(() =>
    this.allRows().filter((row) => this.matchesStatusFilter(row.status)),
  );

  protected readonly totalDeliveries = computed(() => this.allRows().length);
  protected readonly completedDeliveries = computed(
    () =>
      this.allRows().filter((row) => this.normalizeStatus(row.status) === 'DELIVERED')
        .length,
  );
  protected readonly totalSpent = computed(() =>
    this.allRows()
      .filter((row) => this.normalizeStatus(row.status) === 'DELIVERED')
      .reduce((sum, row) => sum + row.amount, 0),
  );
  protected readonly spendCurrency = computed(() => {
    const delivered = this.allRows().find(
      (row) => this.normalizeStatus(row.status) === 'DELIVERED',
    );
    return delivered?.currency ?? 'RON';
  });

  protected readonly showingStart = computed(() =>
    this.filteredRows().length === 0 ? 0 : this.pageFirst() + 1,
  );
  protected readonly showingEnd = computed(() =>
    Math.min(this.pageFirst() + this.rowsPerPage, this.filteredRows().length),
  );

  constructor() {
    this.loadHistoryData();
  }

  protected setStatusFilter(filter: HistoryStatusFilter): void {
    if (this.statusFilter() === filter) {
      return;
    }
    this.statusFilter.set(filter);
    this.pageFirst.set(0);
  }

  protected isStatusFilterActive(filter: HistoryStatusFilter): boolean {
    return this.statusFilter() === filter;
  }

  protected onPageChange(event: { first?: number }): void {
    this.pageFirst.set(typeof event.first === 'number' ? event.first : 0);
  }

  protected openDeliveryDetails(deliveryId: string): void {
    void this.router.navigate(['/customer/delivery', deliveryId]);
  }

  protected retry(): void {
    this.loadHistoryData();
  }

  private loadHistoryData(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.deliveryService
      .listForCurrentCustomer({
        page: 0,
        size: CustomerHistoryPage.FETCH_PAGE_SIZE,
        sort: 'createdAt,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((firstPage) => this.loadAllPages(firstPage)),
        map((deliveries) => deliveries.map((delivery) => this.mapRow(delivery))),
        catchError(() => {
          this.loadError.set('Could not load delivery history. Please retry.');
          return of([] as CustomerHistoryRow[]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((rows) => {
        this.allRows.set(rows);
        this.pageFirst.set(0);
      });
  }

  private loadAllPages(
    firstPage: PageDto<DeliverySummaryDto>,
  ) {
    const firstContent = Array.isArray(firstPage.content) ? firstPage.content : [];
    const totalPages =
      typeof firstPage.totalPages === 'number' && firstPage.totalPages > 0
        ? firstPage.totalPages
        : 1;

    if (totalPages <= 1) {
      return of(firstContent);
    }

    const remainingRequests = Array.from({ length: totalPages - 1 }, (_unused, index) =>
      this.deliveryService
        .listForCurrentCustomer({
          page: index + 1,
          size: CustomerHistoryPage.FETCH_PAGE_SIZE,
          sort: 'createdAt,desc',
        })
        .pipe(
          map((response) =>
            Array.isArray(response.content) ? response.content : ([] as DeliverySummaryDto[]),
          ),
          catchError(() => of([] as DeliverySummaryDto[])),
        ),
    );

    return forkJoin(remainingRequests).pipe(
      map((remainingPages) => [firstContent, ...remainingPages].flat()),
    );
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

  private matchesStatusFilter(statusRaw: string): boolean {
    const status = this.normalizeStatus(statusRaw);
    switch (this.statusFilter()) {
      case 'completed':
        return status === 'DELIVERED';
      default:
        return true;
    }
  }

  private normalizeStatus(status: string): string {
    return status.trim().toUpperCase();
  }
}
