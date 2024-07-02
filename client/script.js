const url = `ws://${window.location.host}/myWebsocket`;
const mywsServer = new WebSocket(url);

const $UID = document.getElementById("UID");
const $conn = document.getElementById("conn");
const $game = document.getElementById("game");
const $lobbies = document.getElementById("lobbies");
let myLobby = null;

// if client's connection is up
mywsServer.onopen = () => {
  $conn.innerText = "true";

  mywsServer.send(JSON.stringify({ type: "Lobby:getList" }));
}

mywsServer.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);

  switch (data.type) {
    case "UID":
      $UID.innerText = data.value;
      break;
    case "GameStatus":
      myLobby = data.value;
      break;
    case "Lobby:list":
      const lobbies = data.value;

      $lobbies.innerHTML = "";

      lobbies.forEach(lobby => {
        const li = document.createElement("li");
        li.innerHTML =
          `<p>#${lobby.id}</p>` +
          `<p>${lobby.playerCount}/${lobby.targetPlayerCount} Players</p>` +
          `<p>${lobby.hasStarted ? "Running" : "In Lobby"}</p>`;

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
