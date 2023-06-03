export interface Message {
	message: string;
}

export type EventType = 'message' | 'connect' | 'disconnect';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WsMessageContent {}

export interface SubscriptionMessage extends WsMessageContent {
	eventType: EventType;
	isSubscribe: boolean;
	clientId?: string;
}

export interface SubscriptionEvent extends WsMessageContent {
	eventType: EventType;
	body: unknown;
}

export interface WsMessage {
	event: string;
	data: WsMessageContent;
}
