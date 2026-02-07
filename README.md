# dressed-forwarder

Simple event proxy to forward events from a gateway connection to webhook server.

```ts
import createForwarder from "dressed-forwarder";

const connection = createForwarder("https://example.bot/api/bot/events");
```

Your events should go on a different route than your main interactions, as it does differ for handling.

```ts
// api/bot.ts
import { handleRequest } from "dressed/server";
import { commands, components, events } from "../.dressed";

export const POST = (req: Request) => handleRequest(req, commands, components, events);
```

```ts
// api/bot/events.ts
import { handleRequest } from "dressed-framework";
import { events } from "../../.dressed";

export const POST = (req: Request) => handleRequest(req, events);
```

This is a janky solution and thus isn't worth being published under the `@dressed` scope.
