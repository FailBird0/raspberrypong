/**
 * @param {string} id
 */
const createNewLobby = (id) => {
  const lobby = new Lobby(id);

  return lobby;
}

module.exports = { createNewLobby };

class Lobby {
  /**
   * @param {string} id
   */
  constructor(id) {
    this.lobbyID = id;
    this.targetPlayerCount = 2;
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

    if (this.ball.pos.x - this.ball.radius < 0) {
      // Hit left wall
      this.ball.pos.x = this.gameWidth / 2;
      this.ball.pos.y = this.gameHeight / 2;

      this.players[1].score++;
    } else if (this.ball.pos.x + this.ball.radius > this.gameWidth) {
      // Hit right wall
      this.ball.pos.x = this.gameWidth / 2;
      this.ball.pos.y = this.gameHeight / 2;

      this.players[0].score++;
    }
    
    if (this.ball.pos.y - this.ball.radius < 0 || this.ball.pos.y + this.ball.radius > this.gameHeight) {
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
      this.players[0].size.x = 16;
      this.players[0].size.y = 175;
      this.players[1].size.x = 16;
      this.players[1].size.y = 175;

      this.players[0].pos.x = this.players[0].size.x;
      this.players[0].pos.y = this.gameHeight / 2 - this.players[0].size.y;
      this.players[1].pos.x = this.gameWidth - this.players[1].size.x * 2;
      this.players[1].pos.y = this.gameHeight / 2 - this.players[1].size.y;

      this.ball.reset({ x: this.gameWidth / 2, y: this.gameHeight / 2 });

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
      this.pos.y -= 10;
    } else if (this.input.down) {
      this.pos.y += 10;
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
    this.angle = null;
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
      x: mapCenter.x / 2,
      y: mapCenter.y / 2
    };

    let angle = Math.random() * Math.PI / 2 - Math.PI / 4;
    if (Math.random() > 0.5) angle -= Math.PI;

    this.vel = {
      x: Math.cos(angle) * this.speed,
      y: Math.sin(angle) * this.speed
    };
  }
}
