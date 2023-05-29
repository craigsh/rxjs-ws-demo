import { Module } from '@nestjs/common';
import { WsGateway } from './gateway';

@Module({
	providers: [WsGateway],
})
export class GatewayModule {}
