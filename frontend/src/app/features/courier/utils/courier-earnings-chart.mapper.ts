import { CourierEarningsSummaryDto } from '../models/courier-earnings.models';

export interface CourierEarningsChartMapping {
  chartData: Record<string, unknown> | null;
  chartOptions: Record<string, unknown>;
}

export function mapEarningsToChart(
  summary: CourierEarningsSummaryDto | null,
): CourierEarningsChartMapping {
  if (!summary || summary.chartPoints.length === 0) {
    return {
      chartData: null,
      chartOptions: buildChartOptions(summary?.currency ?? 'RON'),
    };
  }

  const chartData = {
    labels: summary.chartPoints.map((point) => formatShortDate(point.bucketStart)),
    datasets: [
      {
        label: `Earnings (${summary.currency})`,
        data: summary.chartPoints.map((point) => point.total),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  return {
    chartData,
    chartOptions: buildChartOptions(summary.currency),
  };
}

function buildChartOptions(currency: string): Record<string, unknown> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed?: { y?: number } }) => {
            const value = typeof ctx?.parsed?.y === 'number' ? ctx.parsed.y : 0;
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(value);
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: '#64748b' } },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#64748b',
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
