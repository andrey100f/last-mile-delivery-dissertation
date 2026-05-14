import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
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
import { TableEmptyStateComponent } from '@shared/ui/public-api';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Skeleton } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { finalize } from 'rxjs';
import {
  AdminCustomerSummaryDto,
  AdminCourierAvailabilityFilter,
  AdminCourierSummaryDto,
  AdminManagedUserDto,
  AdminManagedUsersQuery,
  AdminManagementApiError,
  CreateAdminCourierRequestDto,
  CreateAdminCustomerRequestDto,
} from '../../models/admin-user-management.models';
import { AdminCouriersService } from '../../services/admin-couriers.service';
import { AdminCustomersService } from '../../services/admin-customers.service';
import { PageHeaderService } from '../../../../layout/page-header/page-header.service';

type ManagementEntityKind = 'courier' | 'customer';

interface CreateDialogTexts {
  title: string;
  submitLabel: string;
  submitSuccessSummary: string;
  submitSuccessDetail: string;
}

@Component({
  selector: 'app-admin-user-management-page',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    Button,
    Dialog,
    InputText,
    Password,
    Skeleton,
    TableModule,
    TableEmptyStateComponent,
    ToggleSwitch,
  ],
  templateUrl: './admin-user-management-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserManagementPageComponent implements OnInit, OnDestroy {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

  readonly entityKind = input.required<ManagementEntityKind>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly adminCouriersService = inject(AdminCouriersService);
  private readonly adminCustomersService = inject(AdminCustomersService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageHeaderService = inject(PageHeaderService);

  protected readonly rows = signal<AdminManagedUserDto[]>([]);
  protected readonly totalRecords = signal(0);
  protected readonly loading = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly hasLoadedAtLeastOnce = signal(false);
  protected readonly hardError = signal<string | null>(null);
  protected readonly transientError = signal<string | null>(null);
  protected readonly searchInput = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly customerSummary = signal<AdminCustomerSummaryDto | null>(null);
  protected readonly customerSummaryLoading = signal(false);
  protected readonly courierSummary = signal<AdminCourierSummaryDto | null>(null);
  protected readonly courierSummaryLoading = signal(false);

  protected readonly loadingSkeletonRows = [0, 1, 2, 3];
  protected readonly rowsPerPageOptions =
    AdminUserManagementPageComponent.ROWS_PER_PAGE_OPTIONS;

  protected readonly activeQuery = signal<AdminManagedUsersQuery>({
    page: 0,
    size: AdminUserManagementPageComponent.DEFAULT_PAGE_SIZE,
    searchTerm: undefined,
    sortField: 'createdAt',
    sortDirection: 'desc',
  });

  protected readonly tableTitle = computed(() =>
    this.entityKind() === 'courier' ? 'Couriers' : 'Customers',
  );
  protected readonly addButtonLabel = computed(() =>
    this.entityKind() === 'courier' ? 'Add Courier' : 'Add Customer',
  );
  protected readonly showCourierFilters = computed(
    () => this.entityKind() === 'courier',
  );
  protected readonly showCourierMetrics = computed(
    () => this.entityKind() === 'courier',
  );
  protected readonly showCourierSummary = computed(
    () => this.entityKind() === 'courier',
  );
  protected readonly showCustomerMetrics = computed(
    () => this.entityKind() === 'customer',
  );
  protected readonly emptyStateTitle = computed(() =>
    this.entityKind() === 'courier' ? 'No couriers found' : 'No customers found',
  );
  protected readonly emptyStateMessage = computed(() =>
    this.entityKind() === 'courier'
      ? 'Try a different search term or create your first courier account.'
      : 'Try a different search term or create your first customer account.',
  );
  protected readonly createDialogTexts = computed<CreateDialogTexts>(() => {
    if (this.entityKind() === 'courier') {
      return {
        title: 'Add Courier',
        submitLabel: 'Add Courier',
        submitSuccessSummary: 'Courier created',
        submitSuccessDetail:
          'Courier account was created and list data was refreshed.',
      };
    }

    return {
      title: 'Add Customer',
      submitLabel: 'Add Customer',
      submitSuccessSummary: 'Customer created',
      submitSuccessDetail:
        'Customer account was created and list data was refreshed.',
    };
  });

  protected readonly showCourierProfileControls = computed(
    () => this.entityKind() === 'courier',
  );
  protected readonly firstRowIndex = computed(
    () => this.activeQuery().page * this.activeQuery().size,
  );
  protected readonly refreshButtonDisabled = computed(
    () => this.loading() || this.refreshing() || this.creating(),
  );
  protected readonly searchButtonDisabled = computed(
    () => this.loading() || this.refreshing(),
  );

  protected readonly createForm = this.fb.group({
    email: this.fb.control('', {
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
    password: this.fb.control('', {
      validators: [Validators.required],
    }),
    displayName: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    phoneNumber: this.fb.control('', {
      validators: [Validators.maxLength(64)],
    }),
    availableNow: this.fb.control(false),
    expressCapable: this.fb.control(false),
  });

  ngOnInit(): void {
    this.pageHeaderService.setAction({
      label: this.addButtonLabel(),
      icon: 'pi pi-plus',
      run: () => this.openCreateDialog(),
    });
    this.loadUsers(this.activeQuery(), false);
    if (this.entityKind() === 'courier') {
      this.loadCourierSummary();
    } else {
      this.loadCustomerSummary();
    }
  }

  ngOnDestroy(): void {
    this.pageHeaderService.clearAction();
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    if (!this.hasLoadedAtLeastOnce() || this.loading()) {
      return;
    }

    const nextSize = this.toValidSize(event.rows, this.activeQuery().size);
    const first = this.toValidFirst(event.first);
    const nextPage = Math.floor(first / nextSize);

    const nextQuery: AdminManagedUsersQuery = {
      ...this.activeQuery(),
      page: nextPage,
      size: nextSize,
    };

    if (this.areQueriesEqual(this.activeQuery(), nextQuery)) {
      return;
    }

    this.loadUsers(nextQuery, true);
  }

  protected updateSearchInput(value: string): void {
    this.searchInput.set(value);
  }

  protected setAvailabilityFilter(
    value: AdminCourierAvailabilityFilter | undefined,
  ): void {
    if (this.entityKind() !== 'courier') {
      return;
    }

    if (this.activeQuery().availability === value) {
      return;
    }

    const nextQuery: AdminManagedUsersQuery = {
      ...this.activeQuery(),
      page: 0,
      availability: value,
    };

    this.loadUsers(nextQuery, true);
  }

  protected isAvailabilityFilterActive(
    value: AdminCourierAvailabilityFilter | undefined,
  ): boolean {
    return this.activeQuery().availability === value;
  }

  protected applySearch(): void {
    const normalized = this.normalizeOptionalText(this.searchInput());
    const nextQuery: AdminManagedUsersQuery = {
      ...this.activeQuery(),
      page: 0,
      searchTerm: normalized,
    };

    this.loadUsers(nextQuery, true);
  }

  protected clearSearch(): void {
    if (!this.searchInput() && !this.activeQuery().searchTerm) {
      return;
    }

    this.searchInput.set('');
    const nextQuery: AdminManagedUsersQuery = {
      ...this.activeQuery(),
      page: 0,
      searchTerm: undefined,
    };

    this.loadUsers(nextQuery, true);
  }

  protected refresh(): void {
    this.loadUsers(this.activeQuery(), true);
  }

  protected retryAfterError(): void {
    this.loadUsers(this.activeQuery(), false);
  }

  protected openCreateDialog(): void {
    if (this.creating()) {
      return;
    }
    this.dialogOpen.set(true);
    this.resetDialogForm();
  }

  protected closeCreateDialog(): void {
    if (this.creating()) {
      return;
    }
    this.dialogOpen.set(false);
    this.resetDialogForm();
  }

  protected onDialogVisibleChange(visible: boolean): void {
    if (visible) {
      return;
    }
    this.closeCreateDialog();
  }

  protected createUser(): void {
    if (this.creating()) {
      return;
    }

    this.submitAttempted.set(true);
    this.clearServerErrors(this.createForm);
    this.createForm.updateValueAndValidity();
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);

    const request$ =
      this.entityKind() === 'courier'
        ? this.adminCouriersService.create(this.buildCourierPayload())
        : this.adminCustomersService.create(this.buildCustomerPayload());

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.creating.set(false)),
      )
      .subscribe({
        next: () => {
          const texts = this.createDialogTexts();
          this.messageService.add({
            severity: 'success',
            summary: texts.submitSuccessSummary,
            detail: texts.submitSuccessDetail,
            life: 4000,
          });
          this.dialogOpen.set(false);
          this.resetDialogForm();
          this.loadUsers(this.activeQuery(), true);
          if (this.entityKind() === 'courier') {
            this.loadCourierSummary();
          } else {
            this.loadCustomerSummary();
          }
        },
        error: (error: unknown) => this.handleCreateError(error),
      });
  }

  protected isFieldInvalid(controlPath: string): boolean {
    const control = this.createForm.get(controlPath);
    return Boolean(
      control && control.invalid && (control.touched || this.submitAttempted()),
    );
  }

  protected fieldError(controlPath: string): string | null {
    const control = this.createForm.get(controlPath);
    if (!control || !control.errors || !(control.touched || this.submitAttempted())) {
      return null;
    }

    if (control.errors['server']) {
      return String(control.errors['server']);
    }
    if (control.errors['required']) {
      return 'This field is required.';
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address.';
    }
    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    }
    if (control.errors['minlength']) {
      return `Minimum length is ${control.errors['minlength'].requiredLength} characters.`;
    }
    if (control.errors['pattern']) {
      return 'Must include at least one uppercase, one lowercase and one digit.';
    }

    return 'Invalid value.';
  }

  protected toShortPublicId(id: string): string {
    const normalized = id.trim().toUpperCase();
    if (normalized.length === 0) {
      return '-';
    }

    const prefix = this.entityKind() === 'courier' ? 'COU' : 'CUS';
    const shortTail = normalized.replaceAll('-', '').slice(0, 6);
    return `${prefix}-${shortTail || '000000'}`;
  }

  protected ordersFor(user: AdminManagedUserDto): number {
    return Number.isFinite(user.ordersCount) ? (user.ordersCount as number) : 0;
  }

  protected totalSpendFor(user: AdminManagedUserDto): number {
    return Number.isFinite(user.totalSpend) ? (user.totalSpend as number) : 0;
  }

  protected totalSpendCurrencyFor(user: AdminManagedUserDto): string {
    return (
      user.totalSpendCurrency ??
      this.customerSummary()?.revenueCurrency ??
      'RON'
    );
  }

  protected isCourierAvailable(user: AdminManagedUserDto): boolean {
    return user.availableNow === true;
  }

  protected deliveriesForCourier(user: AdminManagedUserDto): number {
    return Number.isFinite(user.deliveriesCount)
      ? (user.deliveriesCount as number)
      : 0;
  }

  private loadUsers(query: AdminManagedUsersQuery, preserveRowsOnError: boolean): void {
    if (this.loading() || this.refreshing()) {
      return;
    }

    const hasExistingRows = this.hasLoadedAtLeastOnce() && this.rows().length > 0;
    this.activeQuery.set({
      ...query,
      searchTerm: this.normalizeOptionalText(query.searchTerm),
    });
    this.hardError.set(null);
    this.transientError.set(null);

    if (hasExistingRows) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.listWithCurrentService(this.activeQuery())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.rows.set(response.content);
          this.totalRecords.set(response.totalElements);
          this.hasLoadedAtLeastOnce.set(true);
        },
        error: (error: unknown) => {
          const uiError = this.toUiError(error);
          const detail =
            uiError.detail ??
            'User management data could not be loaded. Please retry in a few moments.';

          if (preserveRowsOnError && hasExistingRows) {
            this.transientError.set(detail);
            return;
          }

          this.rows.set([]);
          this.totalRecords.set(0);
          this.hardError.set(detail);
          this.hasLoadedAtLeastOnce.set(true);
        },
      });
  }

  private listWithCurrentService(query: AdminManagedUsersQuery) {
    return this.entityKind() === 'courier'
      ? this.adminCouriersService.list(query)
      : this.adminCustomersService.list(query);
  }

  private toUiError(error: unknown): AdminManagementApiError {
    return this.entityKind() === 'courier'
      ? this.adminCouriersService.toUiError(error)
      : this.adminCustomersService.toUiError(error);
  }

  private loadCustomerSummary(): void {
    if (this.entityKind() !== 'customer') {
      return;
    }

    this.customerSummaryLoading.set(true);
    this.adminCustomersService
      .getSummary()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.customerSummaryLoading.set(false)),
      )
      .subscribe({
        next: (summary) => this.customerSummary.set(summary),
        error: () => {
          // Keep page resilient if summary endpoint fails.
          this.customerSummary.set(null);
        },
      });
  }

  private loadCourierSummary(): void {
    if (this.entityKind() !== 'courier') {
      return;
    }

    this.courierSummaryLoading.set(true);
    this.adminCouriersService
      .getSummary()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.courierSummaryLoading.set(false)),
      )
      .subscribe({
        next: (summary) => this.courierSummary.set(summary),
        error: () => {
          // Keep page resilient if summary endpoint fails.
          this.courierSummary.set(null);
        },
      });
  }

  private buildCustomerPayload(): CreateAdminCustomerRequestDto {
    const raw = this.createForm.getRawValue();
    return {
      email: raw.email.trim(),
      password: raw.password,
      displayName: raw.displayName.trim(),
      phoneNumber: this.normalizeOptionalText(raw.phoneNumber),
    };
  }

  private buildCourierPayload(): CreateAdminCourierRequestDto {
    const customerPayload = this.buildCustomerPayload();
    const raw = this.createForm.getRawValue();
    return {
      ...customerPayload,
      availableNow: raw.availableNow,
      expressCapable: raw.expressCapable,
    };
  }

  private handleCreateError(error: unknown): void {
    const uiError = this.toUiError(error);

    let fieldErrors = { ...uiError.fieldErrors };
    if (
      uiError.status === 409 &&
      !fieldErrors['email'] &&
      this.normalizeOptionalText(uiError.detail)
    ) {
      fieldErrors = {
        ...fieldErrors,
        email: uiError.detail as string,
      };
    }

    if (Object.keys(fieldErrors).length > 0) {
      this.applyFieldErrors(fieldErrors);
      this.createForm.markAllAsTouched();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Could not create user',
      detail:
        uiError.detail ??
        'Please review the form values and try submitting again.',
      life: 5000,
    });
  }

  private applyFieldErrors(fieldErrors: Record<string, string>): void {
    for (const [serverField, message] of Object.entries(fieldErrors)) {
      const controlPath = this.normalizeControlPath(serverField);
      const control = this.createForm.get(controlPath);
      if (!control) {
        continue;
      }

      control.setErrors({
        ...(control.errors ?? {}),
        server: message,
      });
      control.markAsTouched();
    }
  }

  private normalizeControlPath(serverField: string): string {
    const normalized = serverField.replaceAll('[', '.').replaceAll(']', '').trim();
    if (normalized === 'name' || normalized === 'fullName') {
      return 'displayName';
    }
    if (normalized === 'phone') {
      return 'phoneNumber';
    }
    return normalized;
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

  private resetDialogForm(): void {
    this.submitAttempted.set(false);
    this.createForm.reset({
      email: '',
      password: '',
      displayName: '',
      phoneNumber: '',
      availableNow: false,
      expressCapable: false,
    });
    this.createForm.markAsPristine();
    this.createForm.markAsUntouched();
    this.clearServerErrors(this.createForm);
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | undefined {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private toValidFirst(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
    return 0;
  }

  private toValidSize(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
    return fallback;
  }

  private areQueriesEqual(
    left: AdminManagedUsersQuery,
    right: AdminManagedUsersQuery,
  ): boolean {
    return (
      left.page === right.page &&
      left.size === right.size &&
      left.searchTerm === right.searchTerm &&
      left.availability === right.availability &&
      left.sortField === right.sortField &&
      left.sortDirection === right.sortDirection
    );
  }
}
