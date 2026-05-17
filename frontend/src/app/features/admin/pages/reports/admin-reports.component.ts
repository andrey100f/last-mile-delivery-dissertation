import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { UIChart } from 'primeng/chart';
import { finalize, Observable, Subject, takeUntil } from 'rxjs';
import {
  AdminDeliveriesByStatusReportDto,
  AdminReportType,
  AdminReportsQueryParams,
  AdminRevenueReportDto,
  ReportGranularity,
  ReportsViewMode,
} from '../../models/admin-reports.models';
import { AdminReportsService } from '../../services/admin-reports.service';
import {
  mapDeliveriesByDayToChart,
  mapRevenueToChart,
} from '../../utils/admin-reports-chart.mapper';

type ReportsLoadMode = 'initial' | 'filter' | 'switch-report' | 'retry';
type AnyReportDto = AdminDeliveriesByStatusReportDto | AdminRevenueReportDto;

@Component({
  selector: 'app-admin-reports',
  imports: [Button, Skeleton, TableModule, UIChart],
  templateUrl: './admin-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReportsComponent implements OnDestroy {
  private readonly adminReportsService = inject(AdminReportsService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly hardError = signal<string | null>(null);
  protected readonly transientError = signal<string | null>(null);
  protected readonly dateRangeError = signal<string | null>(null);

  protected readonly reportType = signal<AdminReportType>('deliveries');
  protected readonly viewMode = signal<ReportsViewMode>('chart');
  protected readonly granularity = signal<ReportGranularity>('day');
  protected readonly fromDate = signal(this.toInputDate(-14));
  protected readonly toDate = signal(this.toInputDate(0));
  protected readonly maxRangeDays = signal(180);

  protected readonly deliveriesReport = signal<AdminDeliveriesByStatusReportDto | null>(
    null,
  );
  protected readonly revenueReport = signal<AdminRevenueReportDto | null>(null);

  protected readonly reportTypeOptions: ReadonlyArray<{
    id: AdminReportType;
    label: string;
  }> = [
    { id: 'deliveries', label: 'Deliveries by day' },
    { id: 'revenue', label: 'Revenue' },
  ];

  protected readonly chartModel = computed(() => {
    if (this.reportType() === 'deliveries') {
      return mapDeliveriesByDayToChart(this.deliveriesReport());
    }
    return mapRevenueToChart(this.revenueReport());
  });

  protected readonly currentWindowLabel = computed(() => {
    const window =
      this.currentReportWindow(this.deliveriesReport()) ??
      this.currentReportWindow(this.revenueReport());
    if (!window) {
      return null;
    }
    const from = this.formatDateTime(window.from);
    const to = this.formatDateTime(window.to);
    return `${from} -> ${to} (${window.timezone.toUpperCase()})`;
  });

  protected readonly reportSummaryLabel = computed(() => {
    if (this.reportType() === 'deliveries') {
      const report = this.deliveriesReport();
      return `${this.formatNumber(report?.totalStatusEvents ?? 0)} deliveries`;
    }
    const report = this.revenueReport();
    return `${this.formatCurrency(
      report?.totalRevenue ?? 0,
      report?.currency ?? 'RON',
    )} total`;
  });

  protected readonly noDataMessage = computed(() => {
    if (this.reportType() === 'deliveries') {
      return 'No deliveries were recorded for the selected range.';
    }
    return 'No delivered revenue entries were found for the selected range.';
  });

  protected readonly isCurrentReportEmpty = computed(() => {
    if (this.reportType() === 'deliveries') {
      return (this.deliveriesReport()?.totalStatusEvents ?? 0) === 0;
    }
    return (this.revenueReport()?.deliveredCount ?? 0) === 0;
  });

  constructor() {
    this.loadReport('initial');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected updateFromDate(value: string): void {
    this.fromDate.set(value);
    this.dateRangeError.set(null);
  }

  protected updateToDate(value: string): void {
    this.toDate.set(value);
    this.dateRangeError.set(null);
  }

  protected updateGranularity(value: string): void {
    this.granularity.set(value === 'week' ? 'week' : 'day');
  }

  protected setReportType(nextType: AdminReportType): void {
    if (this.reportType() === nextType) {
      return;
    }
    this.reportType.set(nextType);
    this.loadReport('switch-report');
  }

  protected setViewMode(mode: ReportsViewMode): void {
    this.viewMode.set(mode);
  }

  protected applyFilters(): void {
    if (!this.validateFilters()) {
      return;
    }
    this.loadReport('filter');
  }

  protected retry(): void {
    this.loadReport('retry');
  }

  protected exportCsv(): void {
    if (!this.validateFilters()) {
      return;
    }
    const url = this.adminReportsService.buildExportUrl(
      this.reportType(),
      this.buildQueryParams(),
    );
    window.open(url, '_blank', 'noopener');
  }

  protected formatCurrency(value: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${value.toFixed(2)} ${currency}`;
    }
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  }

  protected formatDate(value: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return '-';
    }
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(parsed));
  }

  protected currentGranularityLabel(): string {
    return this.granularity() === 'week' ? 'Weekly' : 'Daily';
  }

  private loadReport(mode: ReportsLoadMode): void {
    if (this.loading() || this.refreshing()) {
      return;
    }

    const hasExistingSnapshot = this.hasSnapshotForCurrentType();
    this.hardError.set(null);
    this.transientError.set(null);
    if (hasExistingSnapshot || mode !== 'initial') {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.currentReportRequest(this.reportType(), this.buildQueryParams())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (report) => {
          this.storeCurrentReport(report);
          this.maxRangeDays.set(report.window.maxRangeDays);
          this.hasLoadedAtLeastOnce.set(true);
        },
        error: (error: unknown) => {
          const uiError = this.adminReportsService.toUiError(error);
          const detail =
            uiError.detail ??
            'Report data could not be loaded. Please retry in a few moments.';

          if (hasExistingSnapshot) {
            this.transientError.set(detail);
            return;
          }

          this.hardError.set(detail);
          this.hasLoadedAtLeastOnce.set(true);
        },
      });
  }

  private currentReportRequest(
    reportType: AdminReportType,
    params: AdminReportsQueryParams,
  ): Observable<AnyReportDto> {
    if (reportType === 'deliveries') {
      return this.adminReportsService.getDeliveriesByStatus(params);
    }
    return this.adminReportsService.getRevenueReport(params);
  }

  private storeCurrentReport(report: AnyReportDto): void {
    if (this.reportType() === 'deliveries') {
      this.deliveriesReport.set(report as AdminDeliveriesByStatusReportDto);
      return;
    }
    if (this.reportType() === 'revenue') {
      this.revenueReport.set(report as AdminRevenueReportDto);
    }
  }

  private hasSnapshotForCurrentType(): boolean {
    if (this.reportType() === 'deliveries') {
      return this.deliveriesReport() !== null;
    }
    if (this.reportType() === 'revenue') {
      return this.revenueReport() !== null;
    }
    return false;
  }

  private buildQueryParams(): AdminReportsQueryParams {
    return {
      from: this.fromDate().trim(),
      to: this.toDate().trim(),
      granularity: this.granularity(),
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

  private formatDateTime(value: string): string {
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

  private currentReportWindow(
    report: AnyReportDto | null,
  ) {
    return report?.window ?? null;
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
