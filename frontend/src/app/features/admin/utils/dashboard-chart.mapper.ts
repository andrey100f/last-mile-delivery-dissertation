import {
  AdminDashboardDto,
  AdminDashboardSeriesPointDto,
} from '../models/admin-dashboard.models';

export const DASHBOARD_CHART_COLORS = {
  line: {
    border: '#3b82f6',
    background: 'rgba(59, 130, 246, 0.16)',
  },
  pie: ['#3b82f6', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444'],
} as const;

export interface DashboardChartMappingResult {
  lineChartData: Record<string, unknown> | null;
  pieChartData: Record<string, unknown> | null;
  lineChartOptions: Record<string, unknown>;
  pieChartOptions: Record<string, unknown>;
  warnings: string[];
}

export function mapDashboardToCharts(
  dashboard: AdminDashboardDto,
): DashboardChartMappingResult {
  const warnings: string[] = [];
  const lineChartData =
    buildLineChartData(dashboard.deliveryVolumeSeries) ??
    buildKpiSnapshotLineData(dashboard);
  const pieChartData =
    buildPieChartData(dashboard.statusDistributionSeries) ??
    buildKpiFallbackDistributionData(dashboard);

  if (!dashboard.deliveryVolumeSeries || dashboard.deliveryVolumeSeries.length === 0) {
    warnings.push(
      'Time-series data is missing from API; showing a KPI snapshot fallback chart.',
    );
  }
  if (
    !dashboard.statusDistributionSeries ||
    dashboard.statusDistributionSeries.length === 0
  ) {
    warnings.push(
      'Status distribution data is missing from API; showing operational mix fallback chart.',
    );
  }

  return {
    lineChartData,
    pieChartData,
    lineChartOptions: createLineChartOptions(),
    pieChartOptions: createPieChartOptions(),
    warnings,
  };
}

function buildLineChartData(
  series: AdminDashboardSeriesPointDto[] | null,
): Record<string, unknown> | null {
  if (!series || series.length === 0) {
    return null;
  }

  return {
    labels: series.map((point) => point.label),
    datasets: [
      {
        label: 'Deliveries',
        data: series.map((point) => point.value),
        borderColor: DASHBOARD_CHART_COLORS.line.border,
        backgroundColor: DASHBOARD_CHART_COLORS.line.background,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  };
}

function buildPieChartData(
  series: AdminDashboardSeriesPointDto[] | null,
): Record<string, unknown> | null {
  if (!series || series.length === 0) {
    return null;
  }

  return {
    labels: series.map((point) => point.label),
    datasets: [
      {
        data: series.map((point) => point.value),
        backgroundColor: series.map(
          (_point, index) => DASHBOARD_CHART_COLORS.pie[index % DASHBOARD_CHART_COLORS.pie.length],
        ),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };
}

function buildKpiSnapshotLineData(
  dashboard: AdminDashboardDto,
): Record<string, unknown> {
  return {
    labels: ['Active deliveries', 'Couriers online', 'Exception backlog'],
    datasets: [
      {
        label: 'Current window snapshot',
        data: [
          dashboard.activeDeliveriesCount,
          dashboard.couriersOnlineCount,
          dashboard.exceptionBacklogCount,
        ],
        borderColor: DASHBOARD_CHART_COLORS.line.border,
        backgroundColor: DASHBOARD_CHART_COLORS.line.background,
        borderWidth: 2,
        tension: 0.2,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  };
}

function buildKpiFallbackDistributionData(
  dashboard: AdminDashboardDto,
): Record<string, unknown> {
  return {
    labels: ['Active deliveries', 'Couriers online', 'Exception backlog'],
    datasets: [
      {
        data: [
          dashboard.activeDeliveriesCount,
          dashboard.couriersOnlineCount,
          dashboard.exceptionBacklogCount,
        ],
        backgroundColor: [
          DASHBOARD_CHART_COLORS.pie[0],
          DASHBOARD_CHART_COLORS.pie[1],
          DASHBOARD_CHART_COLORS.pie[2],
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };
}

function createLineChartOptions(): Record<string, unknown> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label(context: { parsed?: { y?: number } }): string {
            const value =
              context.parsed && typeof context.parsed.y === 'number'
                ? context.parsed.y
                : 0;
            return `deliveries: ${value}`;
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 2,
        grace: '20%',
        grid: {
          color: '#e5e7eb',
        },
        ticks: {
          precision: 0,
          stepSize: 1,
          color: '#6b7280',
        },
      },
      x: {
        grid: {
          color: '#f3f4f6',
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          color: '#6b7280',
        },
      },
    },
  };
}

function createPieChartOptions(): Record<string, unknown> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label(context: { label?: string; parsed?: number }): string {
            const label = context.label ?? 'Unknown';
            const value = Number.isFinite(context.parsed) ? Number(context.parsed) : 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  };
}
