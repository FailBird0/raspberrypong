const WebSocket = require("ws");
const express = require("express");
const app = express();
const path = require("path");
const crypto = require("crypto");

app.use("/", express.static(path.resolve(__dirname, "../client")));

const myServer = app.listen(9876, () => {
  console.log(`Server listening on port 9876`);
});

const wsServer = new WebSocket.Server({
  noServer: true
});

function createUID() {
  return crypto.randomBytes(4).toString("hex");
}

wsServer.on("connection", (ws) => {
  ws.uid = createUID();
  console.log(`Client connected: ${ws.uid}`);
  ws.send(JSON.stringify({ type: "UID", value: ws.uid }));

  ws.on("message", (msg) => {
    const message = msg.toString();
    switch (message) {
      case "Reset":
        count = 0;
        break;
    }
  });
});

myServer.on('upgrade', async function upgrade(request, socket, head) {
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit('connection', ws, request);
  });
});

let count = 0;

setInterval(() => {
  count++;

  const data = JSON.stringify(
    {
      type: "CountUpdate",
      value: count
    }
  );

  wsServer.clients.forEach((client) => {
    client.send(data);
  });
}, 500);
