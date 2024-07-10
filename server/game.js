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
    this.gameTick = null;
    this.newPowerupInterval = null;

    /** @type {Player[]} */
    this.players = [];

    /** @type {Ball} */
    this.ball = new Ball();

    this.powerups = [];
  }

  update() {
    this.players.forEach(player => {
      player.update();
    });

    this.ball.update();

    this.powerups.forEach(powerup => {
      powerup.update(this.gameTick);
    });

    // Remove dead powerups
    this.powerups = this.powerups.filter(powerup => !powerup.isDead);

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
        // Hit player
        this.ball.vel.x *= -1;

        let ballAngle = Math.atan2( this.ball.vel.y, this.ball.vel.x );
        let playerSpeed = player.vel.y;

        if (this.ball.vel.x > 0) {
          this.ball.pos.x = player.pos.x + player.size.x + this.ball.radius;
          ballAngle -= (Math.PI / 2.5 * Math.tanh(-playerSpeed / 10)) / 3;
        } else {
          this.ball.pos.x = player.pos.x - this.ball.radius;
          ballAngle += (Math.PI / 2.5 * Math.tanh(-playerSpeed / 10)) / 3;
        }

        this.ball.vel.x = Math.cos(ballAngle) * this.ball.speed;
        this.ball.vel.y = Math.sin(ballAngle) * this.ball.speed;
      }
    }

    // powerup spawn
    if (this.newPowerupInterval <= 0) {
      const pos = {
        x: Math.random() * 80 - 40 + gameWidth / 2,
        y: Math.random() * (gameHeight - 20) + 10
      };

      const powerup = allPowerups[Math.floor(Math.random() * allPowerups.length)]

      this.powerups.push(new powerup(pos));

      this.newPowerupInterval = Math.random() * 360 + 60;
    }

    this.newPowerupInterval--;

    // powerup collision
    for (const powerup of this.powerups) {
      const dist = Math.hypot(powerup.pos.x - this.ball.pos.x, powerup.pos.y - this.ball.pos.y);
      if (dist < this.ball.radius + powerup.radius) {
        powerup.pickUp();

        this.ball.effect = powerup.effect;
      }
    }

    this.gameTick++;
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

    if (this.players.length < this.targetPlayerCount && this.hasStarted) {
      this.resetLobby();
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

      this.gameTick = 0;

      this.newPowerupInterval = Math.floor(Math.random() * 360 + 60);

      this.hasStarted = true;
    }
  }
  resetLobby() {
    this.isResetting = true; // handled in index.js:gameLoops()
    this.hasStarted = false;
    this.ball.reset(gameCenter);
    this.powerups = [];
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
      up: false,
      down: false,
      left: false,
      right: false
    };
  }

  update() {
    if (this.input.up) {
      this.vel.y = -12;
    } else if (this.input.down) {
      this.vel.y = 12;
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

    this.radius = 12;

    this.speed = 16;
    this.vel = {
      x: null,
      y: null
    };

    this.effect = null;
  }

  update() {
    if (this.effect) {
      const ballAngle = Math.atan2(this.vel.y, this.vel.x);

      switch (this.effect.type) {
        case "FastBall":
          this.speed = 32;
          this.effect.duration--;

          if (this.effect.duration <= 0) {
            this.effect = null;
            this.speed = 16;
          }
          
          this.vel.x = Math.cos(ballAngle) * this.speed;
          this.vel.y = Math.sin(ballAngle) * this.speed;

          break;
        case "ReverseBall":
          this.vel.x = -this.vel.x;
          this.vel.y = -this.vel.y;

          this.effect = null;

          break;
      }
    }

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

    if (this.effect && this.effect.duration) {
      this.effect.duration = 0;
    }
  }
}

class Powerup {
  constructor(pos) {
    this.originPos = {
      x: pos.x,
      y: pos.y
    };

    this.pos = {
      x: pos.x,
      y: pos.y
    };

    this.radius = 20;

    this.isDead = false;
  }

  update(tick) {
    this.pos.y = Math.sin(tick / 1000) + this.originPos.y;
  }

  pickUp() {
    this.isDead = true;
  }
}

class FastBallPowerup extends Powerup {
  constructor(pos) {
    super(pos);

    this.effect = {
      type: "FastBall",
      duration: 90 // 90 ticks (30/sec * 3 sec)
    };
  }
}

class ReverseBallPowerup extends Powerup {
  constructor(pos) {
    super(pos);

    this.effect = {
      type: "ReverseBall"
    };
  }
}

const allPowerups = [
  FastBallPowerup,
  ReverseBallPowerup
];
