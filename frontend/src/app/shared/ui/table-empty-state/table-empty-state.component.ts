import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-table-empty-state',
  imports: [Button, RouterLink],
  templateUrl: './table-empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableEmptyStateComponent {
  readonly title = input<string>('No data yet');
  readonly message = input<string>('Try adjusting filters or refresh the page.');
  readonly icon = input<string>('pi pi-inbox');
  readonly actionLabel = input<string | undefined>(undefined);
  readonly actionRouterLink = input<string | readonly string[] | undefined>(
    undefined,
  );
}
