import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { EventType, SubscriptionEvent, SubscriptionMessage } from '@rxjs-ws-demo/api-interfaces';
import { Socket } from 'dgram';
import { Server } from 'ws';
import { WsInterfaceService } from '../shared/ws-Interface';

@WebSocketGateway()
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(private wsInterface: WsInterfaceService) {
		this.listenForMessages();
	}

	@WebSocketServer()
	server: Server;

	private wsClients: Socket[] = [];

	private subscriptions: Map<EventType, WeakSet<Socket>> = new Map();

	handleDisconnect(client: Socket) {
		this.wsClients = this.wsClients.filter((c) => c !== client);

		console.log('Client disconnected ' + this.wsClients.length);
		this.broadcastConnectDisconnect(false);
	}

	handleConnection(client: Socket, ...args: any[]) {
		this.wsClients.push(client);
		console.log('Client connected ' + this.wsClients.length);

		this.broadcastConnectDisconnect(true);
	}

	@SubscribeMessage('subscriptions')
	onEvent(client: Socket, subscriptionRequest: SubscriptionMessage) {
		//: Observable<WsResponse<number>> {
		console.log('onEvent', subscriptionRequest);

		if (subscriptionRequest.isSubscribe) {
			let map = this.subscriptions.get(subscriptionRequest.eventType);
			if (!map) {
				map = new WeakSet<Socket>();
				this.subscriptions.set(subscriptionRequest.eventType, map);
			}

			map.add(client);
		} else {
			// Unsubscribe
			const map = this.subscriptions.get(subscriptionRequest.eventType);
			if (map) {
				map.delete(client);
			}
		}
	}

	private listenForMessages() {
		this.wsInterface.messages$.subscribe((msg) => {
			console.log('listenForMessages', msg);

			const event: SubscriptionEvent = {
				eventType: 'message',
				body: msg,
			};

			// Find the subscribers to the message event
			const subscribers = this.subscriptions.get('message');

			let count = 0;
			this.wsClients.forEach((c) => {
				if (subscribers && subscribers.has(c)) {
					count++;
					c.send(JSON.stringify(event));
				}
			});

			console.log('Message notification sent to ' + count + ' subscribers');
		});
	}

	private broadcastConnectDisconnect(isConnect: boolean) {
		const eventType = isConnect ? 'connect' : 'disconnect';

		const event: SubscriptionEvent = {
			eventType,
			body: (isConnect ? 'Client connected' : 'Client disconnected') + ' at ' + new Date(),
		};

		// Find the subscribers to the connect/disconnect event
		const subscribers = this.subscriptions.get(eventType);

		let count = 0;
		this.wsClients.forEach((c) => {
			if (subscribers && subscribers.has(c)) {
				count++;
				c.send(JSON.stringify(event));
			}
		});

		console.log(eventType + ' notification sent to ' + count + ' subscribers');
	}
}
