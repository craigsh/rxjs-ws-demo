import { Body, Controller, Post } from '@nestjs/common';

import { AppService } from './app.service';
import { WsInterfaceService } from './shared/ws-Interface';
import { Message } from '@rxjs-ws-demo/api-interfaces';

@Controller()
export class AppController {
	constructor(private readonly appService: AppService, private wsInterface: WsInterfaceService) {}

	@Post('message')
	postMessage(@Body() dto: Message) {
		this.wsInterface.logMessage(dto);
	}
}
