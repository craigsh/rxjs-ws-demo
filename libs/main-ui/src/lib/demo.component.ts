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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';

interface DemoState {
	showingConnectionStatus: boolean;
	showingConnectionWatcher: boolean;
}

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
		MatSlideToggleModule,
		FormsModule,
	],
	template: `
		<mat-toolbar color="primary">RxJs Web Sockets Demo </mat-toolbar>
		<ng-container *ngIf="vm$ | async as vm">
			<div class="wrapper">
				<h1>Powered by Angular and NestJS</h1>

				<div>Message: {{ hello$ | async | json }}</div>

				<div class="buttons">
					<button mat-raised-button (click)="subscribe()">Subscribe</button>
					<button mat-raised-button (click)="subscribeConnects()">Subscribe connects</button>
					<button mat-raised-button (click)="endSub.next()">Unsubscribe</button>
					<button mat-raised-button (click)="postMessage()">Post message</button>

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
				</div>
			</div>
		</ng-container>
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
export class DemoComponent extends ComponentStore<DemoState> {
	private http = inject(HttpClient);
	protected socketService = inject(SocketService);
	private socketStats = inject(SocketStatsStore);
	private snackBar = inject(MatSnackBar);

	readonly endSub = new Subject<void>();
	private readonly endSub$ = this.endSub.asObservable();

	readonly showingConnectionStatus$ = this.select(({ showingConnectionStatus }) => showingConnectionStatus);
	readonly showingConnectionWatcher$ = this.select(({ showingConnectionWatcher }) => showingConnectionWatcher);

	readonly vm$ = this.select({
		showingConnectionStatus: this.showingConnectionStatus$,
		showingConnectionWatcher: this.showingConnectionWatcher$,
	});

	hello$ = this.http.get<Message>('/api/hello');

	constructor() {
		super({
			showingConnectionStatus: true,
			showingConnectionWatcher: true,
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
