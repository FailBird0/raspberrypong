/**
 * @param {number} lobbyID
 * @param {number} targetPlayerCount
 */
const createNewLobby = (id, targetPlayerCount) => {
  const lobby = new Lobby(id, targetPlayerCount);

  return lobby;
}

module.exports = { createNewLobby };

class Lobby {
  /**
   * @param {number} targetPlayerCount
   */
  constructor(id, targetPlayerCount) {
    this.lobbyID = id;
    this.targetPlayerCount = targetPlayerCount;
    this.hasStarted = false;
    this.players = [];
    this.ball = new Ball();
  }

  update() {
    this.players.forEach(player => {
      player.update();
    });

    this.ball.update();
  }

  playerJoin(uid) {
    if (
        this.players.length >= this.targetPlayerCount ||
        this.hasStarted ||
        this.players.some(player => player.uid === uid)
    ) {
      return false;
    }

    const player = new Player();
    player.uid = uid;

    this.players.push(player);

    return true;
  }
  
  playerQuit(uid) {
    if (!this.players.some(player => player.uid === uid)) {
      return false;
    }
    this.players = this.players.filter(player => player.uid !== uid);

    return true;
  }
}

class Player {
  constructor() {
    this.uid = 0;
    this.isReady = false;

    this.score = 0;

    this.pos = {
      x: null,
      y: null
    };

    this.size = {
      x: null,
      y: null
    }

    this.input = {
      left: false,
      right: false,
      up: false,
      down: false
    };
  }

  update() {

  }
}

class Ball {
  constructor() {
    this.pos = {
      x: null,
      y: null
    };

    this.speed = 6;
    this.angle = null;
    this.vel = {
      x: null,
      y: null
    };
  }

  update() {

  }
}
