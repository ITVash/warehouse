import webpush from "web-push";
import { memoryDb } from "../lib/db";
import { PushSubscription } from "../types";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@negostore.ru";

if (vapidPublicKey && vapidPrivateKey && !vapidPrivateKey.includes("mock")) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.warn("Failed to initialize VAPID details:", err);
  }
}

export class NotificationService {
  static async subscribe(data: { userId: string; endpoint: string; p256dh: string; auth: string }): Promise<PushSubscription> {
    const existing = Array.from(memoryDb.pushSubscriptions.values()).find(
      (sub) => sub.endpoint === data.endpoint
    );
    if (existing) {
      existing.userId = data.userId;
      existing.updatedAt = new Date().toISOString();
      memoryDb.pushSubscriptions.set(existing.id, existing);
      return existing;
    }

    const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sub: PushSubscription = {
      id,
      userId: data.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.pushSubscriptions.set(id, sub);
    return sub;
  }

  static async unsubscribe(endpoint: string): Promise<boolean> {
    const sub = Array.from(memoryDb.pushSubscriptions.values()).find(
      (s) => s.endpoint === endpoint
    );
    if (sub) {
      return memoryDb.pushSubscriptions.delete(sub.id);
    }
    return false;
  }

  static async sendToAll(payload: { title: string; body: string; url?: string }) {
    const subs = Array.from(memoryDb.pushSubscriptions.values());
    const message = JSON.stringify(payload);

    for (const sub of subs) {
      try {
        if (vapidPublicKey && vapidPrivateKey && !vapidPrivateKey.includes("mock")) {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            message
          );
        }
      } catch (err: unknown) {
        console.warn(`Could not dispatch push notification to ${sub.endpoint}:`, (err as Error)?.message);
      }
    }
  }
}
