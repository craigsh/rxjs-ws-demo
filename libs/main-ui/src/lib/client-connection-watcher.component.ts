import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'mu-client-connection-watcher',
	standalone: true,
	imports: [CommonModule],
	template: `<p>client-connection-watcher works!</p>`,
	styles: [
		`
			:host {
				display: block;
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientConnectionWatcherComponent {}
