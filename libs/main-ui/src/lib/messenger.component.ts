import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ComponentStore } from '@ngrx/component-store';
import { Message, SubscriptionEvent } from '@rxjs-ws-demo/api-interfaces';
import { MessageService } from '@rxjs-ws-demo/rest';
import { SocketService } from '@rxjs-ws-demo/web-sockets';
import { Observable, switchMap, tap, withLatestFrom } from 'rxjs';
import { StatusValueComponent } from './status-value.component';
import { MessageDisplayComponent } from './message-display.component';

type MessengerState = {
	messages: Message[];
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
		MatInputModule,
		MessageDisplayComponent,
		StatusValueComponent,
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
							<mat-form-field style="flex: 1;">
								<mat-label>Message</mat-label>
								<input matInput placeholder="Send a message" #message />
							</mat-form-field>

							<button
								mat-raised-button
								color="primary"
								[disabled]="!message.value || !vm.isConnected"
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
								<mu-message-display [message]="msg" [thisClientId]="vm.myClientId" />
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

					form.message-form {
						width: 100%;
						display: flex;
						align-items: baseline;
						gap: 8px;
					}

					h2 {
						margin: 0;
						margin-bottom: 8px;

						font-size: 1rem;
						font-weight: 500;
					}

					.no-messages {
						font-size: 0.8rem;
						opacity: 0.8;
					}
				}

				button#close-button {
					position: absolute;
					right: 0;
					top: 0;
				}
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessengerComponent extends ComponentStore<MessengerState> {
	protected socketService = inject(SocketService);
	private messageService = inject(MessageService);

	@Output() closed = new EventEmitter();

	readonly messages$ = this.select(({ messages }) => messages);

	readonly vm$ = this.select({
		myClientId: this.messageService.clientId$,
		messages: this.messages$,
		isConnected: this.socketService.isConnected$,
	});

	readonly listenForMessages = this.effect((trigger$) =>
		trigger$.pipe(
			switchMap(() =>
				this.socketService.listen<SubscriptionEvent<Message>>('message').pipe(
					withLatestFrom(this.messages$),
					tap(([message, messages]) => {
						this.patchState({ messages: [...messages, message.body].slice(-MAX_MESSAGES) });
					}),
				),
			),
		),
	);

	readonly sendMessage = this.effect((message$: Observable<string>) =>
		message$.pipe(
			tap((message) => {
				this.messageService.sendMessage(message);
			}),
		),
	);

	constructor() {
		super({
			messages: [],
		});

		// Set up subscription immediately.
		this.listenForMessages();

		// Resubscribe whenever the socket reconnects
		this.listenForMessages(this.socketService.connected$);
	}
}
