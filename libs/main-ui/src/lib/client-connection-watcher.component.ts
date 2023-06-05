import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ComponentStore } from '@ngrx/component-store';
import { SubscriptionEvent } from '@rxjs-ws-demo/api-interfaces';
import { SocketService } from '@rxjs-ws-demo/web-sockets';
import { switchMap, tap, withLatestFrom } from 'rxjs';

interface ClientConnectionState {
	connectionMessages: string[];
}

const MAX_MESSAGES = 4;

@Component({
	selector: 'mu-client-connection-watcher',
	standalone: true,
	imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
	template: `
		<ng-container *ngIf="vm$ | async as vm">
			<mat-card>
				<mat-card-header>
					<mat-card-title>Client connection events (other clients - last {{ MAX_MESSAGES }})</mat-card-title>
					<button mat-icon-button (click)="closed.emit()"><mat-icon>close</mat-icon></button>
				</mat-card-header>
				<mat-card-content>
					<div *ngIf="vm.connectionMessages.length; else noConnections">
						<div class="message" *ngFor="let msg of vm.connectionMessages">
							{{ msg }}
						</div>
					</div>

					<ng-template #noConnections>
						<div class="no-connections">No connections logged...</div>
					</ng-template>
				</mat-card-content>
			</mat-card>
		</ng-container>
	`,
	styles: [
		`
			:host {
				display: block;

				button {
					position: absolute;
					right: 0;
					top: 0;
				}

				.no-connections {
					color: #999;
					font-size: 0.8rem;
				}

				.message {
					padding: 8px 0;
				}
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientConnectionWatcherComponent extends ComponentStore<ClientConnectionState> {
	@Output() closed = new EventEmitter();

	private socket = inject(SocketService);

	readonly MAX_MESSAGES = MAX_MESSAGES;
	readonly connectionMessages$ = this.select(({ connectionMessages }) => connectionMessages);

	readonly vm$ = this.select({ connectionMessages: this.connectionMessages$ });

	constructor() {
		super({ connectionMessages: [] });

		// Immediately Subscribe to connect and disconnect events from the server
		this.watchClientConnections();

		// Re-subscribe to connect and disconnect events from the server when the socket reconnects
		this.watchClientConnections(this.socket.connected$);
	}

	private readonly watchClientConnections = this.effect((trigger$) =>
		trigger$.pipe(
			switchMap(() =>
				this.socket.listen<SubscriptionEvent>(['connect', 'disconnect']).pipe(
					withLatestFrom(this.connectionMessages$),
					tap(([event, connectionMessages]) => {
						const connectionMessage = `Client ${
							event.eventType === 'connect' ? 'connected' : 'disconnected'
						} - at ${new Date().toISOString()}`;

						this.patchState({
							connectionMessages: [...connectionMessages, connectionMessage],
						});

						this.trim();
					}),
				),
			),
		),
	);

	private readonly trim = this.effect((trigger$) =>
		trigger$.pipe(
			withLatestFrom(this.connectionMessages$),
			tap(([, connectionMessages]) => {
				if (connectionMessages.length > MAX_MESSAGES) {
					this.patchState({
						connectionMessages: connectionMessages.slice(1),
					});
				}
			}),
		),
	);
}
