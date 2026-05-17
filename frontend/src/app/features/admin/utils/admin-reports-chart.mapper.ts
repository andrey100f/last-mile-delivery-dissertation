import {
  AdminDeliveriesByStatusReportDto,
  AdminRevenueReportDto,
} from '../models/admin-reports.models';

export const REPORTS_CHART_COLORS = [
  '#3b82f6',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#6366f1',
  '#22c55e',
] as const;

export interface ReportsChartMapping {
  chartData: Record<string, unknown> | null;
  chartOptions: Record<string, unknown>;
}

export function mapDeliveriesByDayToChart(
  report: AdminDeliveriesByStatusReportDto | null,
): ReportsChartMapping {
  if (!report || report.buckets.length === 0) {
    return {
      chartData: null,
      chartOptions: buildCommonChartOptions(true),
    };
  }

  const chartData = {
    labels: report.buckets.map((bucket) => formatShortDate(bucket.bucketStart)),
    datasets: [
      {
        label: 'Deliveries',
        data: report.buckets.map((bucket) => bucket.total),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.25,
      },
    ],
  };

  return {
    chartData,
    chartOptions: buildCommonChartOptions(true),
  };
}

export function mapRevenueToChart(
  report: AdminRevenueReportDto | null,
): ReportsChartMapping {
  if (!report || report.buckets.length === 0) {
    return {
      chartData: null,
      chartOptions: buildCommonChartOptions(false),
    };
  }

  const chartData = {
    labels: report.buckets.map((bucket) => formatShortDate(bucket.bucketStart)),
    datasets: [
      {
        label: `Revenue (${report.currency})`,
        data: report.buckets.map((bucket) => bucket.revenue),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  return {
    chartData,
    chartOptions: buildCommonChartOptions(false),
  };
}

function buildCommonChartOptions(integerOnly: boolean): Record<string, unknown> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
    scales: {
      x: { ticks: { color: '#64748b' } },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#64748b',
          ...(integerOnly ? { precision: 0 } : {}),
        },
      },
    },
  };
}

function formatShortDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: '2-digit',
  }).format(new Date(parsed));
}
