import { Room } from 'colyseus';
import GameState from '../game/GameState';

class BroadcastService {
  room: Room<GameState>
  roomTitle: string

  constructor(room: Room, roomTitle: string) {
    this.room = room;
    this.roomTitle = roomTitle;
  }

  broadcast(type: string, data: Object = {}, isAttention: boolean = false) {
    this.room.broadcast({
      type,
      sender: this.roomTitle,
      isAttention,
      ...data
    });
  }
}

export default BroadcastService;
