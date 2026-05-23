import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BaseService } from '@core/services/base.service';
import { map } from 'rxjs';
import {
  CustomerProfileDto,
  CustomerProfileUpdateRequest,
} from '../models/customer-profile.models';

type CustomerProfileApiResponse = Partial<CustomerProfileDto> & {
  displayName?: unknown;
  fullName?: unknown;
  name?: unknown;
  phone?: unknown;
  phoneNumber?: unknown;
  email?: unknown;
};

@Injectable({
  providedIn: 'root',
})
export class CustomerProfileService extends BaseService {
  getMyProfile() {
    return this.httpClient
      .get<CustomerProfileApiResponse>(`${this.baseUrl}/users/me`)
      .pipe(map((response) => this.normalizeProfileResponse(response)));
  }

  updateMyProfile(payload: CustomerProfileUpdateRequest) {
    return this.httpClient
      .put<CustomerProfileApiResponse>(`${this.baseUrl}/users/me`, payload)
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
    response: CustomerProfileApiResponse,
  ): CustomerProfileDto {
    const personalSource = this.asObject(response.personal);

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
        email: this.toText(
          personalSource?.['email'] ?? response.email,
        ),
      },
    } satisfies CustomerProfileDto;
  }

  private extractFieldErrors(errorBody: unknown): Array<[string, string]> {
    if (typeof errorBody !== 'object' || errorBody === null) {
      return [];
    }

    const candidates: Array<[string, string]> = [];
    const body = errorBody as {
      errors?: Record<string, unknown>;
      fieldErrors?: Record<string, unknown>;
      violations?: unknown[];
    };

    this.appendErrorsFromMap(candidates, body.errors);
    this.appendErrorsFromMap(candidates, body.fieldErrors);

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

  private appendErrorsFromMap(
    target: Array<[string, string]>,
    source: Record<string, unknown> | undefined,
  ): void {
    if (!source || typeof source !== 'object') {
      return;
    }

    for (const [field, value] of Object.entries(source)) {
      if (Array.isArray(value) && value.length > 0) {
        target.push([field, String(value[0])]);
        continue;
      }
      if (typeof value === 'string' && value.length > 0) {
        target.push([field, value]);
      }
    }
  }

  private normalizeControlPath(serverField: string): string {
    const normalized = serverField.replaceAll('[', '.').replaceAll(']', '');
    const aliases: Array<[RegExp, string]> = [
      [/^(name|fullName)$/, 'personal.displayName'],
      [/^(phone|phoneNumber)$/, 'personal.phone'],
      [/^personalInfo\./, 'personal.'],
      [/^personal\.displayName$/, 'personal.displayName'],
      [/^personal\.phone$/, 'personal.phone'],
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

  private toText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  }
}
