import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { DeliveryService } from '@core/services/delivery/delivery';
import {
  CourierAvailableDeliveriesQuery,
  CourierAvailableDeliveryDto,
  DeliveryDetailDto,
  DeliveryStatusAction,
  PageDto,
  UpdateDeliveryStatusRequest,
} from '@core/services/enum/delivery.types';
import { map, Observable } from 'rxjs';

export interface CourierDeliveryUiError {
  status: number;
  type:
    | 'DELIVERY_TAKEN'
    | 'COURIER_UNAVAILABLE'
    | 'EXPRESS_NOT_CAPABLE'
    | 'INVALID_STATUS_TRANSITION'
    | 'ACCESS_DENIED'
    | 'NOT_FOUND'
    | 'GENERIC';
  code: string | null;
  detail: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CourierDeliveryService extends BaseService {
  private readonly deliveryService = inject(DeliveryService);

  getAvailable(
    params: CourierAvailableDeliveriesQuery = {},
  ): Observable<PageDto<CourierAvailableDeliveryDto>> {
    let queryParams = new HttpParams();

    if (params.page !== undefined) {
      queryParams = queryParams.set('page', params.page);
    }
    if (params.size !== undefined) {
      queryParams = queryParams.set('size', params.size);
    }
    if (params.sort && params.sort.length > 0) {
      queryParams = queryParams.set('sort', params.sort);
    }
    if (params.deliveryType && params.deliveryType.length > 0) {
      queryParams = queryParams.set('deliveryType', params.deliveryType);
    }

    return this.httpClient.get<PageDto<CourierAvailableDeliveryDto>>(
      `${this.baseUrl}/deliveries/available`,
      {
        params: queryParams,
      },
    );
  }

  getActive(
    params: Pick<CourierAvailableDeliveriesQuery, 'page' | 'size' | 'sort'> = {},
  ): Observable<PageDto<CourierAvailableDeliveryDto>> {
    let queryParams = new HttpParams();

    if (params.page !== undefined) {
      queryParams = queryParams.set('page', params.page);
    }
    if (params.size !== undefined) {
      queryParams = queryParams.set('size', params.size);
    }
    if (params.sort && params.sort.length > 0) {
      queryParams = queryParams.set('sort', params.sort);
    }

    return this.httpClient.get<PageDto<CourierAvailableDeliveryDto>>(
      `${this.baseUrl}/deliveries/active`,
      {
        params: queryParams,
      },
    );
  }

  getDeliveryDetail(id: string): Observable<DeliveryDetailDto> {
    return this.deliveryService.getById(id);
  }

  acceptDelivery(id: string): Observable<DeliveryDetailDto> {
    return this.httpClient.post<DeliveryDetailDto>(
      `${this.baseUrl}/deliveries/${id}/accept`,
      {},
    );
  }

  updateStatus(
    id: string,
    payload: UpdateDeliveryStatusRequest | { action: DeliveryStatusAction },
  ): Observable<DeliveryDetailDto> {
    return this.httpClient
      .patch<unknown>(`${this.baseUrl}/deliveries/${id}/status`, payload)
      .pipe(
        map((response) =>
          this.deliveryService.normalizeDetailResponse(
            id,
            response as Parameters<
              DeliveryService['normalizeDetailResponse']
            >[1],
          ),
        ),
      );
  }

  toUiError(error: unknown): CourierDeliveryUiError {
    if (!(error instanceof HttpErrorResponse)) {
      return {
        status: 0,
        type: 'GENERIC',
        code: null,
        detail: null,
      };
    }

    const code = this.extractErrorCode(error);
    const detail = this.extractErrorDetail(error);
    const isTakenConflict =
      error.status === 409 &&
      (code === 'DELIVERY_TAKEN' ||
        detail?.toUpperCase().includes('DELIVERY_TAKEN') === true);
    const isInvalidTransition =
      error.status === 400 &&
      (code === 'INVALID_STATUS_TRANSITION' ||
        detail?.toUpperCase().includes('INVALID STATUS TRANSITION') === true);
    const isCourierUnavailable =
      error.status === 409 &&
      (code === 'COURIER_UNAVAILABLE' ||
        detail?.toUpperCase().includes('NOT AVAILABLE') === true);
    const isExpressNotCapable =
      error.status === 409 &&
      (code === 'EXPRESS_NOT_CAPABLE' ||
        detail?.toUpperCase().includes('EXPRESS') === true);

    return {
      status: error.status,
      type: isTakenConflict
        ? 'DELIVERY_TAKEN'
        : isCourierUnavailable
          ? 'COURIER_UNAVAILABLE'
          : isExpressNotCapable
            ? 'EXPRESS_NOT_CAPABLE'
        : isInvalidTransition
          ? 'INVALID_STATUS_TRANSITION'
          : error.status === 403
            ? 'ACCESS_DENIED'
            : error.status === 404
              ? 'NOT_FOUND'
              : 'GENERIC',
      code,
      detail,
    };
  }

  private extractErrorCode(error: HttpErrorResponse): string | null {
    const body = error.error;
    if (!body || typeof body !== 'object') {
      return null;
    }

    const candidate = body as {
      code?: unknown;
      errorCode?: unknown;
      error_key?: unknown;
      key?: unknown;
    };

    const value =
      this.toText(candidate.code) ??
      this.toText(candidate.errorCode) ??
      this.toText(candidate.error_key) ??
      this.toText(candidate.key);

    return value ? value.trim().toUpperCase() : null;
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

    return (
      this.toText(candidate.detail) ??
      this.toText(candidate.message) ??
      this.toText(candidate.title) ??
      this.toText(candidate.error)
    );
  }

  private toText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
