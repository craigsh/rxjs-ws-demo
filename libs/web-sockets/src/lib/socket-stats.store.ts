import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Observable, tap, withLatestFrom } from 'rxjs';

interface SocketStatsState {
	isConnected: boolean;
	subscriptionCount: number;
	connections: number;
	reconnectionTries: number;
	messagesReceived: number;
}

@Injectable({
	providedIn: 'root',
})
export class SocketStatsStore extends ComponentStore<SocketStatsState> {
	readonly isConnected$ = this.select(({ isConnected }) => isConnected);
	readonly subscriptionCount$ = this.select(({ subscriptionCount }) => subscriptionCount);
	readonly connections$ = this.select(({ connections }) => connections);
	readonly reconnectionTries$ = this.select(({ reconnectionTries }) => reconnectionTries);
	readonly messagesReceived$ = this.select(({ messagesReceived }) => messagesReceived);

	readonly vm$ = this.select({
		isConnected: this.isConnected$,
		subscriptionCount: this.subscriptionCount$,
		connections: this.connections$,
		reconnectionTries: this.reconnectionTries$,
		messagesReceived: this.messagesReceived$,
	});

	get reconnectionTries() {
		return this.get().reconnectionTries;
	}

	readonly setConnected = this.effect((isConnected$: Observable<boolean>) =>
		isConnected$.pipe(
			tap((isConnected) => {
				this.patchState({ isConnected });
			}),
		),
	);

	readonly bumpConnections = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.connections$),
			tap(([, connections]) => {
				this.patchState({ connections: connections + 1 });
			}),
		),
	);

	readonly bumpConnectionRetries = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.reconnectionTries$),
			tap(([, reconnectionTries]) => {
				this.patchState({ reconnectionTries: reconnectionTries + 1 });
			}),
		),
	);

	readonly bumpMessagesReceived = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.messagesReceived$),
			tap(([, messagesReceived]) => {
				this.patchState({ messagesReceived: messagesReceived + 1 });
			}),
		),
	);

	readonly bumpSubscriptionCount = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.subscriptionCount$),
			tap(([, subscriptionCount]) => {
				this.patchState({ subscriptionCount: subscriptionCount + 1 });
			}),
		),
	);

	readonly dropSubscriptionCount = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.subscriptionCount$),
			tap(([, subscriptionCount]) => {
				this.patchState({ subscriptionCount: subscriptionCount - 1 });
			}),
		),
	);

	constructor() {
		super({
			isConnected: false,
			subscriptionCount: 0,
			connections: 0,
			reconnectionTries: 0,
			messagesReceived: 0,
		});
	}
}
