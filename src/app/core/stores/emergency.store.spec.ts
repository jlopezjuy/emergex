import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EmergencyStore } from './emergency.store';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { WebsocketService } from '../websocket/websocket.service';
import { SessionStore } from './session.store';
import { UserFeedbackService } from '../notifications/user-feedback.service';
import { NotificationStore } from './notification.store';

describe('EmergencyStore panic alerts', () => {
  const handlers = new Map<string, (raw: unknown) => void>();
  const unsubscribe = vi.fn();
  let store: EmergencyStore;
  let feedback: UserFeedbackService;
  let notifications: NotificationStore;

  beforeEach(() => {
    handlers.clear();
    unsubscribe.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: EmergencyApiService, useValue: { getById: vi.fn(), getActivos: vi.fn() } },
        {
          provide: WebsocketService,
          useValue: {
            subscribe: (topic: string, cb: (raw: unknown) => void) => {
              handlers.set(topic, cb);
              return { unsubscribe };
            },
          },
        },
        { provide: SessionStore, useValue: { account: () => ({ empresa: { id: 42 } }) } },
      ],
    });
    store = TestBed.inject(EmergencyStore);
    feedback = TestBed.inject(UserFeedbackService);
    notifications = TestBed.inject(NotificationStore);
  });

  it('subscribes to the tenant panic topic', () => {
    store.startTicketTracking();

    expect(handlers.has('/topic/empresa/42/panico')).toBe(true);
  });

  it('shows a persistent error toast and a notification when a panic arrives', () => {
    store.startTicketTracking();

    handlers.get('/topic/empresa/42/panico')!({
      type: 'PanicoActivado',
      empresaId: 42,
      ticketId: 98253,
      latitud: -26.18,
      longitud: -58.17,
    });

    const toast = feedback.toasts()[0];
    expect(toast.type).toBe('error');
    expect(toast.title).toContain('PÁNICO');
    expect(toast.message).toContain('98253');
    expect(toast.ttlMs).toBeGreaterThanOrEqual(30000);
    expect(notifications.notifications()[0].type).toBe('error');
  });

  it('ignores malformed panic events', () => {
    store.startTicketTracking();

    handlers.get('/topic/empresa/42/panico')!({ type: 'PanicoActivado' });

    expect(feedback.toasts()).toHaveLength(0);
  });

  it('unsubscribes from the panic topic when tracking stops', () => {
    store.startTicketTracking();
    store.stopTicketTracking();

    expect(unsubscribe).toHaveBeenCalledTimes(3);
  });
});
