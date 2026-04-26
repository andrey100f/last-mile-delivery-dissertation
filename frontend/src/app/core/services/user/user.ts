import { Injectable, signal } from '@angular/core';
import { readStoredAccessToken } from '@core/auth/auth-session.storage';
import { isJwtExpired, readJwtSubject } from '@core/auth/jwt-payload';
import { BaseService } from '@core/services/base.service';
import { User } from '@core/services/enum/user.types';
import { Observable, catchError, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService extends BaseService {
  private readonly _currentUserInfo = signal<User | null>(null);

  readonly currentUser = this._currentUserInfo.asReadonly();

  clearCurrentUser(): void {
    this._currentUserInfo.set(null);
  }

  /**
   * Loads the signed-in user from `GET /users/{sub}` using the JWT `sub` claim.
   * Call after login and on app bootstrap when a valid token exists.
   */
  refreshCurrentUser(): Observable<User | null> {
    const token = readStoredAccessToken();
    if (token === null || token.length === 0 || isJwtExpired(token)) {
      this._currentUserInfo.set(null);
      return of(null);
    }
    const sub = readJwtSubject(token);
    if (sub === null) {
      this._currentUserInfo.set(null);
      return of(null);
    }
    return this.httpClient.get<User>(`${this.baseUrl}/users/${sub}`).pipe(
      tap((user) => this._currentUserInfo.set(user)),
      catchError(() => {
        this._currentUserInfo.set(null);
        return of(null);
      }),
    );
  }

  /** App initializer: same as {@link refreshCurrentUser} when a session exists. */
  ensureLoaded(): Observable<User | null> {
    return this.refreshCurrentUser();
  }
}
