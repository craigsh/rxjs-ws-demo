import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ComponentStore } from '@ngrx/component-store';
import { SocketService, SocketStatsStore } from '@rxjs-ws-demo/web-sockets';
import { Observable, skip, tap } from 'rxjs';
import { ClientConnectionWatcherComponent } from './client-connection-watcher.component';
import { ConnectionStatusComponent } from './connection-status.component';
import { MessengerComponent } from './messenger.component';

interface DemoState {
	showingConnectionStatus: boolean;
	showingConnectionWatcher: boolean;
	showingMessenger: boolean;
}

@Component({
	selector: 'mu-demo',
	standalone: true,
	imports: [
		ClientConnectionWatcherComponent,
		CommonModule,
		ConnectionStatusComponent,
		FormsModule,
		MatButtonModule,
		MatSlideToggleModule,
		MatSnackBarModule,
		MatToolbarModule,
		MessengerComponent,
	],
	template: `
		<mat-toolbar color="primary">
			<div class="content">
				<div class="title">RxJS Web Sockets Demo</div>
				<h1>Powered by Angular, RxJS, and NestJS</h1>
			</div>
		</mat-toolbar>

		<ng-container *ngIf="vm$ | async as vm">
			<div class="wrapper">
				<div class="header">
					<h1>A demo web-sockets application</h1>
					<button mat-raised-button (click)="disconnect()">Disconnect!</button>
				</div>

				<div class="toggles">
					<mat-slide-toggle [ngModel]="vm.showingMessenger" (change)="setShowingMessenger($event.checked)"
						>Show messenger</mat-slide-toggle
					>
					<mat-slide-toggle
						[ngModel]="vm.showingConnectionStatus"
						(change)="setShowingConnectionStatus($event.checked)"
						>Show connection status</mat-slide-toggle
					>
					<mat-slide-toggle
						[ngModel]="vm.showingConnectionWatcher"
						(change)="setShowingConnectionWatcher($event.checked)"
						>Show connection watcher</mat-slide-toggle
					>
				</div>

				<div class="panels">
					<mu-connection-status
						*ngIf="vm.showingConnectionStatus"
						(closed)="setShowingConnectionStatus(false)"
					/>

					<mu-client-connection-watcher
						*ngIf="vm.showingConnectionWatcher"
						(closed)="setShowingConnectionWatcher(false)"
					/>

					<mu-messenger *ngIf="vm.showingMessenger" (closed)="setShowingMessenger(false)" />
				</div>
			</div>
		</ng-container>
	`,
	styles: [
		`
			:host {
				display: block;
				height: 100%;

				mat-toolbar {
					.content {
						width: 100%;
						display: flex;
						align-items: center;

						.title {
							flex: 1;
						}

						h1 {
							justify-self: flex-end;
						}
					}
				}

				.wrapper {
					padding: 12px;

					.header {
						border: 1px solid #ccc;
						background-color: #eee;
						border-radius: 8px;
						padding: 8px;

						h1 {
							margin: 8px;
							font-size: 1.5rem;
						}

						margin-bottom: 8px;
					}
				}

				.toggles {
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
export class DemoComponent extends ComponentStore<DemoState> {
	private http = inject(HttpClient);
	protected socketService = inject(SocketService);
	private socketStats = inject(SocketStatsStore);
	private snackBar = inject(MatSnackBar);

	readonly showingConnectionStatus$ = this.select(({ showingConnectionStatus }) => showingConnectionStatus);
	readonly showingConnectionWatcher$ = this.select(({ showingConnectionWatcher }) => showingConnectionWatcher);
	readonly showingMessenger$ = this.select(({ showingMessenger }) => showingMessenger);

	readonly vm$ = this.select({
		showingConnectionStatus: this.showingConnectionStatus$,
		showingConnectionWatcher: this.showingConnectionWatcher$,
		showingMessenger: this.showingMessenger$,
	});

	constructor() {
		super({
			showingConnectionStatus: true,
			showingConnectionWatcher: true,
			showingMessenger: true,
		});

		this.watchConnectedChanged(this.socketStats.isConnected$);
	}

	readonly setShowingConnectionStatus = this.effect((showing$: Observable<boolean>) =>
		showing$.pipe(
			tap((showing) => {
				this.patchState({ showingConnectionStatus: showing });
			}),
		),
	);

	readonly setShowingConnectionWatcher = this.effect((showing$: Observable<boolean>) =>
		showing$.pipe(
			tap((showing) => {
				this.patchState({ showingConnectionWatcher: showing });
			}),
		),
	);

	readonly setShowingMessenger = this.effect((showing$: Observable<boolean>) =>
		showing$.pipe(
			tap((showing) => {
				this.patchState({ showingMessenger: showing });
			}),
		),
	);

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

	readonly disconnect = this.effect((trigger$) =>
		trigger$.pipe(
			tap(() => {
				this.socketService.disconnect();
			}),
		),
	);
}
