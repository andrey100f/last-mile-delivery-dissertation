import { inject, Injectable } from '@angular/core';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  USER_ROLE_STORAGE_KEY,
  clearStoredAuthSession,
  readStoredAccessToken,
} from '@core/auth/auth-session.storage';
import { isJwtExpired } from '@core/auth/jwt-payload';
import { BaseService } from '@core/services/base.service';
import {
  LoginRequestDto,
  LoginResponseDto,
  UserRole,
} from '@core/services/enum/auth.types';
import { UserService } from '@core/services/user/user';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends BaseService {
  private readonly userService = inject(UserService);

  /**
   * Sends email, password, and portal role; the API returns 401 if no user matches that triple.
   * Persists token and role only after a successful response.
   */
  public login(request: LoginRequestDto): Observable<LoginResponseDto> {
    return this.httpClient
      .post<LoginResponseDto>(`${this.baseUrl}/auth/login`, request)
      .pipe(
        tap((res) => {
          this.setAccessToken(res.token);
          this.setPersistedRole(request.role);
        }),
      );
  }

  public getAccessToken(): string | null {
    return readStoredAccessToken();
  }

  public getCurrentRole(): UserRole | null {
    const raw = sessionStorage.getItem(USER_ROLE_STORAGE_KEY);
    return parseStoredUserRole(raw);
  }

  public getCurrentUser(): { role: UserRole } | null {
    const role = this.getCurrentRole();
    return role !== null ? { role } : null;
  }

  public isAccessTokenPresentAndValid(): boolean {
    const token = this.getAccessToken();
    if (token === null || token.length === 0) {
      return false;
    }
    if (isJwtExpired(token)) {
      return false;
    }
    return true;
  }

  /** Clears persisted session client-side only (no server revoke); safe for 401 handler — avoids redirect loops. */
  public logout(): void {
    clearStoredAuthSession();
    this.userService.clearCurrentUser();
  }

  private setAccessToken(token: string): void {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  }

  private setPersistedRole(role: UserRole): void {
    sessionStorage.setItem(USER_ROLE_STORAGE_KEY, role);
  }
}

function parseStoredUserRole(raw: string | null): UserRole | null {
  if (raw === null) {
    return null;
  }
  const values = Object.values(UserRole) as string[];
  return values.includes(raw) ? (raw as UserRole) : null;
}
