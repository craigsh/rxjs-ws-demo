import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { SocketStatsStore } from '@rxjs-ws-demo/web-sockets';
import { StatusValueComponent } from './status-value.component';

@Component({
	selector: 'mu-connection-status',
	standalone: true,
	imports: [CommonModule, MatCardModule, StatusValueComponent],
	template: `
		<ng-container *ngIf="socketStats.vm$ | async as vm">
			<mat-card>
				<mat-card-header>
					<mat-card-title>Connection Status</mat-card-title>
				</mat-card-header>
				<mat-card-content>
					<mu-status-value name="Connected" [value]="vm.isConnected ? 'Yes' : 'No'"></mu-status-value>
					<mu-status-value name="Subscription count" [value]="vm.subscriptionCount"></mu-status-value>
					<mu-status-value name="Times connected" [value]="vm.connections"></mu-status-value>
					<mu-status-value name="Retries" [value]="vm.reconnectionTries"></mu-status-value>
					<mu-status-value name="Messages count" [value]="vm.messagesReceived"></mu-status-value>
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
