"use strict";
/**
 * Utils class to draw a stroke in canvas
 */
class Utils {
	blockSize;
	ctx;

	constructor({ blockSize }) {
		this.blockSize = blockSize;
		this.ctx = document.querySelector("canvas").getContext("2d");
	}

	drawStroke(start, end, color) {
		this.ctx.beginPath();
		this.ctx.setLineDash([5, 3]);
		this.ctx.moveTo(start[0] * this.blockSize + this.blockSize / 2, start[1] * this.blockSize + this.blockSize / 2);
		this.ctx.lineTo(end[0] * this.blockSize + this.blockSize / 2, end[1] * this.blockSize + this.blockSize / 2);
		this.ctx.strokeStyle = color;
		this.ctx.stroke();
	}

	distance(line1, line2, color) {
		this.drawStroke(line1, line2, color);
	}

	distanceCount(line1, line2, color) {
		let d = Math.sqrt(Math.abs(line1[1] - line2[1]) + Math.abs(line1[0] - line2[0]));
		this.ctx.fillStyle = color;
		this.ctx.font = "15px Arial";
		this.ctx.fillText(d, line2[0] * this.blockSize, line2[1] * this.blockSize - 10);
	}

	distancePerpendicular(line1, line2, line3, line4, color) {
		this.ctx.fillStyle = color;
		this.ctx.font = "15px Arial";
		this.drawStroke(line1, line2, color);
		this.ctx.fillText([line2], line2[0] * this.blockSize, line2[1] * this.blockSize - 30);

		this.drawStroke(line3, line4, color);
		this.ctx.fillText([line4], line4[0] * this.blockSize, line4[1] * this.blockSize + 30);
	}
}

/**
 * Class of Sound
 * Play an sound in browser
 */
class Sound {
	sound;

	constructor(src) {
		this.sound = document.createElement("audio");
		this.sound.src = src;
		this.sound.setAttribute("preload", "auto");
		this.sound.setAttribute("controls", "none");
		this.sound.style.display = "none";
		document.body.appendChild(this.sound);
	}

	play() {
		this.sound.play();
	}

	stop() {
		this.sound.pause();
	}
}

/**
 * Class of game
 */
class Game {
	// Sound Effect
	sound = {
		eat: null,
		gameOver: null,
	};

	// Interval
	interval;
	timeInterval;

	constructor({ element, size, blockSize, fps, utils, aStar }) {
		if (typeof utils === "object") {
			this.utils = utils;
		} else {
			this.utils = {
				showGrid: false,
				distance: false,
				distancePerependicular: false,
			};
		}

		this.fps = fps; // Framerate
		this.ctx = document.querySelector(element).getContext("2d"); // Get canvas
		this.scoreEl = document.querySelector("#score"); // HTML display of score

		this.aStar = aStar; // Bool, is run AStar true/false
		this.aStarBlock = []; // Astar recommendation for next move [x, y]
		this.aStarBlockIndex = 0; // Index for looping aStar

		this.move = []; // Snake next move [x, y]
		this.size = size; // Size of board px
		this.blockSize = blockSize; // Size of block px

		this.totalBlock = Math.floor(size / blockSize); // Total rows and columns block

		this.snake = [
			[1, 0],
			[0, 0],
		]; // Snake body

		this.direction = aStar ? false : 39; // Snake direction in keycode, rightArrow
		this.food = []; // Food position [x, y]
		this.score = 0; // Score

		this.utilities = new Utils({
			blockSize,
		}); // Show utilites

		// prepare all in constructor
		this.init();
	}

	setSound() {
		this.sound.eat = new Sound("sound/eated.mp3");
		this.sound.gameOver = new Sound("sound/gameover.mp3");
	}

	/**
	 * When game over condition
	 */
	gameOver() {
		clearInterval(this.interval);
		clearInterval(this.timeInterval);
		this.sound.gameOver.play();
	}

	/**
	 * When Object is eat a food
	 */
	eated() {
		this.sound.eat.play();
		this.score += 1;
		this.scoreEl.innerHTML = this.score;
		this.snake.push(this.food);
	}

	/**
	 * Draw a board on canvas
	 */
	drawBoard() {
		this.ctx.canvas.width = this.size;
		this.ctx.canvas.height = this.size;
		this.ctx.canvas.style.border = "1px solid #DDD";
	}

	drawGrid() {
		for (var x = 0; x < this.totalBlock; x++) {
			for (var y = 0; y < this.totalBlock; y++) {
				this.ctx.strokeStyle = "#DDD";
				this.ctx.strokeRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
			}
		}
	}

	/**
	 * Draw a block with color
	 */
	drawRect(x, y, color) {
		this.ctx.fillStyle = color;
		this.ctx.fillRect(x, y, this.blockSize, this.blockSize);
	}

	drawSnake() {
		const { snake, blockSize } = this;

		for (var i = 1; i < snake.length; i++) {
			this.ctx.strokeStyle = "#DDD";
			this.ctx.strokeRect(snake[i][0] * blockSize, snake[i][1] * blockSize, blockSize, blockSize);
			this.drawRect(snake[i][0] * blockSize, snake[i][1] * blockSize, "#000");
		}

		this.drawRect(snake[0][0] * blockSize, snake[0][1] * blockSize, "green");
	}

	/**
	 * Generate random food
	 */
	randomFood() {
		const { totalBlock, snake } = this;

		this.food = [Math.floor(Math.random() * totalBlock), Math.floor(Math.random() * totalBlock)];
		snake.map((x) => {
			if (JSON.stringify(x) === JSON.stringify(this.food)) {
				this.randomFood();
			}
		});
	}

	/**
	 * Draw generated food into board
	 */
	drawFood() {
		const { blockSize, food } = this;

		this.drawRect(food[0] * blockSize, food[1] * blockSize, "red");
	}

	/**
	 * Listener move of snake
	 */
	snakeMove() {
		document.onkeydown = function (e) {
			if (this.direction - e.keyCode !== 2 && this.direction - e.keyCode !== -2) {
				this.direction = e.keyCode;
			}
		};

		this.move = [this.snake[0][0], this.snake[0][1]];

		let { food, totalBlock, aStarBlock } = this;

		if (this.aStar) {
			if (aStarBlock[0] - this.move[1] == 1) this.direction = 40;
			else if (aStarBlock[0] - this.move[1] == -1) this.direction = 38;
			else if (aStarBlock[1] - this.move[0] == 1) this.direction = 39;
			else if (aStarBlock[1] - this.move[0] == -1) this.direction = 37;
		}

		switch (this.direction) {
			case 37: // leftArrow
				this.move[0] -= 1;
				break;
			case 38: // upArrow
				this.move[1] -= 1;
				break;
			case 39: // rightArrow
				this.move[0] += 1;
				break;
			case 40: // downArrow
				this.move[1] += 1;
				break;
		}

		if (this.move[0] > totalBlock - 1 || this.move[1] > totalBlock - 1 || this.move[0] < 0 || this.move[1] < 0) {
			this.gameOver();
		}

		this.snake.map((x) => {
			if (JSON.stringify(this.move) === JSON.stringify(x)) {
				this.gameOver();
			}
		});

		if (JSON.stringify(this.move) === JSON.stringify(food)) {
			this.eated();
			this.randomFood();
		}

		this.snake.unshift(this.move);
		this.snake.pop();
	}

	/**
	 * Run Astar Algorithm
	 */
	runAStar(snakePos) {
		let { food, totalBlock, snake } = this;

		// make an array with empty array based on amount of total block
		// let board = new Array(totalBlock).fill([]);
		let board = [];
		for (let i = 0; i < totalBlock; i++) {
			board.push([]);
		}

		for (let i = 0; i < totalBlock; i++) {
			for (let j = board[i].length; j < totalBlock; j++) {
				board[i].push(1);
			}
		}

		for (let i = 0; i < snake.length; i++) {
			board[snake[i][1]][[snake[i][0]]] = 0;
		}

		board = new Graph(board);
		const start = board.grid[snakePos[1]][snakePos[0]];
		const end = board.grid[food[1]][food[0]];

		// astar is global object
		const result = astar.search(board, start, end);

		if (board.length == 0) {
		}

		this.aStarBlock = result.length > 0 ? [result[0].x, result[0].y] : [0, 0];
	}

	/**
	 * Init all
	 */
	init() {
		this.setSound();
		this.drawBoard();
		this.utils.showGrid && this.drawGrid();
		this.drawSnake();
		this.randomFood();
		this.drawFood();

		this.runAStar(this.snake[0]);
	}

	update() {
		this.snakeMove();
		this.drawBoard();
		this.utils.showGrid && this.drawGrid();
		this.drawSnake();
		this.drawFood();

		this.utils.distance && this.utilities.distance(this.snake[0], this.food, "blue");
		this.utils.distanceCount && this.utilities.distanceCount(this.snake[0], this.food, "blue");
		this.utils.distancePerpendicular && this.utilities.distancePerpendicular(this.snake[0], [this.food[0], this.snake[0][1]], this.snake[0], [this.snake[0][0], this.food[1]], "blue");

		this.aStar && this.runAStar(this.move);
	}

	play() {
		this.interval = setInterval(() => this.update(), 1000 / this.fps);

		// every 1 second will show current time game is running
		this.timeInterval = setInterval(() => {
			const timeEl = document.querySelector("#time");
			const time = +timeEl.innerHTML + 1;

			// :TODO -> add algorithm to generate second, minutes, hours

			timeEl.innerHTML = time;
		}, 1000);
	}

	pause() {
		clearInterval(this.interval);
		clearInterval(this.timeInterval);
	}
}
