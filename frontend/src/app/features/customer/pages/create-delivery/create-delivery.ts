import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DeliveryService } from '@core/services/delivery/delivery';
import {
  CreateDeliveryRequest,
  DeliveryCreatedResponse,
  DeliveryType,
} from '@core/services/enum/delivery.types';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-delivery-page',
  imports: [
    ReactiveFormsModule,
    Card,
    Button,
    InputText,
    InputNumber,
    Textarea,
  ],
  templateUrl: './create-delivery-redesign.html',
  styleUrl: './create-delivery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateDeliveryPage {
  private readonly fb = inject(FormBuilder);
  private readonly deliveryService = inject(DeliveryService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saving = signal(false);
  protected readonly latestPricing = signal<DeliveryCreatedResponse | null>(null);
  protected readonly selectedDeliveryType = signal<DeliveryType>('STANDARD');

  protected readonly deliveryTypeCards: {
    value: DeliveryType;
    label: string;
    eta: string;
    previewBase: number;
    disabled?: boolean;
  }[] = [
    { value: 'STANDARD', label: 'Standard', eta: '2-4 hours', previewBase: 15 },
    { value: 'EXPRESS', label: 'Express', eta: '1 hour', previewBase: 25 },
  ];

  protected readonly previewPricing = computed(() => {
    const selectedType = this.selectedDeliveryType();
    const selected = this.deliveryTypeCards.find(
      (card) => card.value === selectedType,
    );
    const baseAmount = selected?.previewBase ?? 15;
    const feeAmount = 2.5;
    const taxAmount = Number(((baseAmount + feeAmount) * 0.1).toFixed(2));
    return {
      baseAmount,
      feeAmount,
      taxAmount,
      totalAmount: Number((baseAmount + feeAmount + taxAmount).toFixed(2)),
      currency: 'USD',
    };
  });

  protected readonly form = this.fb.nonNullable.group({
    pickup: this.createAddressGroup(),
    destination: this.createAddressGroup(),
    package: this.fb.nonNullable.group({
      weightKg: this.fb.nonNullable.control(0.01, {
        validators: [Validators.required, Validators.min(0.01)],
      }),
      description: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.maxLength(1000)],
      }),
    }),
    deliveryType: this.fb.nonNullable.control<DeliveryType>('STANDARD', {
      validators: [Validators.required],
    }),
    specialInstructions: this.fb.nonNullable.control('', {
      validators: [Validators.maxLength(2000)],
    }),
  });

  protected onSubmit(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.deliveryService
      .create(this.buildPayload())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (response) => this.handleCreateSuccess(response),
        error: (error: unknown) => {
          const mapped = this.deliveryService.applyValidationErrors(
            this.form,
            error as HttpErrorResponse,
          );
          if (mapped) {
            this.form.markAllAsTouched();
            return;
          }
          this.form.markAllAsTouched();
          this.messageService.add({
            severity: 'error',
            summary: 'Could not create delivery',
            detail: 'Please review your data and try again.',
            life: 5000,
          });
        },
      });
  }

  protected cancel(): void {
    void this.router.navigate(['/customer']);
  }

  protected selectDeliveryType(type: DeliveryType): void {
    this.form.controls.deliveryType.setValue(type);
    this.form.controls.deliveryType.markAsTouched();
    this.selectedDeliveryType.set(type);
  }

  protected isDeliveryTypeSelected(type: DeliveryType): boolean {
    return this.form.controls.deliveryType.value === type;
  }

  protected fieldError(controlPath: string): string | null {
    const control = this.form.get(controlPath);
    if (!control?.touched || !control.errors) {
      return null;
    }

    if (control.errors['server']) {
      return String(control.errors['server']);
    }
    if (control.errors['required']) {
      return 'This field is required.';
    }
    if (control.errors['email']) {
      return 'Please enter a valid email.';
    }
    if (control.errors['min']) {
      return `Value must be at least ${control.errors['min'].min}.`;
    }
    if (control.errors['max']) {
      return `Value must be at most ${control.errors['max'].max}.`;
    }
    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    }
    if (control.errors['minlength']) {
      return `Minimum length is ${control.errors['minlength'].requiredLength} characters.`;
    }
    if (control.errors['pattern']) {
      return 'Value format is invalid.';
    }

    return 'Invalid value.';
  }

  protected isFieldInvalid(controlPath: string): boolean {
    const control = this.form.get(controlPath);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  private createAddressGroup() {
    return this.fb.nonNullable.group({
      line1: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.maxLength(255)],
      }),
      contactName: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.maxLength(255)],
      }),
      contactPhone: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.maxLength(64)],
      }),
    });
  }

  private buildPayload(): CreateDeliveryRequest {
    const raw = this.form.getRawValue();
    return {
      pickup: {
        line1: raw.pickup.line1.trim(),
        contactName: raw.pickup.contactName.trim(),
        contactPhone: raw.pickup.contactPhone.trim(),
      },
      destination: {
        line1: raw.destination.line1.trim(),
        contactName: raw.destination.contactName.trim(),
        contactPhone: raw.destination.contactPhone.trim(),
      },
      package: {
        weightKg: raw.package.weightKg,
        description: this.toOptional(raw.package.description),
      },
      deliveryType: raw.deliveryType,
      specialInstructions: this.toOptional(raw.specialInstructions),
    };
  }

  private handleCreateSuccess(response: DeliveryCreatedResponse): void {
    this.latestPricing.set(response);
    this.messageService.add({
      severity: 'success',
      summary: 'Delivery created',
      detail: `Tracking ${response.trackingCode} | Total ${response.totalAmount} ${response.currency}`,
      life: 6000,
    });
    void this.router.navigate(['/customer']);
  }

  private toOptional(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }
}
