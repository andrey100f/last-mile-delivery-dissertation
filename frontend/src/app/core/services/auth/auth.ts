import { Injectable } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import {
  LoginRequestDto,
  LoginResponseDto,
} from '@core/services/enum/auth.types';
import { Observable, tap } from 'rxjs';

const ACCESS_TOKEN_STORAGE_KEY = 'deliveryhub.accessToken';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends BaseService {
  public login(credentials: LoginRequestDto): Observable<LoginResponseDto> {
    return this.httpClient
      .post<LoginResponseDto>(`${this.baseUrl}/auth/login`, credentials)
      .pipe(tap((res) => this.setAccessToken(res.token)));
  }

  public getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  /** Clears persisted session client-side only (no server revoke); safe for 401 handler — avoids redirect loops. */
  public logout(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  private setAccessToken(token: string): void {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  }
}
