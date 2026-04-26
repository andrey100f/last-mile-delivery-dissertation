import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PORTAL_PAGE_PLACEHOLDER_BODY } from '@shared/portal-page-placeholder';

/** Main-column header: page title + placeholder subtitle (React-style), no app branding here. */
@Component({
  selector: 'app-page-top-bar',
  standalone: true,
  templateUrl: './page-top-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageTopBarComponent {
  readonly title = input.required<string>();

  protected readonly subtitleText = PORTAL_PAGE_PLACEHOLDER_BODY;
}
