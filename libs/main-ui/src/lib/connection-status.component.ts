import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { SocketStatsStore } from '@rxjs-ws-demo/web-sockets';

@Component({
	selector: 'mu-connection-status',
	standalone: true,
	imports: [CommonModule, MatCardModule],
	template: `
		<ng-container *ngIf="socketStats.vm$ | async as vm">
			<mat-card>
				<mat-card-title>Connection Status</mat-card-title>
				<mat-card-content>
					<div>Connected: {{ vm.isConnected }}</div>
					<div>Subscription count: {{ vm.subscriptionCount }}</div>
					<div>Times connected: {{ vm.connections }}</div>
					<div>Retries: {{ vm.reconnectionTries }}</div>
					<div>Messages count: {{ vm.messagesReceived }}</div>
				</mat-card-content>
			</mat-card>
		</ng-container>
	`,
	styles: [
		`
			:host {
				display: block;
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusComponent {
	protected socketStats = inject(SocketStatsStore);
}
