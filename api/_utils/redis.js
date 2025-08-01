"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDIS_KEYS = void 0;
exports.createRedisClient = createRedisClient;
exports.getLeaderboardKey = getLeaderboardKey;
const redis_1 = require("@upstash/redis");
function createRedisClient({ readonly = false } = {}) {
    return new redis_1.Redis({
        url: process.env.KV_REST_API_URL,
        token: readonly
            ? process.env.KV_REST_API_READ_ONLY_TOKEN
            : process.env.KV_REST_API_TOKEN,
    });
}
exports.REDIS_KEYS = {
    LEADERBOARD: {
        POSITION: 'memorhythm:leaderboard:position',
        RHYTHM: 'memorhythm:leaderboard:rhythm',
        TOTAL: 'memorhythm:leaderboard:total',
        ROUND: 'memorhythm:leaderboard:round',
    },
};
function getLeaderboardKey(category) {
    const key = exports.REDIS_KEYS.LEADERBOARD[category.toUpperCase()];
    if (!key) {
        throw new Error(`Invalid leaderboard category: ${category}`);
    }
    return key;
}
