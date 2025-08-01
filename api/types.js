"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = void 0;
var GameState;
(function (GameState) {
    GameState["Idle"] = "IDLE";
    GameState["Playback"] = "PLAYBACK";
    GameState["PlayerTurn"] = "PLAYER_TURN";
    GameState["Calculating"] = "CALCULATING";
    GameState["Scoring"] = "SCORING";
})(GameState || (exports.GameState = GameState = {}));
