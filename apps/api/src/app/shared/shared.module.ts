import { Module } from '@nestjs/common';
import { WsInterfaceService } from './ws-Interface';

@Module({
	providers: [WsInterfaceService],
	exports: [WsInterfaceService],
})
export class SharedModule {}
