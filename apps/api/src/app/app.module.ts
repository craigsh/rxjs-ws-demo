import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
	imports: [SharedModule, GatewayModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
