const url = `ws://${window.location.host}/myWebsocket`;
const mywsServer = new WebSocket(url);

const $home = document.getElementById("home");
const $lobby = document.getElementById("lobby");
const $game = document.getElementById("game");

/** @type {HTMLCanvasElement} */
const $canvas = document.getElementById("gameCanvas");

/** @type {CanvasRenderingContext2D} */
const ctx = $canvas.getContext("2d");

$canvas.width = 800;
$canvas.height = 600;

let uid = null;
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

// if client's connection is up
mywsServer.onopen = () => {
  mywsServer.send(JSON.stringify({ type: "Lobby:getList" }));
}

mywsServer.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "UID:get":
      handleUIDGet(data);
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

const renderGame = (game) => {
  ctx.clearRect(0, 0, $canvas.width, $canvas.height);

  const players = game.players;
  const ball = game.ball;

  for (const player of players) {
    ctx.beginPath();
    ctx.fillStyle = "#000000";
    ctx.fillRect(player.pos.x, player.pos.y, player.size.x, player.size.y);
  }

  ctx.beginPath();
  ctx.arc(ball.pos.x, ball.pos.y, 16, 0, 2 * Math.PI);
  ctx.fillStyle = "#000000";
  ctx.fill();
}


const handleUIDGet = (data) => {
  uid = data.payload.uid;
  $home.querySelector(".home-UID").innerHTML = uid;
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

  $home.style.display = "block";
  $lobby.style.display = "none";
  $game.style.display = "none";
};

const handleLobbyList = (data) => {
  const lobbies = data.payload.lobbies;

  const $lobbies = $home.querySelector(".home-lobby-list");

  $lobbies.innerHTML = "";

  lobbies.forEach(lobby => {
    const li = document.createElement("li");
    li.innerHTML = `
          <p>#${lobby.id}</p>
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
  const $lobbyPlayers = $lobby.querySelector(".lobby-players");
  const $lobbyReady = $lobby.querySelector(".lobby-ready");
  const $lobbyQuit = $lobby.querySelector(".lobby-quit");

  const newReadyState = $lobbyReady.getAttribute("data-ready") === "true" ? false : true;

  const lobby = data.payload.lobby;

  $lobbyID.innerHTML = lobby.id;
  $lobbyPlayers.innerHTML = `${lobby.playerCount}/${lobby.targetPlayerCount} Players`;
  $lobbyReady.innerHTML = newReadyState ? "Unready" : "Ready";
  $lobbyReady.onclick = () => {
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
  renderGame(data.payload);
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
  if (!gameRunning) {
    return;
  }

  const json = JSON.stringify({
    type: "Game:playerInput",
    data: {
      lobbyID: myLobby,
      inputs: inputs
    }
  });

  mywsServer.send(json);
}

setInterval(gameUpdate, 1000 / 20);
