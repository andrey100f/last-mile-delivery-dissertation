import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AUTH_RETURN_URL_SESSION_KEY } from '@core/auth/auth-redirect.service';
import {
  returnUrlAllowedForRole,
  sanitizeInternalReturnUrl,
} from '@core/auth/return-url';
import { AuthService } from '@core/services/auth/auth';
import { UserRole } from '@core/services/enum/auth.types';
import { UserService } from '@core/services/user/user';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { finalize, switchMap } from 'rxjs';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, Button, InputText],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  protected readonly submitting = signal(false);

  protected readonly UserRole = UserRole;

  protected readonly roles: readonly {
    id: UserRole;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      id: UserRole.CUSTOMER,
      label: 'Customer',
      description: 'Create and track deliveries',
      icon: 'pi pi-user',
    },
    {
      id: UserRole.COURIER,
      label: 'Courier',
      description: 'Accept and complete deliveries',
      icon: 'pi pi-box',
    },
    {
      id: UserRole.ADMIN,
      label: 'Administrator',
      description: 'Manage operations',
      icon: 'pi pi-user',
    },
  ];

  protected readonly form = this.fb.nonNullable.group({
    role: this.fb.nonNullable.control<UserRole>(UserRole.CUSTOMER, {
      validators: [Validators.required],
    }),
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email],
    }),
    password: this.fb.nonNullable.control('', {
      validators: [Validators.required],
    }),
  });

  protected selectRole(role: UserRole): void {
    this.form.controls.role.setValue(role);
  }

  protected roleDescription(): string {
    const id = this.form.controls.role.getRawValue();
    return this.roles.find((r) => r.id === id)?.description ?? '';
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, role } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .login({ email, password, role })
      .pipe(
        switchMap(() => this.userService.refreshCurrentUser()),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => this.navigateAfterLogin(),
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Authentication failed',
            detail:
              'We could not sign you in. Check your email and password, and that Login as matches your account role in the system.',
            life: 7000,
          });
        },
      });
  }

  private navigateAfterLogin(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('returnUrl');
    const fromSession = sessionStorage.getItem(AUTH_RETURN_URL_SESSION_KEY);
    sessionStorage.removeItem(AUTH_RETURN_URL_SESSION_KEY);

    const candidate = fromQuery?.trim() || fromSession || undefined;
    const safe = candidate ? sanitizeInternalReturnUrl(candidate) : undefined;
    const role = this.form.controls.role.getRawValue();
    const allowed = returnUrlAllowedForRole(safe, role);
    if (allowed) {
      void this.router.navigateByUrl(allowed);
      return;
    }
    this.navigateByRole();
  }

  private navigateByRole(): void {
    const role = this.form.controls.role.getRawValue();
    switch (role) {
      case UserRole.CUSTOMER:
        void this.router.navigate(['/customer']);
        break;
      case UserRole.COURIER:
        void this.router.navigate(['/courier']);
        break;
      case UserRole.ADMIN:
        void this.router.navigate(['/admin']);
        break;
      default:
        void this.router.navigate(['/welcome']);
    }
  }
}
