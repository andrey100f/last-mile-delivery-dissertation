import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { PageTopBarComponent } from '../../../layout/page-top-bar/page-top-bar.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-portal-route-stub',
  imports: [PageTopBarComponent],
  templateUrl: './portal-route-stub.html',
  styleUrl: './portal-route-stub.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalRouteStub {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageTitle = signal(this.readTitle());

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.pageTitle.set(this.readTitle()));
  }

  private readTitle(): string {
    const t = this.route.snapshot.data['pageTitle'];
    return typeof t === 'string' && t.length > 0 ? t : 'Page';
  }
}
