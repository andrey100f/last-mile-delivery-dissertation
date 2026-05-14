import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Button } from 'primeng/button';
import { UIChart } from 'primeng/chart';
import { Skeleton } from 'primeng/skeleton';
import { finalize } from 'rxjs';
import { AdminDashboardDto } from '../../models/admin-dashboard.models';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import {
  DASHBOARD_CHART_COLORS,
  mapDashboardToCharts,
} from '../../utils/dashboard-chart.mapper';

interface AdminDashboardKpiCard {
  label: string;
  value: string;
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
}

interface PieLegendItem {
  label: string;
  value: number;
  color: string;
}

type DashboardLoadMode = 'initial' | 'filter' | 'retry';

@Component({
  selector: 'app-admin-dashboard',
  imports: [Button, UIChart, Skeleton],
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly adminDashboardService = inject(AdminDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly dashboard = signal<AdminDashboardDto | null>(null);
  protected readonly hardError = signal<string | null>(null);
  protected readonly transientError = signal<string | null>(null);
  protected readonly dateRangeError = signal<string | null>(null);
  protected readonly chartWarnings = signal<string[]>([]);
  protected readonly fromDate = signal(this.toInputDate(-2));
  protected readonly toDate = signal(this.toInputDate(0));
  protected readonly lineChartData = signal<Record<string, unknown> | null>(null);
  protected readonly pieChartData = signal<Record<string, unknown> | null>(null);
  protected readonly lineChartOptions = signal<Record<string, unknown>>({});
  protected readonly pieChartOptions = signal<Record<string, unknown>>({});
  protected readonly loadingSkeletonCards = [0, 1, 2];

  protected readonly kpiCards = computed<AdminDashboardKpiCard[]>(() => {
    const snapshot = this.dashboard();
    if (!snapshot) {
      return [];
    }

    return [
      {
        label: 'Active deliveries',
        value: this.formatNumber(snapshot.activeDeliveriesCount),
        icon: 'pi pi-truck',
        iconColorClass: 'text-blue-600',
        iconBgClass: 'bg-blue-100',
      },
      {
        label: 'Couriers online',
        value: this.formatNumber(snapshot.couriersOnlineCount),
        icon: 'pi pi-wifi',
        iconColorClass: 'text-cyan-600',
        iconBgClass: 'bg-cyan-100',
      },
      {
        label: 'Revenue',
        value: this.formatCurrency(snapshot.revenueTotal, snapshot.revenueCurrency),
        icon: 'pi pi-dollar',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-100',
      },
    ];
  });

  protected readonly generatedAtLabel = computed(() => {
    const generatedAt = this.dashboard()?.generatedAt;
    if (!generatedAt) {
      return null;
    }

    const parsed = Date.parse(generatedAt);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(parsed));
  });

  protected readonly windowLabel = computed(() => {
    const current = this.dashboard();
    if (!current) {
      return null;
    }

    const from = this.formatWindowBoundary(current.window.from);
    const to = this.formatWindowBoundary(current.window.to);
    return `${from} -> ${to} (${current.window.timezone})`;
  });

  protected readonly pieLegendItems = computed<PieLegendItem[]>(() => {
    const snapshot = this.dashboard();
    if (!snapshot) {
      return [];
    }

    const fromStatusSeries = snapshot.statusDistributionSeries?.map((point, index) => ({
      label: point.label,
      value: point.value,
      color: DASHBOARD_CHART_COLORS.pie[index % DASHBOARD_CHART_COLORS.pie.length],
    }));

    if (fromStatusSeries && fromStatusSeries.length > 0) {
      return fromStatusSeries;
    }

    return [
      {
        label: 'Active deliveries',
        value: snapshot.activeDeliveriesCount,
        color: DASHBOARD_CHART_COLORS.pie[0],
      },
      {
        label: 'Couriers online',
        value: snapshot.couriersOnlineCount,
        color: DASHBOARD_CHART_COLORS.pie[1],
      },
      {
        label: 'Exception backlog',
        value: snapshot.exceptionBacklogCount,
        color: DASHBOARD_CHART_COLORS.pie[2],
      },
    ];
  });

  constructor() {
    this.loadDashboard('initial');
  }

  protected applyDateRange(): void {
    if (!this.validateDateRange()) {
      return;
    }
    this.loadDashboard('filter');
  }

  protected clearDateRange(): void {
    if (!this.fromDate() && !this.toDate()) {
      return;
    }
    this.fromDate.set('');
    this.toDate.set('');
    this.dateRangeError.set(null);
    this.loadDashboard('filter');
  }

  protected retry(): void {
    this.loadDashboard('retry');
  }

  protected updateFromDate(value: string): void {
    this.fromDate.set(value);
    this.dateRangeError.set(null);
  }

  protected updateToDate(value: string): void {
    this.toDate.set(value);
    this.dateRangeError.set(null);
  }

  protected hasCharts(): boolean {
    return this.lineChartData() !== null || this.pieChartData() !== null;
  }

  private loadDashboard(mode: DashboardLoadMode): void {
    if (this.loading() || this.refreshing()) {
      return;
    }

    const currentDashboard = this.dashboard();
    const hasExistingDashboard = currentDashboard !== null;
    const queryParams = this.buildQueryParams();

    this.hardError.set(null);
    this.transientError.set(null);
    if (hasExistingDashboard || mode !== 'initial') {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.adminDashboardService
      .getDashboard(queryParams)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          this.hasLoadedAtLeastOnce.set(true);
          this.applyChartMapping(dashboard);
        },
        error: (error: unknown) => {
          const uiError = this.adminDashboardService.toUiError(error);
          const detail =
            uiError.detail ??
            'Dashboard data could not be loaded. Please retry in a few moments.';

          if (hasExistingDashboard) {
            this.transientError.set(detail);
            return;
          }

          this.hardError.set(detail);
          this.chartWarnings.set([]);
          this.lineChartData.set(null);
          this.pieChartData.set(null);
        },
      });
  }

  private applyChartMapping(dashboard: AdminDashboardDto): void {
    const chartMapping = mapDashboardToCharts(dashboard);
    this.lineChartData.set(chartMapping.lineChartData);
    this.pieChartData.set(chartMapping.pieChartData);
    this.lineChartOptions.set(chartMapping.lineChartOptions);
    this.pieChartOptions.set(chartMapping.pieChartOptions);
    this.chartWarnings.set(chartMapping.warnings);
  }

  private buildQueryParams(): { from?: string; to?: string } {
    const from = this.fromDate().trim();
    const to = this.toDate().trim();
    return {
      from: from || undefined,
      to: to || undefined,
    };
  }

  private validateDateRange(): boolean {
    const from = this.fromDate().trim();
    const to = this.toDate().trim();

    if (!from || !to) {
      this.dateRangeError.set(null);
      return true;
    }

    const fromEpoch = Date.parse(`${from}T00:00:00Z`);
    const toEpoch = Date.parse(`${to}T00:00:00Z`);
    if (Number.isNaN(fromEpoch) || Number.isNaN(toEpoch)) {
      this.dateRangeError.set('Please use valid date values before applying filters.');
      return false;
    }

    if (fromEpoch > toEpoch) {
      this.dateRangeError.set('"From" date cannot be after "To" date.');
      return false;
    }

    this.dateRangeError.set(null);
    return true;
  }

  private formatWindowBoundary(value: string): string {
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

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  }

  private formatCurrency(value: number, currency: string): string {
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
