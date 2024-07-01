const WebSocket = require("ws");
const express = require("express");
const app = express();
const path = require("path");

app.use("/", express.static(path.resolve(__dirname, "../client")));

const myServer = app.listen(9876, () => {
  console.log(`Server listening on port 9876`);
});

const wsServer = new WebSocket.Server({
  noServer: true
});

wsServer.on("connection", function(ws) {
  const date = new Date();
  const dateString = `${date.toDateString()} ${date.toLocaleTimeString()}`;
  wsServer.clients.forEach((client) => {
    client.send(`${dateString}: New client connected. Client count: ${wsServer.clients.size}`);
  });
  ws.on("message", function(msg) {
    wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    })
  })
});

myServer.on('upgrade', async function upgrade(request, socket, head) {
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit('connection', ws, request);
  });
});
