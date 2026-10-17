import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { EmailModule } from "./email/email.module.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  imports: [ConfigModule, EmailModule],
  controllers: [HealthController],
})
export class AppModule {}
