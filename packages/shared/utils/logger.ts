import pino from "pino";

export type AppName = "jobtv" | "event-system" | "agent-manager";

export function createLogger(app: AppName) {
  return pino({
    level:
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    base: {
      app,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    },
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  });
}
