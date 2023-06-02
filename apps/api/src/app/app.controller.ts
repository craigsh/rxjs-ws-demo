import { Body, Controller, Get, Post } from '@nestjs/common';

import { AppService } from './app.service';
import { WsInterfaceService } from './shared/ws-Interface';

@Controller()
export class AppController {
	constructor(private readonly appService: AppService, private wsInterface: WsInterfaceService) {}

	@Get('hello')
	getData() {
		return this.appService.getData();
	}

	@Post('message')
	postMessage(@Body() dto: { message: string }) {
		this.wsInterface.logMessage(dto.message);
	}
}
