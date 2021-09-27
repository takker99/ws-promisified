export interface Result {
  /** close web socket */
  close(): Promise<CloseEvent>;
  /** send data through web socket */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  /** receive data as an async generator */
  receive(): AsyncGenerator<MessageEvent, never, void>;
}

/** create and open a web socket wrapped by Promise */
export function openWS(url: string, protcols?: string | string[]) {
  return new Promise<Result>((resolve, reject) => {
    const socket = new WebSocket(url, protcols);

    once(socket, "open", () =>
      resolve({
        close: () =>
          new Promise((res, rej) => {
            socket.close();
            once(socket, "close", (e) => res(e));
            once(socket, "error", (e) => rej(e));
          }),
        send: (data) => {
          if (socket.readyState === 2) {
            throw Error("The Web Socket is closing");
          }
          if (socket.readyState === 3) {
            throw Error("The Web Socket is already closed");
          }
          socket.send(data);
        },
        receive: async function* () {
          while (true) {
            const response = await new Promise((res, rej) => {
              once(socket, "message", (e) => res(e));
              once(socket, "error", (e) => rej(e));
            });
            yield response as MessageEvent;
          }
        },
      }));
    once(socket, "error", (e) => reject(e));
  });
}

function once<T extends keyof WebSocketEventMap>(
  socket: WebSocket,
  type: T,
  callback: (event: WebSocketEventMap[T]) => void,
) {
  const wrapper = (e: WebSocketEventMap[T]) => {
    callback(e);
    socket.removeEventListener(type, wrapper);
  };
  socket.addEventListener(type, wrapper);
}
