const url = `ws://${window.location.host}/myWebsocket`;
const mywsServer = new WebSocket(url);

const myMessages = document.getElementById("messages");
const myInput = document.getElementById("message");
const sendBtn = document.getElementById("send");

sendBtn.disabled = true;
sendBtn.addEventListener("click", sendMsg, false);

function sendMsg() {
  const text = myInput.value;
  msgGeneration(text, "Client");
  mywsServer.send(text);
}

function msgGeneration(msg, from) {
  const newMessage = document.createElement("h5");
  newMessage.innerText = `${from} says: ${msg}`;
  myMessages.appendChild(newMessage);
}

mywsServer.onopen = () => {
  sendBtn.disabled = false;
}

mywsServer.onmessage = (event) => {
  const { data } = event;
  msgGeneration(data, "Server");
}
