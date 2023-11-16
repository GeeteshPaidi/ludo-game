//importing the co ordinates of the board

import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS } from './constants.js';
import { UI } from './UI.js';

export class Ludo {
    currentPositions = {
        P1: [],
        P2: [],
        P3: [],
        P4: [],
    }

    //In JavaScript, the 'this' keyword refers to an object. Which object it refers to depends on how 'this' is being invoked (used or called)
    _diceValue;
    get diceValue() {   //to get dice value
        return this._diceValue;
    }
    set diceValue(value) {
        this._diceValue = value;

        UI.setDiceValue(value);
    }

    _turn;
    get turn() {
        return this._turn;
    }
    set turn(value) {
        this._turn = value;
        UI.setTurn(value);
    }

    //disabling the dice after rolling
    _state;
    get state() {
        return this._state;
    }
    set state(value) {
        this._state = value;

        if(value === STATE.DICE_NOT_ROLLED) {
            UI.enableDice();
            UI.unhighlightPieces();     //unhighlighting the pieces after enabling the dice
        } else {
            UI.disableDice();
        }
    }

    constructor() {
        this.listenDiceClick();
        this.listenResetClick();
        this.listenPieceClick();
        this.resetGame();
    }

    //bind method creates a new function that, when called, has its 'this' keyword set to the provided value
    listenDiceClick() {
        UI.listenDiceClick(this.onDiceClick.bind(this))
    }

    onDiceClick() {
        this.diceValue = 1 + Math.floor(Math.random() * 6);     //Math.random gives a random number between 0 and 1
        this.state = STATE.DICE_ROLLED;
        this.checkForEligiblePieces();
    }

    checkForEligiblePieces() {
        const player = PLAYERS[this.turn];
        // eligible pieces of given player
        const eligiblePieces = this.getEligiblePieces(player);
        if(eligiblePieces.length) {
            // highlighting the pieces
            UI.highlightPieces(player, eligiblePieces);
        } else {
            this.incrementTurn();
        }
    }

    incrementTurn() {   //using ternary operator to increment the turn
        this.turn = this.turn === 0 ? 1 : (this.turn === 1 ? 2 : (this.turn === 2 ? 3 : 0));
        this.state = STATE.DICE_NOT_ROLLED;
    }

    getEligiblePieces(player) {
        return [0, 1, 2, 3].filter(piece => {       //filtering the pieces
            const currentPosition = this.currentPositions[player][piece];

            //if the piece is in home position, it is not eligible
            if(currentPosition === HOME_POSITIONS[player]) {
                return false;
            }

            //if the piece is in base position and the dice value is not 6, it is not eligible
            if(BASE_POSITIONS[player].includes(currentPosition)&& this.diceValue !== 6){
                return false;
            }

            //if the piece is in home entrance and the dice value is not enough to reach home, it is not eligible
            if(HOME_ENTRANCE[player].includes(currentPosition)&& this.diceValue > HOME_POSITIONS[player] - currentPosition) {
                return false;
            }

            return true;
        });
    }


    listenResetClick() {
        UI.listenResetClick(this.resetGame.bind(this))
    }

    //bringing back pieces to base positions upon reset
    resetGame() {
        this.currentPositions = structuredClone(BASE_POSITIONS);

        PLAYERS.forEach(player => {
            [0, 1, 2, 3].forEach(piece => {
                this.setPiecePosition(player, piece, this.currentPositions[player][piece])
            })
        });

        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;
    }
    
    listenPieceClick() {
        UI.listenPieceClick(this.onPieceClick.bind(this));
    }

    onPieceClick(event) {
        const target = event.target;

        //null check
        if(!target.classList.contains('player-piece') || !target.classList.contains('highlight')) {
            return;
        }

        //getting the player and piece and handling the selected piece
        const player = target.getAttribute('player-id');
        const piece = target.getAttribute('piece');
        this.handlePieceClick(player, piece);
    }

    handlePieceClick(player, piece) {
        console.log(player, piece);
        const currentPosition = this.currentPositions[player][piece];
        
        //if the piece is in base position and the dice value is 6, it is moved to start position
        if(BASE_POSITIONS[player].includes(currentPosition)) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
            this.state = STATE.DICE_NOT_ROLLED;
            return;
        }

        UI.unhighlightPieces();
        this.movePiece(player, piece, this.diceValue);
    }

    //setting the position of the piece and creating a new function to move the piece
    setPiecePosition(player, piece, newPosition) {
        this.currentPositions[player][piece] = newPosition;
        UI.setPiecePosition(player, piece, newPosition)
    }

    movePiece(player, piece, moveBy) {
        const interval = setInterval(() => {
            this.incrementPiecePosition(player, piece);
            moveBy--;

            if(moveBy === 0) {
                clearInterval(interval);

                // check if player won
                if(this.hasPlayerWon(player)) {
                    alert(`Congratulations player: ${player}, you have reached home!`);
                    return;
                }

                const isKill = this.checkForKill(player, piece);

                //upon killing or getting 6, the player gets another chance
                if(isKill || this.diceValue === 6) {
                    this.state = STATE.DICE_NOT_ROLLED;
                    return;
                }

                this.incrementTurn();
            }
        }, 200);    //for every 200ms makes it a smooth transition
    }

    checkForKill(player, piece) {
        const currentPosition = this.currentPositions[player][piece];
        const opponents = PLAYERS.filter(p => p !== player);        //find players other than current player            
        opponents.forEach(opponent => {                             //for each - travels through every player of the array-opponents
            let kill = false;
            [0, 1, 2, 3].forEach(piece => {
                const opponentPosition = this.currentPositions[opponent][piece];
                if(currentPosition === opponentPosition && !SAFE_POSITIONS.includes(currentPosition)) {
                    this.setPiecePosition(opponent, piece, BASE_POSITIONS[opponent][piece]);
                    kill = true
                }
            });

        return kill
        });
    }

    //player is declared won if all pieces are in home position
    hasPlayerWon(player) {
        return [0, 1, 2, 3].every(piece => this.currentPositions[player][piece] === HOME_POSITIONS[player])
    }

    incrementPiecePosition(player, piece) {
        this.setPiecePosition(player, piece, this.getIncrementedPosition(player, piece));
    }
    
    getIncrementedPosition(player, piece) {
        const currentPosition = this.currentPositions[player][piece];

        if(currentPosition === TURNING_POINTS[player]) {
            return HOME_ENTRANCE[player][0];
        }

        //upon reaching cell number 51 continue to 0 again
        else if(currentPosition === 51) {
            return 0;
        }
        return currentPosition + 1;
    }
}