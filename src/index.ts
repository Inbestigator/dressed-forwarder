import { type ConnectionActions, createConnection } from "@dressed/ws";
import { ApplicationWebhookType, GatewayDispatchEvents, type GatewayDispatchPayload } from "discord-api-types/v10";
import { botEnv } from "dressed/utils";

type HandlerActions = Omit<ConnectionActions, "emit" | "shards">;

export type Event<K extends keyof typeof GatewayDispatchEvents> = (GatewayDispatchPayload extends infer U
  ? U extends { t: infer T }
    ? (typeof GatewayDispatchEvents)[K] extends T
      ? U
      : never
    : never
  : never)["d"];

/**
 * Create a forwarding connection to send event types to your webserver
 * @param cc Endpoint to send the events
 * @param connectionParams Configuration for the gateway connection
 */
export default function createForwarder(cc: string | URL, ...connectionParams: Parameters<typeof createConnection>) {
  const connection = createConnection(...connectionParams);

  for (const key in connection) {
    if (!key.startsWith("on")) continue;
    connection[key as keyof HandlerActions]((data) =>
      fetch(cc, {
        method: "POST",
        headers: { authorization: botEnv.DISCORD_TOKEN },
        body: JSON.stringify({
          type: ApplicationWebhookType.Event,
          event: {
            data,
            type: GatewayDispatchEvents[key.slice(2) as keyof typeof GatewayDispatchEvents],
          },
        }),
      }),
    );
  }

  return connection;
}
