import { HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { map, Observable, tap } from 'rxjs';
import {
  CustomerNotificationDto,
  CustomerNotificationPage,
  MarkAllReadResponse,
  NotificationListQuery,
} from '../models/notification.models';

type NotificationApiResponse = Omit<Partial<CustomerNotificationDto>, 'read'> & {
  read?: unknown;
  delivery_id?: unknown;
  created_at?: unknown;
  read_at?: unknown;
};

type NotificationPageApiResponse = Omit<CustomerNotificationPage, 'content'> & {
  content?: NotificationApiResponse[];
};

@Injectable({
  providedIn: 'root',
})
export class NotificationService extends BaseService {
  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  getNotifications(
    query: NotificationListQuery = {},
  ): Observable<CustomerNotificationPage> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', String(query.page));
    }
    if (query.size !== undefined) {
      params = params.set('size', String(query.size));
    }
    if (query.sort && query.sort.trim().length > 0) {
      params = params.set('sort', query.sort.trim());
    }
    if (query.unreadOnly !== undefined) {
      params = params.set('unreadOnly', String(query.unreadOnly));
    }
    if (query.type && query.type.trim().length > 0) {
      params = params.set('type', query.type.trim());
    }

    return this.httpClient
      .get<NotificationPageApiResponse>(`${this.baseUrl}/notifications`, {
        params,
      })
      .pipe(map((response) => this.normalizePage(response)));
  }

  markAsRead(notificationId: string): Observable<void> {
    return this.httpClient.patch<void>(
      `${this.baseUrl}/notifications/${notificationId}/read`,
      {},
    );
  }

  markAllAsRead(): Observable<MarkAllReadResponse> {
    return this.httpClient.patch<MarkAllReadResponse>(
      `${this.baseUrl}/notifications/read-all`,
      {},
    );
  }

  setUnreadCount(count: number): void {
    this._unreadCount.set(Math.max(0, Math.floor(count)));
  }

  refreshUnreadCount(): Observable<number> {
    return this.getNotifications({
      page: 0,
      size: 1,
      sort: 'createdAt,desc',
      unreadOnly: true,
    }).pipe(
      map((response) =>
        typeof response.totalElements === 'number' && Number.isFinite(response.totalElements)
          ? Math.max(response.totalElements, 0)
          : 0,
      ),
      tap((count) => this.setUnreadCount(count)),
    );
  }

  private normalizePage(response: NotificationPageApiResponse): CustomerNotificationPage {
    const content = Array.isArray(response.content) ? response.content : [];
    return {
      content: content.map((item) => this.normalizeNotification(item)),
      totalElements:
        typeof response.totalElements === 'number' && Number.isFinite(response.totalElements)
          ? response.totalElements
          : 0,
      totalPages:
        typeof response.totalPages === 'number' && Number.isFinite(response.totalPages)
          ? response.totalPages
          : 0,
      size:
        typeof response.size === 'number' && Number.isFinite(response.size)
          ? response.size
          : 0,
      number:
        typeof response.number === 'number' && Number.isFinite(response.number)
          ? response.number
          : 0,
    };
  }

  private normalizeNotification(item: NotificationApiResponse): CustomerNotificationDto {
    const fallbackCreatedAt = new Date().toISOString();
    const createdAt = this.toRequiredText(
      item.createdAt ?? item.created_at,
      fallbackCreatedAt,
    );
    const readAt = this.toNullableText(item.readAt ?? item.read_at);
    const read =
      typeof item.read === 'boolean'
        ? item.read
        : typeof item.read === 'string'
          ? item.read.toLowerCase() === 'true'
          : readAt !== null;

    return {
      id: this.toRequiredText(item.id, ''),
      type: this.toRequiredText(item.type, 'SYSTEM_ANNOUNCEMENT'),
      category: this.toRequiredText(item.category, 'SYSTEM'),
      title: this.toRequiredText(item.title, 'Notification'),
      message: this.toRequiredText(item.message, ''),
      deliveryId: this.toNullableText(item.deliveryId ?? item.delivery_id),
      createdAt,
      read,
      readAt: read ? readAt ?? createdAt : null,
    };
  }

  private toRequiredText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
      return fallback;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : fallback;
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
