import "server-only";

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info:  (message: string, data?: Record<string, unknown>) => log("info",  message, data),
  warn:  (message: string, data?: Record<string, unknown>) => log("warn",  message, data),
  error: (message: string, data?: Record<string, unknown>) => log("error", message, data),
};
