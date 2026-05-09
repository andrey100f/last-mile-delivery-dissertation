import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { map, Observable } from 'rxjs';
import { DeliveryStatusSnapshotDto } from '../models/tracking.models';

type DeliveryStatusSnapshotApiResponse = Partial<DeliveryStatusSnapshotDto> & {
  eta?: unknown;
  etaInMinutes?: unknown;
  progress?: unknown;
  progressPercentage?: unknown;
};

export interface CustomerTrackingUiError {
  status: number;
  type: 'ACCESS_DENIED' | 'NOT_FOUND' | 'GENERIC';
  detail: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerDeliveryService extends BaseService {
  getStatusSnapshot(deliveryId: string): Observable<DeliveryStatusSnapshotDto> {
    return this.httpClient
      .get<DeliveryStatusSnapshotApiResponse>(
        `${this.baseUrl}/deliveries/${deliveryId}/status`,
      )
      .pipe(map((response) => this.normalizeStatusSnapshot(response)));
  }

  toUiError(error: unknown): CustomerTrackingUiError {
    if (!(error instanceof HttpErrorResponse)) {
      return {
        status: 0,
        type: 'GENERIC',
        detail: null,
      };
    }

    return {
      status: error.status,
      type:
        error.status === 403
          ? 'ACCESS_DENIED'
          : error.status === 404
            ? 'NOT_FOUND'
            : 'GENERIC',
      detail: this.extractErrorDetail(error),
    };
  }

  private normalizeStatusSnapshot(
    response: DeliveryStatusSnapshotApiResponse,
  ): DeliveryStatusSnapshotDto {
    const nowIso = new Date().toISOString();
    return {
      status: typeof response.status === 'string' ? response.status : 'CREATED',
      etaMinutes: this.toNullableNumber(
        response.etaMinutes ?? response.eta ?? response.etaInMinutes,
      ),
      updatedAt:
        typeof response.updatedAt === 'string' && response.updatedAt.trim().length > 0
          ? response.updatedAt
          : nowIso,
      progressPercent: this.toNullableNumber(
        response.progressPercent ?? response.progress ?? response.progressPercentage,
      ),
    };
  }

  private extractErrorDetail(error: HttpErrorResponse): string | null {
    const body = error.error;
    if (!body || typeof body !== 'object') {
      return null;
    }

    const candidate = body as {
      detail?: unknown;
      message?: unknown;
      title?: unknown;
      error?: unknown;
    };

    const value =
      this.toText(candidate.detail) ??
      this.toText(candidate.message) ??
      this.toText(candidate.title) ??
      this.toText(candidate.error);
    return value?.trim() ?? null;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private toText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
