export interface AdminManagedUserDto {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  role: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  ordersCount?: number;
  totalSpend?: number;
  totalSpendCurrency?: string;
  availableNow?: boolean;
  deliveriesCount?: number;
}

export interface AdminManagedUsersPageDto {
  content: AdminManagedUserDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AdminManagedUsersQuery {
  page: number;
  size: number;
  searchTerm?: string;
  sortField?: AdminManagedUserSortField;
  sortDirection?: AdminManagedUserSortDirection;
  availability?: AdminCourierAvailabilityFilter;
}

export type AdminManagedUserSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'email'
  | 'displayName'
  | 'phoneNumber';

export type AdminManagedUserSortDirection = 'asc' | 'desc';

export type AdminCourierAvailabilityFilter = 'available' | 'unavailable';

export interface CreateAdminCustomerRequestDto {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
}

export interface CreateAdminCourierRequestDto
  extends CreateAdminCustomerRequestDto {
  availableNow?: boolean;
  expressCapable?: boolean;
}

export interface AdminManagementApiError {
  status: number;
  detail: string | null;
  fieldErrors: Record<string, string>;
}

export interface AdminCustomerSummaryDto {
  totalCustomers: number;
  totalRevenue: number;
  revenueCurrency: string;
}

export interface AdminCourierSummaryDto {
  totalCouriers: number;
  activeNow: number;
  totalDeliveries: number;
}
