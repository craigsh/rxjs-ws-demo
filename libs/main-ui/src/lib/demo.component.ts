import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ComponentStore } from '@ngrx/component-store';
import { Message } from '@rxjs-ws-demo/api-interfaces';
import { SocketService, SocketStatsStore } from '@rxjs-ws-demo/web-sockets';
import { Observable, Subject, skip, switchMap, takeUntil, tap } from 'rxjs';
import { ConnectionStatusComponent } from './connection-status.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClientConnectionWatcherComponent } from './client-connection-watcher.component';

export type NoState = Record<string, never>;

@Component({
	selector: 'mu-demo',
	standalone: true,
	imports: [
		CommonModule,
		MatToolbarModule,
		MatButtonModule,
		ConnectionStatusComponent,
		MatSnackBarModule,
		ClientConnectionWatcherComponent,
	],
	template: `
		<mat-toolbar color="primary">RxJs Web Sockets Demo </mat-toolbar>
		<div class="wrapper">
			<h1>Powered by Angular and NestJS</h1>

			<div>Message: {{ hello$ | async | json }}</div>

			<div class="buttons">
				<button mat-raised-button (click)="subscribe()">Subscribe</button>
				<button mat-raised-button (click)="subscribeConnects()">Subscribe connects</button>
				<button mat-raised-button (click)="endSub.next()">Unsubscribe</button>
				<button mat-raised-button (click)="postMessage()">Post message</button>
			</div>

			<div class="panels">
				<mu-connection-status></mu-connection-status>

				<mu-client-connection-watcher></mu-client-connection-watcher>
			</div>
		</div>
	`,
	styles: [
		`
			:host {
				display: block;
				height: 100%;

				.wrapper {
					padding: 12px;
				}

				.buttons {
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 8px;
				}

				.panels {
					display: flex;
					flex-direction: column;
					gap: 12px;
				}
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoComponent extends ComponentStore<NoState> {
	private http = inject(HttpClient);
	protected socketService = inject(SocketService);
	private socketStats = inject(SocketStatsStore);
	private snackBar = inject(MatSnackBar);

	readonly endSub = new Subject<void>();
	private readonly endSub$ = this.endSub.asObservable();

	hello$ = this.http.get<Message>('/api/hello');

	constructor() {
		super({});

		this.watchConnectedChanged(this.socketStats.isConnected$);
	}

	readonly watchConnectedChanged = this.effect((isConnected$: Observable<boolean>) =>
		isConnected$.pipe(
			skip(1),
			tap((isConnected) => {
				this.snackBar.open('Web socket ' + (isConnected ? 'connected' : 'disconnected'), undefined, {
					duration: 2000,
				});
			}),
		),
	);

	readonly subscribe = this.effect((trigger$) =>
		trigger$.pipe(
			switchMap(() => {
				return this.socketService.subscribeToEventType('message').pipe(
					takeUntil(this.endSub$),
					tap((data) => {
						console.log('data - via WS event', data);
					}),
				);
			}),
		),
	);

	readonly subscribeConnects = this.effect((trigger$) =>
		trigger$.pipe(
			switchMap(() => {
				return this.socketService.subscribeToEventType('connect').pipe(
					takeUntil(this.endSub$),
					tap((data) => {
						console.log('connect event', data);
					}),
				);
			}),
		),
	);

	readonly postMessage = this.effect((trigger$) =>
		trigger$.pipe(
			switchMap(() => {
				return this.http.post('/api/message', {
					message: 'Hello from Angular',
				});
			}),
		),
	);
}
