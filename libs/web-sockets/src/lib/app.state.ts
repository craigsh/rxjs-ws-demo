import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Observable, tap } from 'rxjs';

interface AppStateState {
	sessionId?: string;
}

@Injectable({
	providedIn: 'root',
})
export class AppStateStore extends ComponentStore<AppStateState> {
	readonly sessionId$ = this.select(({ sessionId }) => sessionId);

	get sessionId() {
		return this.get().sessionId ?? '';
	}

	readonly setSessionId = this.effect((sessionId$: Observable<string>) =>
		sessionId$.pipe(
			tap((sessionId) => {
				this.patchState({ sessionId });
			}),
		),
	);
}
