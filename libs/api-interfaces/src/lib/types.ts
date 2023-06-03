export interface Message {
	clientId: string;
	message: string;
	sentAt: Date;
}

export type EventType = 'message' | 'connect' | 'disconnect';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WsMessageContent {}

export interface SubscriptionMessage extends WsMessageContent {
	eventType: EventType | EventType[];
	isSubscribe: boolean;
}

export interface SubscriptionEvent<TBody = unknown> extends WsMessageContent {
	eventType: EventType;
	body: TBody;
}

export interface WsMessage {
	event: string;
	data: WsMessageContent;
}
