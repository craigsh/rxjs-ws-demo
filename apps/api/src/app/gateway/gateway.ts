import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { SubscriptionMessage } from '@rxjs-ws-demo/api-interfaces';
import { Socket } from 'dgram';
import { Server } from 'ws';

@WebSocketGateway()
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	wsClients: Socket[] = [];

	handleDisconnect(client: Socket) {
		//console.log('handleDisconnect', client);

		this.wsClients = this.wsClients.filter((c) => c !== client);

		console.log('Client disconnected ' + this.wsClients.length);
	}

	handleConnection(client: Socket, ...args: any[]) {
		//console.log('handleConnection', args, client['sec-websocket-key']);

		this.wsClients.push(client);

		console.log('Client connected ' + this.wsClients.length);
	}

	// @SubscribeMessage('newMessage')
	// handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: any): void {
	// 	console.log('handleMessage', client, payload);
	// }

	// sendToAll(msg: string) {
	// 	this.server.emit('message', msg);
	// }

	@SubscribeMessage('subscriptions')
	onEvent(client: Socket, data: SubscriptionMessage) {
		//: Observable<WsResponse<number>> {
		console.log('onEvent', data);

		this.wsClients.forEach((c) => {
			c.send(JSON.stringify(data));
		});

		// return from([1, 2, 3]).pipe(
		// 	delay(1000),
		// 	map((item) => ({ event: 'events', data: item * 2 })),
		// );
	}
}
