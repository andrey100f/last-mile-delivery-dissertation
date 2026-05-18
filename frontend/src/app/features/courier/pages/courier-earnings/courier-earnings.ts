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
import { StatusTagComponent, TableEmptyStateComponent } from '@shared/ui/public-api';
import { Button } from 'primeng/button';
import { UIChart } from 'primeng/chart';
import { Skeleton } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  CourierEarningsEntriesPage,
  CourierEarningsEntryDto,
  CourierEarningsSummaryDto,
} from '../../models/courier-earnings.models';
import { CourierEarningsService } from '../../services/courier-earnings.service';
import { mapEarningsToChart } from '../../utils/courier-earnings-chart.mapper';

type LoadMode = 'initial' | 'filter' | 'retry';

interface EarningsEntryRow {
  deliveryId: string;
  shortCode: string;
  earnedAt: string;
  amount: number;
  currency: string;
  status: string;
}

@Component({
  selector: 'app-courier-earnings-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    Button,
    Skeleton,
    TableModule,
    UIChart,
    StatusTagComponent,
    TableEmptyStateComponent,
  ],
  templateUrl: './courier-earnings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourierEarningsPage {
  private static readonly DEFAULT_PAGE_SIZE = 10;

  private readonly courierEarningsService = inject(CourierEarningsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly entriesLoading = signal(false);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly hardError = signal<string | null>(null);
  protected readonly transientError = signal<string | null>(null);
  protected readonly dateRangeError = signal<string | null>(null);

  protected readonly fromDate = signal(this.toInputDate(-13));
  protected readonly toDate = signal(this.toInputDate(0));
  protected readonly maxRangeDays = signal(180);

  protected readonly summary = signal<CourierEarningsSummaryDto | null>(null);
  protected readonly rows = signal<EarningsEntryRow[]>([]);
  protected readonly totalRecords = signal(0);
  protected readonly activePage = signal(0);
  protected readonly pageSize = signal(CourierEarningsPage.DEFAULT_PAGE_SIZE);
  protected readonly loadingSkeletonRows = [0, 1, 2, 3];

  protected readonly chartModel = computed(() => mapEarningsToChart(this.summary()));
  protected readonly currency = computed(() => this.summary()?.currency ?? 'RON');
  protected readonly todayTotal = computed(() => this.summary()?.todayTotal ?? 0);
  protected readonly weekTotal = computed(() => this.summary()?.weekTotal ?? 0);
  protected readonly monthTotal = computed(() => this.summary()?.monthTotal ?? 0);
  protected readonly customRangeTotal = computed(
    () => this.summary()?.customRangeTotal ?? 0,
  );
  protected readonly customWindowLabel = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return 'Selected range';
    }
    const from = this.formatDate(summary.window.from);
    const to = this.formatDate(summary.window.to);
    return `${from} -> ${to}`;
  });
  protected readonly trendLabel = computed(() => {
    const trend = this.summary()?.trend;
    if (!trend || trend.deltaPercent === null) {
      return 'No previous period baseline available yet';
    }
    const direction = trend.deltaPercent >= 0 ? '+' : '';
    return `${direction}${trend.deltaPercent.toFixed(2)}% vs previous period`;
  });

  constructor() {
    this.loadSnapshot('initial');
  }

  protected applyFilters(): void {
    if (!this.validateFilters()) {
      return;
    }
    this.activePage.set(0);
    this.loadSnapshot('filter');
  }

  protected retry(): void {
    this.loadSnapshot('retry');
  }

  protected updateFromDate(value: string): void {
    this.fromDate.set(value);
    this.dateRangeError.set(null);
  }

  protected updateToDate(value: string): void {
    this.toDate.set(value);
    this.dateRangeError.set(null);
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    if (!this.hasLoadedAtLeastOnce()) {
      return;
    }

    const rows =
      typeof event.rows === 'number' && event.rows > 0
        ? event.rows
        : this.pageSize();
    const first =
      typeof event.first === 'number' && event.first >= 0
        ? event.first
        : this.activePage() * this.pageSize();
    const page = Math.floor(first / rows);

    if (rows === this.pageSize() && page === this.activePage()) {
      return;
    }

    this.pageSize.set(rows);
    this.activePage.set(page);
    this.loadEntriesPage();
  }

  private loadSnapshot(mode: LoadMode): void {
    if (this.loading() || this.refreshing()) {
      return;
    }
    const hasSnapshot = this.summary() !== null;
    this.hardError.set(null);
    this.transientError.set(null);

    if (hasSnapshot || mode !== 'initial') {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    const query = this.buildRangeQuery();
    const pageQuery = {
      ...query,
      page: this.activePage(),
      size: this.pageSize(),
      sort: 'recordedAt,desc',
    };

    forkJoin({
      summary: this.courierEarningsService.getSummary(query),
      entries: this.courierEarningsService.getEntries(pageQuery),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: ({ summary, entries }) => {
          this.summary.set(summary);
          this.maxRangeDays.set(summary.window.maxRangeDays);
          this.applyEntries(entries);
          this.hasLoadedAtLeastOnce.set(true);
        },
        error: (error: unknown) => {
          const uiError = this.courierEarningsService.toUiError(error);
          const detail =
            uiError.detail ??
            'Earnings data could not be loaded. Please retry in a few moments.';
          if (hasSnapshot) {
            this.transientError.set(detail);
            return;
          }
          this.hardError.set(detail);
          this.hasLoadedAtLeastOnce.set(true);
        },
      });
  }

  private loadEntriesPage(): void {
    if (this.entriesLoading() || this.loading() || this.refreshing()) {
      return;
    }
    this.entriesLoading.set(true);
    this.transientError.set(null);

    this.courierEarningsService
      .getEntries({
        ...this.buildRangeQuery(),
        page: this.activePage(),
        size: this.pageSize(),
        sort: 'recordedAt,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          const uiError = this.courierEarningsService.toUiError(error);
          this.transientError.set(
            uiError.detail ??
              'Entries could not be refreshed. Showing the last successful page.',
          );
          return of<CourierEarningsEntriesPage>({
            content: this.rows().map((row) => ({
              deliveryId: row.deliveryId,
              trackingCode: row.shortCode,
              amount: row.amount,
              currency: row.currency,
              status: row.status,
              earnedAt: row.earnedAt,
              category: null,
              note: null,
            })),
            totalElements: this.totalRecords(),
            totalPages: 0,
            size: this.pageSize(),
            number: this.activePage(),
          });
        }),
        finalize(() => this.entriesLoading.set(false)),
      )
      .subscribe((page) => this.applyEntries(page));
  }

  private applyEntries(page: CourierEarningsEntriesPage): void {
    const rows = Array.isArray(page.content) ? page.content : [];
    this.rows.set(rows.map((entry) => this.toRow(entry)));
    this.totalRecords.set(this.toNonNegative(page.totalElements));
  }

  private toRow(entry: CourierEarningsEntryDto): EarningsEntryRow {
    const fallbackCode = entry.deliveryId.trim().replaceAll('-', '').slice(0, 8).toUpperCase();
    return {
      deliveryId: entry.deliveryId,
      shortCode: entry.trackingCode?.trim() || `DLV-${fallbackCode || '00000000'}`,
      earnedAt: entry.earnedAt,
      amount: this.toNonNegative(entry.amount),
      currency: entry.currency?.trim().toUpperCase() || 'RON',
      status: entry.status || 'DELIVERED',
    };
  }

  private buildRangeQuery(): { from: string; to: string } {
    return {
      from: this.fromDate().trim(),
      to: this.toDate().trim(),
    };
  }

  private validateFilters(): boolean {
    const from = this.fromDate().trim();
    const to = this.toDate().trim();
    if (!from || !to) {
      this.dateRangeError.set('Both "From" and "To" are required.');
      return false;
    }

    const fromEpoch = Date.parse(`${from}T00:00:00Z`);
    const toEpoch = Date.parse(`${to}T00:00:00Z`);
    if (Number.isNaN(fromEpoch) || Number.isNaN(toEpoch)) {
      this.dateRangeError.set('Please enter valid dates before applying filters.');
      return false;
    }
    if (fromEpoch > toEpoch) {
      this.dateRangeError.set('"From" date cannot be after "To" date.');
      return false;
    }

    const diffDays = Math.floor((toEpoch - fromEpoch) / (24 * 60 * 60 * 1000)) + 1;
    if (diffDays > this.maxRangeDays()) {
      this.dateRangeError.set(
        `Selected range exceeds the maximum allowed window (${this.maxRangeDays()} days).`,
      );
      return false;
    }

    this.dateRangeError.set(null);
    return true;
  }

  private formatDate(value: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return '-';
    }
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(parsed));
  }

  private toNonNegative(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, value);
  }

  private toInputDate(dayOffset: number): string {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + dayOffset);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
