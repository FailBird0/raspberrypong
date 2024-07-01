const WebSocket = require("ws");
const express = require("express");
const app = express();
const path = require("path");

app.use("/", express.static(path.resolve(__dirname, "../client")));

const myServer = app.listen(9876);

const wsServer = new WebSocket.Server({
  noServer: true
});

wsServer.on("connection", function(ws) {
  const date = new Date();
  const dateString = `${date.toDateString()} ${date.toLocaleTimeString()}`;
  wsServer.clients.forEach(c => {
    c.send(`${dateString}: New client connected. Client count: ${wsServer.clients.size}`);
  });
  ws.on("message", function(msg) {
    wsServer.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    })
  })
});

wsServer.on("disconnect", function(ws) {
  const date = new Date();
  const dateString = `${date.toDateString()} ${date.toLocaleTimeString()}`;
  wsServer.clients.forEach(c => {
    c.send(`${dateString}: A Client disconnected`);
  });
});

myServer.on('upgrade', async function upgrade(request, socket, head) {
  wsServer.handleUpgrade(request, socket, head, function done(ws) {
    wsServer.emit('connection', ws, request);
  });
});