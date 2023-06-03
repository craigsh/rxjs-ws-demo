import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Observable, switchMap, withLatestFrom } from 'rxjs';
import { Message } from '@rxjs-ws-demo/api-interfaces';
import { generateUUID } from '@rxjs-ws-demo/utils';

type MessageServiceState = {
	messageCount: number;
	clientId: string;
};

@Injectable({
	providedIn: 'root',
})
export class MessageService extends ComponentStore<MessageServiceState> {
	private http = inject(HttpClient);

	readonly clientId$ = this.select(({ clientId }) => clientId);

	readonly sendMessage = this.effect((message$: Observable<string>) =>
		message$.pipe(
			withLatestFrom(this.clientId$),
			switchMap(([message, clientId]) => {
				const msg: Message = {
					message,
					sentAt: new Date(),
					clientId,
				};
				return this.http.post('/api/message', msg);
			}),
		),
	);

	constructor() {
		super({
			messageCount: 0,
			clientId: generateUUID(),
		});
	}
}
