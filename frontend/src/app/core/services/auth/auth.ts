import { Injectable } from '@angular/core';
import {BaseService} from '@core/services/base.service';
import {LoginRequestDto, LoginResponseDto} from '@core/services/enum/auth.types';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends BaseService {

  public login(credentials: LoginRequestDto): Observable<LoginResponseDto> {
    return this.httpClient.post<LoginResponseDto>(`${this.baseUrl}/auth/login`, credentials);
  }

}
