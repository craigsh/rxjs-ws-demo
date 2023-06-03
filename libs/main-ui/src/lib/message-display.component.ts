import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Message } from '@rxjs-ws-demo/api-interfaces';

@Component({
	selector: 'mu-message-display',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="message" [class.is-me]="message.clientId === thisClientId">
			<span>{{ message.clientId === thisClientId ? '➡️' : '⬅️' }}</span>
			<span class="sent">{{ message.sentAt }}</span>
			<span class="message">{{ message.message }}</span>
		</div>
	`,
	styles: [
		`
			:host {
				.message {
					display: flex;
					align-items: center;

					.sent {
						display: inline-block;
						padding-right: 12px;
					}

					&.is-me {
						color: #999;
						font-style: italic;
					}
				}
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageDisplayComponent {
	@Input() message!: Message;
	@Input() thisClientId!: string;
}
