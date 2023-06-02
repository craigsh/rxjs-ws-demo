import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class WsInterfaceService {
	private messagesSubject = new Subject<string>();
	messages$ = this.messagesSubject.asObservable();

	logMessage(message: string) {
		this.messagesSubject.next(message);
	}
}
