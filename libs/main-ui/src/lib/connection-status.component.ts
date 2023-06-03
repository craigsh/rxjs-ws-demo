import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { SocketStatsStore } from '@rxjs-ws-demo/web-sockets';
import { StatusValueComponent } from './status-value.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
	selector: 'mu-connection-status',
	standalone: true,
	imports: [CommonModule, MatCardModule, StatusValueComponent, MatButtonModule, MatIconModule],
	template: `
		<ng-container *ngIf="socketStats.vm$ | async as vm">
			<mat-card>
				<mat-card-header>
					<mat-card-title>Connection Status</mat-card-title>
					<button mat-icon-button (click)="closed.emit()"><mat-icon>close</mat-icon></button>
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

			button {
				position: absolute;
				right: 0;
				top: 0;
			}
		`,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusComponent {
	@Output() closed = new EventEmitter();

	protected socketStats = inject(SocketStatsStore);
}
