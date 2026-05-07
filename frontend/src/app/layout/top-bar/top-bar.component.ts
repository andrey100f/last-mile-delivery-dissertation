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
  private static readonly DELIVERY_CODE_PATTERN = /(.*?)(DLV-[A-Z0-9]+)/;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pageHeaderService = inject(PageHeaderService);

  readonly title = input('Dashboard');
  readonly subtitle = input<string | null>(null);
  protected readonly action = this.pageHeaderService.actionOverride;
  protected readonly titleParts = computed(() => {
    const currentTitle = this.title();
    const match = TopBarComponent.DELIVERY_CODE_PATTERN.exec(currentTitle);
    if (!match) {
      return {
        beforeCode: currentTitle,
        code: null as string | null,
      };
    }
    return {
      beforeCode: match[1],
      code: match[2],
    };
  });

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  protected runHeaderAction(): void {
    this.action()?.run();
  }
}
