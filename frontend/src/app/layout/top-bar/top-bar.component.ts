import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { UserRole } from '@core/services/enum/auth.types';
import { NotificationService } from '@features/customer/services/notification.service';
import { MessageService } from 'primeng/api';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '@core/services/auth/auth';
import { PageHeaderService } from '../page-header/page-header.service';

@Component({
  selector: 'app-top-bar',
  imports: [],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  private static readonly DELIVERY_CODE_PATTERN =
    /(.*?)(DLV-[A-Z0-9-]+|(?=[A-Z0-9-]*\d)[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;
  private static readonly NOTIFICATIONS_POLL_INTERVAL_MS = 10000;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly messageService = inject(MessageService);
  private lastUnreadCount: number | null = null;

  readonly title = input('Dashboard');
  readonly subtitle = input<string | null>(null);
  protected readonly actions = this.pageHeaderService.actionsOverride;
  protected readonly titleParts = computed(() => {
    const currentTitle = this.title();
    return this.splitDeliveryCode(currentTitle);
  });
  protected readonly subtitleParts = computed(() => {
    const currentSubtitle = this.subtitle();
    if (!currentSubtitle) {
      return null;
    }
    return this.splitDeliveryCode(currentSubtitle);
  });

  constructor() {
    if (this.authService.getCurrentRole() === UserRole.CUSTOMER) {
      this.startCustomerNotificationsPolling();
    }
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  protected runHeaderAction(index: number): void {
    const currentActions = this.actions();
    if (!currentActions || index < 0 || index >= currentActions.length) {
      return;
    }
    currentActions[index].run();
  }

  private startCustomerNotificationsPolling(): void {
    interval(TopBarComponent.NOTIFICATIONS_POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        takeUntilDestroyed(this.destroyRef),
        switchMap(() =>
          this.notificationService
            .getNotifications({
              page: 0,
              size: 1,
              sort: 'createdAt,desc',
              unreadOnly: true,
            })
            .pipe(catchError(() => of(null))),
        ),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        const unreadCount =
          typeof response.totalElements === 'number' && Number.isFinite(response.totalElements)
            ? Math.max(response.totalElements, 0)
            : 0;
        this.notificationService.setUnreadCount(unreadCount);

        if (this.lastUnreadCount === null) {
          this.lastUnreadCount = unreadCount;
          return;
        }

        if (unreadCount > this.lastUnreadCount) {
          this.messageService.add({
            severity: 'info',
            summary: 'New notification',
            detail:
              unreadCount - this.lastUnreadCount > 1
                ? 'You received new delivery notifications.'
                : 'You received a new delivery notification.',
            life: 4500,
          });
        }

        this.lastUnreadCount = unreadCount;
      });
  }

  private splitDeliveryCode(value: string): {
    beforeCode: string;
    code: string | null;
    afterCode: string;
  } {
    const match = TopBarComponent.DELIVERY_CODE_PATTERN.exec(value);
    if (!match) {
      return {
        beforeCode: value,
        code: null,
        afterCode: '',
      };
    }
    return {
      beforeCode: match[1],
      code: match[2],
      afterCode: value.slice(match.index + match[0].length),
    };
  }
}
