import {inject} from '@angular/core';
import {environment} from '@environment/environment';
import {HttpClient} from '@angular/common/http';

export class BaseService {
  protected readonly httpClient = inject(HttpClient);
  protected readonly baseUrl = environment.apiUrl;
}
