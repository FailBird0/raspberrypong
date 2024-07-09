/**
 * @param {string} id
 */
const createNewLobby = (id) => {
  const lobby = new Lobby(id);

  return lobby;
}

module.exports = { createNewLobby };

const gameWidth = 1200;
const gameHeight = 750;
const gameCenter = {
  x: gameWidth / 2,
  y: gameHeight / 2
};

class Lobby {
  /**
   * @param {string} id
   */
  constructor(id) {
    this.lobbyID = id;
    this.targetPlayerCount = 2;
    this.isResetting = false;
    this.hasStarted = false;

    /** @type {Player[]} */
    this.players = [];

    /** @type {Ball} */
    this.ball = new Ball();
  }

  update() {
    if (this.players.length < this.targetPlayerCount) {
      this.resetLobby();

      return;
    }

    this.players.forEach(player => {
      player.update();
    });

    this.ball.update();

    if (this.ball.pos.x - this.ball.radius < 0) {
      // Hit left wall
      this.ball.reset(gameCenter);

      this.players[1].score++;
    } else if (this.ball.pos.x + this.ball.radius > gameWidth) {
      // Hit right wall
      this.ball.reset(gameCenter);

      this.players[0].score++;
    }
    
    if (this.ball.pos.y - this.ball.radius < 0 || this.ball.pos.y + this.ball.radius > gameHeight) {
      // Hit top or bottom
      this.ball.vel.y = -this.ball.vel.y;
    }

    for (const player of this.players) {
      if (
        this.ball.pos.x - this.ball.radius < player.pos.x + player.size.x &&
        this.ball.pos.x + this.ball.radius > player.pos.x &&
        this.ball.pos.y - this.ball.radius < player.pos.y + player.size.y &&
        this.ball.pos.y + this.ball.radius > player.pos.y
      ) {
        this.ball.vel.x = -this.ball.vel.x;
      }
    }
  }

  playerJoin(playerInfo) {
    if (
        this.players.length >= this.targetPlayerCount ||
        this.hasStarted ||
        this.players.some(player => player.uuid === playerInfo.uuid)
    ) {
      return false;
    }

    const player = new Player();
    player.uuid = playerInfo.uuid;
    player.name = playerInfo.name;

    this.players.push(player);

    return true;
  }
  
  playerQuit(uuid) {
    if (!this.players.some(player => player.uuid === uuid)) {
      return false;
    }

    this.players = this.players.filter(player => player.uuid !== uuid);

    if (this.players.length < this.targetPlayerCount) {
      // TODO: Handle Player quitting
    }

    return true;
  }
  initGame() {
    if (this.targetPlayerCount === 2) {
      this.players[0].size.x = 16;
      this.players[0].size.y = 175;
      this.players[1].size.x = 16;
      this.players[1].size.y = 175;

      this.players[0].pos.x = this.players[0].size.x;
      this.players[0].pos.y = gameHeight / 2 - this.players[0].size.y;
      this.players[1].pos.x = gameWidth - this.players[1].size.x * 2;
      this.players[1].pos.y = gameHeight / 2 - this.players[1].size.y;

      this.ball.reset(gameCenter);

      this.hasStarted = true;
    }
  }
  resetLobby() {
    this.isResetting = true; // handled in index.js:gameLoops()
    this.hasStarted = false;
    this.ball.reset(gameCenter);
  }
}

class Player {
  constructor() {
    this.uuid = null;
    this.name = null;
    this.isReady = false;

    this.score = 0;

    this.pos = {
      x: null,
      y: null
    };

    this.vel = {
      x: 0,
      y: 0
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
      this.vel.y = -10;
    } else if (this.input.down) {
      this.vel.y = 10;
    } else {
      this.vel.y = 0;
    }

    // this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    if (this.pos.y < this.size.x) {
      // using this.size.x as padding
      this.pos.y = this.size.x;
    } else if (this.pos.y + this.size.y + this.size.x > gameHeight) {
      this.pos.y = gameHeight - this.size.y - this.size.x;
    }
  }
}

class Ball {
  constructor() {
    this.pos = {
      x: null,
      y: null
    };

    this.radius = 16;

    this.speed = 8;
    this.vel = {
      x: null,
      y: null
    };
  }

  update() {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
  }

  reset(mapCenter) {
    this.pos = {
      x: mapCenter.x,
      y: mapCenter.y
    };

    let angle = Math.random() * Math.PI / 2 - Math.PI / 4;
    if (Math.random() > 0.5) angle -= Math.PI;

    this.vel = {
      x: Math.cos(angle) * this.speed,
      y: Math.sin(angle) * this.speed
    };
  }
}
