# dressed-forwarder

Simple event proxy to forward events from a gateway connection to webhook server.

In order to enable parsing of gateway events, run builds through this library instead of Dressed.

```diff
- bun dressed build
+ bun dressed-forwarder build
```

Your events should go on a different route than your main interactions, as it does differ for handling.

This is a janky solution and thus isn't worth being published under the `@dressed` scope.
