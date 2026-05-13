import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import { NotificationService } from '@features/customer/services/notification.service';
import { PageHeaderService } from '../page-header/page-header.service';
import { catchError, filter, interval, of, startWith, switchMap } from 'rxjs';
import { NavItem } from '@core/navigation/app-nav.model';
import {
  displayNameFromEmail,
  initialsFromDisplayName,
  initialsFromEmail,
} from '../layout-user.utils';
import { TopBarComponent } from '../top-bar/top-bar.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass, TopBarComponent],
  templateUrl: './app-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  private static readonly SIDEBAR_NOTIFICATIONS_POLL_INTERVAL_MS = 10000;

  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly notificationService = inject(NotificationService);

  protected readonly navSections = computed(() => navSectionsForRole(this.auth.sessionRole()));
  protected readonly hasUnreadNotifications = computed(
    () => this.notificationService.unreadCount() > 0,
  );
  private readonly routeTitle = signal('Dashboard');
  private readonly routeSubtitle = signal<string | null>(null);
  protected readonly pageTitle = computed(
    () => this.pageHeaderService.titleOverride() ?? this.routeTitle(),
  );
  protected readonly pageSubtitle = computed(() => {
    const override = this.pageHeaderService.subtitleOverride();
    return override === undefined ? this.routeSubtitle() : override;
  });

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
    const displayName = u?.displayName?.trim();
    if (!email) {
      return { initials: '?', line1: 'Account', line2: 'Signed in' };
    }

    const effectiveDisplayName =
      displayName && displayName.length > 0
        ? displayName
        : displayNameFromEmail(email);

    return {
      initials:
        displayName && displayName.length > 0
          ? initialsFromDisplayName(displayName)
          : initialsFromEmail(email),
      line1: effectiveDisplayName,
      line2: email,
    };
  });

  constructor() {
    this.refreshRouteHeader();
    this.startSidebarNotificationsPolling();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshRouteHeader());
  }

  protected showUnreadDotFor(item: NavItem): boolean {
    if (!this.hasUnreadNotifications()) {
      return false;
    }
    const [scope, section] = item.routerCommands;
    return scope === 'customer' && section === 'notifications';
  }

  private refreshRouteHeader(): void {
    this.routeTitle.set(this.readCurrentPageTitle());
    this.routeSubtitle.set(this.readCurrentPageSubtitle());
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

  private startSidebarNotificationsPolling(): void {
    interval(AppLayoutComponent.SIDEBAR_NOTIFICATIONS_POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          if (this.auth.getCurrentRole() !== UserRole.CUSTOMER) {
            return of(null);
          }
          return this.notificationService
            .getNotifications({
              page: 0,
              size: 1,
              sort: 'createdAt,desc',
              unreadOnly: true,
            })
            .pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((response) => {
        if (response === null) {
          this.notificationService.setUnreadCount(0);
          return;
        }
        const unreadCount =
          typeof response.totalElements === 'number' && Number.isFinite(response.totalElements)
            ? Math.max(response.totalElements, 0)
            : 0;
        this.notificationService.setUnreadCount(unreadCount);
      });
  }
}
