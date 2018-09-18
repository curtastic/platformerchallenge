"use strict";

class Game {
	constructor() {
		this.guySpriteSheet = [];
		this.guys = [];
		this.shots = [];
		this.keyRightIsDown = false;
		this.keyLeftIsDown = false;
		this.keySpaceIsDown = false;
		this.keyShootIsDown = false;
		this.friction = .8;
		this.tileSize = 128;
		this.gravity = this.tileSize * .004;
		this.gems = 0;
		this.cameraX = 0;
		this.cameraY = 0;
	}
	
	inGrid(gridX, gridY) {
		return gridX >= 0 && gridY >= 0 && gridX < this.grid[0].length && gridY < this.grid.length;
	}
	
	init() {
		
		window.onkeydown = (e) => {
			this.keyPressed(e.keyCode, true);
		}

		window.onkeyup = (e) => {
			this.keyPressed(e.keyCode, false);
		}

		window.onresize = this.resize.bind(this);
		
		this.grid = getGrid();
		
		this.canvas = myCanvas;
		this.stage = new createjs.Stage(this.canvas);
		this.levelContainer = new createjs.Container();
		
		this.queue = new createjs.LoadQueue();
		this.queue.on("complete", this.filesLoaded.bind(this), this);
		this.queue.loadFile({id: "background", src: "images/bg1600.jpg?v=2"});
		this.queue.loadFile({id: "tile1", src: "images/tile1.png"});
		this.queue.loadFile({id: "tile2", src: "images/tile2.png"});
		this.queue.loadFile({id: "gem", src: "images/gem.png"});
		this.queue.loadFile({id: "shot", src: "images/shot.png"});
		this.queue.loadFile({id: "hero", src: "images/hero100.png?v=8"});
		this.queue.loadFile({id: "golem", src: "images/golem200.png?v=5"});
		this.queue.loadFile({id: "heart", src: "images/heart.png"});
		this.queue.loadFile({id: "spike", src: "images/spike.png?v=2"});
		this.queue.loadFile({id: "human", src: "images/human.png"});
		
	}
	
	filesLoaded() {
		this.background = new createjs.Bitmap(this.queue.getResult('background'));
		this.stage.addChild(this.background);
		
		this.stage.addChild(this.levelContainer);
		
		this.guySpriteSheet[GUY_TYPE_HUMAN] = new createjs.SpriteSheet({
			framerate: 1,
			images: [this.queue.getResult('hero')],
			frames: {width: 98, height: 105},
			animations: {
				stand: [0, 3, "stand", .1],
				shoot: [4, 9, "shoot", .3],
				run: [12, 23, "run", .6],
				die: [24, 28, "die", .6]
			}
		});
		
		this.guySpriteSheet[GUY_TYPE_GOLEM] = new createjs.SpriteSheet({
			framerate: 1,
			images: [this.queue.getResult('golem')],
			frames: {width: 200, height: 170},
			animations: {
				stand: [0, 0, "stand", .3],
				shoot: [5, 8, "shoot", .3],
				run: [0, 4, "run", .16],
				die: [10, 14, "die", .3]
			}
		});
		
		this.you = new Guy(GUY_TYPE_HUMAN, 2, 7);
		
		this.resize();
		
		// Make your health display.
		this.displayHearts = [];
		for(var i = 0; i < this.you.health; i++) {
			var canvas = new createjs.Bitmap(this.queue.getResult('heart'));
			canvas.x = window.innerWidth / 2 / this.stage.scaleX + (i - this.you.health / 2) * 55;
			canvas.y = 11;
			canvas.scaleX = canvas.scaleY = .5;
			this.displayHearts.push(canvas);
			this.stage.addChild(canvas);
		}
		
		// Make your gems display.
		var canvas = new createjs.Bitmap(this.queue.getResult('gem'));
		canvas.x = 11;
		canvas.y = 11;
		canvas.scaleY = 1.2;
		this.stage.addChild(canvas);
		
		this.gemsText = new createjs.Text("x 0", "40px Arial", "#000");
		this.gemsText.x = 72;
		this.gemsText.y = 14;
		this.stage.addChild(this.gemsText);
		
		
		var gemWidth = .8 * this.tileSize;
		var gemHeight = .5 * this.tileSize;
		var gemFileWidth = this.queue.getResult('gem').width;
		var gemFileHeight = this.queue.getResult('gem').height;
		
		// Create all of the objects in the level.
		for(var y = 0; y < this.grid.length; y++) {
			for(var x = 0; x < this.grid[0].length; x++) {
				var tileType = this.grid[y][x];
				if(tileType) {
					if(tileType == TILE_TYPE_GOLEM) {
						new Guy(GUY_TYPE_GOLEM, x, y);
						this.grid[y][x] = 0;
					} else {
						// Figure out which image to put in this tile.
						var imageName = 'gem';
						if(tileType == TILE_TYPE_DIRT) {
							if(y > 0 && this.grid[y-1][x] && this.grid[y-1][x].type == TILE_TYPE_DIRT) {
								imageName = 'tile1';
							} else {
								imageName = 'tile2';
							}
						} else if(tileType == TILE_TYPE_SPIKE) {
							imageName = 'spike';
						} else if(tileType == TILE_TYPE_HUMAN) {
							imageName = 'human';
						}
						var canvas = new createjs.Bitmap(this.queue.getResult(imageName));
						canvas.x = x * this.tileSize;
						canvas.y = y * this.tileSize;
						
						// Center the gem within the tile.
						if(tileType == TILE_TYPE_GEM) {
							canvas.scaleX = gemWidth / gemFileWidth;
							canvas.scaleY = gemHeight / gemFileHeight;
							canvas.x += (this.tileSize - gemWidth) / 2;
							canvas.y += (this.tileSize - gemHeight) / 2;
						}
						else if(tileType == TILE_TYPE_HUMAN) {
							canvas.scaleX = canvas.scaleY = 2.2;
						}
						
						this.grid[y][x] = {canvas: canvas, type: tileType};
						this.levelContainer.addChild(canvas);
					}
				}
			}
		}
		
		
		createjs.Ticker.setFPS(60);
		createjs.Ticker.addEventListener("tick", this.tick.bind(this));
	}
	
	resize() {
		// Make the canvas be the same size as the screen.
		this.canvas.setAttribute('width', window.innerWidth);
		this.canvas.setAttribute('height', window.innerHeight);
		this.stage.scaleX = this.stage.scaleY = (window.innerHeight / this.grid.length) / this.tileSize
		
		// Make the background always cover the whole screen.
		var spaceX = window.innerWidth / this.queue.getResult('background').width / this.stage.scaleX;
		var spaceY = window.innerHeight / this.queue.getResult('background').height / this.stage.scaleX;
		var scale = Math.max(spaceX, spaceY);
		this.background.scaleX = scale;
		this.background.scaleY = scale;
	}
	
	controls() {
		// Move left/right.
		if(this.keyRightIsDown) {
			this.you.speedX = this.you.thrustX;
			if(this.you.sprite.currentAnimation != 'run' && (this.you.sprite.currentAnimation != 'shoot' || this.you.sprite.paused)) {
				this.you.sprite.gotoAndPlay('run');
			}
		} else if(this.keyLeftIsDown) {
			this.you.speedX = -this.you.thrustX;
			if(this.you.sprite.currentAnimation != 'run' && (this.you.sprite.currentAnimation != 'shoot' || this.you.sprite.paused)) {
				this.you.sprite.gotoAndPlay('run');
			}
		} else {
			if(this.you.onGround) {
				if(this.you.sprite.currentAnimation != 'stand' && this.you.sprite.currentAnimation != 'shoot') {
					this.you.sprite.gotoAndPlay('stand');
				}
			}
		}
		
		// Shoot.
		if(this.keyShootIsDown) {
			this.keyShootIsDown = false;
			this.you.sprite.gotoAndPlay('shoot');
			var gunX = this.you.width / 2 + this.you.gunX;
			if(this.you.sprite.scaleX < 0) {
				gunX *= -.7;
			}
			var shot = new Shot(this.you.canvas.x + gunX, this.you.canvas.y + this.you.gunY);
			if(this.you.sprite.scaleX < 0) {
				shot.speedX *= -1;
			}
		}
		if(this.you.sprite.currentAnimation == 'shoot' && this.you.sprite.currentFrame == 9) {
			this.you.sprite.stop();
		}
		
		// Jump.
		if(this.keySpaceIsDown && this.you.onGround) {
			this.you.speedY = -this.you.thrustY;
		}
	}
	
	tick(e) {
		
		// Update guys.
		for(var guy of this.guys) {
			guy.update();
		}
		
		// Update shots.
		for(var shot of this.shots) {
			shot.update();
		}
		
		// Update camera.
		this.cameraX = this.you.canvas.x - this.canvas.width/2 / this.stage.scaleX;
		if(this.cameraX < 0) {
			this.cameraX = 0;
		}
		this.levelContainer.x = -this.cameraX;
		
		this.stage.update();
	}
	
	keyPressed(keyCode, down) {
		if(keyCode == KEY_ARROW_LEFT || keyCode == KEY_A) {
			this.keyLeftIsDown = down;
		} else if(keyCode == KEY_ARROW_RIGHT || keyCode == KEY_D) {
			this.keyRightIsDown = down;
		} else if(keyCode == KEY_SPACE || keyCode == KEY_ARROW_UP || keyCode == KEY_W) {
			this.keySpaceIsDown = down;
		} else if(keyCode == KEY_ENTER || keyCode == KEY_SHIFT) {
			this.keyShootIsDown = down;
		}
	}
}

const TILE_TYPE_DIRT = 1;
const TILE_TYPE_GEM = 2;
const TILE_TYPE_GOLEM = 3;
const TILE_TYPE_SPIKE = 4;
const TILE_TYPE_HUMAN = 5;

const GUY_TYPE_HUMAN = 1;
const GUY_TYPE_GOLEM = 2;

const KEY_A = 65;
const KEY_S = 83;
const KEY_D = 68;
const KEY_W = 87;
const KEY_ARROW_LEFT = 37;
const KEY_ARROW_UP = 38;
const KEY_ARROW_RIGHT = 39;
const KEY_ARROW_DOWN = 40;
const KEY_SPACE = 32;
const KEY_ENTER = 13;
const KEY_SHIFT = 16;

var game = new Game();

window.onload = () => {
	game.init();
}