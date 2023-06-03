import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'mu-messenger',
	standalone: true,
	imports: [CommonModule],
	template: `<p>messenger works!</p>`,
	styles: [
		`
			:host {
				display: block;
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessengerComponent {}
