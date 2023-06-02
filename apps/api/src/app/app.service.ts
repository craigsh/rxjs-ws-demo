import { Injectable } from '@nestjs/common';
import { WsInterfaceService } from './shared/ws-Interface';

@Injectable()
export class AppService {
	constructor(private wsInterface: WsInterfaceService) {}

	getData(): { message: string } {
		//		this.wsInterface.logMessage(`Hello from the API - at ` + new Date().toLocaleString());
		return { message: `Hello from the API - at ` + new Date().toLocaleString() };
	}
}
