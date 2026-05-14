export interface AdminDashboardWindowDto {
  from: string;
  to: string;
  timezone: string;
}

export interface AdminDashboardSeriesPointDto {
  label: string;
  value: number;
}

export interface AdminDashboardDto {
  activeDeliveriesCount: number;
  couriersOnlineCount: number;
  revenueTotal: number;
  revenueCurrency: string;
  exceptionBacklogCount: number;
  generatedAt: string;
  window: AdminDashboardWindowDto;
  deliveryVolumeSeries: AdminDashboardSeriesPointDto[] | null;
  statusDistributionSeries: AdminDashboardSeriesPointDto[] | null;
}

export interface AdminDashboardQueryParams {
  from?: string;
  to?: string;
}

export interface AdminDashboardUiError {
  status: number;
  detail: string | null;
}
