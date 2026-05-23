import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserService } from '@core/services/user/user';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Skeleton } from 'primeng/skeleton';
import { finalize } from 'rxjs';
import {
  CustomerProfileDto,
  CustomerProfileUpdateRequest,
} from '../../models/customer-profile.models';
import { CustomerProfileService } from '../../services/customer-profile.service';

interface CustomerProfileLoadErrorState {
  title: string;
  message: string;
}

@Component({
  selector: 'app-customer-profile-page',
  imports: [
    ReactiveFormsModule,
    Card,
    Button,
    InputText,
    Skeleton,
  ],
  templateUrl: './customer-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerProfilePage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly customerProfileService = inject(CustomerProfileService);
  private readonly messageService = inject(MessageService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly loadError = signal<CustomerProfileLoadErrorState | null>(null);

  private lastLoadedSnapshot: CustomerProfileDto | null = null;
  private lastLoadedComparable: CustomerProfileUpdateRequest | null = null;

  protected readonly form = this.fb.group({
    personal: this.fb.group({
      displayName: this.fb.control('', {
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      phone: this.fb.control('', {
        validators: [
          Validators.required,
          Validators.maxLength(40),
          Validators.pattern(/^[+0-9()\-.\s]{7,40}$/),
        ],
      }),
      email: this.fb.control({ value: '', disabled: true }),
    }),
  });

  constructor() {
    this.loadProfile();
  }

  protected retryLoad(): void {
    this.loadProfile();
  }

  protected saveProfile(): void {
    if (this.saving()) {
      return;
    }
    if (!this.hasUnsavedChanges) {
      return;
    }

    this.submitAttempted.set(true);
    this.clearServerErrors(this.form);
    this.form.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.customerProfileService
      .updateMyProfile(this.buildPayload())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.userService
            .refreshCurrentUser()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
          this.messageService.add({
            severity: 'success',
            summary: 'Profile updated',
            detail: 'Your account information was saved successfully.',
            life: 4000,
          });
          this.loadProfile();
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            this.customerProfileService.applyValidationErrors(this.form, error)
          ) {
            this.form.markAllAsTouched();
            return;
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Could not save profile',
            detail: 'Please review your data and try again.',
            life: 5000,
          });
        },
      });
  }

  protected cancelChanges(): void {
    if (!this.lastLoadedSnapshot) {
      return;
    }
    this.applyProfileToForm(this.lastLoadedSnapshot);
    this.messageService.add({
      severity: 'info',
      summary: 'Changes discarded',
      detail: 'Profile fields were reset to the last saved values.',
      life: 3500,
    });
  }

  protected isFieldInvalid(controlPath: string): boolean {
    const control = this.form.get(controlPath);
    if (!control) {
      return false;
    }

    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected fieldError(controlPath: string): string | null {
    const control = this.form.get(controlPath);
    if (!control || !(control.touched || this.submitAttempted()) || !control.errors) {
      return null;
    }

    if (control.errors['server']) {
      return String(control.errors['server']);
    }
    if (control.errors['required']) {
      return 'This field is required.';
    }
    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    }
    if (control.errors['pattern']) {
      return 'Value format is invalid.';
    }

    return 'Invalid value.';
  }

  protected get hasUnsavedChanges(): boolean {
    if (!this.lastLoadedComparable) {
      return false;
    }
    return !this.isSameAsLoadedSnapshot();
  }

  private loadProfile(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.customerProfileService
      .getMyProfile()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (profile) => {
          this.lastLoadedSnapshot = profile;
          this.applyProfileToForm(profile);
          this.hasLoadedAtLeastOnce.set(true);
        },
        error: (error: unknown) => {
          this.hasLoadedAtLeastOnce.set(true);
          this.loadError.set(this.toLoadErrorState(error));
        },
      });
  }

  private applyProfileToForm(profile: CustomerProfileDto): void {
    this.submitAttempted.set(false);
    this.clearServerErrors(this.form);
    this.lastLoadedComparable = this.toComparablePayloadFromProfile(profile);

    this.form.patchValue(
      {
        personal: {
          displayName: profile.personal.displayName,
          phone: profile.personal.phone,
          email: profile.personal.email,
        },
      },
      { emitEvent: false },
    );

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private buildPayload(): CustomerProfileUpdateRequest {
    const raw = this.form.getRawValue();

    return {
      personal: {
        displayName: raw.personal.displayName.trim(),
        phone: raw.personal.phone.trim(),
      },
    };
  }

  private isSameAsLoadedSnapshot(): boolean {
    if (!this.lastLoadedComparable) {
      return false;
    }
    const current = this.buildPayload();
    return JSON.stringify(current) === JSON.stringify(this.lastLoadedComparable);
  }

  private toComparablePayloadFromProfile(
    profile: CustomerProfileDto,
  ): CustomerProfileUpdateRequest {
    return {
      personal: {
        displayName: profile.personal.displayName.trim(),
        phone: profile.personal.phone.trim(),
      },
    };
  }

  private clearServerErrors(control: AbstractControl): void {
    if (control instanceof FormGroup) {
      for (const child of Object.values(control.controls)) {
        this.clearServerErrors(child);
      }
    }

    if (!control.errors || !('server' in control.errors)) {
      return;
    }

    const { server: _server, ...rest } = control.errors;
    control.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }

  private toLoadErrorState(error: unknown): CustomerProfileLoadErrorState {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return {
        title: 'Profile not found',
        message: 'Your account profile could not be loaded. Contact support if this persists.',
      };
    }

    if (error instanceof HttpErrorResponse && error.status === 403) {
      return {
        title: 'Access denied',
        message: 'Your account cannot access profile settings.',
      };
    }

    return {
      title: 'Could not load profile',
      message: 'Please refresh or try again in a few moments.',
    };
  }
}
