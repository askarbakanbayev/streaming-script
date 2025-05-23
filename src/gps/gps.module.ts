import { Module } from '@nestjs/common';
import { GpsService } from './gps.service';
import { GpsGateway } from './gps.gateway';

@Module({
  providers: [GpsService, GpsGateway],
  exports: [GpsService],
})
export class GpsModule {}
