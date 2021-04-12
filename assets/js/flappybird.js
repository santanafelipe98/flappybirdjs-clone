/* 
 * Flappy Bird and all it's resources are properties of .GEARS Studios
 * All assets (sprites, sounds, etc.) used here are for research and study purposes only
 * Author: Felipe Santana
 * Year: 2021
 * Goals: Create a Flappy Bird clone game using purely Vanilla JS, HTML and CSS
*/

window.requestAnimationFrame = window.requestAnimationFrame ||
                               window.mozRequestAnimationFrame ||
                               window.webkitRequestAnimationFrame ||             
                               window.msRequestAnimationFrame;

///Global constants

const MAX_DISTANCE_BETWEEN_PIPES = 100;
const MIN_TOP_PIPE_Y_POSITION = 184;
const DEFAULT_PIPES_WIDTH = 52;

const flappyBird = {
    canvas: null,
    gravity: 0.5,
    background: null,
    floor: null,
    player: null,
    hud: null,
    pipes: null,
    stepID: null,
    state: {},
    audios: {
        die: './assets/sounds/sfx_die.wav',
        hit: './assets/sounds/sfx_hit.wav',
        point: './assets/sounds/sfx_point.wav',
        swooshing: './assets/sounds/sfx_swooshing.wav',
        wing: './assets/sounds/sfx_wing.wav'
    },
    screens: {
        main: document.getElementById('menuMain'),
        gameOver: document.getElementById('menuGameOver'),
        tutorial: document.getElementById('tutorial'),
        transition: document.getElementById('transition'),
    },
    controls: {
        btnStart: null,
        btnOK: null,
        btnPlayPause: null,
    },
    /**
     * Prepare all necessary things to make
     * the game work as expected
     */
    init() {
        //Get elements

        this.canvas = document.getElementById('canvas');
        this.background = document.getElementById('bg');
        this.floor = document.getElementById('floor');
        this.player = document.getElementById('player');
        this.hud = document.getElementById('hud');

        //Load sfxs

        this.loadAudios();

        //Reset player state

        this.resetPlayerState();
        this.hidePlayer();

        ///Spawn pipes

        this.pipes = this.spawnPipes();
        this.resetPipesState();

        //Setup controls (buttons, e.t.c)

        this.setupControls();
    },
    /**
     * Game step function
     * @returns {void}
     */
    step() {

        //Detect collision between player and floor objects

        if (this.collisionBetween(this.player, this.floor)) {
            this.setState({ gameOver: true }, this.gameOver.bind(this));
            window.cancelAnimationFrame(this.stepID);

            return;
        }

        for (let pipe of this.pipes) {
            let pipeTop = pipe.querySelector('.pipeTop');
            let pipeBottom = pipe.querySelector('.pipeBottom');
            let hitCounter = pipe.querySelector('.hitCounter');

            //Detect collision between player and pipes

            if (this.collisionBetween(this.player, pipeTop)
                || this.collisionBetween(this.player, pipeBottom)) {
                this.setState({ gameOver: true }, this.gameOver.bind(this));
                window.cancelAnimationFrame(this.stepID);

                //Play hit audio

                this.playAudio(this.audios.hit);

                return;
            }

            //Detect collision between player and hit counter
        
            if (this.collisionBetween(this.player, hitCounter)) {
                let hitClasses = hitCounter.classList;

                if (hitClasses.contains('enabled')) {
                    let currentScore = this.state.score + 1;
                    let scoreEl = document.getElementById('scoreMain');

                    this.setState(
                        { score: currentScore },
                        () => this.renderValue(currentScore, scoreEl));

                    hitClasses.toggle('enabled');
                }
            }

            if (this.isPipeOutsideRoom(pipe)) {
                //Respawn pipe

                this.respawnPipe(pipe);
            }

            //Keep moving the pipe

            this.movePipe(pipe);
        }

        this.physics();
        this.animatePlayer();

        this.stepID = window.requestAnimationFrame(this.step.bind(this));
    },
    /**
     * Starts a new game
     */
    newGame() {
        //Show main menu

        this.showMainMenu();

        //Animations
        
        this.background.style.animation = 'parallax 20s linear infinite';
        this.floor.style.animation = 'parallax 10s linear infinite';

        //Reset player state

        let scoreEl = document.getElementById('scoreMain');
        this.setState({ score: 0 }, () => this.renderValue(0, scoreEl));
        
        this.resetPlayerState();

        //Hide player

        this.hidePlayer();

        //Reset pipes state

        this.resetPipesState();
    },
    start() {
        this.setState({ isRunning: true });

        //Show player

        this.showPlayer();

        //Show tutorial screen

        this.showTutorial();
    },
    /**
     * Game over function
     */
    gameOver() {
        window.cancelAnimationFrame(this.stepID);

        this.setState({ isRunning: false });

        ///Stop parallax effect

        this.stopParallax(this.background);
        this.stopParallax(this.floor);

        //Show game over screen

        this.showGameOver();

        
        //play die sfx

        this.playAudio(this.audios.die);

        //play death animation

        window.requestAnimationFrame(this.deathAnimation.bind(this));
    },
    /**
     * Initalize the game's sfxs
     */
    loadAudios() {
        let soundsNames = Object.keys(this.audios);

        soundsNames.forEach(soundName => {
            let audioUrl = this.audios[soundName];
            let audio = new Audio(audioUrl);

            this.audios[soundName] = audio;
        });
    },
    /**
     * Reset player state
     */
    resetPlayerState() {
        this.setState({ score: 0 });

        let canvasHeight = this.getCanvasHeight();
        let playerHeight = this.getObjectHeight(this.player);
        
        this.setPlayerPosition(74, (canvasHeight / 2) - (playerHeight / 2));
        this.setPlayerDirection(0);

        this.setState({ player: { vspeed: 0 } });


        //Animation

        this.player.style.animation = 'flying 0.5s linear infinite';
    },
    /**
     * Reset pipes state
     */
    resetPipesState() {
        let pipesCount = 0;
        let canvasWidth = this.getCanvasWidth();

        for (let pipe of this.pipes) {
            let left = canvasWidth + ((MAX_DISTANCE_BETWEEN_PIPES + DEFAULT_PIPES_WIDTH) * pipesCount);
            let top = -MIN_TOP_PIPE_Y_POSITION + (Math.floor(Math.random() * MIN_TOP_PIPE_Y_POSITION));

            //Enable hit counter

            let hitCounter = pipe.querySelector('.hitCounter');
            hitCounter.classList.add('enabled');

            this.setObjectOffset(pipe, [ left, top ]);

            pipesCount++;
        }

        this.setState({ pipes: { hspeed: 1.5 } });
    },
    /**
     * Set the player's position on the screen
     * @param {number} x - The x position on the screen
     * @param {number} y - The y position on the screen
    */
    setPlayerPosition(x, y) {
        this.player.style.left = `${x}px`;
        this.player.style.top = `${y}px`;

        this.setState({ player: { offset: [ x, y ] }});
    },
    /**
     * Set the player's sprite direction
     * @param {number} direction - Angle in degrees 
    */
    setPlayerDirection(direction) {
        this.player.style.transform = `rotate(${direction}deg)`;

        this.setState({ player: { direction: direction }});
    },
    /**
     * Show player on scene
     */
    showPlayer() {
        this.player.style.display = 'block';
    },
    /**
     * Hide player on scene
     */
    hidePlayer() {
        this.player.style.display = 'none';
    },
    /**
     * Return canvas's width
     * @returns {number} - Canvas width
     */
    getCanvasWidth() {
        return this.canvas.clientWidth;
    },
    /**
     * Returns canvas's height
     * @returns {number} - Canvas height
     */
    getCanvasHeight() {
        return this.canvas.clientHeight;
    },
    /**
     * Spawn pipes
     * @param {number} count - The number of pipes to spawn
     * @returns {HTMLCollection} - The collection of pipes elements that have
     * just been created
     */
    spawnPipes(count = 3) {
        //Get canvas's width

        let canvasWidth = this.canvas.clientWidth;

        //Create pipes elements

        for (let i = 0; i < count; i++) {
            
            let left = canvasWidth + ((MAX_DISTANCE_BETWEEN_PIPES + DEFAULT_PIPES_WIDTH) * i);
            let top = -MIN_TOP_PIPE_Y_POSITION + (Math.floor(Math.random() * MIN_TOP_PIPE_Y_POSITION));

            let pipesEl = 
                `<div class="pipes" style="left: ${left}px; top: ${top}px;">
                    <div class="pipe pipeTop"></div>
                    <div class="hitCounter"></div>
                    <div class="pipe pipeBottom"></div>
                </div>`;
            
            this.canvas.insertAdjacentHTML('beforeend', pipesEl);
        }

        return document.getElementsByClassName('pipes');
    },
    /**
     * Respawn pipe
     * @param {HTMLElement} pipe - The pipe to respawn
     */
    respawnPipe(pipe) {
        let canvasWidth = this.getCanvasWidth();

        //Calculate new coordinates

        let pipesCount = this.pipes.length;
        let left = 0;

        for (let i = 0; i <= pipesCount - 1; i++) {
            if (i == pipesCount - 1) {
                left += MAX_DISTANCE_BETWEEN_PIPES;
            } else {
                left += MAX_DISTANCE_BETWEEN_PIPES + DEFAULT_PIPES_WIDTH;
            }
        }

        let top = -MIN_TOP_PIPE_Y_POSITION + (Math.floor(Math.random() * MIN_TOP_PIPE_Y_POSITION));

        let hitCounter = pipe.querySelector('.hitCounter');
        hitCounter.classList.add('enabled');
        
        this.setObjectOffset(pipe, [ left, top ]);
    },
    /**
     * Checks whether the tube has left the room 
     * @param {HTMLElement} pipe - The pipe element
     * @returns {boolean} - is outside?
     */
    isPipeOutsideRoom(pipe) {
        let offset = this.getObjectOffset(pipe);
        let width = this.getObjectWidth(pipe);

        return offset[0] <= -width;
    },
    /**
     * Setup all control elements
     */
    setupControls() {
        this.controls.btnStart = document.getElementById('btnStart');
        this.controls.btnPlayPause = document.getElementById('btnPlayPause');
        this.controls.btnOK = document.getElementById('btnOK');

        //Handle events

        //Start button click

        this.controls.btnStart.addEventListener(
            'click',
            (e) => this.handleButtonClick(e, this.start.bind(this))
        );
        
        //OK button click

        this.controls.btnOK.addEventListener(
            'click',
            (e) => this.handleButtonClick(e, this.newGame.bind(this)));

        //Tutorial screen click
            
        this.screens.tutorial.addEventListener('click', this.onTap.bind(this));

        //Canvas click

        this.canvas.addEventListener('click', () => {
            if (this.state.isRunning) {
                this.playAudio(this.audios.wing);
                this.impulsePlayer(6);
            }
        });
    },
    /**
     * 
     * Starts parallax effect
     */
    parallax() {
        this.floor.style.animation = 'parallax 5s linear infinite';
        this.background.style.animation = 'parallax 20s linear infinite';
    },
    /**
     * Stop parallax effect
     */
    stopParallax() {
        this.floor.style.animation = 'none';
        this.background.style.animation = 'none';
    },
    /** 
     * Applies gravity to the player
    */
    physics() {
        let playerState = Object.assign({}, this.state.player);

        if (playerState.vspeed < 16) {
            playerState.vspeed += this.gravity;
        }

        playerState.offset[1] += playerState.vspeed;

        this.setState({ player: playerState });
        this.setObjectOffset(this.player, playerState.offset);
    },
    /**
     * Checks collision between two elements
     * @param {HTMLElement} element1 
     * @param {HTMLElement} element2 
     * @returns {boolean} result
     */
     collisionBetween(element1, element2) {
        let element1Width = element1.clientWidth;
        let element2Width = element2.clientWidth;
        let element1Height = element1.clientHeight;
        let element2Height = element2.clientHeight;

        let [ x1, y1 ] = this.getObjectOffset(element1);
        let [ x2, y2 ] = this.getObjectOffset(element2);

        if (x1 + element1Width >= x2 && x1 <= x2 + element2Width) {
            if (y1 + element1Height >= y2 && y1 <= y2 + element2Height ) {
                return true;
            }
        }

        return false;
    },
    /**
     * Returns the elemet width
     * @param {HTMLElement} element - target
     * @returns {number} - element width
     */
    getObjectWidth(element) {
        return element.clientWidth;
    },
    /**
     * Returns the element height
     * @param {HTMLElement} element - target
     * @returns {number} - element height
     */
    getObjectHeight(element) {
        return element.clientHeight;
    },
    /**
     * Returns the canvas offset
     * @returns {number} canvas offset array
     */
    getCanvasOffset() {
        const rect = this.canvas.getBoundingClientRect();

        return [ rect.left, rect.top ];
    },
    /**
     * Return the object's position on canvas
     * @param {HTMLElement} element
     * @returns {Array} element x,y offset
     */
    getObjectOffset(element) {
        const rect = element.getBoundingClientRect();
        let canvasOffset = this.getCanvasOffset();

        const x = rect.left - canvasOffset[0];
        const y = rect.top - canvasOffset[1];

        return [ x, y ];
    },
    /**
     * Set the object's position on canvas
     * @param {HTMLElement} element 
     * @param {Array} offset 
     */
    setObjectOffset(element, offset) {
        const [ x = 0, y = 0 ] = offset;

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    },
    /**
     * Move the pipe element horizontally 
     * @param {HTMLElement} pipe - The pipe element to move 
     */
    movePipe(pipe) {
        let hspeed = this.state.pipes.hspeed;
        let pipeOffset = this.getObjectOffset(pipe);

        pipeOffset[0] -= hspeed;

        this.setObjectOffset(pipe, pipeOffset);
    },
    /**
     * Plays score counting animation 
     * @param {HTMLElement} target - The element that presents the score
     */
    countScore(target) {
        let timer = null;

        const counterFunc = (start = 0) => {
            if (start <= this.state.score) {
                this.renderValue(start, target);
                let current = ++start;

                timer = setTimeout(() => counterFunc(current), 300);
            } else {
                clearInterval(timer);
            }
        };

        counterFunc();
    },
    /**
     * Gives the player an impulse
     * @param {number} force - force
     */
    impulsePlayer(force) {
        let playerState = this.state.player;
        playerState.vspeed = -force;

        this.setState({ player: playerState });
    },
    /**
     * Controls the player's idle animation
     */
    animatePlayer() {
        let playerDirection = this.state.player.direction;

        //Controls player's direction

        if (this.state.player.vspeed > 10) {
            playerDirection = Math.min(45, playerDirection + 4);
        } else if (this.state.player.vspeed < 0 && this.state.player.vspeed <= 6) {
            playerDirection = Math.max(-45, playerDirection - 10);
        } else {
            playerDirection = 0;
        }

        this.setPlayerDirection(playerDirection);
    },
    /**
     * Plays player's death animation
     * @returns {void}
     */
    deathAnimation() {
        if (this.collisionBetween(this.player, this.floor)) {
            window.cancelAnimationFrame(this.stepID);
            this.player.style.animation = 'none';

            //Plays hit sfx

            this.playAudio(this.audios.hit);

            return;
        }

        let playerDirection = this.state.player.direction;

        this.physics();

        //Controls player's direction

        if (this.state.player.vspeed > 0) {
            playerDirection = Math.min(90, playerDirection + 10);
        }

        this.setPlayerDirection(playerDirection);        

        this.stepID = window.requestAnimationFrame(this.deathAnimation.bind(this));
    },
    /**
     * Plays an audio
     * @param {HTMLAudioElement} audio 
     */
    playAudio(audio) {
        if (!this.isAudioPlaying(audio)) {
            audio.load();
            audio.play();
        }
    },
    /**
     * Checks whether the audio is actually playing 
     * @param {HTMLAudioElement} audio 
     * @returns {boolean} result
     */
    isAudioPlaying(audio) {
        return !audio.paused;
    },
    /**
     * Hides screen
     * @param {HTMLElement} screen - Target screen
     */
    hideScreen(screen) {
        screen.style.display = 'none';
    },
    /**
     * Hides all screens except the given screen
     * @param {HTMLElement} screen - Exception screen
     */
    hideScreensExcept(screen) {
        let screenNames = Object.keys(this.screens);

        screenNames.forEach(screenName => {
            if (this.screens[screenName] !== screen) {
                this.hideScreen(this.screens[screenName]);
            }
        });
    },
    /**
     * Shows the main menu screen
     */
    showMainMenu() {
        //Hides others screens

        this.hideScreensExcept(this.screens.main);
        
        this.screens.transition.style.display = 'block';
        this.screens.transition.style.animation = 'none';
        this.screens.transition.style.animation = 'fadeOut 1s linear';
        this.screens.main.style.display = 'flex';
    },
    /**
     * Shows the tutorial screen
     */
    showTutorial() {
        //Hides others screens

        this.hideScreensExcept(this.screens.tutorial);
        this.screens.tutorial.style.display = 'flex';
    },
    /**
     * Shows the game over screen
     */
    showGameOver() {
        //Hides other screens

        this.hideHUD();
        this.hideScreensExcept(this.screens.gameOver);
        this.screens.gameOver.style.display = 'flex';

        let scoreFrameEl = document.getElementById('scoreFrame');
        let scoreCountEl = document.getElementById('scoreCount');
        let highscoreEl = document.getElementById('highscore');

        //Slide up the score frame

        scoreFrameEl.style.animation = 'slideUp 0.2s linear forwards';

        //Score

        let previousHighscore = this.getHighscore();
        let isNew = this.state.score > previousHighscore;

        this.addScoreToHighscore();
        this.countScore(scoreCountEl);

        //Highscore

        if (isNew) {
            //Play point's sfx
            this.playAudio(this.audios.point);
        }
        
        this.renderHighscore(isNew, highscoreEl);
    },
    /**
     * Shows the game HUD
     */
    showHUD() {
        this.hud.style.display = 'flex';
    },
    /**
     * Hides the game HUD
     */
    hideHUD() {
        this.hud.style.display = 'none';
    },
    /**
     * Custom handler for mouse click events
     * @param {Event} event - The mouse click event
     * @param {function} callback - A callback to handle the event call
     */
    handleButtonClick(event, callback) {
        let target = event.target;
        let targetStyle = window.getComputedStyle(target);
        let marginTop = parseInt(targetStyle.marginTop.replace('px', ''));

        target.style.marginTop = `${marginTop + 1}px`;

        let delay = setTimeout(() => {
            callback(event)

            //Reset margin top
            target.style.marginTop = `${marginTop}px`;
            
            //Clear timer
            clearTimeout(delay);
        }, 500);
    },
    /**
     * Handles tapping on tutorial screen
     */
    onTap() {
        this.hideScreen(this.screens.tutorial);
        //Show hud

        this.showHUD();

        this.stepID = window.requestAnimationFrame(this.step.bind(this));
    },
    /**
     * Updates the game state
     * @param {object} newState - Updated game state
     * @param {function} onComplete - Callback function
     */
    async setState(newState, onComplete) {
        let prevState = { ...this.state };
        this.state = extend({}, prevState, newState);

        if (onComplete) {
            onComplete(newState);
        }
    },
    /**
     * Add score to the highscore list
     * @returns {void}
     */
    addScoreToHighscore() {
        let currentScore = this.state.score;
        const highscore = localStorage.getItem('@highscore');

        if (!highscore) {
            let arr = [ currentScore ];
            localStorage.setItem('@highscore', JSON.stringify(arr));

            return;
        }

        let scoreList = JSON.parse(highscore);
        scoreList.push(currentScore);

        scoreList.sort((a, b) => a < b);

        //Limit to the 10 highest scores

        if (scoreList.length > 10) {
            scoreList.pop();
        }

        //Save highscore

        localStorage.setItem('@highscore', JSON.stringify(scoreList));
    },
    /**
     * Returns the highest score
     * @returns {number} Highest score
     */
    getHighscore() {
        const highscore = JSON.parse(localStorage.getItem('@highscore'));

        if (highscore) {
            return highscore[0];
        }

        return 0;
    },
    /**
     * Renders a value on the given target element 
     * @param {number} value - A value to render
     * @param {HTMLElement} target - A target element
     */
    renderValue(value, target) {
        let scoreDigits = value.toString().split('');
        let html = '';

        scoreDigits.forEach(digit => {
            html += `<span class="digit d${digit}" data-digit="${digit}"></span>`;
        });

        target.innerHTML = html;
    },
    /**
     * Renders the highscore on the given target element
     * @param {boolean} isNew - Represents if the new score is a new highscore
     * @param {HTMLElement} target - Target element
     */
    renderHighscore(isNew, target) {
        this.renderValue(this.getHighscore(), target);
        let newEl = document.getElementById('new');

        if (isNew) {
            newEl.style.display = 'block';
        } else {
            newEl.style.display = 'none';
        }
    }
};