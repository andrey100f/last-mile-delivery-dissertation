import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BaseService } from '@core/services/base.service';
import {
  CreateDeliveryRequest,
  DeliveryCreatedResponse,
  DeliveryDetailDto,
  DeliveryListQuery,
  DeliverySummaryDto,
  PageDto,
} from '@core/services/enum/delivery.types';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DeliveryService extends BaseService {
  create(
    payload: CreateDeliveryRequest,
  ): Observable<DeliveryCreatedResponse> {
    return this.httpClient.post<DeliveryCreatedResponse>(
      `${this.baseUrl}/deliveries`,
      payload,
    );
  }

  list(query: DeliveryListQuery = {}): Observable<PageDto<DeliverySummaryDto>> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.sort !== undefined && query.sort.length > 0) {
      params = params.set('sort', query.sort);
    }
    if (query.status !== undefined && query.status.length > 0) {
      params = params.set('status', query.status);
    }

    return this.httpClient.get<PageDto<DeliverySummaryDto>>(
      `${this.baseUrl}/deliveries`,
      {
        params,
      },
    );
  }

  listForCurrentCustomer(
    query: DeliveryListQuery = {},
  ): Observable<PageDto<DeliverySummaryDto>> {
    return this.list(query);
  }

  getById(id: string): Observable<DeliveryDetailDto> {
    return this.httpClient
      .get<
        Partial<DeliveryDetailDto> & {
          delivery_status_history?: unknown[];
          pickupAddress?: unknown;
          destinationAddress?: unknown;
          packageData?: unknown;
          packageDetails?: unknown;
          packageWeightKg?: unknown;
          packageDescription?: unknown;
          publicTrackingCode?: unknown;
          createdAt?: unknown;
          updatedAt?: unknown;
          pickupLine1?: unknown;
          destinationLine1?: unknown;
          pricing?: {
            baseAmount?: unknown;
            feeAmount?: unknown;
            taxAmount?: unknown;
            totalAmount?: unknown;
            currency?: unknown;
          };
        }
      >(
        `${this.baseUrl}/deliveries/${id}`,
      )
      .pipe(
        map((response) => {
          const timelineSource =
            response.timeline ?? response.delivery_status_history ?? [];
          const pickupSource = response.pickup ?? response.pickupAddress;
          const destinationSource =
            response.destination ?? response.destinationAddress;
          const packageSource =
            response.package ?? response.packageData ?? response.packageDetails;
          const pricing = response.pricing ?? {};

          return {
            id: typeof response.id === 'string' ? response.id : id,
            trackingCode:
              typeof response.trackingCode === 'string'
                ? response.trackingCode
                : typeof response.publicTrackingCode === 'string'
                  ? response.publicTrackingCode
                  : null,
            status:
              typeof response.status === 'string' ? response.status : 'CREATED',
            createdAt: this.toIsoDateString(response.createdAt),
            updatedAt: this.toIsoDateString(response.updatedAt),
            pickup: this.toAddressDto(pickupSource, response.pickupLine1),
            destination: this.toAddressDto(
              destinationSource,
              response.destinationLine1,
            ),
            package: this.toPackageDto(packageSource, {
              weightKg: response.packageWeightKg,
              description: response.packageDescription,
              specialInstructions: response.specialInstructions,
            }),
            specialInstructions:
              typeof response.specialInstructions === 'string'
                ? response.specialInstructions
                : null,
            deliveryType:
              typeof response.deliveryType === 'string'
                ? response.deliveryType
                : 'STANDARD',
            baseAmount: this.toNumber(response.baseAmount, pricing.baseAmount),
            feeAmount: this.toNumber(response.feeAmount, pricing.feeAmount),
            taxAmount: this.toNumber(response.taxAmount, pricing.taxAmount),
            totalAmount: this.toNumber(response.totalAmount, pricing.totalAmount),
            currency:
              typeof response.currency === 'string'
                ? response.currency
                : typeof pricing.currency === 'string'
                  ? pricing.currency
                  : 'USD',
            courier:
              response.courier && typeof response.courier === 'object'
                ? this.toCourierDto(response.courier)
                : null,
            timeline: Array.isArray(timelineSource)
              ? timelineSource
                  .map((item) => this.toTimelineEntry(item))
                  .filter((item): item is NonNullable<typeof item> => !!item)
              : [],
          } satisfies DeliveryDetailDto;
        }),
      );
  }

  applyValidationErrors(
    form: FormGroup,
    error: HttpErrorResponse,
  ): boolean {
    if (error.status !== 400 || !error.error) {
      return false;
    }

    const fieldErrors = this.extractFieldErrors(error.error);
    if (fieldErrors.length === 0) {
      return false;
    }

    let applied = false;
    for (const [rawField, message] of fieldErrors) {
      const controlPath = this.normalizeControlPath(rawField);
      const control = form.get(controlPath);
      if (!control) {
        continue;
      }
      control.setErrors({
        ...(control.errors ?? {}),
        server: message,
      });
      control.markAsTouched();
      applied = true;
    }

    return applied;
  }

  private extractFieldErrors(errorBody: unknown): Array<[string, string]> {
    if (typeof errorBody !== 'object' || errorBody === null) {
      return [];
    }

    const candidates: Array<[string, string]> = [];
    const body = errorBody as {
      errors?: Record<string, unknown>;
      violations?: unknown[];
    };

    if (body.errors && typeof body.errors === 'object') {
      for (const [field, value] of Object.entries(body.errors)) {
        if (Array.isArray(value) && value.length > 0) {
          candidates.push([field, String(value[0])]);
          continue;
        }
        if (typeof value === 'string' && value.length > 0) {
          candidates.push([field, value]);
        }
      }
    }

    if (Array.isArray(body.violations)) {
      for (const violation of body.violations) {
        if (!violation || typeof violation !== 'object') {
          continue;
        }
        const item = violation as { field?: unknown; message?: unknown };
        if (
          typeof item.field === 'string' &&
          item.field.length > 0 &&
          typeof item.message === 'string' &&
          item.message.length > 0
        ) {
          candidates.push([item.field, item.message]);
        }
      }
    }

    return candidates;
  }

  private normalizeControlPath(serverField: string): string {
    return serverField
      .replaceAll('[', '.')
      .replaceAll(']', '')
      .replace(/^package(Data|Details)(\.|$)/, 'package$2');
  }

  private toTimelineEntry(item: unknown): { status: string; recordedAt: string } | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const entry = item as {
      status?: unknown;
      recordedAt?: unknown;
      recorded_at?: unknown;
    };
    const status = typeof entry.status === 'string' ? entry.status : null;
    const recordedAtRaw =
      typeof entry.recordedAt === 'string'
        ? entry.recordedAt
        : typeof entry.recorded_at === 'string'
          ? entry.recorded_at
          : null;

    if (!status || !recordedAtRaw) {
      return null;
    }

    return {
      status,
      recordedAt: recordedAtRaw,
    };
  }

  private toAddressDto(
    source: unknown,
    fallbackLine1?: unknown,
  ): DeliveryDetailDto['pickup'] {
    if (!source || typeof source !== 'object') {
      return {
        line1: typeof fallbackLine1 === 'string' ? fallbackLine1 : '-',
        contactName: '-',
        contactPhone: '-',
      };
    }

    const value = source as {
      line1?: unknown;
      contactName?: unknown;
      contactPhone?: unknown;
    };

    return {
      line1:
        typeof value.line1 === 'string'
          ? value.line1
          : typeof fallbackLine1 === 'string'
            ? fallbackLine1
            : '-',
      contactName:
        typeof value.contactName === 'string' ? value.contactName : '-',
      contactPhone:
        typeof value.contactPhone === 'string' ? value.contactPhone : '-',
    };
  }

  private toPackageDto(
    source: unknown,
    fallback?: {
      weightKg?: unknown;
      description?: unknown;
      specialInstructions?: unknown;
    },
  ): DeliveryDetailDto['package'] {
    if (!source || typeof source !== 'object') {
      return {
        description:
          typeof fallback?.description === 'string' ? fallback.description : null,
        weightKg: this.toNumber(fallback?.weightKg),
        lengthCm: null,
        widthCm: null,
        heightCm: null,
        fragile: null,
        specialInstructions:
          typeof fallback?.specialInstructions === 'string'
            ? fallback.specialInstructions
            : null,
      };
    }

    const value = source as {
      description?: unknown;
      weightKg?: unknown;
      lengthCm?: unknown;
      widthCm?: unknown;
      heightCm?: unknown;
      fragile?: unknown;
      specialInstructions?: unknown;
    };

    return {
      description:
        typeof value.description === 'string'
          ? value.description
          : typeof fallback?.description === 'string'
            ? fallback.description
            : null,
      weightKg: this.toNumber(value.weightKg, fallback?.weightKg),
      lengthCm: this.toNullableNumber(value.lengthCm),
      widthCm: this.toNullableNumber(value.widthCm),
      heightCm: this.toNullableNumber(value.heightCm),
      fragile:
        typeof value.fragile === 'boolean'
          ? value.fragile
          : value.fragile === 'true'
            ? true
            : value.fragile === 'false'
              ? false
              : null,
      specialInstructions:
        typeof value.specialInstructions === 'string'
          ? value.specialInstructions
          : typeof fallback?.specialInstructions === 'string'
            ? fallback.specialInstructions
            : null,
    };
  }

  private toCourierDto(source: unknown): DeliveryDetailDto['courier'] {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const value = source as {
      id?: unknown;
      fullName?: unknown;
      displayName?: unknown;
      phone?: unknown;
    };

    const id = typeof value.id === 'string' ? value.id : '';
    const fullName =
      typeof value.fullName === 'string'
        ? value.fullName
        : typeof value.displayName === 'string'
          ? value.displayName
          : 'Courier';

    return {
      id,
      fullName,
      phone: typeof value.phone === 'string' ? value.phone : null,
    };
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return this.toNumber(value);
  }

  private toNumber(primary: unknown, fallback?: unknown): number {
    const values = [primary, fallback];
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return 0;
  }

  private toIsoDateString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
