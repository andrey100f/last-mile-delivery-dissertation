import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
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
    /(.*?)(DLV-[A-Z0-9-]+|[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pageHeaderService = inject(PageHeaderService);

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
