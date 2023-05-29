import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayModule } from './gateway/gateway.module';

@Module({
	imports: [GatewayModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
