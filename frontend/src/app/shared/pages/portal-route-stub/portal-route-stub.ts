import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { PORTAL_PAGE_PLACEHOLDER_BODY } from '@shared/portal-page-placeholder';
import { filter } from 'rxjs';

@Component({
  selector: 'app-portal-route-stub',
  templateUrl: './portal-route-stub.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalRouteStub {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageTitle = signal(this.readTitle());
  protected readonly placeholderBody = PORTAL_PAGE_PLACEHOLDER_BODY;

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.pageTitle.set(this.readTitle()));
  }

  private readTitle(): string {
    const t = this.route.snapshot.data['title'] ?? this.route.snapshot.data['pageTitle'];
    return typeof t === 'string' && t.trim().length > 0 ? t : 'Page';
  }
}
