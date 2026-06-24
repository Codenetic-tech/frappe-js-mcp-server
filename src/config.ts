import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

const configSchema = z.object({
  FRAPPE_URL: z.string().url("FRAPPE_URL must be a valid URL"),
  FRAPPE_API_KEY: z.string().optional(),
  FRAPPE_API_SECRET: z.string().optional(),
  FRAPPE_TOKEN: z.string().optional(),
  FRAPPE_TOKEN_TYPE: z.enum(["Bearer", "token"]).default("Bearer"),
  FRAPPE_USERNAME: z.string().optional(),
  FRAPPE_PASSWORD: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

// Validate config, but fail gracefully if FRAPPE_URL is not set so we can print a nice instruction.
let validatedConfig: Config;
try {
  validatedConfig = configSchema.parse({
    FRAPPE_URL: process.env.FRAPPE_URL,
    FRAPPE_API_KEY: process.env.FRAPPE_API_KEY,
    FRAPPE_API_SECRET: process.env.FRAPPE_API_SECRET,
    FRAPPE_TOKEN: process.env.FRAPPE_TOKEN,
    FRAPPE_TOKEN_TYPE: process.env.FRAPPE_TOKEN_TYPE || "Bearer",
    FRAPPE_USERNAME: process.env.FRAPPE_USERNAME,
    FRAPPE_PASSWORD: process.env.FRAPPE_PASSWORD,
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Environment configuration error:");
    error.errors.forEach((err) => {
      console.error(`   - ${err.path.join(".")}: ${err.message}`);
    });
  } else {
    console.error("❌ Unexpected configuration error:", error);
  }
  process.exit(1);
}

export const config = validatedConfig;
