import { Injectable, signal } from '@angular/core';

export interface PageHeaderAction {
  label: string;
  icon?: string;
  run: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class PageHeaderService {
  readonly titleOverride = signal<string | undefined>(undefined);
  readonly subtitleOverride = signal<string | null | undefined>(undefined);
  readonly actionOverride = signal<PageHeaderAction | undefined>(undefined);

  setOverride(title: string, subtitle?: string | null): void {
    const normalizedTitle = title.trim();
    this.titleOverride.set(
      normalizedTitle.length > 0 ? normalizedTitle : undefined,
    );

    if (subtitle === undefined) {
      this.subtitleOverride.set(undefined);
      return;
    }

    if (subtitle === null) {
      this.subtitleOverride.set(null);
      return;
    }

    const normalizedSubtitle = subtitle.trim();
    this.subtitleOverride.set(
      normalizedSubtitle.length > 0 ? normalizedSubtitle : null,
    );
  }

  clearOverride(): void {
    this.titleOverride.set(undefined);
    this.subtitleOverride.set(undefined);
    this.actionOverride.set(undefined);
  }

  setAction(action: PageHeaderAction): void {
    this.actionOverride.set(action);
  }

  clearAction(): void {
    this.actionOverride.set(undefined);
  }
}
