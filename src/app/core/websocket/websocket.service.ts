import { Injectable, signal } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { logError, logWarn } from '../utils/logger';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private client!: Client;
  readonly connected = signal(false);

  connect(token: string, onConnected?: () => void): void {
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl) as WebSocket,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected.set(true);
        onConnected?.();
      },
      onDisconnect: () => {
        this.connected.set(false);
      },
      onStompError: (frame) => {
        logError('STOMP error', frame);
        this.connected.set(false);
      },
    });
    this.client.activate();
  }

  disconnect(): void {
    if (this.client?.active) {
      this.client.deactivate();
    }
    this.connected.set(false);
  }

  subscribe(topic: string, callback: (msg: unknown) => void): StompSubscription | null {
    if (!this.client?.connected) {
      logWarn('WebSocket not connected. Cannot subscribe to', topic);
      return null;
    }
    return this.client.subscribe(topic, (message) => {
      try {
        const body = JSON.parse(message.body) as unknown;
        callback(body);
      } catch {
        callback(message.body);
      }
    });
  }

  publish(destination: string, body: unknown): void {
    if (!this.client?.connected) {
      logWarn('WebSocket not connected. Cannot publish to', destination);
      return;
    }
    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }
}
