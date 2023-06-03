import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import {
	EventType,
	WsMessage,
	SubscriptionEvent,
	SubscriptionMessage,
	WsMessageContent,
} from '@rxjs-ws-demo/api-interfaces';
import { assertDefined } from '@rxjs-ws-demo/utils';
import {
	EMPTY,
	Observable,
	Subject,
	catchError,
	combineLatest,
	exhaustMap,
	filter,
	finalize,
	map,
	switchMap,
	takeWhile,
	tap,
	timer,
	withLatestFrom,
} from 'rxjs';
import { WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { SocketStatsStore } from './socket-stats.store';

const RETRY_SECONDS = 5;
const MAX_RETRIES = 30;
const DEBUG_MODE = true;

interface SocketState {
	baseUri: string;
	wsSubjectConfig?: WebSocketSubjectConfig<WsMessage>;
	subscribeUnsubscribeMessages: WsMessageContent[];
	socket?: WebSocketSubject<WsMessage>;
	connectError?: unknown;
}

@Injectable({
	providedIn: 'root',
})
export class SocketService extends ComponentStore<SocketState> {
	private messages = new Subject<unknown>();
	private readonly connected = new Subject<void>();

	private readonly baseUri$ = this.select(({ baseUri }) => baseUri);
	private readonly wsSubjectConfig$ = this.select(({ wsSubjectConfig }) => wsSubjectConfig);

	/**
	 * The current state of the websocket connection.
	 */
	readonly isConnected$ = this.statsStore.isConnected$;

	/**
	 * A stream of messages to send
	 */
	private messages$ = this.messages.asObservable();

	private readonly subscribeUnsubscribeMessages$ = this.select(
		({ subscribeUnsubscribeMessages }) => subscribeUnsubscribeMessages,
	);

	private readonly socket$ = this.select(({ socket }) => socket);

	/**
	 * A stream that emits whenever the websocket connects.
	 */
	readonly connected$ = this.connected.asObservable();

	/**
	 * A stream of errors that occurred when trying to connect to the websocket.
	 */
	readonly connectError$ = this.select(({ connectError }) => connectError);

	/**
	 * A stream of messages to send, combined with whether the websocket is connected.
	 * This will emit when the websocket is connected, and there are messages to send.
	 */
	private readonly toSend$ = combineLatest([this.isConnected$, this.subscribeUnsubscribeMessages$]).pipe(
		filter(([isConnected, queue]) => isConnected && queue.length > 0),
		map(([, queue]) => queue),
	);

	/**
	 * Constructs the WebSocketSubjectConfig object, with open and close observers to handle connection status,
	 * and trying to re-connect when disconnected.
	 */
	private readonly setUpWebSocketSubjectConfig = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.baseUri$),
			tap(([, baseUri]) => {
				const url = baseUri.replace(/^http/, 'ws') + 'ws';

				if (DEBUG_MODE) {
					console.log('Web socket url', url);
				}
				const config: WebSocketSubjectConfig<WsMessage> = {
					url,
					closeObserver: {
						next: (event) => {
							DEBUG_MODE && console.log('closeObserver', event);
							this.statsStore.setConnected(false);

							this.tryReconnect();
						},
					},
					openObserver: {
						next: (event) => {
							DEBUG_MODE && console.log('openObserver', event);
							this.statsStore.bumpConnections();

							this.patchState({ connectError: undefined });
							this.statsStore.setConnected(true);

							// Notify connected
							this.connected.next();
						},
					},
				};

				this.patchState({ wsSubjectConfig: config });
			}),
		),
	);

	/**
	 * Attempts to connect to the websocket.
	 */
	private readonly connect = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.wsSubjectConfig$),
			switchMap(([, config]) => {
				assertDefined(config);

				// Create a new socket, and listen for messages, pushing them into the messagesSubject.
				const socket = new WebSocketSubject(config);
				this.patchState({ socket });
				return socket.pipe(
					tap((msg) => {
						this.statsStore.bumpMessagesReceived();
						this.messages.next(msg);
					}),
					catchError((err) => {
						this.patchState({ connectError: err });

						DEBUG_MODE && console.log('error in connect', err);
						return EMPTY;
					}),
				);
			}),
		),
	);

	/**
	 * Disconnects the socket. For simulation purposes. The service will automatically try to reconnect.
	 */
	readonly disconnect = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.isConnected$, this.socket$),
			tap(([, isConnected, socket]) => {
				if (isConnected && socket) {
					socket.complete();
				}
			}),
		),
	);

	/**
	 * Handles attempting to reconnect to the websocket until connected or the max retries have been reached.
	 */
	private readonly tryReconnect = this.effect((trigger$) =>
		trigger$.pipe(
			exhaustMap(() => {
				return timer(RETRY_SECONDS * 1000).pipe(
					withLatestFrom(this.isConnected$),
					takeWhile(([, isConnected]) => {
						if (!isConnected) {
							this.statsStore.bumpConnectionRetries();

							//DEBUG_MODE && console.log('Attempting re-connect to websocket - try #' + reconnectionTries);
						}

						return !isConnected && this.statsStore.reconnectionTries < MAX_RETRIES;
					}),
					tap(() => {
						this.connect();
					}),
				);
			}),
		),
	);

	/**
	 * Watches the queue for changes, and when the socket exists, sends the messages in the queue.
	 */
	readonly watchQueue = this.effect((queue$: Observable<WsMessageContent[]>) =>
		queue$.pipe(
			withLatestFrom(this.socket$),
			tap(([queue, socket]) => {
				DEBUG_MODE && console.log('watchQueue', queue, socket);

				if (!socket) {
					return;
				}

				while (queue.length > 0) {
					const msg = queue.shift();
					assertDefined(msg);

					DEBUG_MODE && console.log('Sending queued message', msg);
					socket.next({
						event: 'subscriptions',
						data: msg,
					});

					this.patchState({ subscribeUnsubscribeMessages: queue });
				}
			}),
		),
	);

	/**
	 * Adds a message to the queue to send to the server to subscribe or unsubscribe to/from a notification.
	 */
	private readonly queueSubscribeUnsubscribeMessage = this.effect((msg$: Observable<SubscriptionMessage>) =>
		msg$.pipe(
			withLatestFrom(this.subscribeUnsubscribeMessages$),
			tap(([msg, queue]) => {
				if (msg.isSubscribe) {
					this.statsStore.bumpSubscriptionCount();
				} else {
					this.statsStore.dropSubscriptionCount();
				}

				this.patchState({ subscribeUnsubscribeMessages: [...queue, msg] });
			}),
		),
	);

	constructor(@Inject(DOCUMENT) document: Document, private statsStore: SocketStatsStore) {
		super({
			baseUri: document.baseURI,
			subscribeUnsubscribeMessages: [],
		});

		this.statsStore.setConnected(false);

		this.setUpWebSocketSubjectConfig();
		this.connect();
		this.watchQueue(this.toSend$);
	}

	/**
	 * Begins subscribing to a type of events or events.
	 * Returns an observable that will emit when the event is received.
	 * @param eventType
	 * @returns
	 */
	subscribeToEventType<T extends SubscriptionEvent>(eventType: EventType | EventType[]): Observable<T> {
		return this.setUpSubscription<T>(eventType);
	}

	/**
	 *
	 * @param eventType
	 * @returns
	 */
	private setUpSubscription<T extends SubscriptionEvent>(eventType: EventType | EventType[]): Observable<T> {
		const msg = {
			eventType,
			isSubscribe: true,
		} as SubscriptionMessage;

		// Send a message to the server to begin subscribe to the event type(s).
		this.queueSubscribeUnsubscribeMessage(msg);

		return this.messages$.pipe(
			map((msg) => msg as T),
			tap((msg) => {
				DEBUG_MODE && console.log('received notification', msg);
			}),
			filter((msg) => {
				if (typeof eventType === 'string') {
					return msg.eventType === eventType;
				} else {
					return eventType.includes(msg.eventType);
				}
			}),
			finalize(() => {
				// Caller has unsubscribed from the stream.
				// Send the message to the server to unsubscribe from the event type(s).
				const unsubscribeMessage: SubscriptionMessage = {
					...msg,
					isSubscribe: false,
				};
				this.queueSubscribeUnsubscribeMessage(unsubscribeMessage);
			}),
		);
	}
}
