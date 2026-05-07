import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { DeliveryService } from '@core/services/delivery/delivery';
import {
  CourierAcceptDeliveryResponse,
  CourierAvailableDeliveriesQuery,
  CourierAvailableDeliveryDto,
  DeliveryDetailDto,
  PageDto,
} from '@core/services/enum/delivery.types';
import { Observable } from 'rxjs';

export interface CourierDeliveryUiError {
  status: number;
  type: 'DELIVERY_TAKEN' | 'GENERIC';
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

  getDeliveryDetail(id: string): Observable<DeliveryDetailDto> {
    return this.deliveryService.getById(id);
  }

  acceptDelivery(id: string): Observable<CourierAcceptDeliveryResponse> {
    return this.httpClient.post<CourierAcceptDeliveryResponse>(
      `${this.baseUrl}/deliveries/${id}/accept`,
      {},
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

    return {
      status: error.status,
      type: isTakenConflict ? 'DELIVERY_TAKEN' : 'GENERIC',
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
