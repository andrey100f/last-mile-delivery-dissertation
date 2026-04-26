import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { navSectionsForRole } from '@core/navigation/app-nav.utils';
import { AuthService } from '@core/services/auth/auth';
import { UserRole } from '@core/services/enum/auth.types';
import { UserService } from '@core/services/user/user';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  templateUrl: './app-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  protected readonly navSections = computed(() => navSectionsForRole(this.auth.sessionRole()));

  protected readonly rolePortalTagline = computed(() => {
    switch (this.auth.sessionRole()) {
      case UserRole.CUSTOMER:
        return 'Customer portal';
      case UserRole.COURIER:
        return 'Courier portal';
      case UserRole.ADMIN:
        return 'Admin portal';
      default:
        return 'Portal';
    }
  });

  protected readonly sidebarUser = computed(() => {
    const u = this.userService.currentUser();
    const email = u?.email?.trim();
    if (!email) {
      return { initials: '?', line1: 'Account', line2: 'Signed in' };
    }
    return {
      initials: initialsFromEmail(email),
      line1: displayNameFromEmail(email),
      line2: email,
    };
  });

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, '');
  if (cleaned.length >= 2) {
    return (cleaned[0] + cleaned[1]).toUpperCase();
  }
  if (local.length >= 2) {
    return local.slice(0, 2).toUpperCase();
  }
  return local.slice(0, 1).toUpperCase() || '?';
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
