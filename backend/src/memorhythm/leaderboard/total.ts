import { createRedisClient, getLeaderboardKey } from '../../_utils/redis';
import type { LeaderboardResponse, LeaderboardEntry } from '../../types.js';

/**
 * GET /api/memorhythm/leaderboard/total
 * 
 * Fetches the total score leaderboard from Redis.
 * Total score is the combined metric of position and rhythm accuracy.
 */
export default async function handler(req: any, res: any) {
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
    const category = 'total';
    
    // Create a read-only Redis client connection
    // Using readonly=true provides a read-only token for security
    // and potentially better performance for read operations
    const redis = createRedisClient({ readonly: true });
    
    // Get the Redis key for this leaderboard category
    // Keys are prefixed with "memorhythm:leaderboard:" for organization
    const key = getLeaderboardKey(category);
    
    // Parse the limit parameter from query string (default: 10, max: 100)
    // This controls how many leaderboard entries to return
    const limit = parseInt(req.query.limit || '10', 10);
    const maxLimit = Math.min(limit, 100);
    
    // Query Redis using ZRANGE command on a sorted set
    // - Key: the leaderboard key (e.g., "memorhythm:leaderboard:total")
    // - Range: 0 to maxLimit-1 (top N scores)
    // - rev: true = highest scores first (descending order)
    // - withScores: true = return both member names and their scores
    const result = (await redis.zrange(key, 0, maxLimit - 1, {
      rev: true,        // Reverse order (highest scores first)
      withScores: true, // Include the numeric scores, not just usernames
    })) as (string | number)[];

    // Redis returns alternating member/score pairs: [member1, compositeScore1, member2, compositeScore2, ...]
    // Members are in format "username:score:round", we need to parse this
    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < result.length; i += 2) {
      const memberData = result[i] as string; // Format: "username:score:round"
      const [user, scoreStr, roundStr] = memberData.split(':');
      
      entries.push({
        user,
        score: Number(scoreStr),             // The actual percentage score
        round: Number(roundStr),             // The round this score was achieved in
        rank: Math.floor(i / 2) + 1,         // Calculate rank based on position
      });
    }

    // Format the response according to our API contract
    const response: LeaderboardResponse = {
      category: category as any,
      entries,
    };

    // Return the leaderboard data as JSON
    res.status(200).json(response);
    
  } catch (error) {
    // Log any errors for debugging (visible in Vercel function logs)
    console.error('Error in total score leaderboard fetch:', error);
    
    // Return a generic error response to the client
    res.status(500).json({ error: 'Internal Server Error' });
  }
}