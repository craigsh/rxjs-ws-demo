import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { EventType, GenericWsMessage, SubscriptionEvent, SubscriptionMessage } from '@rxjs-ws-demo/api-interfaces';
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
	wsSubjectConfig?: WebSocketSubjectConfig<GenericWsMessage>;
	subscribeUnsubscribeMessages: SubscriptionMessage[];
	socket?: WebSocketSubject<GenericWsMessage>;
}

@Injectable({
	providedIn: 'root',
})
export class SocketService extends ComponentStore<SocketState> {
	/**
	 * The current state of the websocket connection.
	 */
	readonly isConnected$ = this.statsStore.isConnected$;

	private messagesSubject = new Subject<unknown>();
	private messages$ = this.messagesSubject.asObservable();

	private readonly baseUri$ = this.select(({ baseUri }) => baseUri);
	private readonly wsSubjectConfig$ = this.select(({ wsSubjectConfig }) => wsSubjectConfig);

	private readonly subscribeUnsubscribeMessages$ = this.select(
		({ subscribeUnsubscribeMessages }) => subscribeUnsubscribeMessages,
	);
	private readonly socket$ = this.select(({ socket }) => socket);

	private readonly connected = new Subject<void>();
	/**
	 * A stream that emits whenever the websocket connects.
	 */
	readonly connected$ = this.connected.asObservable();

	/**
	 * A stream of messages to send, combined with whether the websocket is connected.
	 * This will emit when the websocket is connected, and there are messages to send.
	 */
	private readonly toSend$ = combineLatest([this.isConnected$, this.subscribeUnsubscribeMessages$]).pipe(
		filter(([isConnected, queue]) => isConnected && queue.length > 0),
		map(([, queue]) => queue),
	);

	/**
	 * Constructs the WebSocketSubjectConfig object, with open and close observers to handle connection status, and trying to re-connect when disconnected.
	 */
	private readonly setUpWebSocketSubjectConfig = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.baseUri$),
			tap(([, baseUri]) => {
				const url = baseUri.replace(/^http/, 'ws') + 'ws';

				if (DEBUG_MODE) {
					console.log('Web socket url', url);
				}
				const config: WebSocketSubjectConfig<GenericWsMessage> = {
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

							this.statsStore.setConnected(true);

							// Signal connected
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
						this.messagesSubject.next(msg);
					}),
					catchError((err) => {
						DEBUG_MODE && console.log('error in connect', err);
						return EMPTY;
					}),
				);
			}),
		),
	);

	/**
	 * Disconnects the socket.
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
	readonly watchQueue = this.effect((queue$: Observable<SubscriptionMessage[]>) =>
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
	 *
	 * @param eventType
	 * @returns
	 */
	subscribeToEventType<T extends SubscriptionEvent>(eventType: EventType): Observable<T> {
		return this.setUpSubscription<T>(eventType).pipe(
			filter((msg) => {
				return msg.eventType === eventType;
			}),
		);
	}

	/**
	 *
	 * @param eventType
	 * @returns
	 */
	private setUpSubscription<T extends SubscriptionEvent>(eventType: EventType): Observable<T> {
		const msg = {
			eventType,
			isSubscribe: true,
		} as SubscriptionMessage;

		// Send a message to the server to subscribe to the notification.
		this.queueSubscribeUnsubscribeMessage(msg);

		return this.messages$.pipe(
			map((msg) => msg as T),
			tap((msg) => {
				DEBUG_MODE && console.log('received notification', msg);
			}),
			filter((msg) => {
				return msg.eventType === eventType;
			}),
			finalize(() => {
				// Caller has unsubscribed from the stream, so send the message to the server to unsubscribe from the event.
				const unsubscribeMessage: SubscriptionMessage = {
					...msg,
					isSubscribe: false,
				};
				this.queueSubscribeUnsubscribeMessage(unsubscribeMessage);
			}),
		);
	}
}
