import { ApplicationWebhookEventType, GatewayDispatchEvents } from "discord-api-types/v10";
import { createHandlerParser, type parseEvents as dressedParseEvents } from "dressed/build";
import { warnSymbol } from "./dressed/utils/log.js";

export const parseEvents: typeof dressedParseEvents = createHandlerParser({
  colNames: ["Event"],
  uniqueKeys: ["type"],
  itemMessages: ({ name }) => ({ confict: `"${name}" conflicts with another event, skipping the duplicate` }),
  createData({ name }) {
    const type =
      ApplicationWebhookEventType[name as keyof typeof ApplicationWebhookEventType] ??
      GatewayDispatchEvents[name as keyof typeof GatewayDispatchEvents];

    if (!type) {
      throw new Error(`${warnSymbol} Event type of "${name}" could not be determined, skipping`, {
        cause: "dressed-parsing",
      });
    }

    return { type };
  },
});
