import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { pathPrefixForRole } from '@core/auth/role-portal-path';
import { AuthService } from '@core/services/auth/auth';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-forbidden-page',
  imports: [Card, Button],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly portalHome = computed(() => {
    const role = this.auth.getCurrentRole();
    if (role === null) {
      return '/login' as const;
    }
    return pathPrefixForRole(role);
  });

  protected readonly signedIn = computed(() => this.auth.getCurrentRole() !== null);

  protected goToPortal(): void {
    void this.router.navigateByUrl(this.portalHome(), { replaceUrl: true });
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
