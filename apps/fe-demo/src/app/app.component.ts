import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message } from '@rxjs-ws-demo/api-interfaces';

@Component({
	selector: 'rxjs-ws-demo-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
})
export class AppComponent {
	private http = inject(HttpClient);
	title = 'fe-demo';

	hello$ = this.http.get<Message>('/api/hello');
}
