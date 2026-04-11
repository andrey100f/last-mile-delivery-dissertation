import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private readonly _httpClient = inject(HttpClient);

  public getHealth(): Observable<{ status: string }> {
    return this._httpClient.get<{ status: string }>('/api/actuator/health');
  }

}
