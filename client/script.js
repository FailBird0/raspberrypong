const url = `ws://${window.location.host}/myWebsocket`;
const mywsServer = new WebSocket(url);

const $home = document.getElementById("home");
const $lobby = document.getElementById("lobby");
const $game = document.getElementById("game");

/** @type {HTMLCanvasElement} */
const $canvas = document.getElementById("gameCanvas");

/** @type {CanvasRenderingContext2D} */
const ctx = $canvas.getContext("2d");

$canvas.width = 1200;
$canvas.height = 750;

let uuid = null;
let myName = null;
let myLobby = null;
let isInHome = true;
let isReady = false;
let gameRunning = false;

const inputs = {
  up: false,
  down: false,
  left: false,
  right: false
};

let prevInputs;

let gameState;
let modGameState;

// if client's connection is up
mywsServer.onopen = () => {
  mywsServer.send(JSON.stringify({ type: "Lobby:getList" }));
}

mywsServer.onmessage = (event) => {
  console.log(new Date().getMilliseconds());
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "User:getUUID":
      handleUUIDGet(data);
      break;
    case "Lobby:join":
      handleLobbyJoin(data);
      break;
    case "Lobby:quit":
      handleLobbyQuit();
      break;
    case "Lobby:list":
      handleLobbyList(data);
      break;
    case "Lobby:info":
      handleLobbyInfo(data);
      break;
    case "Game:start":
      handleGameStart();
      break;
    case "Game:update":
      handleGameUpdate(data);
      break;
    case "Log":
      console.log(data.value);
      break;
  }
}

const joinLobby = (lobbyID) => {
  mywsServer.send(JSON.stringify(
    {
      type: "Lobby:join",
      data: {
        lobbyID: lobbyID
      }
    }
  ));
};

const quitLobby = (lobbyID) => {
  mywsServer.send(JSON.stringify(
    {
      type: "Lobby:quit",
      data: {
        lobbyID: lobbyID
      }
    }
  ));
};

const readyLobby = (lobbyID, isReady) => {
  mywsServer.send(JSON.stringify(
    {
      type: "Lobby:readyState",
      data: {
        lobbyID: lobbyID,
        isReady: isReady
      }
    }
  ));
};

/**
 * 
 * @param {Boolean | null} newState 
 */
const flipReadyState = (newState = null) => {
  if (newState === null) {
    isReady = !isReady;
  } else {
    isReady = newState;
  }

  const $lobbyReady = $lobby.querySelector(".lobby-ready");

  $lobbyReady.setAttribute("data-ready", isReady);
  $lobbyReady.innerHTML = isReady ? "Ready" : "Not Ready";
}


const handleUUIDGet = (data) => {
  uuid = data.payload.uuid;
  $home.querySelector(".home-UUID").innerHTML = uuid;
};

const handleLobbyJoin = (data) => {
  myLobby = data.payload.lobbyID;
  isInHome = false;
  isReady = false;

  $home.style.display = "none";
  $lobby.style.display = "block";
  $game.style.display = "none";
};

const handleLobbyQuit = () => {
  myLobby = null;
  isInHome = true;
  isReady = false;
  gameRunning = false;

  $home.style.display = "block";
  $lobby.style.display = "none";
  $game.style.display = "none";

  flipReadyState(false);
};

const handleLobbyList = (data) => {
  const lobbies = data.payload.lobbies;

  const $lobbies = $home.querySelector(".home-lobby-list");

  $lobbies.innerHTML = "";

  lobbies.forEach(lobby => {
    const li = document.createElement("li");
    li.innerHTML = `
          <p><strong>${lobby.id}</strong></p>
          <p>${lobby.playerCount}/${lobby.targetPlayerCount} Players</p>
          <p>${lobby.hasStarted ? "Running" : "In Lobby"}</p>`;

    const joinButton = document.createElement("button");
    joinButton.innerText = "Join";
    joinButton.onclick = () => joinLobby(lobby.id);

    li.appendChild(joinButton);
    $lobbies.append(li);
  });
};

const handleLobbyInfo = (data) => {
  const $lobbyID = $lobby.querySelector(".lobby-id");
  const $lobbyPlayerList = $lobby.querySelector(".lobby-player-list");
  const $lobbyReady = $lobby.querySelector(".lobby-ready");
  const $lobbyQuit = $lobby.querySelector(".lobby-quit");

  const readyState = $lobbyReady.getAttribute("data-ready") === "true";

  const lobby = data.payload.lobby;

  $lobbyID.innerHTML = lobby.id;
  $lobbyPlayerList.innerHTML = "";

  for (let i = 0; i < lobby.targetPlayerCount; i++) {
    const player = lobby.playerList[i];
    const li = document.createElement("li");

    if (player) {
      li.innerHTML = `
            <p><strong>${player.name ?? "[No Name]"}</strong></p>
            <p><small>${player.uuid}</small></p>
            <p>${player.isReady ? "Ready" : "Not Ready"}</p>`;
    } else {
      li.innerHTML = "<p>Waiting for player...</p>";
    }

    $lobbyPlayerList.append(li);
  }

  $lobbyReady.innerHTML = readyState ? "Ready" : "Not Ready";
  $lobbyReady.onclick = () => {
    const newReadyState = !readyState;
    $lobbyReady.setAttribute("data-ready", newReadyState);
    readyLobby(lobby.id, newReadyState);
  };
  $lobbyQuit.onclick = () => quitLobby(lobby.id);
};

const handleGameStart = () => {
  gameRunning = true;

  $home.style.display = "none";
  $lobby.style.display = "none";
  $game.style.display = "flex";
};

const handleGameUpdate = (data) => {
  gameState = {
    players: (() => {
      let players = [];

      for (const p of data.payload.p) {
        players.push({
          // uuid: p.i,
          // name: p.n,
          pos: { x: p.p[0], y: p.p[1] },
          size: { x: p.d[0], y: p.d[1] },
          score: p.s
        });
      }

      return players;
    })(),
    ball: (() => {
      let ball = data.payload.b;

      return {
        pos: { x: ball.p[0], y: ball.p[1] },
        radius: ball.r
      };
    })()
  };
};

const renderGame = () => {
  requestAnimationFrame(renderGame);

  if (!gameRunning || !gameState) {
    return;
  }

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, $canvas.width, $canvas.height);

  const players = gameState.players;
  const ball = gameState.ball;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];

    ctx.beginPath();
    ctx.fillStyle = "#000000";
    ctx.fillRect(player.pos.x, player.pos.y, player.size.x, player.size.y);
  }

  ctx.beginPath();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "32px monospace";
  ctx.fillStyle = "#c0c0c0";
  ctx.fillText(`${players[0].score}:${players[1].score}`, $canvas.width / 2, $canvas.height / 2);

  ctx.beginPath();
  ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, 2 * Math.PI);
  ctx.fillStyle = "#000000";
  ctx.fill();
};
requestAnimationFrame(renderGame);


$home.querySelector(".home-name").value = myName ?? "";

$home.querySelector(".home-name-save").onclick = () => {
  let newName = $home.querySelector(".home-name").value;

  if (newName === "") {
    newName = null;
  }

  myName = newName;

  const json = JSON.stringify({
    type: "User:saveName",
    payload: {
      name: newName
    }
  });

  mywsServer.send(json);
};

window.addEventListener("beforeunload", () => {
  if (myLobby) {
    quitLobby(myLobby);
  }
});

window.addEventListener("keydown", (event) => {
  const k = event.key;

  switch (k) {
    case "ArrowUp":
      inputs.up = true;
      break;
    case "ArrowDown":
      inputs.down = true;
      break;
    case "ArrowLeft":
      inputs.left = true;
      break;
    case "ArrowRight":
      inputs.right = true;
      break;
  }
});

window.addEventListener("keyup", (event) => {
  const k = event.key;

  switch (k) {
    case "ArrowUp":
      inputs.up = false;
      break;
    case "ArrowDown":
      inputs.down = false;
      break;
    case "ArrowLeft":
      inputs.left = false;
      break;
    case "ArrowRight":
      inputs.right = false;
      break;
  }
});

function gameUpdate() {
  if (!gameRunning || (JSON.stringify(inputs) === prevInputs)) {
    return;
  }

  const json = JSON.stringify({
    type: "Game:playerInput",
    data: {
      lobbyID: myLobby,
      inputs: inputs
    }
  });

  prevInputs = JSON.stringify(inputs);

  mywsServer.send(json);
}

setInterval(gameUpdate, 1000 / 15);
