import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
	selector: 'mu-demo',
	standalone: true,
	imports: [CommonModule, MatToolbarModule],
	template: `
		<mat-toolbar color="primary">Rxjs Web Sockets Demo </mat-toolbar>
		<div class="wrapper">
			<h1>Powered by Angular and NestJS</h1>
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
export class DemoComponent {}
