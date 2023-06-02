export interface Message {
	message: string;
}

export type EventType = 'message' | 'connect' | 'disconnect';

export type SubscriptionMessage = {
	eventType: EventType;
	isSubscribe: boolean;
	clientId?: string;
};

export type SubscriptionEvent = {
	eventType: EventType;
	body: unknown;
};

export type GenericWsMessage = {
	event: string;
	data: SubscriptionMessage;
};
