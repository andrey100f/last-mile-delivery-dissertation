import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {BaseService} from '@core/services/base.service';

@Injectable({
  providedIn: 'root',
})
export class HealthService extends BaseService {

  public getHealth(): Observable<{ status: string }> {
    return this.httpClient.get<{ status: string }>(`${this.baseUrl}/actuator/health`);
  }
}
