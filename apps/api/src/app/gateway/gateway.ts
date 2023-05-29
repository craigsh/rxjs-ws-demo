import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Socket } from 'dgram';

@WebSocketGateway()
export class WsGateway {
	@WebSocketServer() server;

	@SubscribeMessage('newMessage')
	handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: any): void {
		console.log('handleMessage', client, payload);
	}

	sendToAll(msg: string) {
		this.server.emit('message', msg);
	}
}
