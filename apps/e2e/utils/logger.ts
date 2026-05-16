import preset from '@config/test.config';
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? preset.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss.l',
      ignore: 'pid,hostname',
    },
  },
});
