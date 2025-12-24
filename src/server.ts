import { handleEvent } from "dressed/server";
import { botEnv, serverConfig } from "dressed/utils";
import logger from "./dressed/utils/log.js";

export async function handleRequest(req: Request, events: Parameters<typeof handleEvent>[0], config = serverConfig) {
  if (req.headers.get("authorization") !== botEnv.DISCORD_TOKEN) {
    logger.error("Invalid authorization");
    return new Response(null, { status: 401 });
  }
  try {
    const status = await handleEvent(events, await req.json(), config.middleware);
    return new Response(status === 200 ? '{"type":1}' : null, { status });
  } catch (error) {
    logger.error("Failed to process request:", error);
    return new Response(null, { status: 500 });
  }
}
