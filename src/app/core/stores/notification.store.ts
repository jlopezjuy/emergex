import { Injectable, signal, computed } from '@angular/core';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  readonly notifications = signal<NotificationItem[]>([]);

  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.read).length,
  );

  addNotification(
    item: Omit<NotificationItem, 'id' | 'read' | 'timestamp'>,
  ): void {
    const notification: NotificationItem = {
      ...item,
      id: crypto.randomUUID(),
      read: false,
      timestamp: new Date(),
    };
    this.notifications.update((list) => [notification, ...list].slice(0, 50));
  }

  markRead(id: string): void {
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  markAllRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }
}
