import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ComponentStore } from '@ngrx/component-store';
import { Message } from '@rxjs-ws-demo/api-interfaces';
import { SocketService } from '@rxjs-ws-demo/web-sockets';
import { Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ConnectionStatusComponent } from './connection-status.component';

export type NoState = Record<string, never>;

@Component({
	selector: 'mu-demo',
	standalone: true,
	imports: [CommonModule, MatToolbarModule, MatButtonModule, ConnectionStatusComponent],
	template: `
		<mat-toolbar color="primary">RxJs Web Sockets Demo </mat-toolbar>
		<div class="wrapper">
			<h1>Powered by Angular and NestJS</h1>

			<div>Message: {{ hello$ | async | json }}</div>

			<button mat-raised-button (click)="subscribe()">Subscribe</button>
			<button mat-raised-button (click)="subscribeConnects()">Subscribe connects</button>
			<button mat-raised-button (click)="endSub.next()">Unsubscribe</button>
			<button mat-raised-button (click)="postMessage()">Post message</button>

			<mu-connection-status></mu-connection-status>
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
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoComponent extends ComponentStore<NoState> {
	private http = inject(HttpClient);
	protected socketService = inject(SocketService);

	readonly endSub = new Subject<void>();
	private readonly endSub$ = this.endSub.asObservable();

	hello$ = this.http.get<Message>('/api/hello');

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
