export interface Message {
	message: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WebSocketMessage {}

export interface GenericMessage extends WebSocketMessage {
	message: string;
}

export interface WebSocketSubscriptionMsg extends WebSocketMessage {
	beginSub: boolean;
	className: string;
	eventType: number;
	session: boolean;
}

export interface NotificationJsonModel {
	$type: string;
	note_causer_sessionId: string;
	readonly note_causer_staffCode: string;
	note_eventType: number;
	note_typeName: string;
}
