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
    this.titleOverride.set(title.trim().length > 0 ? title : undefined);
    this.subtitleOverride.set(subtitle === undefined ? undefined : subtitle);
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
