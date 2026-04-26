import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { navSectionsForRole } from '@core/navigation/app-nav.utils';
import { AuthService } from '@core/services/auth/auth';
import { UserRole } from '@core/services/enum/auth.types';
import { UserService } from '@core/services/user/user';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { fromEvent } from 'rxjs';

const MOBILE_MAX_WIDTH_PX = 768;

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    NgClass,
    Drawer,
    Button,
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** PrimeNG drawer visibility (mobile). */
  protected readonly mobileMenuOpen = signal(false);

  /** Desktop sidebar narrow (icon-first) mode. */
  protected readonly sidebarCollapsed = signal(false);

  protected readonly isMobile = signal(
    typeof globalThis.matchMedia === 'function'
      ? globalThis.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`).matches
      : false,
  );

  protected readonly navSections = computed(() =>
    navSectionsForRole(this.auth.sessionRole()),
  );

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

  constructor() {
    if (typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const mql = globalThis.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);
    const apply = () => this.isMobile.set(mql.matches);
    apply();
    fromEvent(mql, 'change')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        apply();
        if (!mql.matches) {
          this.mobileMenuOpen.set(false);
        }
      });
  }

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  protected toggleCollapse(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  protected openMobileMenu(): void {
    this.mobileMenuOpen.set(true);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected onNavLinkClick(): void {
    if (this.isMobile()) {
      this.closeMobileMenu();
    }
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
