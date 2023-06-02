import { Inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
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
import { assertDefined } from '@rxjs-ws-demo/utils';
import { DOCUMENT } from '@angular/common';
import { AppStateStore } from './app.state';
import { GenericWsMessage, SubscriptionEvent, SubscriptionMessage } from '@rxjs-ws-demo/api-interfaces';

const RETRY_SECONDS = 5;
const MAX_RETRIES = 30;
const DEBUG_MODE = true;

interface SocketState {
	baseUri: string;
	wsSubjectConfig?: WebSocketSubjectConfig<GenericWsMessage>;
	subscribeUnsubscribeMessages: SubscriptionMessage[];
	isConnected: boolean;
	socket?: WebSocketSubject<GenericWsMessage>;
	subscriptionCount: number;
	connections: number;
	reconnectionTries: number;
	messagesReceived: number;
}

@Injectable({
	providedIn: 'root',
})
export class SocketService extends ComponentStore<SocketState> {
	readonly isConnected$ = this.select(({ isConnected }) => isConnected);
	readonly subscriptionCount$ = this.select(({ subscriptionCount }) => subscriptionCount);
	readonly connections$ = this.select(({ connections }) => connections);
	readonly reconnectionTries$ = this.select(({ reconnectionTries }) => reconnectionTries);
	readonly messagesReceived$ = this.select(({ messagesReceived }) => messagesReceived);

	private messagesSubject = new Subject<unknown>();
	private messages$ = this.messagesSubject.asObservable();

	private readonly baseUri$ = this.select(({ baseUri }) => baseUri);
	private readonly wsSubjectConfig$ = this.select(({ wsSubjectConfig }) => wsSubjectConfig);

	private readonly subscribeUnsubscribeMessages$ = this.select(
		({ subscribeUnsubscribeMessages }) => subscribeUnsubscribeMessages,
	);
	private readonly socket$ = this.select(({ socket }) => socket);

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
			withLatestFrom(this.baseUri$, this.connections$),
			tap(([, baseUri, connections]) => {
				const url = baseUri.replace(/^http/, 'ws') + 'ws';

				if (DEBUG_MODE) {
					console.log('Web socket url', url);
				}
				const config: WebSocketSubjectConfig<GenericWsMessage> = {
					url,
					closeObserver: {
						next: (event) => {
							DEBUG_MODE && console.log('closeObserver', event);
							this.patchState({ isConnected: false });
							this.tryReconnect();
						},
					},
					openObserver: {
						next: (event) => {
							DEBUG_MODE && console.log('openObserver', event);
							connections++;
							this.patchState({ isConnected: true, connections });
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
			withLatestFrom(this.wsSubjectConfig$, this.messagesReceived$),
			switchMap(([, config, messagesReceived]) => {
				assertDefined(config);

				// Create a new socket, and listen for messages, pushing them into the messagesSubject.
				const socket = new WebSocketSubject(config);
				this.patchState({ socket });
				return socket.pipe(
					tap((msg) => {
						messagesReceived++;
						this.patchState({ messagesReceived });

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
	 * Handles attempting to reconnect to the websocket until connected or the max retries have been reached.
	 */
	private readonly tryReconnect = this.effect((trigger$) =>
		trigger$.pipe(
			exhaustMap(() => {
				return timer(RETRY_SECONDS * 1000).pipe(
					withLatestFrom(this.isConnected$, this.reconnectionTries$),
					takeWhile(([, isConnected, reconnectionTries], index) => {
						if (!isConnected) {
							reconnectionTries++;
							this.patchState({ reconnectionTries });

							DEBUG_MODE && console.log('Attempting re-connect to websocket - try #' + reconnectionTries);
						}

						return !isConnected && index < MAX_RETRIES;
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
	 * Adds a message to the queue to send to Jade to subscribe or unsubscribe to/from a notification.
	 */
	private readonly queueSubscribeUnsubscribeMessage = this.effect((msg$: Observable<SubscriptionMessage>) =>
		msg$.pipe(
			withLatestFrom(this.subscribeUnsubscribeMessages$, this.subscriptionCount$),
			tap(([msg, queue, subscriptionCount]) => {
				if (msg.isSubscribe) {
					subscriptionCount++;
				} else {
					subscriptionCount--;
				}

				this.patchState({ subscribeUnsubscribeMessages: [...queue, msg], subscriptionCount });
			}),
		),
	);

	/**
	 * Adds a message to the queue to send to Jade to subscribe or unsubscribe to/from a notification.
	 */
	private readonly queueSubscribeMessage = this.effect((msg$: Observable<SubscriptionMessage>) =>
		msg$.pipe(
			withLatestFrom(this.subscribeUnsubscribeMessages$, this.subscriptionCount$),
			tap(([msg, queue, subscriptionCount]) => {
				if (msg.isSubscribe) {
					subscriptionCount++;
				} else {
					subscriptionCount--;
				}

				this.patchState({ subscribeUnsubscribeMessages: [...queue, msg], subscriptionCount });
			}),
		),
	);

	constructor(@Inject(DOCUMENT) document: Document, private appState: AppStateStore) {
		super({
			baseUri: document.baseURI,
			subscribeUnsubscribeMessages: [],
			isConnected: false,
			subscriptionCount: 0,
			connections: 0,
			reconnectionTries: 0,
			messagesReceived: 0,
		});

		this.setUpWebSocketSubjectConfig();
		this.connect();
		this.watchQueue(this.toSend$);
	}

	subscribeToEventType<T extends SubscriptionEvent>(eventType: string): Observable<T> {
		return this.setUpSubscription<T>(eventType).pipe(
			filter((msg) => {
				return msg.eventType === eventType;
			}),
		);
	}

	private setUpSubscription<T extends SubscriptionEvent>(eventType: string): Observable<T> {
		const msg = {
			eventType,
			isSubscribe: true,
		} as SubscriptionMessage;

		// Send a message to Jade to subscribe to the notification.
		this.queueSubscribeMessage(msg);

		return this.messages$.pipe(
			map((msg) => msg as T),
			tap((msg) => {
				DEBUG_MODE && console.log('received notification', msg);
			}),
			filter((msg) => {
				return msg.eventType === eventType;
			}),
			finalize(() => {
				// Caller has unsubscribed from the stream, so send the message to the server  to unsubscribe from the event.
				const unsubscribeMessage: SubscriptionMessage = {
					...msg,
					isSubscribe: false,
				};
				this.queueSubscribeUnsubscribeMessage(unsubscribeMessage);
			}),
		);
	}

	// /**
	//  * Begins a Jade class notification, returning an Observable of the type.
	//  * @param jadeClassName The Jade class name
	//  * @param eventType The Jade event type number to subscribe to
	//  * @param ignoreSelf Whether to ignore messages from the current session
	//  * @returns
	//  */
	// beginClassNotification<T extends NotificationJsonModel = NotificationJsonModel>(
	// 	jadeClassName: string,
	// 	eventType: number,
	// 	ignoreSelf = false,
	// ): Observable<T> {
	// 	return this.setUpNotification<T>({ jadeClassName, eventType }).pipe(
	// 		filter((msg) => {
	// 			if (ignoreSelf && msg.note_causer_sessionId === this.appState.sessionId) {
	// 				return false;
	// 			}

	// 			return true;
	// 		}),
	// 	);
	// }

	// /**
	//  * Begins a Jade session notification, returning an Observable of the type.
	//  * @param eventType The Jade event type number to subscribe to
	//  * @returns
	//  */
	// beginSessionNotification<T extends NotificationJsonModel = NotificationJsonModel>(
	// 	eventType: number,
	// ): Observable<T> {
	// 	return this.setUpNotification({ eventType, session: true });
	// }

	// /**
	//  * Sets up the notification in Jade, and returns an Observable of messages of the type.
	//  * @param opts
	//  * @returns
	//  */
	// private setUpNotification<T extends NotificationJsonModel = NotificationJsonModel>(opts: {
	// 	jadeClassName?: string;
	// 	eventType: number;
	// 	session?: boolean;
	// }) {
	// 	opts.jadeClassName ||= '';
	// 	opts.session ||= false;

	// 	const sessionOid = opts.session ? this.appState.sessionId : '';

	// 	const msg = {
	// 		// $type: Types.WebSocketSubscriptionMsg,
	// 		className: opts.jadeClassName,
	// 		eventType: opts.eventType,
	// 		session: opts.session,
	// 		oid: sessionOid,
	// 		beginSub: true,
	// 	} as WebSocketSubscriptionMsg;

	// 	// Send a message to Jade to subscribe to the notification.
	// 	this.queueSubscribeUnsubscribeMessage(msg);

	// 	return this.messages$.pipe(
	// 		map((msg) => msg as T),
	// 		tap((msg) => {
	// 			DEBUG_MODE && console.log('received notification', msg);
	// 		}),
	// 		filter((msg) => {
	// 			if (opts.session) {
	// 				return msg.note_eventType === opts.eventType && msg.note_typeName === 'ApiSession';
	// 			}
	// 			return msg.note_typeName === opts.jadeClassName && msg.note_eventType === opts.eventType;
	// 		}),
	// 		finalize(() => {
	// 			// Caller has unsubscribed from the stream, so send the message to Jade to unsubscribe from the notification.
	// 			const unsubscribeMessage = {
	// 				...msg,
	// 				beginSub: false,
	// 			};
	// 			this.queueSubscribeUnsubscribeMessage(unsubscribeMessage);
	// 		}),
	// 	);
	// }
}
