import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import {
  DeliveryListQuery,
  DeliverySummaryDto,
  PageDto,
} from '@core/services/enum/delivery.types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DeliveryService extends BaseService {
  listForCurrentCustomer(
    query: DeliveryListQuery = {},
  ): Observable<PageDto<DeliverySummaryDto>> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.status !== undefined && query.status.length > 0) {
      params = params.set('status', query.status);
    }

    return this.httpClient.get<PageDto<DeliverySummaryDto>>(
      `${this.baseUrl}/deliveries`,
      {
        params,
      },
    );
  }
}
