import { Room, Client } from 'colyseus';

export class ChatRoom extends Room {
  maxClients = 4;

  onCreate (options) {
    console.log("ChatRoom created!", options);
  }

  onMessage(client: Client, message: any) {
    console.log("ChatRoom received message from", client.sessionId, ":", message);
    
    this.broadcast({
      sender: client.sessionId,
      type: 'message',
      message
    });
  };

  onJoin (client) {
    this.broadcast({
      sender: client.sessionId,
      type: 'message',
      message: `${ client.sessionId } joined.`
    });
  }

  onLeave (client) {
    this.broadcast({
      sender: client.sessionId,
      type: 'message',
      message: `${ client.sessionId } left.`
    });
  }

  onDispose () {
    console.log("Dispose ChatRoom");
  }
}
