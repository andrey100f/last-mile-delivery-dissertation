import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private readonly _httpClient = inject(HttpClient);
  private readonly _baseUrl = environment.apiUrl;

  public getHealth(): Observable<{ status: string }> {
    return this._httpClient.get<{ status: string }>(`${this._baseUrl}/actuator/health`);
  }
}
