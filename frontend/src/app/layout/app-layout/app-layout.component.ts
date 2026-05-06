import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { navSectionsForRole } from '@core/navigation/app-nav.utils';
import { AuthService } from '@core/services/auth/auth';
import { UserRole } from '@core/services/enum/auth.types';
import { UserService } from '@core/services/user/user';
import { filter } from 'rxjs';
import { displayNameFromEmail, initialsFromEmail } from '../layout-user.utils';
import { TopBarComponent } from '../top-bar/top-bar.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass, TopBarComponent],
  templateUrl: './app-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navSections = computed(() => navSectionsForRole(this.auth.sessionRole()));
  protected readonly pageTitle = signal('Dashboard');
  protected readonly pageSubtitle = signal<string | null>(null);

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
    this.refreshRouteHeader();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshRouteHeader());
  }

  private refreshRouteHeader(): void {
    this.pageTitle.set(this.readCurrentPageTitle());
    this.pageSubtitle.set(this.readCurrentPageSubtitle());
  }

  private readCurrentPageTitle(): string {
    const title = this.readLeafDataValue('title') ?? this.readLeafDataValue('pageTitle');
    if (title !== null) {
      return title;
    }
    return 'Dashboard';
  }

  private readCurrentPageSubtitle(): string | null {
    return this.readLeafDataValue('subtitle');
  }

  private readLeafDataValue(key: string): string | null {
    let activeRoute = this.router.routerState.snapshot.root;
    while (activeRoute.firstChild) {
      activeRoute = activeRoute.firstChild;
    }
    const value = activeRoute.data?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
