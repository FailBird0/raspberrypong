const WebSocket = require("ws");
const express = require("express");
const app = express();
const path = require("path");
const crypto = require("crypto");
const { createNewLobby } = require("./game");

app.use("/", express.static(path.resolve(__dirname, "../client")));

const myServer = app.listen(9876, () => {
  console.log(`Server listening on port 9876`);
});

const wsServer = new WebSocket.Server({
  noServer: true
});

wsServer.on("connection", (ws) => {
  // create UID for client
  ws.uid = crypto.randomBytes(6).toString("hex");
  ws.send(JSON.stringify({ type: "UID", value: ws.uid }));

  ws.on("message", (msg) => {
    const message = JSON.parse(msg.toString());

    switch (message.type) {
      case "Lobby:join":
        console.log(`${ws.uid} Joining lobby ${message.data.lobbyID}`);
        joinLobby(ws, message.data.lobbyID);
        break;
      case "Lobby:quit":
        quitLobby(ws, message.data.lobbyID);
        break;
      case "Lobby:getList":
        sendLobbyInfos(ws);
        break;
      default:
        console.log(`Unknown message: ${message}`);
        break;
    }
  });
});

myServer.on('upgrade', async function upgrade(request, socket, head) {
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit('connection', ws, request);
  });
});


// Game

const joinLobby = (ws, lobbyID) => {
  const lobby = lobbies.get(lobbyID);

  if (lobby) {
    lobby.players.push(ws);

    ws.send(JSON.stringify({ type: "GameStatus", value: lobbyID }));
  }
};

const quitLobby = (ws, lobbyID) => {
  const lobby = lobbies.get(lobbyID);

  if (lobby) {
    lobbies.get(lobbyID).players = lobby.players.filter(player => player.uid !== ws.uid);

    ws.send(JSON.stringify({ type: "GameStatus", value: "disconnected" }));
  }
};

const lobbies = new Map();

const createLobby = () => {
  const lobbyID = crypto.randomBytes(4).toString("hex");
  const lobby = createNewLobby(lobbyID, 2);

  lobbies.set(
    lobbyID,
    lobby
  );
};

const sendLobbyInfos = (ws) => {
  const lobbyInfos = [];

  lobbies.forEach((lobby, lobbyID) => {
    lobbyInfos.push({
      id: lobbyID,
      playerCount: lobby.players.length,
      targetPlayerCount: lobby.targetPlayerCount,
      hasStarted: lobby.hasStarted
    });
  });

  ws.send(JSON.stringify({ type: "Lobby:list", value: lobbyInfos }));
};

createLobby();
