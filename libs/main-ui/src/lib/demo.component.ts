import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { Message } from '@rxjs-ws-demo/api-interfaces';
import { SocketService } from '@rxjs-ws-demo/web-sockets';
import { mergeMap, switchMap, tap } from 'rxjs';
import { ComponentStore } from '@ngrx/component-store';

export type NoState = Record<string, never>;

@Component({
	selector: 'mu-demo',
	standalone: true,
	imports: [CommonModule, MatToolbarModule, MatButtonModule],
	template: `
		<mat-toolbar color="primary">RxJs Web Sockets Demo </mat-toolbar>
		<div class="wrapper">
			<h1>Powered by Angular and NestJS</h1>

			<div>Message: {{ hello$ | async | json }}</div>

			<button mat-raised-button (click)="subscribe()">Subscribe</button>
			<button mat-raised-button>Unsubscribe</button>
			<button mat-raised-button (click)="postMessage()">Post message</button>
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

	hello$ = this.http.get<Message>('/api/hello');

	readonly subscribe = this.effect((trigger$) =>
		trigger$.pipe(
			mergeMap(() => {
				return this.socketService.subscribeToEventType('message').pipe(
					tap((data) => {
						console.log('data - via WS event', data);
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
