export interface AdminEventsQueryParams {
  type: string[];
  from: string | null;
  to: string | null;
  page: number;
  size: number;
}

export interface AdminSystemEventDto {
  id: string;
  type: string;
  actorType: string;
  actorId: string | null;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
}

export interface AdminSystemEventsPageDto {
  items: AdminSystemEventDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface AdminEventsUiError {
  status: number;
  detail: string | null;
}
