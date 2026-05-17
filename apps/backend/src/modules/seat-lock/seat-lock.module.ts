import { Module } from '@nestjs/common';

import { IRedisClient } from '@/modules/redis/redis.client';
import { RedisModule } from '@/modules/redis/redis.module';

import { ISeatLockService } from './domain/interfaces/seat-lock.service';
import { SeatLockServiceRedis } from './infrastructure/seat-lock.service.redis';

@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: ISeatLockService,
      useFactory: (redis: IRedisClient) => new SeatLockServiceRedis(redis),
      inject: [IRedisClient],
    },
  ],
  exports: [ISeatLockService],
})
export class SeatLockModule {}
