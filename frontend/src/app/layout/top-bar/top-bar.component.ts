import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pageHeaderService = inject(PageHeaderService);

  readonly title = input('Dashboard');
  readonly subtitle = input<string | null>(null);
  protected readonly action = this.pageHeaderService.actionOverride;

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  protected runHeaderAction(): void {
    this.action()?.run();
  }
}
