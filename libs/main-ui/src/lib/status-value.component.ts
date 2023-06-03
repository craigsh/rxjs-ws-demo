import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'mu-status-value',
	standalone: true,
	imports: [CommonModule],
	template: `
		<span class="name">{{ name }}</span>
		<span class="value">{{ value }}</span>
	`,
	styles: [
		`
			:host {
				display: flex;
				align-items: center;
				gap: 8px;

				padding: 8px 0;

				.name {
					width: 200px;
					opacity: 0.8;
				}
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusValueComponent {
	@Input() name?: string;
	@Input() value?: unknown;
}
