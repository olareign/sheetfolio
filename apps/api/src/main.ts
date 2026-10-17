import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ENV, type Env } from "./config/env.js";

// Local runs read apps/api/.env; hosted environments inject variables directly.
if (process.env.NODE_ENV !== "production") {
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

const app = await NestFactory.create(AppModule);
const env = app.get<Env>(ENV);
app.enableCors({ origin: env.WEB_ORIGIN ?? false });
app.enableShutdownHooks();
await app.listen(env.PORT);
