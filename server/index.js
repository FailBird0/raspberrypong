const WebSocket = require("ws");
const express = require("express");
const app = express();
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { createNewLobby } = require("./game");
let i2c = null;
let oled = null;
let oledFont = null;

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
  oledFont = require("oled-font-5x7");

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
  oledDisplay.writeString(oledFont, 1, `  Pong Server Online  \n\n`, 1, false);
  oledDisplay.writeString(oledFont, 1, `raspberrypi.local\n`, 1, false);
  oledDisplay.writeString(oledFont, 1, `Port: ${port}\n\n`, 1, false);

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
  // create UUID for client
  ws.uuid = crypto.randomUUID();
  ws.name = null;
  ws.send(JSON.stringify(
    {
      type: "User:getUUID",
      payload: {
        uuid: ws.uuid
      }
    }
  ));

  ws.on("message", (msg) => {
    const message = JSON.parse(msg.toString());

    switch (message.type) {
      case "User:saveName":
        saveUsername(ws, message.payload.name);
        break;
      case "Lobby:join":
        joinLobby(ws, message.data.lobbyID);
        break;
      case "Lobby:quit":
        quitLobby(ws, message.data.lobbyID);
        break;
      case "Lobby:readyState":
        readyLobby(ws, message.data.lobbyID, message.data.isReady);
        break;
      case "Lobby:getList":
        sendLobbyInfos(ws);
        break;
      case "Game:playerInput":
        const lobby = lobbies.get(message.data.lobbyID);
        const player = lobby.players.find(player => player.uuid === ws.uuid);
        const inputs = message.data.inputs;

        player.input.left = inputs.left;
        player.input.right = inputs.right;
        player.input.up = inputs.up;
        player.input.down = inputs.down;
        break;
      default:
        console.log(`Unknown message from WebSocket connection ${ws.uuid}: "${message}"`);
        break;
    }
  });
});

myServer.on("upgrade", async function upgrade(request, socket, head) {
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit("connection", ws, request);
  });
});


const saveUsername = (ws, newName) => {
  ws.name = newName;
}


// Game

/**
 * 
 * @param {WebSocket} ws 
 * @param {string} lobbyID 
 */
const joinLobby = (ws, lobbyID) => {
  const lobby = lobbies.get(lobbyID);

  if (lobby) {
    const playerInfo = {
      uuid: ws.uuid,
      name: ws.name
    };

    const res = lobby.playerJoin(playerInfo);

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

  if (lobby.players.some(player => player.uuid === ws.uuid)) {
    const res = lobby.playerQuit(ws.uuid);

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

          for (const player of lobby.players) {
            if (client.uuid === player.uuid) {
              sendLobbyInfo(client, lobbyID);
            }
          }
        }
      });
    }
  }
};

const readyLobby = (ws, lobbyID, isReady) => {
  const lobby = lobbies.get(lobbyID);

  if (lobby) {
    lobby.players.find(player => player.uuid === ws.uuid).isReady = isReady;

    const clientsArray = Array.from(wsServer.clients);
    const playersWs = [];

    for (const players of lobby.players) {
      for (const client of clientsArray) {
        if (client.uuid === players.uuid) {
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

const createLobby = (lobbySize) => {
  const lobbyID = crypto.randomUUID();
  const lobby = createNewLobby(lobbyID, lobbySize);

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
      playerList: lobby.players.map(player => player.uuid)
    });
  });

  const json = JSON.stringify(
    {
      type: "Lobby:list",
      payload: {
        lobbies: lobbyInfos
      }
    }
  );

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
          uuid: player.uuid,
          name: player.name,
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

createLobby(2);
createLobby(4);

function gameLoops() {
  lobbies.forEach(lobby => {
    if (lobby.hasStarted) {
      // game update
      lobby.update();

      // compressing json / omitting unnecessary data
      // spaghet
      const json = JSON.stringify(
        {
          type: "Game:update",
          payload: {
            p: (() => {
              return lobby.players.map(player => ({
                // i: player.uuid,
                // n: player.name, // uuid, name not neccessary
                p: [Math.floor(player.pos.x), Math.floor(player.pos.y)],
                d: [Math.floor(player.size.x), Math.floor(player.size.y)],
                s: player.score
              }));
            })(),
            b: (() => {
              return {
                p: [Math.floor(lobby.ball.pos.x), Math.floor(lobby.ball.pos.y)],
                r: lobby.ball.radius
              };
            })(),
            u: (() => {
              return lobby.powerups.map(powerup => {
                return {
                  t: powerup.effect.type,
                  p: [Math.floor(powerup.pos.x), Math.floor(powerup.pos.y)],
                  r: powerup.radius
                };
              });
            })()
          }
        }
      );

      for (const player of lobby.players) {
        for (const client of wsServer.clients) {
          if (client.uuid === player.uuid) {
            client.send(json);
          }
        }
      }
    } else if (lobby.isResetting) {
      // reset lobby
      for (const player of lobby.players) {
        for (const client of wsServer.clients) {
          if (client.uuid === player.uuid) {
            quitLobby(client, lobby.lobbyID);
          }
        }
      }

      lobby.isResetting = false;
    }
  });
}

setInterval(gameLoops, 1000 / 30);
