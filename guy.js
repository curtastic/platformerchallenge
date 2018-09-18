"use strict";

class Guy {
	constructor(guyType, gridX, gridY) {
		this.speedX = 0;
		this.speedY = 0;
		this.onGround = false;
		this.dead = false;
		this.type = guyType;
		game.guys.push(this);
		
		this.canvas = new createjs.Container();
		this.canvas.x = game.tileSize * gridX;
		this.canvas.y = game.tileSize * gridY;
		
		this.sprite = new createjs.Sprite(game.guySpriteSheet[guyType]);
		if(guyType == GUY_TYPE_GOLEM) {
			this.health = 3;
			
			this.thrustX = game.tileSize * .04;
			this.thrustY = game.tileSize * .16;
			
			this.width = game.tileSize * 1.7;
			this.height = game.tileSize * 1.41;
			this.canvas.scaleX = this.canvas.scaleY = 1.7;
			
			this.spriteOffsetFacingRight = -25 * this.canvas.scaleX;
			this.spriteOffsetFacingLeft = 102 * this.canvas.scaleX;
			this.sprite.y = -35 * this.canvas.scaleX;
			this.lastDieFrame = 14;
		} else if(guyType == GUY_TYPE_HUMAN) {
			this.health = 4;
			
			this.thrustX = game.tileSize * .07;
			this.thrustY = game.tileSize * .16;
			
			this.width = game.tileSize * .7;
			this.height = game.tileSize * 1.22;
			this.canvas.scaleX = this.canvas.scaleY = 2.3;
			
			this.spriteOffsetFacingRight = -5 * this.canvas.scaleX;
			this.spriteOffsetFacingLeft = 22 * this.canvas.scaleX;
			this.sprite.y = -8 * this.canvas.scaleX;
			this.lastDieFrame = 28;
			
			this.gunX = this.width * .95;
			this.gunY = this.height * .3;
		}
		
		this.sprite.x = this.spriteOffsetFacingRight;
		this.sprite.gotoAndPlay('run');
		this.canvas.addChild(this.sprite);
		
		game.levelContainer.addChild(this.canvas);
	}
	
	hitGrid() {
		// Convert pixel positions to tile indices.
		var x = this.canvas.x;
		var y = this.canvas.y;
		var gridX1 = Math.floor(x / game.tileSize);
		var gridY1 = Math.floor(y / game.tileSize);
		var gridX2 = Math.floor((x + this.width) / game.tileSize);
		var gridY2 = Math.floor((y + this.height) / game.tileSize);
		
		// Go through all tiles that this object is at least partially in.
		for(var gridY = gridY1; gridY <= gridY2; gridY++) {
			for(var gridX = gridX1; gridX <= gridX2; gridX++) {
				if(!game.inGrid(gridX, gridY)) {
					return true;
				}
				var tile = game.grid[gridY][gridX];
				if(tile) {
					// Check if this tile stops you, or you can pass through.
					if(tile.type == TILE_TYPE_GEM) {
						// Collect any gems you're touching.
						if(this == game.you) {
							game.grid[gridY][gridX] = 0;
							tile.canvas.parent.removeChild(tile.canvas);
							game.gems++;
							game.gemsText.text = "x " + game.gems;
						}
					} else if(tile.type == TILE_TYPE_HUMAN) {
						// Rescue any humans you're touching.
						if(this.type == GUY_TYPE_HUMAN && !this.dead) {
							game.grid[gridY][gridX] = 0;
							tile.canvas.parent.removeChild(tile.canvas);
							new Guy(GUY_TYPE_HUMAN, gridX, gridY - 1);
						}
					} else if(tile.type == TILE_TYPE_SPIKE) {
						// Humans die if they hit spikes.
						if(this.type == GUY_TYPE_HUMAN && !this.dead) {
							this.takeDamage(99);
						}
						return true;
					} else {
						return true;
					}
				}
			}
		}
	}
	
	hitEnemy() {
		for(var guy of game.guys) {
			if(!guy.dead && guy.type != GUY_TYPE_HUMAN) {
				if(this.canvas.x + this.width >= guy.canvas.x && this.canvas.x <= guy.canvas.x + guy.width) {
					if(this.canvas.y + this.height >= guy.canvas.y && this.canvas.y <= guy.canvas.y + guy.height) {
						return guy;
					}
				}
			}
		}
	}
	
	AI() {
		if(this.type == GUY_TYPE_HUMAN) {
			if(this.canvas.x < game.you.canvas.x - game.tileSize) {
				this.speedX = this.thrustX;
			} else if(this.canvas.x > game.you.canvas.x + game.tileSize) {
				this.speedX = -this.thrustX;
			}
			
			if(this.onGround && this.canvas.y > game.you.canvas.y + game.tileSize) {
				this.speedY = -this.thrustY;
			}
		} else {
			this.speedX = this.thrustX;
			if(this.sprite.scaleX < 0) {
				this.speedX *= -1;
			}
			
			if(this.onGround && Math.random() < .01) {
				this.speedX *= -1;
			}
			
			if(this.onGround && Math.random() < .01) {
				this.speedY = -this.thrustY;
			}
		}
	}
	
	update() {
		
		if(this.dead) {
			// Don't move when dead, fade out.
			if(this.sprite.currentFrame == this.lastDieFrame) {
				this.sprite.stop();
				this.sprite.alpha -= .05;
				if(this.sprite.alpha <= 0) {
					this.remove();
					return;
				}
			}
		} else {
			// Controls.
			if(this == game.you) {
				game.controls();
			} else {
				this.AI();
			}
			
			if(this.type == GUY_TYPE_HUMAN) {
				if(!this.blink && this.hitEnemy()) {
					this.takeDamage(1);
				}
			}
		}
		
		// Apply gravity and friction.
		this.speedX *= game.friction;
		this.speedY += game.gravity;
		
		// Move object on the x axis.
		var oldX = this.canvas.x
		this.canvas.x += this.speedX;
		if(this.hitGrid()) {
			this.canvas.x = oldX;
			this.speedX = 0;
		}
		
		// Move object on the y axis.
		var oldY = this.canvas.y
		this.canvas.y += this.speedY;
		this.onGround = false;
		if(this.hitGrid()) {
			this.canvas.y = oldY;
			if(this.speedY > 0) {
				this.onGround = true;
			}
			this.speedY = 0;
		}
		
		// Set which way it's facing.
		if(this.speedX > 0) {
			this.sprite.x = this.spriteOffsetFacingRight;
			this.sprite.scaleX = 1;
		}
		if(this.speedX < 0) {
			this.sprite.x = this.spriteOffsetFacingLeft;
			this.sprite.scaleX = -1;
		}
		
		// Quickly fade out and in when it just took damage.
		if(this.blink > 0) {
			this.blink--;
			if(this.blink <= 0) {
				this.blink = 0;
				this.sprite.alpha = 1;
			} else {
				this.sprite.alpha = .5 + Math.sin(this.blink) / 2;
			}
		}
	}
	
	takeDamage(amount) {
		this.health -= amount;
		if(this.health <= 0) {
			this.die();
		} else {
			this.blink = Math.PI * 3;
			if(this.type == GUY_TYPE_HUMAN) {
				this.blink *= 4;
			}
		}
		
		// Update your health display.
		if(this == game.you) {
			for(var i = 0; i < amount; i++) {
				var canvas = game.displayHearts.pop();
				if(canvas) {
					canvas.parent.removeChild(canvas);
				}
			}
		}
	}
	
	die() {
		this.sprite.gotoAndPlay('die');
		this.dead = true;
	}
	
	remove() {
		this.canvas.parent.removeChild(this.canvas);
		game.guys.splice(game.guys.indexOf(this), 1);
	}
}