import { NextRequest } from "next/server";
import { NotificationService } from "@/src/services/notification.service";
import { requireAuth } from "@/src/lib/auth";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const body = await req.json();

    const subscription = await NotificationService.subscribe({
      userId: user.id!,
      endpoint: body.endpoint,
      p256dh: body.keys?.p256dh || body.p256dh,
      auth: body.keys?.auth || body.auth,
    });

    return apiSuccess(subscription);
  } catch (error) {
    return handleApiError(error);
  }
}
