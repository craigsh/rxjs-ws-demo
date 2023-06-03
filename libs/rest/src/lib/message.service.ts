import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Observable, switchMap } from 'rxjs';

type MessageServiceState = {
	messageCount: number;
};

@Injectable({
	providedIn: 'root',
})
export class MessageService extends ComponentStore<MessageServiceState> {
	private http = inject(HttpClient);

	readonly sendMessage = this.effect((message$: Observable<string>) =>
		message$.pipe(
			switchMap((message) => {
				return this.http.post('/api/message', { message });
			}),
		),
	);

	constructor() {
		super({
			messageCount: 0,
		});
	}
}
