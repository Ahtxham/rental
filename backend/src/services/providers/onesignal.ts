import { PUSH } from "@/constants/env";

/**
 * OneSignal REST transport.
 *
 * The only file in the product that knows OneSignal exists. Everything else
 * goes through `services/notification-service.ts`, so swapping providers (or
 * dropping back to Expo push, which is free but mobile-only) is a change here
 * and nowhere else.
 *
 * Targeting is by **external id** we set the driver's `_id` as their
 * OneSignal external id from the app, which means the server never stores or
 * syncs push tokens. A driver reinstalling, changing phone or adding a second
 * device stays reachable with no token bookkeeping on our side.
 */

/**
 * Overridable so the transport can be pointed at a local mock and asserted
 * against, payload shape and auth header are otherwise unverifiable without
 * a live OneSignal account, and "we think this is the right JSON" is not a
 * thing to discover on the night a driver's first alert fails to arrive.
 */
const ENDPOINT = `${process.env.ONESIGNAL_API_BASE || "https://api.onesignal.com"}/notifications`;

/** A push is a nudge to open the app, never a data channel. */
export interface PushMessage {
  title: string;
  body: string;
  /**
   * Routed by the app on tap. **IDs only.** Payloads pass through a third
   * party and come to rest in OS notification logs, so no driver names, phone
   * numbers or coordinates go in here.
   */
  data?: Record<string, string>;
}

export interface PushResult {
  ok: boolean;
  /** OneSignal's notification id, absent when nobody was reachable. */
  id?: string;
  /** Set when the send failed, or succeeded but reached no one. */
  reason?: string;
}

export const isConfigured = (): boolean =>
  Boolean(PUSH.ONESIGNAL_APP_ID && PUSH.ONESIGNAL_API_KEY);

/**
 * Send to one or more external ids.
 *
 * Never throws: a notification is a courtesy layered on top of an action that
 * has already happened, and no alert is worth failing the thing it describes.
 * Callers get a result they may log and otherwise ignore.
 */
export const sendToExternalIds = async (
  externalIds: string[],
  message: PushMessage,
): Promise<PushResult> => {
  if (!isConfigured()) {
    return { ok: false, reason: "OneSignal is not configured" };
  }
  if (externalIds.length === 0) {
    return { ok: false, reason: "no recipients" };
  }

  const payload = {
    app_id: PUSH.ONESIGNAL_APP_ID,
    // Required whenever targeting by alias rather than by segment.
    target_channel: "push",
    include_aliases: { external_id: externalIds },
    headings: { en: message.title },
    contents: { en: message.body },
    ...(message.data ? { data: message.data } : {}),
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${PUSH.ONESIGNAL_AUTH_SCHEME} ${PUSH.ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
      // A push must not hold up the request or job that triggered it.
      signal: AbortSignal.timeout(10_000),
    });

    const text = await response.text();
    let parsed: { id?: string; errors?: unknown } = {};
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      // Non-JSON body, keep the raw text for the reason below.
    }

    if (!response.ok) {
      // 401 here almost always means the auth scheme is wrong for the key,
      // see ONESIGNAL_AUTH_SCHEME in constants/env.ts.
      return {
        ok: false,
        reason: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    // The quiet failure that matters: OneSignal answers 200 with NO id when
    // the audience resolved to nobody. Treated as a failure on purpose,
    // otherwise "notification sent" logs happily while no phone ever buzzes.
    if (!parsed.id) {
      return {
        ok: false,
        reason: "accepted but matched no subscriptions (driver has not registered a device)",
      };
    }

    return { ok: true, id: parsed.id };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};
