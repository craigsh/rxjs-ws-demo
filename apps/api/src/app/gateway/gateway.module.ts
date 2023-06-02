import { Module } from '@nestjs/common';
import { WsGateway } from './gateway';
import { SharedModule } from '../shared/shared.module';

@Module({
	imports: [SharedModule],
	providers: [WsGateway],
})
export class GatewayModule {}
