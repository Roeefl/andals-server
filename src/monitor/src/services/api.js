import axios from 'axios';

const baseUrl = process.env.VUE_APP_BASE_URL || 'http://localhost:1337';

class ApiService {
  async serverState() {
    try {
      const serverState = await axios
        .get(`${baseUrl}/api/`)
        .then(({ data }) => data);

      return serverState;
    } catch (err) {
      console.error(err);
    }
  }
}

export default new ApiService();

// export function fetchRoomData (roomId: string) {
//     return http.get(`${ENDPOINT}/api/room`).
//         query({ roomId }).
//         accept('application/json');
// }

// export function remoteRoomCall(roomId: string, method: string, ...args: any[]) {
//     return http.get(`${ENDPOINT}/api/room/call`).
//         query({ roomId, method, args: JSON.stringify(args) }).
//         accept('application/json');
// }
