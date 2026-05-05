import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Tag } from 'primeng/tag';

import {
  DeliveryStatus,
  resolveDeliveryStatusPresentation,
  TagSeverity,
} from './status-maps';

type StatusTagSize = 'sm' | 'md' | 'lg';
type StatusTagVariant = 'dot' | 'tag';

/** Shared status chip for delivery-centric tables and detail headers. */
@Component({
  selector: 'app-status-tag',
  imports: [Tag],
  templateUrl: './status-tag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusTagComponent {
  readonly status = input.required<string | DeliveryStatus>();
  readonly severityOverride = input<TagSeverity | undefined>(undefined);
  readonly size = input<StatusTagSize>('md');
  readonly showIcon = input<boolean>(false);
  readonly variant = input<StatusTagVariant>('dot');

  protected readonly presentation = computed(() =>
    resolveDeliveryStatusPresentation(this.status(), this.severityOverride()),
  );

  protected readonly icon = computed(() =>
    this.showIcon() ? this.presentation().icon : undefined,
  );

  protected readonly styleClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'px-2 py-0.5 text-[11px]';
      case 'lg':
        return 'px-2.5 py-1 text-sm';
      default:
        return 'px-2.5 py-1 text-xs';
    }
  });

  protected readonly dotSizeClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'h-1.5 w-1.5';
      case 'lg':
        return 'h-2.5 w-2.5';
      default:
        return 'h-2 w-2';
    }
  });

  protected readonly textColorClass = computed(() => {
    switch (this.presentation().severity) {
      case 'success':
        return 'text-emerald-700';
      case 'info':
        return 'text-cyan-700';
      case 'warn':
        return 'text-amber-700';
      case 'danger':
        return 'text-red-700';
      case 'contrast':
        return 'text-slate-800';
      default:
        return 'text-slate-600';
    }
  });

  protected readonly bgColorClass = computed(() => {
    switch (this.presentation().severity) {
      case 'success':
        return 'bg-emerald-50';
      case 'info':
        return 'bg-cyan-50';
      case 'warn':
        return 'bg-amber-50';
      case 'danger':
        return 'bg-red-50';
      case 'contrast':
        return 'bg-slate-100';
      default:
        return 'bg-slate-100';
    }
  });

  protected readonly dotColorClass = computed(() => {
    switch (this.presentation().severity) {
      case 'success':
        return 'bg-emerald-500';
      case 'info':
        return 'bg-cyan-500';
      case 'warn':
        return 'bg-amber-500';
      case 'danger':
        return 'bg-red-500';
      case 'contrast':
        return 'bg-slate-700';
      default:
        return 'bg-slate-500';
    }
  });
}
