import { Injectable } from '@nestjs/common';
import { Message } from '@rxjs-ws-demo/api-interfaces';
import { Subject } from 'rxjs';

@Injectable()
export class WsInterfaceService {
	private messagesSubject = new Subject<Message>();
	messages$ = this.messagesSubject.asObservable();

	logMessage(message: Message) {
		this.messagesSubject.next(message);
	}
}
