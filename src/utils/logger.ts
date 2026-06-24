import { config } from "../config.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVEL_VALUES[config.LOG_LEVEL as LogLevel] ?? 1;

export const logger = {
  debug(message: string, ...args: any[]) {
    if (currentLevel <= LOG_LEVEL_VALUES.debug) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  },
  info(message: string, ...args: any[]) {
    if (currentLevel <= LOG_LEVEL_VALUES.info) {
      console.error(`[INFO] ${message}`, ...args);
    }
  },
  warn(message: string, ...args: any[]) {
    if (currentLevel <= LOG_LEVEL_VALUES.warn) {
      console.error(`[WARN] ${message}`, ...args);
    }
  },
  error(message: string, ...args: any[]) {
    if (currentLevel <= LOG_LEVEL_VALUES.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
};
