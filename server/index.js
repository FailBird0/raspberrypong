const WebSocket = require("ws");
const express = require("express");
const app = express();
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { createNewLobby } = require("./game");
let i2c = null;
let oled = null;
const oledFont = require("oled-font-5x7");

const port = 9876;

let oledDisplay = null;

const nets = os.networkInterfaces();
const results = {};

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
    if (net.family === familyV4Value && !net.internal) {
      if (!results[name]) {
        results[name] = [];
      }
      results[name].push(net.address);
    }
  }
}

try {
  i2c = require("i2c-bus");
  oled = require("oled-i2c-bus");

  const i2cBus = i2c.openSync(1);
  const opts = {
    width: 128,
    height: 64,
    address: 0x3C
  };

  oledDisplay = new oled(i2cBus, opts);
  oledDisplay.turnOnDisplay();
  oledDisplay.clearDisplay();
  oledDisplay.dimDisplay(false);
  oledDisplay.writeString(oledFont, 1, `  Pong Server Online\n       Port: ${port}\n\n`, 1, false);

  let ipsString = "";

  for (const name of Object.keys(results)) {
    let nameStr = `${name}: `;
    ipsString += nameStr;

    ipsString += results[name].join("\n" + " ".repeat(nameStr.length)) + "\n";
  }

  oledDisplay.writeString(oledFont, 1, ipsString, 1, true);
  oledDisplay.update();
} catch (err) {
  console.log("Failed to initialize OLED Display.");
  oledDisplay = null;
}

app.use("/", express.static(path.resolve(__dirname, "../client")));

const myServer = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const wsServer = new WebSocket.Server({
  noServer: true
});

wsServer.on("connection", (ws) => {
  // create UID for client
  ws.uid = crypto.randomBytes(6).toString("hex");
  ws.send(JSON.stringify(
    {
      type: "UID:get",
      payload: {
        uid: ws.uid
      }
    }
  ));

  ws.on("message", (msg) => {
    const message = JSON.parse(msg.toString());

    switch (message.type) {
      case "Lobby:join":
        console.log(`${ws.uid} Joining lobby ${message.data.lobbyID}`);
        joinLobby(ws, message.data.lobbyID);
        break;
      case "Lobby:quit":
        console.log(`${ws.uid} Quitting lobby ${message.data.lobbyID}`);
        quitLobby(ws, message.data.lobbyID);
        break;
      case "Lobby:readyState":
        console.log(`${ws.uid} ReadyState change lobby ${message.data.lobbyID}`);
        readyLobby(ws, message.data.lobbyID, message.data.isReady);
        break;
      case "Lobby:getList":
        sendLobbyInfos(ws);
        break;
      case "Game:playerInput":
        const lobby = lobbies.get(message.data.lobbyID);
        const player = lobby.players.find(player => player.uid === ws.uid);
        const inputs = message.data.inputs;

        player.input.left = inputs.left;
        player.input.right = inputs.right;
        player.input.up = inputs.up;
        player.input.down = inputs.down;
        break;
      default:
        console.log(`Unknown message: ${message}`);
        break;
    }
  });
});

myServer.on("upgrade", async function upgrade(request, socket, head) {
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit("connection", ws, request);
  });
});


// Game

/**
 * 
 * @param {WebSocket} ws 
 * @param {string} lobbyID 
 */
const joinLobby = (ws, lobbyID) => {
  const lobby = lobbies.get(lobbyID);

  if (lobby) {
    const res = lobby.playerJoin(ws.uid);

    if (res) {
      const json = JSON.stringify(
        {
          type: "Lobby:join",
          payload: {
            lobbyID: lobbyID
          }
        }
      );

      ws.send(json);

      wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          sendLobbyInfos(client);
          sendLobbyInfo(client, lobbyID);
        }
      });
    }
  }
};

/**
 * 
 * @param {WebSocket} ws 
 * @param {string} lobbyID 
 */
const quitLobby = (ws, lobbyID) => {
  const lobby = lobbies.get(lobbyID);

  if (lobby.players.some(player => player.uid === ws.uid)) {
    const res = lobby.playerQuit(ws.uid);

    if (res) {
      const json = JSON.stringify(
        {
          type: "Lobby:quit"
        }
      );
      ws.send(json);

      wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          sendLobbyInfos(client);
        }
      });
    }
  }
};

const readyLobby = (ws, lobbyID, isReady) => {
  const lobby = lobbies.get(lobbyID);

  if (lobby) {
    lobby.players.find(player => player.uid === ws.uid).isReady = isReady;

    const clientsArray = Array.from(wsServer.clients);
    const playersWs = [];

    for (const players of lobby.players) {
      for (const client of clientsArray) {
        if (client.uid === players.uid) {
          playersWs.push(client);
          sendLobbyInfo(client, lobbyID);
        }
      }
    }

    let gameStart = true;

    for (const player of lobby.players) {
      if (!player.isReady) {
        gameStart = false;
        break;
      }
    }

    if (gameStart && lobby.players.length === lobby.targetPlayerCount) {
      lobby.initGame();

      for (const client of clientsArray) {
        if (client.readyState === WebSocket.OPEN) {
          sendLobbyInfos(client);
        }
      }

      for (const player of playersWs) {
        const json = JSON.stringify(
          {
            type: "Game:start"
          }
        );

        player.send(json);
      }
    }
  }
}

const lobbies = new Map();

const createLobby = () => {
  const lobbyID = crypto.randomBytes(4).toString("hex");
  const lobby = createNewLobby(lobbyID, 2);

  lobbies.set(
    lobbyID,
    lobby
  );
};

/**
 * Send info of all lobbies to client ws
 * 
 * @param {WebSocket} ws 
 */
const sendLobbyInfos = (ws) => {
  const lobbyInfos = [];

  lobbies.forEach((lobby, lobbyID) => {
    lobbyInfos.push({
      id: lobbyID,
      playerCount: lobby.players.length,
      targetPlayerCount: lobby.targetPlayerCount,
      hasStarted: lobby.hasStarted,
      playerList: lobby.players.map(player => player.uid)
    });
  });

  const json = JSON.stringify({
    type: "Lobby:list",
    payload: {
      lobbies: lobbyInfos
    }
  });

  ws.send(json);
};


/**
 * Send info of a single lobby to client ws
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} lobbyID - ID of the lobby to send info for
 */
const sendLobbyInfo = (ws, lobbyID) => {
  const lobby = lobbies.get(lobbyID);

  if (lobby) {
    const lobbyData = {
      id: lobbyID,
      playerCount: lobby.players.length,
      targetPlayerCount: lobby.targetPlayerCount,
      hasStarted: lobby.hasStarted,
      playerList: lobby.players.map(player => {
        return {
          uid: player.uid,
          isReady: player.isReady
        }
      })
    };

    const json = JSON.stringify(
      {
        type: "Lobby:info",
        payload: {
          lobby: lobbyData
        }
      }
    );

    ws.send(json);
  }
}

createLobby();

function gameLoops() {
  lobbies.forEach(lobby => {
    if (lobby.hasStarted) {
      lobby.update();

      const json = JSON.stringify(
        {
          type: "Game:update",
          payload: {
            players: lobby.players,
            ball: lobby.ball
          }
        }
      );

      lobby.players.forEach(player => {
        for (const client of wsServer.clients) {
          if (client.uid === player.uid) {
            client.send(json);
          }
        }
      });
    }
  });
}

setInterval(gameLoops, 1000 / 60);
