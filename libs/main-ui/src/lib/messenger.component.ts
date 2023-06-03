import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { StatusValueComponent } from './status-value.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ComponentStore } from '@ngrx/component-store';
import { SocketService } from '@rxjs-ws-demo/web-sockets';
import { Observable, switchMap, tap, withLatestFrom } from 'rxjs';
import { MatInputModule } from '@angular/material/input';

type MessengerState = {
	messages: string[];
};

const MAX_MESSAGES = 100;

@Component({
	selector: 'mu-messenger',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		MatButtonModule,
		MatCardModule,
		MatFormFieldModule,
		MatIconModule,
		StatusValueComponent,
		MatInputModule,
	],
	template: `
		<ng-container *ngIf="vm$ | async as vm">
			<mat-card>
				<mat-card-header>
					<mat-card-title>Messenger</mat-card-title>
					<button id="close-button" mat-icon-button (click)="closed.emit()">
						<mat-icon>close</mat-icon>
					</button>
				</mat-card-header>
				<mat-card-content class="content">
					<div class="sender">
						<h2>Sender</h2>

						<form class="message-form">
							<mat-form-field class="example-full-width">
								<mat-label>Message</mat-label>
								<input matInput placeholder="Send a message" #message />
							</mat-form-field>

							<button
								mat-raised-button
								color="primary"
								[disabled]="!message.value"
								(click)="sendMessage(message.value); message.value = ''"
							>
								Send
							</button>
						</form>
					</div>
					<div class="receiver">
						<h2>Receiver</h2>

						<div *ngIf="vm.messages.length; else noMessages">
							<div class="message" *ngFor="let msg of vm.messages">
								{{ msg }}
							</div>
						</div>

						<ng-template #noMessages>
							<div class="no-messages">No messages yet...</div>
						</ng-template>
					</div>
				</mat-card-content>
			</mat-card>
		</ng-container>
	`,
	styles: [
		`
			:host {
				display: block;

				mat-card-content {
					display: flex;
					gap: 8px;

					> div {
						flex: 1;
					}
				}
			}

			button#close-button {
				position: absolute;
				right: 0;
				top: 0;
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessengerComponent extends ComponentStore<MessengerState> {
	protected socketService = inject(SocketService);

	@Output() closed = new EventEmitter();

	readonly messages$ = this.select(({ messages }) => messages);

	readonly vm$ = this.select({ messages: this.messages$ });

	readonly listenForMessages = this.effect((trigger$) =>
		trigger$.pipe(
			switchMap(() =>
				this.socketService.subscribeToEventType('message').pipe(
					withLatestFrom(this.messages$),
					tap(([message, messages]) => {
						const txt = message.body as string;
						this.patchState({ messages: [...messages, txt].slice(-MAX_MESSAGES) });
					}),
				),
			),
		),
	);

	readonly sendMessage = this.effect((message$: Observable<string>) =>
		message$.pipe(
			tap((message) => {
				console.log('Sending message', message);
			}),
		),
	);

	constructor() {
		super({
			messages: [],
		});
	}
}
