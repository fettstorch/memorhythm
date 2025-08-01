"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const redis_1 = require("../../_utils/redis");
/**
 * GET /api/memorhythm/leaderboard/round
 *
 * Fetches the highest round reached leaderboard from Redis.
 * Round score represents how far players progressed in the game before failing.
 */
async function handler(req, res) {
    // Set CORS headers to allow requests from localhost during development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    try {
        const category = 'round';
        // Create a read-only Redis client connection
        // Using readonly=true provides a read-only token for security
        // and potentially better performance for read operations
        const redis = (0, redis_1.createRedisClient)({ readonly: true });
        // Get the Redis key for this leaderboard category
        // Keys are prefixed with "memorhythm:leaderboard:" for organization
        const key = (0, redis_1.getLeaderboardKey)(category);
        // Parse the limit parameter from query string (default: 10, max: 100)
        // This controls how many leaderboard entries to return
        const limit = parseInt(req.query.limit || '10', 10);
        const maxLimit = Math.min(limit, 100);
        // Query Redis using ZRANGE command on a sorted set
        // - Key: the leaderboard key (e.g., "memorhythm:leaderboard:round")
        // - Range: 0 to maxLimit-1 (top N scores)
        // - rev: true = highest scores first (descending order)
        // - withScores: true = return both member names and their scores
        const result = (await redis.zrange(key, 0, maxLimit - 1, {
            rev: true, // Reverse order (highest scores first)
            withScores: true, // Include the numeric scores, not just usernames
        }));
        // Redis returns alternating username/score pairs: [user1, score1, user2, score2, ...]
        // We need to convert this flat array into structured LeaderboardEntry objects
        const entries = [];
        for (let i = 0; i < result.length; i += 2) {
            entries.push({
                user: result[i], // Username at even indices
                score: Number(result[i + 1]), // Score at odd indices (round number)
                rank: Math.floor(i / 2) + 1, // Calculate rank based on position
            });
        }
        // Format the response according to our API contract
        const response = {
            category: category,
            entries,
        };
        // Return the leaderboard data as JSON
        res.status(200).json(response);
    }
    catch (error) {
        // Log any errors for debugging (visible in Vercel function logs)
        console.error('Error in round leaderboard fetch:', error);
        // Return a generic error response to the client
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
