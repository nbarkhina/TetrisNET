var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var GAME_MODE;
    (function (GAME_MODE) {
        GAME_MODE[GAME_MODE["TITLE"] = 1] = "TITLE";
        GAME_MODE[GAME_MODE["PLAYING"] = 2] = "PLAYING";
        GAME_MODE[GAME_MODE["PAUSED"] = 3] = "PAUSED";
    })(GAME_MODE || (GAME_MODE = {}));
    class GamePadState {
        constructor(buttonNum, keyName) {
            this.buttonDown = false;
            this.buttonNum = -1;
            this.buttonTimer = 0;
            this.keyName = '';
            this.buttonNum = buttonNum;
            this.keyName = keyName;
        }
    }
    exports.GamePadState = GamePadState;
    //this is a good technique
    //so i don't need to keep casting from window.app
    var app;
    class MyApp {
        constructor() {
            this.message = '';
            // keytimer = 0;
            this.downkeytimer = 0;
            this.leftkeytimer = 0;
            this.rightkeytimer = 0;
            this.game_mode = GAME_MODE.TITLE;
            this.waitForDownKeyRelease = false;
            this.gamepadButtons = [];
            this.player1Status = ''; //to see if player is connected
            this.player2Status = ''; //to see if player is connected
            this.player1 = new Player(); //player object
            this.player2 = new Player(); //player object
            this.networkStatus = ''; //used for various status messages
            this.playerNum = 0; //which player is this 1 or 2
            this.networkConsole = false; //print network stats to console
            this.competitorBoard = '';
            this.garbageQueue = [];
            this.gameScore = 0;
            this.opponentScore = 0;
            this.gameLobby = '';
            /* KEYBOARD CONTROLS */
            this.dropKey = false;
            this.upKey = false;
            /* TOUCH CONTROLS */
            this.touchDirection = '';
            this.touchX_Start = 0;
            this.touchX_InitialStart = 0;
            this.touchY_Start = 0;
            this.touch_threshold = 25;
            this.lastTouch = new Date();
            this.touchTimer = 0;
            this.touchMoved = false;
            //slowly move the piece down
            //rather than fast drop
            this.touchSlowDownCounter = 0;
            this.touchSlowDownMode = false;
            this.reverseRotate = false;
            //draw:boolean = false;
            this.lastCalledTime = new Date();
            this.fpscounter = 0;
            this.currentfps = 0;
            this.bindRivets();
            this.createGameTable();
            this.initGame();
            this.setupSignalRConnection();
            // smurf;
            requestAnimationFrame(this.requestNextFrame);
            $('#header')[0].addEventListener('touchstart', function (e) { e.stopPropagation(); }, false);
            $('#header')[0].addEventListener('touchend', function (e) { e.stopPropagation(); }, false);
            $('#divMain')[0].addEventListener('touchstart', this.touchStart, false);
            $('#divMain')[0].addEventListener('touchend', this.touchEnd, false);
            $('#divMain')[0].addEventListener('touchmove', this.touchMove, false);
            document.onkeydown = this.keyDown;
            document.onkeyup = this.keyUp;
            window.addEventListener("gamepadconnected", this.initGamePad.bind(this));
            window.addEventListener("resize", this.onWindowResize.bind(this));
        }
        /* NETWORK FUNCTIONS */
        setupSignalRConnection() {
            return __awaiter(this, void 0, void 0, function* () {
                if (window.location.href.includes('localhost')) {
                    this.signalrConnection = new signalR.HubConnectionBuilder().withUrl("/emuhub").build();
                }
                else {
                    //change this to your prod URL
                    this.signalrConnection = new signalR.HubConnectionBuilder().withUrl("/tetrisnet/emuhub").build();
                }
                this.signalrConnection.serverTimeoutInMilliseconds = 100000; // 100 second
                this.signalrConnection.start().then(function () {
                    console.log('SignalR connection started');
                }).catch(function (err) {
                    console.log('SignalR Error', err.toString());
                });
                this.signalrConnection.onclose(function (e) {
                    console.log('conn closed', e);
                    app.player1Status = '';
                    app.player2Status = '';
                    toastr.error('You were disconnected');
                });
                //used for various status updates
                this.signalrConnection.on("ReceiveMessage", function (message, details) {
                    console.log(message, details);
                    if (message == "Broadcast") {
                        //TBD
                    }
                    if (message == "PlayerDisconnected") {
                        let disconnectedPlayer = details;
                        if (disconnectedPlayer == "1")
                            app.player1Status = '';
                        if (disconnectedPlayer == "2")
                            app.player2Status = '';
                        $('#btnNewGame').prop("disabled", true);
                        toastr.error('Player ' + disconnectedPlayer + ' Disconnected');
                        // app.disconnectFromServer();
                    }
                    app.networkStatus = 'Message: ' + message + ' Details: ' + details;
                });
                //used to start the game
                this.signalrConnection.on("StartGame", function () {
                    console.log('Start Game received');
                    app.reset();
                });
                //used to start the game
                this.signalrConnection.on("GameOver", function (playerWhoLost) {
                    let won = "yes";
                    if (playerWhoLost == app.playerNum) {
                        $('#winBox').css('color', 'red');
                        $('#winBoxText').text('You Lost');
                        $('#winBox').show();
                        won = "no";
                        app.opponentScore++;
                    }
                    else {
                        app.gameover();
                        $('#winBox').css('color', 'green');
                        $('#winBoxText').text('You Won!');
                        $('#winBox').show();
                        app.gameScore++;
                    }
                    app.logScore(won);
                });
                //when receiving competitor's board
                this.signalrConnection.on("ReceiveBoard", function (board) {
                    // console.log('board received', board);
                    app.competitorBoard = board;
                });
                //when receiving competitor's garbage
                this.signalrConnection.on("ReceiveGarbage", function (numLines) {
                    console.log('garbage received', numLines);
                    app.garbageQueue.push(numLines);
                });
                //initial connected signal
                this.signalrConnection.on("Connected", function (status, player) {
                    if (status == "Success") {
                        app.playerNum = player.playerNum;
                        app.networkStatus = 'Hi Player ' + app.playerNum + " (lobby " + player.gameID + ")";
                        app.gameLobby = player.gameID;
                        document.title = 'TetrisNET - Player ' + app.playerNum;
                        if (app.playerNum == 1) {
                            app.player1 = player;
                            app.player1Status = 'Online'; // (' + player.ipAddress + ')';
                        }
                        if (app.playerNum == 2) {
                            app.player2 = player;
                            app.player2Status = 'Online'; // (' + player.ipAddress + ')';
                        }
                    }
                    else {
                        app.networkStatus = status;
                    }
                    console.log(status, player);
                });
                //all connected signal
                this.signalrConnection.on("AllClientsConnected", function (player1, player2) {
                    app.player1 = player1;
                    app.player2 = player2;
                    app.player1Status = 'Online'; // (' + player1.ipAddress + ')';
                    app.player2Status = 'Online'; // (' + player2.ipAddress + ')';
                    $('#btnNewGame').prop("disabled", false);
                    app.networkStatus = 'Game Ready (lobby ' + player1.gameID + ")";
                    console.log(status, player1, player2);
                });
                //disconnect
                this.signalrConnection.on("AllGames", function (games) {
                    console.log('all games', games);
                });
                //disconnect
                this.signalrConnection.on("Shutdown", function () {
                    app.disconnectFromServer();
                });
            });
        }
        disconnectFromServer() {
            console.log('Shutting Down Connection');
            this.signalrConnection.stop();
            this.player1Status = '';
            this.player2Status = '';
            $('#btnNewGame').prop("disabled", true);
        }
        disconnectPlayers() {
            app.signalrConnection.invoke("ForceDisconnectAll").catch(function (err) {
                return console.error(err.toString());
            });
        }
        getAllGames() {
            app.signalrConnection.invoke("GetAllGames").catch(function (err) {
                return console.error(err.toString());
            });
        }
        sendUpdateBoard() {
            let currentBoard = '';
            for (let i = 0; i < 20; i++) {
                for (let j = 0; j < 10; j++) {
                    if (app.gameMatrix[i][j] > 0)
                        currentBoard += '1';
                    else
                        currentBoard += '0';
                }
            }
            app.signalrConnection.invoke("UpdateBoard", currentBoard).catch(function (err) {
                return console.error(err.toString());
            });
        }
        /* GAMEPAD CONTROLS */
        initGamePad(e) {
            try {
                if (e.gamepad.buttons.length > 0) {
                    this.message = '<b>Gamepad Detected:</b><br>' + e.gamepad.id;
                }
            }
            catch (_a) { }
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.", e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);
        }
        processGamepad() {
            try {
                var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
                if (!gamepads)
                    return;
                var gp = null;
                for (let i = 0; i < gamepads.length; i++) {
                    if (gamepads[i] && gamepads[i].buttons.length > 0)
                        gp = gamepads[i];
                }
                if (gp) {
                    for (let i = 0; i < gp.buttons.length; i++) {
                        // if (gp.buttons[i].pressed)
                        //     console.log(i);
                    }
                    this.gamepadButtons.forEach(button => {
                        //handle left/right differently - add delay
                        // if (button.keyName=='Left' || button.keyName=='Right')
                        // {
                        //     if (gp.buttons[button.buttonNum].pressed)
                        //     {
                        //         if (button.buttonTimer==0 || (button.buttonTimer>10 && button.buttonTimer%3==0))
                        //         {
                        //             if (button.keyName=='Left') this.moveLeft();
                        //             if (button.keyName=='Right') this.moveRight();
                        //         }
                        //         button.buttonDown = true;
                        //         button.buttonTimer++;
                        //     }
                        //     else if (button.buttonDown)
                        //     {
                        //         button.buttonDown = false;
                        //         button.buttonTimer = 0;
                        //     }
                        // }
                        // else
                        {
                            if (gp.buttons[button.buttonNum].pressed) {
                                if (button.buttonTimer == 0) {
                                    if (button.buttonNum == 2)
                                        this.reverseRotate = true;
                                    this.sendKeyDownEvent(button.keyName);
                                    // console.log('button timer: ' + button.buttonTimer);
                                }
                                button.buttonDown = true;
                                button.buttonTimer++;
                            }
                            else if (button.buttonDown) {
                                // console.log('gamepad up');
                                if (!gp.buttons[button.buttonNum].pressed) {
                                    button.buttonDown = false;
                                    button.buttonTimer = 0;
                                    this.sendKeyUpEvent(button.keyName);
                                }
                            }
                        }
                    });
                }
            }
            catch (_a) { }
        }
        sendKeyDownEvent(key) {
            let keyEvent = new KeyboardEvent('Gamepad Event Down', { key: key });
            this.keyDown(keyEvent);
        }
        sendKeyUpEvent(key) {
            let keyEvent = new KeyboardEvent('Gamepad Event Up', { key: key });
            this.keyUp(keyEvent);
        }
        keyDown(event) {
            let app = window.myApp;
            if (event.key == 'ArrowDown' || event.key == 'Down')
                app.downKey = true;
            if (event.key == 'ArrowLeft' || event.key == 'Left') {
                app.leftKey = true;
            }
            if (event.key == 'ArrowRight' || event.key == 'Right') {
                app.rightKey = true;
            }
            if (event.key == 'a' && !app.dropKey) {
                app.drop();
                app.dropKey = true;
            }
            if ((event.key == 'ArrowUp' || event.key == 'Up') && !app.upKey) {
                app.rotate();
                app.upKey = true;
                this.reverseRotate = false; //reset reverse rotate
            }
            if (event.key == 'p') {
                app.btnPause();
            }
            if (event.key == 'n') {
                app.newGame_Click();
            }
        }
        keyUp(event) {
            let app = window.myApp;
            // console.log(event);
            if (event.key == 'a') {
                app.dropKey = false;
            }
            if ((event.key == 'ArrowUp' || event.key == 'Up')) {
                app.upKey = false;
            }
            if (event.key == 'ArrowDown' || event.key == 'Down') {
                app.waitForDownKeyRelease = false;
                app.downKey = false;
            }
            if (event.key == 'ArrowLeft' || event.key == 'Left') {
                app.leftKey = false;
            }
            if (event.key == 'ArrowRight' || event.key == 'Right') {
                app.rightKey = false;
            }
        }
        touchStart(event) {
            let app = window.myApp;
            //PREVENT DOUBLE TAP ZOOM ON IOS
            let delta = (new Date().getTime() - app.lastTouch.getTime());
            if (delta < 500) {
                event.preventDefault();
            }
            app.lastTouch = new Date();
            app.touchX_Start = event.touches[0].clientX;
            app.touchX_InitialStart = event.touches[0].clientX;
            app.touchY_Start = event.touches[0].clientY;
            app.touchSlowDownCounter = event.touches[0].clientY;
            app.touchTimer = 0;
            app.touchMoved = false;
        }
        touchMove(event) {
            event.preventDefault();
            let app = window.myApp;
            if (app.game_mode != GAME_MODE.PLAYING)
                return;
            let xDistance = Math.abs(event.touches[0].clientX - app.touchX_Start);
            let yDistance = Math.abs(event.touches[0].clientY - app.touchY_Start);
            let movingDown = false;
            if (yDistance > xDistance)
                movingDown = true;
            if (!movingDown) {
                if (event.touches[0].clientX < app.touchX_Start - app.touch_threshold) {
                    app.touchX_Start = event.touches[0].clientX;
                    app.moveLeft();
                }
                if (event.touches[0].clientX > app.touchX_Start + app.touch_threshold) {
                    app.touchX_Start = event.touches[0].clientX;
                    app.moveRight();
                }
            }
            //NEW section to slowly move it down
            else {
                //waitForDownKeyRelase so that it doesn't
                //keep moving down after a block has dropped
                if (!app.waitForDownKeyRelease && !app.toClear) {
                    //only if touch point starts at 250 or above
                    if (app.touchY_Start < 250 && event.touches[0].clientY > app.touchSlowDownCounter + app.touch_threshold - 10) {
                        app.touchSlowDownCounter = event.touches[0].clientY;
                        app.moveDown();
                        app.touchSlowDownMode = true;
                        app.touchDirection = 'down';
                    }
                    if (xDistance > 50) {
                        if (event.touches[0].clientX < app.touchX_Start - app.touch_threshold) {
                            app.moveLeft();
                        }
                        if (event.touches[0].clientX > app.touchX_Start + app.touch_threshold) {
                            app.moveRight();
                        }
                    }
                }
            }
            let leftCounter = 0;
            let rightCounter = 0;
            let upCounter = 0;
            let downCounter = 0;
            if (event.touches[0].clientX < app.touchX_InitialStart - app.touch_threshold) {
                leftCounter = app.touchX_InitialStart - event.touches[0].clientX;
            }
            if (event.touches[0].clientX > app.touchX_InitialStart + app.touch_threshold) {
                rightCounter = event.touches[0].clientX - app.touchX_InitialStart;
            }
            if (event.touches[0].clientY < app.touchY_Start - app.touch_threshold) {
                upCounter = app.touchY_Start - event.touches[0].clientY;
            }
            if (event.touches[0].clientY > app.touchY_Start + app.touch_threshold) {
                downCounter = event.touches[0].clientY - app.touchY_Start;
            }
            if (leftCounter > 0 || rightCounter > 0 || upCounter > 0 || downCounter > 0) {
                let greatest = app.findGreatest([leftCounter, rightCounter, upCounter, downCounter]);
                if (greatest == 0)
                    app.touchDirection = 'left';
                if (greatest == 1)
                    app.touchDirection = 'right';
                if (greatest == 2)
                    app.touchDirection = 'up';
                if (greatest == 3)
                    app.touchDirection = 'down';
            }
        }
        touchEnd(event) {
            let app = window.myApp;
            if (app.game_mode != GAME_MODE.PLAYING)
                return;
            if (app.touchDirection == 'left') {
                // if (!app.touchMoved)
                // app.moveLeft();
            }
            if (app.touchDirection == 'right') {
                // if (!app.touchMoved)
                // app.moveRight();
            }
            //don't drop if in slow touch down mode
            if (app.touchDirection == 'down' && !app.touchSlowDownMode) {
                app.drop();
            }
            if (app.touchDirection == '') {
                // let xDistance = Math.abs(event.touches[0].clientX-this.touchX_Start);
                // let yDistance = Math.abs(event.touches[0].clientY-this.touchY_Start);
                // if (xDistance+yDistance<8)
                app.rotate();
                this.reverseRotate = false; //reset reverse rotate
            }
            // app.downKey = false;
            app.touchDirection = '';
            app.touchSlowDownMode = false;
            app.waitForDownKeyRelease = false;
            // app.leftKey = false;
            // app.rightKey = false;
        }
        findGreatest(nums) {
            let greatest = 0;
            let greatestIndex = 0;
            for (let i = 0; i < nums.length; i++) {
                if (nums[i] > greatest) {
                    greatestIndex = i;
                    greatest = nums[i];
                }
            }
            return greatestIndex;
        }
        bindRivets() {
            rivets.bind($('body'), { data: this });
            setTimeout(() => {
                $("#loadingDiv").hide();
                $("#header").show();
                $("#gameArea").show();
            }, 500);
        }
        getRandomNumber(max) {
            return Math.floor(Math.random() * Math.floor(max));
        }
        newGame_Click() {
            console.log('sending StartGame');
            app.signalrConnection.invoke("StartGame").catch(function (err) {
                return console.error(err.toString());
            });
            this.reset();
        }
        initGame() {
            this.fps = 0;
            this.nextLevel = 0;
            this.timer = 0;
            this.piece = 0;
            this.state = 0;
            this.centX = 0;
            this.centY = 0;
            this.score = 0;
            this.level = 0;
            this.lines = 0;
            this.nextPiece = this.getRandomNumber(7) + 1;
            this.toClear = false;
            this.toMakePiece = true;
            this.downKey = false;
            this.leftKey = false;
            this.rightKey = false;
            this.gameMatrix = [];
            this.gameMatrixBuffer = [];
            this.delay = 32;
            for (let i = 0; i < 20; i++) {
                let arr1 = [];
                let arr2 = [];
                this.gameMatrix.push(arr1);
                this.gameMatrixBuffer.push(arr2);
                for (let j = 0; j < 10; j++) {
                    this.gameMatrix[i][j] = 0;
                    this.gameMatrixBuffer[i][j] = 0;
                }
            }
            this.nextPieceMatrix = [];
            for (let i = 0; i < 4; i++) {
                let arr3 = [];
                this.nextPieceMatrix.push(arr3);
                for (let j = 0; j < 5; j++)
                    this.nextPieceMatrix[i][j] = 0;
            }
            this.gamepadButtons.push(new GamePadState(14, 'Left'));
            this.gamepadButtons.push(new GamePadState(15, 'Right'));
            this.gamepadButtons.push(new GamePadState(13, 'Down'));
            this.gamepadButtons.push(new GamePadState(0, 'Up')); //rotate
            this.gamepadButtons.push(new GamePadState(2, 'Up')); //reverse rotate
            this.gamepadButtons.push(new GamePadState(12, 'a'));
            this.gamepadButtons.push(new GamePadState(9, 'p'));
            this.gamepadButtons.push(new GamePadState(8, 'n'));
        }
        reset() {
            this.game_mode = GAME_MODE.PLAYING;
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 7; j++)
                    this.nextPieceMatrix[i][j] = 0;
            }
            $('#winBox').hide();
            this.garbageQueue = [];
            this.nextLevel = 0;
            this.timer = 0;
            this.piece = 0;
            this.state = 0;
            this.centX = 0;
            this.centY = 0;
            this.score = 0;
            this.level = 1;
            this.lines = 0;
            this.waitForDownKeyRelease = false;
            this.nextPiece = this.getRandomNumber(7) + 1;
            this.toClear = false;
            this.toMakePiece = true;
            this.downKey = false;
            this.leftKey = false;
            this.rightKey = false;
            this.gameMatrix = [];
            this.gameMatrixBuffer = [];
            for (let i = 0; i < 20; i++) {
                let arr1 = [];
                let arr2 = [];
                this.gameMatrix.push(arr1);
                this.gameMatrixBuffer.push(arr2);
                for (let j = 0; j < 10; j++) {
                    this.gameMatrix[i][j] = 0;
                    this.gameMatrixBuffer[i][j] = 0;
                }
            }
        }
        gameLoop() {
            //program loop
            if (this.game_mode != GAME_MODE.PLAYING) {
                return;
            }
            //put delays on directional keys - for right/left move once then wait
            if (this.downKey)
                this.downkeytimer++;
            else
                this.downkeytimer = 0;
            if (this.leftKey)
                this.leftkeytimer++;
            else
                this.leftkeytimer = 0;
            if (this.rightKey)
                this.rightkeytimer++;
            else
                this.rightkeytimer = 0;
            if (this.level == 1)
                this.levelSpeed = 30;
            if (this.level == 2)
                this.levelSpeed = 25;
            if (this.level == 3)
                this.levelSpeed = 20;
            if (this.level == 4)
                this.levelSpeed = 17;
            if (this.level == 5)
                this.levelSpeed = 14;
            if (this.level == 6)
                this.levelSpeed = 10;
            if (this.level == 7)
                this.levelSpeed = 8;
            if (this.level == 8)
                this.levelSpeed = 5;
            if (this.level == 9)
                this.levelSpeed = 3;
            if (this.level == 10)
                this.levelSpeed = 2;
            if (this.timer == -1)
                this.checkMatrix();
            if (this.toClear)
                this.timer--;
            else
                this.timer++;
            if (this.timer == -24) {
                this.clearBlocks();
                this.toClear = false;
                this.timer = 0;
            }
            if (this.toMakePiece && this.timer >= 0) {
                this.makePiece();
                this.toMakePiece = false;
                if (this.downKey || this.touchSlowDownMode) //prevent constant downkey if new piece is generated
                 {
                    this.waitForDownKeyRelease = true;
                }
            }
            if (this.downKey && !this.toClear && !this.waitForDownKeyRelease) {
                if (this.downkeytimer % 3 == 0)
                    this.moveDown();
            }
            if (this.leftKey && !this.toClear) {
                if (this.leftkeytimer == 1 || (this.leftkeytimer > 15 && this.leftkeytimer % 3 == 0))
                    this.moveLeft();
            }
            if (this.rightKey && !this.toClear) {
                if (this.rightkeytimer == 1 || (this.rightkeytimer > 15 && this.rightkeytimer % 3 == 0))
                    this.moveRight();
            }
            if (this.timer == this.levelSpeed) {
                this.timer = 0;
                this.moveDown();
            }
            this.findShadow();
        }
        logScore(win) {
            let referrer = document.referrer;
            if (referrer == null || referrer == "")
                referrer = "NONE";
            if (document.location.href.toLocaleLowerCase().indexOf('neilb.net') > 1)
                $.get('https://neilb.net/tetrisjsbackend/api/stuff/addscoreonline?level=' + this.level + '&lines=' + this.lines +
                    '&lobby=' + this.gameLobby + '&score=' + this.gameScore + '&win=' + win +
                    '&referrer=' + referrer);
        }
        gameover() {
            this.game_mode = GAME_MODE.TITLE;
            for (let i = 0; i < 4; i++)
                for (let j = 0; j < 5; j++)
                    this.nextPieceMatrix[i][j] = 0;
            for (let i = 0; i < 20; i++) {
                for (let j = 0; j < 10; j++) {
                    this.gameMatrix[i][j] = 0;
                    this.gameMatrixBuffer[i][j] = 0;
                    this.shadowFinderMatrix[i][j] = 0;
                }
            }
        }
        makePiece() {
            //update garbage sent by opponent
            this.processGarbage();
            //send your board to competitor
            //only when making a new piece
            this.sendUpdateBoard();
            this.piece = this.nextPiece;
            this.nextPiece = this.getRandomNumber(7) + 1;
            for (let i = 0; i < 4; i++)
                for (let j = 0; j < 7; j++)
                    this.nextPieceMatrix[i][j] = 0;
            if (this.gameMatrix[1][4] != 0) {
                this.sendLost();
                this.gameover();
                return;
            }
            if (this.nextPiece == 1) {
                this.nextPieceMatrix[2][2] = 1;
                this.nextPieceMatrix[1][2] = 1;
                this.nextPieceMatrix[1][1] = 1;
                this.nextPieceMatrix[1][3] = 1;
            }
            if (this.nextPiece == 2) {
                this.nextPieceMatrix[1][3] = 2;
                this.nextPieceMatrix[1][2] = 2;
                this.nextPieceMatrix[2][2] = 2;
                this.nextPieceMatrix[2][1] = 2;
            }
            if (this.nextPiece == 3) {
                this.nextPieceMatrix[1][1] = 3;
                this.nextPieceMatrix[1][2] = 3;
                this.nextPieceMatrix[2][2] = 3;
                this.nextPieceMatrix[2][3] = 3;
            }
            if (this.nextPiece == 4) {
                this.nextPieceMatrix[1][3] = 4;
                this.nextPieceMatrix[2][3] = 4;
                this.nextPieceMatrix[2][2] = 4;
                this.nextPieceMatrix[2][1] = 4;
            }
            if (this.nextPiece == 5) {
                this.nextPieceMatrix[1][1] = 5;
                this.nextPieceMatrix[2][1] = 5;
                this.nextPieceMatrix[2][2] = 5;
                this.nextPieceMatrix[2][3] = 5;
            }
            if (this.nextPiece == 6) {
                this.nextPieceMatrix[1][3] = 6;
                this.nextPieceMatrix[1][2] = 6;
                this.nextPieceMatrix[2][2] = 6;
                this.nextPieceMatrix[2][3] = 6;
            }
            if (this.nextPiece == 7) {
                this.nextPieceMatrix[0][2] = 7;
                this.nextPieceMatrix[1][2] = 7;
                this.nextPieceMatrix[2][2] = 7;
                this.nextPieceMatrix[3][2] = 7;
            }
            if (this.piece == 1) {
                this.gameMatrixBuffer[2][5] = 1;
                this.gameMatrixBuffer[1][5] = 1;
                this.gameMatrixBuffer[1][4] = 1;
                this.gameMatrixBuffer[1][6] = 1;
                this.centX = 5;
                this.centY = 1;
                this.state = 3;
            }
            if (this.piece == 2) {
                this.gameMatrixBuffer[0][5] = 2;
                this.gameMatrixBuffer[0][4] = 2;
                this.gameMatrixBuffer[1][4] = 2;
                this.gameMatrixBuffer[1][3] = 2;
                this.centX = 4;
                this.centY = 1;
                this.state = 1;
            }
            if (this.piece == 3) {
                this.gameMatrixBuffer[0][3] = 3;
                this.gameMatrixBuffer[0][4] = 3;
                this.gameMatrixBuffer[1][4] = 3;
                this.gameMatrixBuffer[1][5] = 3;
                this.centX = 4;
                this.centY = 1;
                this.state = 1;
            }
            if (this.piece == 4) {
                this.gameMatrixBuffer[0][5] = 4;
                this.gameMatrixBuffer[1][5] = 4;
                this.gameMatrixBuffer[1][4] = 4;
                this.gameMatrixBuffer[1][3] = 4;
                this.centX = 4;
                this.centY = 1;
                this.state = 1;
            }
            if (this.piece == 5) {
                this.gameMatrixBuffer[0][3] = 5;
                this.gameMatrixBuffer[1][3] = 5;
                this.gameMatrixBuffer[1][4] = 5;
                this.gameMatrixBuffer[1][5] = 5;
                this.centX = 4;
                this.centY = 1;
                this.state = 1;
            }
            if (this.piece == 6) {
                this.gameMatrixBuffer[0][5] = 6;
                this.gameMatrixBuffer[0][4] = 6;
                this.gameMatrixBuffer[1][4] = 6;
                this.gameMatrixBuffer[1][5] = 6;
            }
            if (this.piece == 7) {
                this.gameMatrixBuffer[0][5] = 7;
                this.gameMatrixBuffer[1][5] = 7;
                this.gameMatrixBuffer[2][5] = 7;
                this.gameMatrixBuffer[3][5] = 7;
                this.centX = 5;
                this.centY = 1;
                this.state = 1;
            }
            if (this.gameMatrix[1][4] != 0) {
                this.sendLost();
                this.gameover();
            }
        }
        sendLost() {
            console.log('sending Lost');
            app.signalrConnection.invoke("Lost").catch(function (err) {
                return console.error(err.toString());
            });
        }
        moveLeft() {
            if (this.game_mode != GAME_MODE.PLAYING)
                return;
            let success = true;
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 20; j++) {
                    if (this.gameMatrixBuffer[j][i] != 0 && i == 0)
                        success = false;
                    if (this.gameMatrixBuffer[j][i] != 0 && i != 0 && this.gameMatrix[j][i - 1] != 0)
                        success = false;
                }
            }
            if (success) {
                this.centX -= 1;
                for (let i = 1; i < 10; i++) {
                    for (let j = 0; j < 20; j++) {
                        if (this.gameMatrixBuffer[j][i] != 0) {
                            this.gameMatrixBuffer[j][i - 1] = this.gameMatrixBuffer[j][i];
                            this.gameMatrixBuffer[j][i] = 0;
                        }
                    }
                }
            }
        }
        moveRight() {
            if (this.game_mode != GAME_MODE.PLAYING)
                return;
            let success = true;
            for (let i = 9; i > -1; i--) {
                for (let j = 0; j < 20; j++) {
                    if (this.gameMatrixBuffer[j][i] != 0 && i == 9)
                        success = false;
                    if (this.gameMatrixBuffer[j][i] != 0 && i != 9 && this.gameMatrix[j][i + 1] != 0)
                        success = false;
                }
            }
            if (success) {
                this.centX += 1;
                for (let i = 8; i > -1; i--) {
                    for (let j = 0; j < 20; j++) {
                        if (this.gameMatrixBuffer[j][i] != 0) {
                            this.gameMatrixBuffer[j][i + 1] = this.gameMatrixBuffer[j][i];
                            this.gameMatrixBuffer[j][i] = 0;
                        }
                    }
                }
            }
        }
        drop() {
            let counter = 0; //failsafe
            while (this.toMakePiece == false) {
                counter++;
                if (counter > 100)
                    return;
                if (this.game_mode == GAME_MODE.PLAYING)
                    this.moveDown();
            }
        }
        findShadow() {
            //initialize shadowFinderMatrix
            if (!this.shadowFinderMatrix) {
                this.shadowFinderMatrix = [];
                for (let i = 0; i < 20; i++) {
                    let arr1 = [];
                    this.shadowFinderMatrix.push(arr1);
                    for (let j = 0; j < 10; j++) {
                        this.shadowFinderMatrix[i][j] = 0;
                    }
                }
            }
            //copy gameMatrixBuffer to shadowFinderMatrix
            for (let i = 0; i < 20; i++) {
                for (let j = 0; j < 10; j++) {
                    this.shadowFinderMatrix[i][j] = this.gameMatrixBuffer[i][j];
                }
            }
            let shadowFound = false;
            let preventInfiniteLoopCounter = 0;
            while (shadowFound == false) {
                preventInfiniteLoopCounter++;
                if (preventInfiniteLoopCounter > 20)
                    break;
                for (let i = 0; i < 10; i++) {
                    for (let j = 0; j < 20; j++) {
                        if (this.shadowFinderMatrix[j][i] != 0 && j == 19)
                            shadowFound = true;
                        if (this.shadowFinderMatrix[j][i] != 0 && j != 19 && this.gameMatrix[j + 1][i] != 0)
                            shadowFound = true;
                    }
                }
                if (!shadowFound) {
                    for (let i = 19; i > -1; i--) {
                        for (let j = 0; j < 10; j++) {
                            if (this.shadowFinderMatrix[i][j] != 0) {
                                this.shadowFinderMatrix[i + 1][j] = this.shadowFinderMatrix[i][j];
                                this.shadowFinderMatrix[i][j] = 0;
                            }
                        }
                    }
                }
            }
        }
        moveDown() {
            let success = true;
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 20; j++) {
                    if (this.gameMatrixBuffer[j][i] != 0 && j == 19)
                        success = false;
                    if (this.gameMatrixBuffer[j][i] != 0 && j != 19 && this.gameMatrix[j + 1][i] != 0)
                        success = false;
                }
            }
            if (success) {
                this.centY += 1;
                for (let i = 19; i > -1; i--) {
                    for (let j = 0; j < 10; j++) {
                        if (this.gameMatrixBuffer[i][j] != 0) {
                            this.gameMatrixBuffer[i + 1][j] = this.gameMatrixBuffer[i][j];
                            this.gameMatrixBuffer[i][j] = 0;
                        }
                    }
                }
                this.timer = 0;
            }
            else {
                for (let i = 0; i < 20; i++) {
                    for (let j = 0; j < 10; j++) {
                        if (this.gameMatrixBuffer[i][j] != 0) {
                            this.gameMatrix[i][j] = this.gameMatrixBuffer[i][j];
                            this.gameMatrixBuffer[i][j] = 0;
                        }
                    }
                }
                this.toMakePiece = true;
                this.timer = -1;
            }
        }
        rotate() {
            if (this.game_mode != GAME_MODE.PLAYING) {
                return;
            }
            if (this.toClear) {
                return;
            }
            //this.piece 1           *
            //                      ***
            if (this.piece == 1) {
                if (this.reverseRotate) {
                    if (this.state == 1) {
                        if (this.centY != 19 && this.gameMatrix[this.centY + 1][this.centX] == 0) {
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.state = 4;
                            return;
                        }
                    }
                    if (this.state == 4) {
                        if (this.centX != 9 && this.gameMatrix[this.centY][this.centX + 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.state = 3;
                            return;
                        }
                    }
                    if (this.state == 3) {
                        if (this.gameMatrix[this.centY - 1][this.centX] == 0) {
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.state = 2;
                            return;
                        }
                    }
                    if (this.state == 2) {
                        if (this.centX != 0 && this.gameMatrix[this.centY][this.centX - 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.state = 1;
                            return;
                        }
                    }
                }
                else {
                    if (this.state == 1) {
                        if (this.centY != 19 && this.gameMatrix[this.centY + 1][this.centX] == 0) {
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.state = 2;
                            return;
                        }
                    }
                    if (this.state == 2) {
                        if (this.centX != 0 && this.gameMatrix[this.centY][this.centX - 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.state = 3;
                            return;
                        }
                    }
                    if (this.state == 3) {
                        if (this.gameMatrix[this.centY - 1][this.centX] == 0) {
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.state = 4;
                            return;
                        }
                    }
                    if (this.state == 4) {
                        if (this.centX != 9 && this.gameMatrix[this.centY][this.centX + 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.state = 1;
                            return;
                        }
                    }
                }
            }
            //this.piece 2           **
            //                      **  
            if (this.piece == 2) {
                if (this.state == 1) {
                    if (this.centY != 19 && this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX - 1] == 0) {
                        this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                        this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = this.piece;
                        this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                        this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = 0;
                        this.state = 2;
                        return;
                    }
                }
                if (this.state == 2) {
                    if (this.centX != 9 && this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX + 1] == 0) {
                        this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                        this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = this.piece;
                        this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                        this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = 0;
                        this.state = 1;
                        return;
                    }
                }
            }
            //this.piece 3          **
            //                       **
            if (this.piece == 3) {
                if (this.state == 1) {
                    if (this.centY != 19 && this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX + 1] == 0) {
                        this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                        this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = this.piece;
                        this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                        this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = 0;
                        this.state = 2;
                        return;
                    }
                }
                if (this.state == 2) {
                    if (this.centX != 0 && this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX - 1] == 0) {
                        this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                        this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = this.piece;
                        this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                        this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = 0;
                        this.state = 1;
                        return;
                    }
                }
            }
            //this.piece 4            *
            //                      ***
            if (this.piece == 4) {
                if (this.reverseRotate) {
                    if (this.state == 1) {
                        if (this.centY != 19 && this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX - 1] == 0) {
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = 0;
                            this.state = 4;
                            return;
                        }
                    }
                    if (this.state == 4) {
                        if (this.centX != 9 && this.gameMatrix[this.centY][this.centX + 1] == 0 && this.gameMatrix[this.centY][this.centX - 1] == 0 && this.gameMatrix[this.centY + 1][this.centX - 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.state = 3;
                            return;
                        }
                    }
                    if (this.state == 3) {
                        if (this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY + 1][this.centX + 1] == 0 && this.gameMatrix[this.centY - 1][this.centX] == 0) {
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.state = 2;
                            return;
                        }
                    }
                    if (this.state == 2) {
                        if (this.centX != 0 && this.gameMatrix[this.centY][this.centX + 1] == 0 && this.gameMatrix[this.centY - 1][this.centX + 1] == 0 && this.gameMatrix[this.centY][this.centX - 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.state = 1;
                            return;
                        }
                    }
                }
                else {
                    if (this.state == 1) {
                        if (this.centY != 19 && this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY + 1][this.centX + 1] == 0) {
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = 0;
                            this.state = 2;
                            return;
                        }
                    }
                    if (this.state == 2) {
                        if (this.centX != 0 && this.gameMatrix[this.centY][this.centX - 1] == 0 && this.gameMatrix[this.centY + 1][this.centX - 1] == 0 && this.gameMatrix[this.centY][this.centX + 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.state = 3;
                            return;
                        }
                    }
                    if (this.state == 3) {
                        if (this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX - 1] == 0 && this.gameMatrix[this.centY + 1][this.centX] == 0) {
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.state = 4;
                            return;
                        }
                    }
                    if (this.state == 4) {
                        if (this.centX != 9 && this.gameMatrix[this.centY][this.centX - 1] == 0 && this.gameMatrix[this.centY][this.centX + 1] == 0 && this.gameMatrix[this.centY - 1][this.centX + 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.state = 1;
                            return;
                        }
                    }
                }
            }
            //this.piece 5          *
            //                      ***
            if (this.piece == 5) {
                if (this.reverseRotate) {
                    if (this.state == 1) {
                        if (this.centY != 19 && this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY + 1][this.centX - 1] == 0) {
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = 0;
                            this.state = 4;
                            return;
                        }
                    }
                    if (this.state == 4) {
                        if (this.centX != 9 && this.gameMatrix[this.centY][this.centX + 1] == 0 && this.gameMatrix[this.centY][this.centX - 1] == 0 && this.gameMatrix[this.centY + 1][this.centX + 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX - 1] = 0;
                            this.state = 3;
                            return;
                        }
                    }
                    if (this.state == 3) {
                        if (this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX + 1] == 0 && this.gameMatrix[this.centY - 1][this.centX] == 0) {
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.state = 2;
                            return;
                        }
                    }
                    if (this.state == 2) {
                        if (this.centX != 0 && this.gameMatrix[this.centY][this.centX + 1] == 0 && this.gameMatrix[this.centY - 1][this.centX - 1] == 0 && this.gameMatrix[this.centY][this.centX - 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.state = 1;
                            return;
                        }
                    }
                }
                else {
                    if (this.state == 1) {
                        if (this.centY != 19 && this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY - 1][this.centX + 1] == 0) {
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = 0;
                            this.state = 2;
                            return;
                        }
                    }
                    if (this.state == 2) {
                        if (this.centX != 0 && this.gameMatrix[this.centY][this.centX - 1] == 0 && this.gameMatrix[this.centY + 1][this.centX + 1] == 0 && this.gameMatrix[this.centY][this.centX + 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.state = 3;
                            return;
                        }
                    }
                    if (this.state == 3) {
                        if (this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY + 1][this.centX - 1] == 0 && this.gameMatrix[this.centY + 1][this.centX] == 0) {
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX + 1] = 0;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                            this.state = 4;
                            return;
                        }
                    }
                    if (this.state == 4) {
                        if (this.centX != 9 && this.gameMatrix[this.centY][this.centX - 1] == 0 && this.gameMatrix[this.centY][this.centX + 1] == 0 && this.gameMatrix[this.centY - 1][this.centX - 1] == 0) {
                            this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX - 1] = this.piece;
                            this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                            this.gameMatrixBuffer[this.centY + 1][this.centX - 1] = 0;
                            this.state = 1;
                            return;
                        }
                    }
                }
            }
            //this.piece 7          ****
            if (this.piece == 7) {
                if (this.state == 1) {
                    if (this.centX != 0 && this.centX != 1 && this.centX != 9 && this.gameMatrix[this.centY][this.centX - 1] == 0 && this.gameMatrix[this.centY][this.centX - 2] == 0 && this.gameMatrix[this.centY][this.centX + 1] == 0) {
                        this.gameMatrixBuffer[this.centY][this.centX - 1] = this.piece;
                        this.gameMatrixBuffer[this.centY][this.centX - 2] = this.piece;
                        this.gameMatrixBuffer[this.centY][this.centX + 1] = this.piece;
                        this.gameMatrixBuffer[this.centY - 1][this.centX] = 0;
                        this.gameMatrixBuffer[this.centY + 1][this.centX] = 0;
                        this.gameMatrixBuffer[this.centY + 2][this.centX] = 0;
                        this.state = 2;
                        return;
                    }
                }
                if (this.state == 2) {
                    if (this.centY != 19 && this.centY != 18 && this.gameMatrix[this.centY - 1][this.centX] == 0 && this.gameMatrix[this.centY + 1][this.centX] == 0 && this.gameMatrix[this.centY + 2][this.centX] == 0) {
                        this.gameMatrixBuffer[this.centY + 2][this.centX] = this.piece;
                        this.gameMatrixBuffer[this.centY + 1][this.centX] = this.piece;
                        this.gameMatrixBuffer[this.centY - 1][this.centX] = this.piece;
                        this.gameMatrixBuffer[this.centY][this.centX - 1] = 0;
                        this.gameMatrixBuffer[this.centY][this.centX - 2] = 0;
                        this.gameMatrixBuffer[this.centY][this.centX + 1] = 0;
                        this.state = 1;
                        return;
                    }
                }
            }
        }
        checkMatrix() {
            for (let i = 0; i < 20; i++) {
                let temp = true;
                for (let j = 0; j < 10; j++) {
                    if (this.gameMatrix[i][j] == 0)
                        temp = false;
                }
                if (temp) {
                    for (let k = 0; k < 10; k++)
                        this.gameMatrix[i][k] = 8;
                    this.toClear = true;
                }
            }
            if (this.toClear) { }
            //TODO blockclear.play();
            else {
                //TODO dropblock.play();
                this.score++;
            }
        }
        clearBlocks() {
            let tempLines = 0;
            for (let i = 0; i < 20; i++) {
                let temp = false;
                for (let j = 0; j < 10; j++) {
                    if (this.gameMatrix[i][j] == 8) {
                        temp = true;
                        for (let k = i; k > 0; k--) {
                            this.gameMatrix[k][j] = this.gameMatrix[k - 1][j];
                        }
                        this.gameMatrix[0][j] = 0;
                    }
                }
                if (temp)
                    tempLines++;
            }
            if (tempLines == 1)
                this.score += 50;
            if (tempLines == 2)
                this.score += 100;
            if (tempLines == 3)
                this.score += 300;
            if (tempLines == 4)
                this.score += 1000;
            this.lines += tempLines;
            this.nextLevel += tempLines;
            if (this.nextLevel >= 10) {
                //TODO newlevel.play();
                this.nextLevel -= 10;
                this.level++;
            }
            else
                ; //TODO blockcleared.play();
            if (tempLines > 1)
                this.sendGarbage(tempLines);
        }
        sendGarbage(linesCleared) {
            let garbageToSend = 0;
            if (linesCleared == 2)
                garbageToSend = 1;
            if (linesCleared == 3)
                garbageToSend = 2;
            if (linesCleared == 4)
                garbageToSend = 4;
            console.log('sending garbage', garbageToSend);
            app.signalrConnection.invoke("SendGargabe", garbageToSend).catch(function (err) {
                return console.error(err.toString());
            });
        }
        processGarbage() {
            this.garbageQueue.forEach(garbage => {
                //move the board up
                for (let counter = 0; counter < garbage; counter++) {
                    for (let y = 0; y < 20; y++) {
                        for (let x = 0; x < 10; x++) {
                            if (y < 19)
                                this.gameMatrix[y][x] = this.gameMatrix[y + 1][x];
                        }
                    }
                }
                //hole in garbage
                let hole = Math.floor(Math.random() * 10);
                //add garbage
                for (let counter = 0; counter < garbage; counter++) {
                    for (let y = 19; y > 19 - garbage; y--) {
                        for (let x = 0; x < 10; x++) {
                            if (x == hole)
                                this.gameMatrix[y][x] = 0;
                            else
                                this.gameMatrix[y][x] = 1;
                        }
                    }
                }
            });
            this.garbageQueue = [];
        }
        requestNextFrame() {
            let app = window.myApp;
            app.processGamepad();
            app.gameLoop();
            app.newPaint();
            requestAnimationFrame(app.requestNextFrame);
        }
        getMessage() {
            return 'New Game';
            // if (!this.draw)
            //     return 'start drawing';
            // else
            //     return 'stop drawing';
        }
        countFPS() {
            this.fpscounter++;
            let delta = (new Date().getTime() - this.lastCalledTime.getTime()) / 1000;
            if (delta > 1) {
                this.currentfps = this.fpscounter;
                this.fpscounter = 0;
                this.lastCalledTime = new Date();
                // $("#fps").html(this.currentfps.toString());
            }
        }
        getRandomColor() {
            var letters = '0123456789ABCDEF';
            var color = '#';
            for (var i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
        newPaint() {
            this.countFPS();
            let xCounter = -1;
            let yCounter = 0;
            let randBlock = 0;
            let elements = $("[tetris-block]");
            let myElements = [];
            for (let i = 0; i < elements.length; i++)
                myElements.push(elements[i]);
            let randomColor = this.getRandomColor();
            myElements.forEach(element => {
                xCounter++;
                if (xCounter == 10) {
                    xCounter = 0;
                    yCounter++;
                }
                if (xCounter == 0) {
                    randBlock = this.getRandomNumber(10);
                }
                let x = parseInt(element.attributes["x"].value);
                let y = parseInt(element.attributes["y"].value);
                if (this.gameMatrixBuffer[y][x] == 8 || this.gameMatrix[y][x] == 8) {
                    // element.style["background-image"] = 'linear-gradient(-45deg,' + randomColor + ', lightblue)';
                    element.style["background-color"] = randomColor;
                }
                else if (this.gameMatrixBuffer[y][x] > 0 || this.gameMatrix[y][x] > 0) {
                    let color = 'blue';
                    // if (this.gameMatrixBuffer[y][x] == 1 || this.gameMatrix[y][x] == 1) color = 'darkblue';
                    // if (this.gameMatrixBuffer[y][x] == 2 || this.gameMatrix[y][x] == 2) color = 'darkorange';
                    // if (this.gameMatrixBuffer[y][x] == 3 || this.gameMatrix[y][x] == 3) color = 'rgb(90, 34, 107)';
                    // if (this.gameMatrixBuffer[y][x] == 4 || this.gameMatrix[y][x] == 4) color = 'darkred';
                    // if (this.gameMatrixBuffer[y][x] == 5 || this.gameMatrix[y][x] == 5) color = 'darkcyan';
                    // if (this.gameMatrixBuffer[y][x] == 6 || this.gameMatrix[y][x] == 6) color = 'darkgreen';
                    // if (this.gameMatrixBuffer[y][x] == 7 || this.gameMatrix[y][x] == 7) color = 'rgb(209, 209, 0)';
                    // element.style["background-image"] = 'linear-gradient(-45deg,blue, lightblue)';
                    element.style["background-color"] = color;
                }
                else if (this.shadowFinderMatrix && this.shadowFinderMatrix[y][x] > 0) {
                    // element.style["background-image"] = 'linear-gradient(grey, grey)';
                    element.style["background-color"] = 'grey';
                }
                else {
                    // element.style["background-image"] = 'linear-gradient(white, white)';
                    element.style["background-color"] = 'white';
                }
            });
            //draw next puiece
            xCounter = -1;
            yCounter = 0;
            elements = $("[nextpiece-block]");
            myElements = [];
            for (let i = 0; i < elements.length; i++)
                myElements.push(elements[i]);
            myElements.forEach(element => {
                xCounter++;
                if (xCounter == 7) {
                    xCounter = 0;
                    yCounter++;
                }
                let x = parseInt(element.attributes["x"].value);
                let y = parseInt(element.attributes["y"].value);
                if (this.nextPieceMatrix[y][x] > 0 || this.nextPieceMatrix[y][x] > 0) {
                    let color = 'blue';
                    element.style["background-color"] = color;
                }
                else
                    element.style["background-color"] = 'white';
            });
            //draw competitor
            elements = $("[competitor-block]");
            myElements = [];
            for (let i = 0; i < elements.length; i++)
                myElements.push(elements[i]);
            let counter = 0;
            if (this.competitorBoard.length == 200) {
                myElements.forEach(element => {
                    let block = this.competitorBoard.substr(counter, 1);
                    if (block == "1") {
                        element.style["background-color"] = 'red';
                    }
                    else
                        element.style["background-color"] = 'white';
                    counter++;
                });
            }
        }
        btnPause() {
            if (this.game_mode == GAME_MODE.TITLE)
                return;
            if (this.game_mode == GAME_MODE.PAUSED)
                this.game_mode = GAME_MODE.PLAYING;
            else
                this.game_mode = GAME_MODE.PAUSED;
        }
        getPauseButtonText() {
            if (this.game_mode == GAME_MODE.PAUSED)
                return "Resume";
            else
                return "Pause";
        }
        createGameTable() {
            let tableHtml = '';
            let boxSize = 20;
            let windowHeight = window.innerHeight;
            let windowWidth = window.innerWidth;
            // console.log(windowHeight,windowWidth);
            if (windowHeight > 800) {
                let extraSpace = windowHeight - 800;
                extraSpace = extraSpace / 20;
                boxSize += extraSpace;
            }
            tableHtml += '<table style="margin: 0px auto;">';
            for (let i = 0; i < 20; i++) {
                tableHtml += "<tr>";
                for (let j = 0; j < 10; j++) {
                    let piece = ' ';
                    tableHtml += "<td tetris-block x='" + j + "' y='" + i +
                        "' style='width:" + boxSize + "px;height:" + boxSize + "px;background-color:lightblue;" +
                        "border:1px black solid;font-size: .75rem;'>" + piece + "</td>";
                }
                tableHtml += "</tr>";
            }
            tableHtml += "</table>";
            $("#gamediv").html(tableHtml);
            let nextPieceHtml = '<table style="">';
            for (let i = 0; i < 4; i++) {
                nextPieceHtml += "<tr>";
                for (let j = 0; j < 5; j++) {
                    let piece = ' ';
                    nextPieceHtml += "<td nextpiece-block x='" + j + "' y='" + i +
                        "' style='width:" + boxSize + "px;height:" + boxSize + "px;background-color:white;" +
                        "border:0px black solid;font-size: .75rem;'>" + piece + "</td>";
                }
                nextPieceHtml += "</tr>";
            }
            nextPieceHtml += "</table>";
            $("#nextpiecediv").html(nextPieceHtml);
            let competitorBoxSize = boxSize / 2;
            let competitorHtml = '<table style="">';
            for (let i = 0; i < 20; i++) {
                competitorHtml += "<tr>";
                for (let j = 0; j < 10; j++) {
                    let piece = ' ';
                    competitorHtml += "<td competitor-block x='" + j + "' y='" + i +
                        "' style='width:" + competitorBoxSize + "px;height:" + competitorBoxSize + "px;background-color:white;" +
                        "border:1px black solid;font-size: .75rem;'>" + piece + "</td>";
                }
                competitorHtml += "</tr>";
            }
            competitorHtml += "</table>";
            $("#competitordiv").html(competitorHtml);
            // let gameDivHeight:number = $("#gamediv").height();
            // console.log(gameDivHeight,windowHeight);
            // $("#gamediv")[0].style["margin-top"] = (windowHeight-gameDivHeight-140) + 'px';
        }
        onWindowResize() {
            let elements = $("[tetris-block]");
            let elements2 = $("[nextpiece-block]");
            let elements3 = $("[competitor-block]");
            let myElements = [];
            let myElementsCompetitor = [];
            let boxSize = 20;
            let windowHeight = window.innerHeight;
            if (windowHeight > 800) {
                let extraSpace = windowHeight - 800;
                extraSpace = extraSpace / 20;
                boxSize += extraSpace;
            }
            for (let i = 0; i < elements.length; i++)
                myElements.push(elements[i]);
            for (let i = 0; i < elements2.length; i++)
                myElements.push(elements2[i]);
            for (let i = 0; i < elements3.length; i++)
                myElementsCompetitor.push(elements3[i]);
            myElements.forEach(element => {
                element.style["width"] = boxSize + 'px';
                element.style["height"] = boxSize + 'px';
            });
            myElementsCompetitor.forEach(element => {
                element.style["width"] = boxSize / 2 + 'px';
                element.style["height"] = boxSize / 2 + 'px';
            });
            // console.log('window resized. boxsize: ' + boxSize);
        }
    }
    exports.MyApp = MyApp;
    class Player {
        constructor() {
            this.name = '';
            this.playerNum = 0;
            this.board = '';
            this.connected = false;
            this.ipAddress = '';
            this.gameID = '';
        }
    }
    exports.Player = Player;
    app = new MyApp();
    window["myApp"] = app;
});
//# sourceMappingURL=index.js.map