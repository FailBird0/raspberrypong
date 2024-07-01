const url = `ws://${window.location.host}/myWebsocket`;
const mywsServer = new WebSocket(url);

const $count = document.getElementById("count");
const $reset = document.getElementById("resetCount");
const $UID = document.getElementById("UID");

// if client's connection is up
mywsServer.onopen = () => {
  $reset.disabled = false;

  $reset.addEventListener("click", () => {
    mywsServer.send("Reset");
  });
}

mywsServer.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "CountUpdate":
      $count.innerText = data.value;
      break;
    case "UID":
      $UID.innerText = data.value;
      break;
    case "Log":
      console.log(data.value);
      break;
  }
}
