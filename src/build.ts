import { appendFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { ApplicationWebhookEventType, GatewayDispatchEvents } from "discord-api-types/v10";
import { getApp } from "dressed";
import {
  createHandlerParser,
  type parseEvents as dressedParseEvents,
  parseCommands,
  parseComponents,
} from "dressed/build";
import type { CommandData, ComponentData, EventData, ServerConfig } from "dressed/server";
import { botEnv, serverConfig } from "dressed/utils";
import { categoryExports, crawlDir, importString, override } from "./dressed/utils/build.js";
import bundleFiles from "./dressed/utils/bundle.js";
import logger, { warnSymbol } from "./dressed/utils/log.js";

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

/**
 * Builds the bot imports and other variables.
 */
export default async function build(
  config: ServerConfig = {},
  { bundle = bundleFiles }: { bundle?: typeof bundleFiles } = {},
): Promise<{
  commands: CommandData[];
  components: ComponentData[];
  events: EventData[];
  config: ServerConfig;
}> {
  mkdirSync(".dressed/tmp", { recursive: true });
  await fetchMissingVars();
  const configPath = readdirSync(".").find((f) => basename(f, extname(f)) === "dressed.config");
  const configOutPath = ".dressed/tmp/dressed.config.mjs";

  if (configPath) {
    await bundle(configPath, ".dressed/tmp");
    const { default: importedConfig } = await import(resolve(configOutPath));
    config = override(importedConfig, config);
    Object.assign(serverConfig, override(serverConfig, config));
  } else {
    writeFileSync(configOutPath, `export default ${JSON.stringify(config)}`);
  }

  const root = config.build?.root ?? "src";
  const categories = ["commands", "components", "events"];
  const files = await Promise.all(categories.map((d) => crawlDir(root, d, config.build?.extensions)));
  const entriesPath = ".dressed/tmp/entries.ts";

  writeFileSync(entriesPath, [files.map((c) => c.map(importString)), categoryExports(files)].flat(2).join(""));
  logger.defer("Bundling handlers");
  await bundle(entriesPath, ".dressed/tmp");
  const { commands, components, events } = await import(resolve(entriesPath.replace(".ts", ".mjs")));

  logger.raw.log(); // This just adds a newline before the logged trees for consistency
  return {
    commands: parseCommands(commands, `${root}/commands`),
    components: parseComponents(components, `${root}/components`),
    events: parseEvents(events, `${root}/events`),
    config,
  };
}

async function fetchMissingVars() {
  try {
    void botEnv.DISCORD_TOKEN; // NOSONAR
    const missingVars: string[] = [];

    try {
      void botEnv.DISCORD_APP_ID; // NOSONAR
    } catch {
      missingVars.push("DISCORD_APP_ID");
    }
    try {
      void botEnv.DISCORD_PUBLIC_KEY; // NOSONAR
    } catch {
      missingVars.push("DISCORD_PUBLIC_KEY");
    }

    if (missingVars.length) {
      logger.defer(`Fetching missing variables (${missingVars.join(", ")})`);

      const app = await getApp();

      const envLines: string[] = [
        "# Some required bot variables were missing, so they've been filled in automatically",
      ];
      if (missingVars.includes("DISCORD_APP_ID")) {
        envLines.push(`DISCORD_APP_ID="${app.id}"`);
      }
      if (missingVars.includes("DISCORD_PUBLIC_KEY")) {
        envLines.push(`DISCORD_PUBLIC_KEY="${app.verify_key}"`);
      }

      appendFileSync(".env", `\n${envLines.join("\n")}`);
    }
  } catch {
    logger.error("Failed to fetch missing variables");
  }
}
