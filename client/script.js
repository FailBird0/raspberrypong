const url = `ws://${window.location.host}/myWebsocket`;
const mywsServer = new WebSocket(url);

const $home = document.getElementById("home");
const $lobby = document.getElementById("lobby");
const $game = document.getElementById("game");

let uid = null;
let myLobby = null;
let isInHome = true;

// if client's connection is up
mywsServer.onopen = () => {
  mywsServer.send(JSON.stringify({ type: "Lobby:getList" }));
}

mywsServer.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);

  switch (data.type) {
    case "UID":
      uid = data.value;
      $home.querySelector(".home-UID").innerHTML = uid;
      break;
    case "Lobby:join":
      myLobby = data.lobbyID;
      isInHome = false;

      $home.style.display = "none";
      $lobby.style.display = "block";
      $game.style.display = "none";
      break;
    case "Lobby:quit":
      myLobby = null;
      isInHome = true;

      $home.style.display = "block";
      $lobby.style.display = "none";
      $game.style.display = "none";
      break;
    case "Lobby:list":
      const lobbies = data.value;

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
      break;
    case "Log":
      console.log(data.value);
      break;
  }
}

const joinLobby = (lobbyID) => {
  mywsServer.send(JSON.stringify({ type: "Lobby:join", data: { lobbyID } }));
};

const quitLobby = (lobbyID) => {
  mywsServer.send(JSON.stringify({ type: "Lobby:quit", data: { lobbyID } }));
};

window.addEventListener("beforeunload", (e) => {
  if (myLobby) {
    quitLobby(myLobby);
  }
});
