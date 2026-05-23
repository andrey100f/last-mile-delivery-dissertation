import { Injectable, NgZone, inject, isDevMode } from '@angular/core';
import { AuthService } from '@core/services/auth/auth';
import { Client, IMessage, ReconnectionTimeMode, StompSubscription } from '@stomp/stompjs';
import { environment } from '@environment/environment';
import { BehaviorSubject, EMPTY, Observable, Subject, filter } from 'rxjs';
import {
  TrackingConnectionState,
  TrackingSocketEvent,
} from '../models/tracking.models';

@Injectable({
  providedIn: 'root',
})
export class TrackingSocketService {
  private static readonly SUPPORTED_EVENT_VERSION = 1;
  private static readonly DELIVERY_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private readonly authService = inject(AuthService);
  private readonly zone = inject(NgZone);

  private readonly connectionStateSubject =
    new BehaviorSubject<TrackingConnectionState>('offline');
  private readonly eventsSubject = new Subject<TrackingSocketEvent>();

  private client: Client | null = null;
  private readonly watchedDeliveryIds = new Set<string>();
  private readonly deliverySubscriptions = new Map<string, StompSubscription>();
  private authMonitorHandle: ReturnType<typeof setInterval> | null = null;

  readonly connectionState$ = this.connectionStateSubject.asObservable();

  watchDelivery(deliveryId: string): Observable<TrackingSocketEvent> {
    const normalizedDeliveryId = deliveryId.trim();
    if (!TrackingSocketService.DELIVERY_ID_PATTERN.test(normalizedDeliveryId)) {
      return EMPTY;
    }

    this.watchedDeliveryIds.add(normalizedDeliveryId);
    this.ensureConnected();
    this.ensureSubscription(normalizedDeliveryId);

    return this.eventsSubject.pipe(
      filter((event) => event.deliveryId === normalizedDeliveryId),
    );
  }

  unwatchDelivery(deliveryId: string): void {
    const normalizedDeliveryId = deliveryId.trim();
    this.watchedDeliveryIds.delete(normalizedDeliveryId);
    this.unsubscribeTopic(normalizedDeliveryId);
  }

  clearActiveDelivery(deliveryId?: string): void {
    if (deliveryId) {
      this.unwatchDelivery(deliveryId);
      return;
    }

    this.watchedDeliveryIds.clear();
    this.unsubscribeAllTopics();
  }

  disconnect(): void {
    this.connectionStateSubject.next('offline');
    this.watchedDeliveryIds.clear();
    this.unsubscribeAllTopics();
    this.stopAuthMonitor();

    if (this.client) {
      const current = this.client;
      this.client = null;
      void current.deactivate();
    }
  }

  private ensureConnected(): void {
    if (!this.hasValidToken()) {
      this.disconnect();
      return;
    }

    if (!this.client) {
      this.client = this.createClient();
    }

    if (this.client.connected) {
      this.connectionStateSubject.next('live');
      this.syncSubscriptions();
      return;
    }

    if (!this.client.active) {
      this.connectionStateSubject.next('connecting');
      this.client.activate();
      return;
    }

    this.connectionStateSubject.next('reconnecting');
  }

  private createClient(): Client {
    const wsUrl = this.resolveWebSocketUrl();
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: this.resolveConnectHeaders(),
      beforeConnect: async () => {
        if (!this.hasValidToken()) {
          throw new Error('WS_CONNECT_UNAUTHORIZED');
        }
        client.connectHeaders = this.resolveConnectHeaders();
      },
      onConnect: () => {
        this.zone.run(() => {
          this.connectionStateSubject.next('live');
          this.startAuthMonitor();
          this.syncSubscriptions();
        });
      },
      onStompError: () => {
        this.zone.run(() => this.connectionStateSubject.next('reconnecting'));
      },
      onWebSocketClose: () => {
        this.zone.run(() => {
          this.stopAuthMonitor();
          this.connectionStateSubject.next(
            this.hasValidToken() ? 'reconnecting' : 'offline',
          );
        });
      },
      onWebSocketError: () => {
        this.zone.run(() => this.connectionStateSubject.next('reconnecting'));
      },
      debug: (message) => {
        if (!isDevMode()) {
          return;
        }
        // Keep logs scoped to dev mode for easier lifecycle troubleshooting.
        console.debug('[TrackingSocketService]', message);
      },
    });
    return client;
  }

  private syncSubscriptions(): void {
    const client = this.client;
    if (!client?.connected) {
      return;
    }

    for (const [deliveryId] of this.deliverySubscriptions) {
      if (!this.watchedDeliveryIds.has(deliveryId)) {
        this.unsubscribeTopic(deliveryId);
      }
    }

    for (const deliveryId of this.watchedDeliveryIds) {
      this.ensureSubscription(deliveryId);
    }
  }

  private ensureSubscription(deliveryId: string): void {
    const client = this.client;
    if (!client?.connected || this.deliverySubscriptions.has(deliveryId)) {
      return;
    }

    const destination = `/topic/deliveries/${deliveryId}/tracking`;
    const subscription = client.subscribe(destination, (frame) =>
      this.handleMessage(frame),
    );
    this.deliverySubscriptions.set(deliveryId, subscription);
  }

  private unsubscribeTopic(deliveryId: string): void {
    const subscription = this.deliverySubscriptions.get(deliveryId);
    if (!subscription) {
      return;
    }

    subscription.unsubscribe();
    this.deliverySubscriptions.delete(deliveryId);
  }

  private unsubscribeAllTopics(): void {
    for (const [deliveryId, subscription] of this.deliverySubscriptions) {
      subscription.unsubscribe();
      this.deliverySubscriptions.delete(deliveryId);
    }
  }

  private handleMessage(frame: IMessage): void {
    let payload: unknown;
    try {
      payload = JSON.parse(frame.body) as unknown;
    } catch {
      return;
    }

    const event = this.normalizeEvent(payload);
    if (!event) {
      return;
    }

    this.zone.run(() => this.eventsSubject.next(event));
  }

  private normalizeEvent(payload: unknown): TrackingSocketEvent | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const value = payload as {
      eventVersion?: unknown;
      deliveryId?: unknown;
      status?: unknown;
      updatedAt?: unknown;
      etaMinutes?: unknown;
      progressPercent?: unknown;
    };

    const eventVersion =
      typeof value.eventVersion === 'number' ? value.eventVersion : null;
    const deliveryId = typeof value.deliveryId === 'string' ? value.deliveryId : null;
    const status = typeof value.status === 'string' ? value.status : null;
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;

    if (
      eventVersion === null ||
      eventVersion !== TrackingSocketService.SUPPORTED_EVENT_VERSION
    ) {
      if (isDevMode()) {
        console.warn(
          '[TrackingSocketService] Ignored unsupported event version:',
          eventVersion,
        );
      }
      return null;
    }
    if (
      !deliveryId ||
      !status ||
      !updatedAt ||
      !TrackingSocketService.DELIVERY_ID_PATTERN.test(deliveryId)
    ) {
      return null;
    }

    return {
      eventVersion,
      deliveryId,
      status,
      updatedAt,
      etaMinutes: this.toNullableNumber(value.etaMinutes),
      progressPercent: this.toNullableNumber(value.progressPercent),
    };
  }

  private resolveConnectHeaders(): Record<string, string> {
    const token = this.authService.getAccessToken();
    if (!token) {
      return {};
    }
    return {
      Authorization: `Bearer ${token}`,
      token,
    };
  }

  private resolveWebSocketUrl(): string {
    const rawApiUrl = environment.apiUrl.trim();
    const token = this.authService.getAccessToken();
    let url: string;

    if (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')) {
      try {
        const parsed = new URL(rawApiUrl);
        const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        const normalizedBase = normalizeApiBase(parsed.pathname);
        url = `${wsProtocol}//${parsed.host}${normalizedBase}/ws-tracking`;
      } catch {
        url = this.resolveSameOriginWebSocketUrl(rawApiUrl);
      }
    } else {
      url = this.resolveSameOriginWebSocketUrl(rawApiUrl);
    }

    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}token=${encodeURIComponent(token)}`;
    }
    return url;
  }

  private resolveSameOriginWebSocketUrl(rawApiUrl: string): string {
    const normalizedBase = normalizeApiBase(rawApiUrl);
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}${normalizedBase}/ws-tracking`;
  }

  private hasValidToken(): boolean {
    return this.authService.isAccessTokenPresentAndValid();
  }

  private startAuthMonitor(): void {
    if (this.authMonitorHandle) {
      return;
    }

    this.authMonitorHandle = setInterval(() => {
      if (this.hasValidToken()) {
        return;
      }

      this.zone.run(() => this.disconnect());
    }, 5000);
  }

  private stopAuthMonitor(): void {
    if (!this.authMonitorHandle) {
      return;
    }

    clearInterval(this.authMonitorHandle);
    this.authMonitorHandle = null;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}

function normalizeApiBase(rawApiBase: string): string {
  const normalized = rawApiBase.trim();
  if (normalized.length === 0) {
    return '/api';
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const parsed = new URL(normalized);
      return parsed.pathname.replace(/\/$/, '');
    } catch {
      return '/api';
    }
  }

  const withLeadingSlash = normalized.startsWith('/')
    ? normalized
    : `/${normalized}`;
  return withLeadingSlash.replace(/\/$/, '');
}
