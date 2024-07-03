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

    this.gameWidth = 800;
    this.gameHeight = 600;

    /** @type {Player[]} */
    this.players = [];

    /** @type {Ball} */
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

    if (this.players.length < this.targetPlayerCount) {
      // TODO: Handle Player quitting
    }

    return true;
  }
  initGame() {
    if (this.targetPlayerCount === 2) {
      this.players[0].size.x = 20;
      this.players[0].size.y = 175;
      this.players[1].size.x = 20;
      this.players[1].size.y = 175;

      this.players[0].pos.x = 20;
      this.players[0].pos.y = this.gameHeight / 2 - this.players[0].size.y;
      this.players[1].pos.x = this.gameWidth - 20 - this.players[1].size.x;
      this.players[1].pos.y = this.gameHeight / 2 - this.players[1].size.y;

      this.ball.pos = {
        x: this.gameWidth / 2,
        y: this.gameHeight / 2
      };

      let ballAngle = Math.random() * Math.PI / 2 - Math.PI / 4;
      if (Math.random() > 0.5) ballAngle -= Math.PI;

      this.ball.vel = {
        x: Math.cos(ballAngle) * this.ball.speed,
        y: Math.sin(ballAngle) * this.ball.speed
      };

      this.hasStarted = true;
    }
  }
}

class Player {
  constructor() {
    this.uid = null;
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
    if (this.input.up) {
      this.pos.y -= 20;
    } else if (this.input.down) {
      this.pos.y += 20;
    }
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
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    // TODO: handle collision
  }
}
