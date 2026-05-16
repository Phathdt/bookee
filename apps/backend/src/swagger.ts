import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Single source of truth for the OpenAPI document config.
 * Used by both runtime Swagger UI mount and CLI export script.
 */
export const swaggerConfig = new DocumentBuilder()
  .setTitle('Bookee API')
  .setDescription('Multi-operator trip booking platform API')
  .setVersion('0.1.0')
  .addBearerAuth()
  .build();
