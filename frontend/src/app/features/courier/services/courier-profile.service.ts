import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BaseService } from '@core/services/base.service';
import {
  CourierProfileDto,
  CourierProfileUpdateRequest,
} from '../models/courier-profile.models';
import { map } from 'rxjs';

type CourierProfileApiResponse = Partial<CourierProfileDto> & {
  displayName?: unknown;
  fullName?: unknown;
  name?: unknown;
  phone?: unknown;
  phoneNumber?: unknown;
  availableNow?: unknown;
  expressCapable?: unknown;
};

@Injectable({
  providedIn: 'root',
})
export class CourierProfileService extends BaseService {
  getMyProfile() {
    return this.httpClient
      .get<CourierProfileApiResponse>(`${this.baseUrl}/couriers/me`)
      .pipe(
        // Keep response mapping resilient to minor backend naming differences.
        map((response) => this.normalizeProfileResponse(response)),
      );
  }

  updateMyProfile(payload: CourierProfileUpdateRequest) {
    return this.httpClient
      .put<CourierProfileApiResponse>(`${this.baseUrl}/couriers/me`, payload)
      .pipe(map((response) => this.normalizeProfileResponse(response)));
  }

  applyValidationErrors(form: FormGroup, error: HttpErrorResponse): boolean {
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

  private normalizeProfileResponse(
    response: CourierProfileApiResponse,
  ): CourierProfileDto {
    const personalSource = this.asObject(response.personal);
    const availabilitySource = this.asObject(response.availability);

    return {
      personal: {
        displayName: this.toText(
          personalSource?.['displayName'] ??
            personalSource?.['fullName'] ??
            personalSource?.['name'] ??
            response.displayName ??
            response.fullName ??
            response.name,
        ),
        phone: this.toText(
          personalSource?.['phone'] ??
            personalSource?.['phoneNumber'] ??
            response.phone ??
            response.phoneNumber,
        ),
      },
      availability: {
        availableNow: this.toBoolean(
          availabilitySource?.['availableNow'] ?? response.availableNow,
        ),
        expressCapable: this.toBoolean(
          availabilitySource?.['expressCapable'] ?? response.expressCapable,
        ),
      },
    } satisfies CourierProfileDto;
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
    const normalized = serverField.replaceAll('[', '.').replaceAll(']', '');
    const aliases: Array<[RegExp, string]> = [
      [/^(name|fullName)$/, 'personal.displayName'],
      [/^(phone|phoneNumber)$/, 'personal.phone'],
      [/^personalInfo\./, 'personal.'],
      [/^(availableNow|availabilityNow)$/, 'availability.availableNow'],
      [/^(acceptExpress|expressCapable)$/, 'availability.expressCapable'],
      [/^availability\.acceptExpress$/, 'availability.expressCapable'],
    ];

    for (const [pattern, target] of aliases) {
      if (pattern.test(normalized)) {
        return normalized.replace(pattern, target);
      }
    }

    return normalized;
  }

  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 'true';
  }

  private toText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  }

}
