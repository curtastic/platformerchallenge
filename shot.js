"use strict";

class Shot {
	constructor(x, y) {
		this.canvas = new createjs.Bitmap(game.queue.getResult('shot'));
		this.canvas.x = x;
		this.canvas.y = y;
		this.speedX = game.tileSize * .25;
		game.shots.push(this);
		game.levelContainer.addChild(this.canvas);
	}
	
	remove() {
		this.canvas.parent.removeChild(this.canvas);
		game.shots.splice(game.shots.indexOf(this), 1);
	}
	
	hitGrid() {
		// Convert pixel positions to tile indices.
		var x = this.canvas.x;
		var y = this.canvas.y;
		var gridX = Math.floor(x / game.tileSize);
		var gridY = Math.floor(y / game.tileSize);
		if(!game.inGrid(gridX, gridY)) {
			return true;
		}
		var tile = game.grid[gridY][gridX];
		if(tile) {
			// Check if this tile stops the shot, or can pass through.
			if(tile.type != TILE_TYPE_GEM) {
				return true;
			}
		}
	}
	
	hitEnemy() {
		for(var guy of game.guys) {
			if(!guy.dead && guy.type != GUY_TYPE_HUMAN) {
				if(this.canvas.x >= guy.canvas.x && this.canvas.x <= guy.canvas.x + guy.width) {
					if(this.canvas.y >= guy.canvas.y && this.canvas.y <= guy.canvas.y + guy.height) {
						return guy;
					}
				}
			}
		}
	}
	
	update() {
		// Move object on the x axis.
		this.canvas.x += this.speedX;
		
		// Check if it hit a wall.
		if(this.hitGrid()) {
			this.remove();
			return;
		}
		
		// Check if it hit an enemy.
		var guy = this.hitEnemy();
		if(guy) {
			guy.takeDamage(1);
			this.remove();
		}
	}
}