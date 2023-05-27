import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message } from '@rxjs-ws-demo/api-interfaces';

@Component({
	selector: 'rxjs-ws-demo-root',
	template: `
		<mu-demo />
		<!-- <rxjs-ws-demo-nx-welcome></rxjs-ws-demo-nx-welcome> -->
		<div>Message: {{ hello$ | async | json }}</div>
	`,
	styles: [``],
})
export class AppComponent {
	private http = inject(HttpClient);
	title = 'fe-demo';

	hello$ = this.http.get<Message>('/api/hello');
}
