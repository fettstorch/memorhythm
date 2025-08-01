import { createRedisClient, REDIS_KEYS } from '../_utils/redis';
import type { ScoreSubmission } from '../types.js';

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
    const redis = createRedisClient({ readonly: false });
    
    const submission = req.body as ScoreSubmission;
    const { user, position, rhythm, total, round } = submission;

    if (!user || typeof user !== 'string' || user.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid user name' });
    }

    if (typeof position !== 'number' || typeof rhythm !== 'number' || 
        typeof total !== 'number' || typeof round !== 'number') {
      return res.status(400).json({ error: 'Invalid score values' });
    }

    const scoreUpdates = [
      { key: REDIS_KEYS.LEADERBOARD.POSITION, score: position },
      { key: REDIS_KEYS.LEADERBOARD.RHYTHM, score: rhythm },
      { key: REDIS_KEYS.LEADERBOARD.TOTAL, score: total },
      { key: REDIS_KEYS.LEADERBOARD.ROUND, score: round },
    ];

    const pipeline = redis.pipeline();
    let updatedCategories: string[] = [];

    for (const { key, score } of scoreUpdates) {
      const currentScore = await redis.zscore(key, user);
      
      if (!currentScore || score > currentScore) {
        pipeline.zadd(key, { score, member: user });
        pipeline.zremrangebyrank(key, 0, -101); // Keep top 100
        updatedCategories.push(key.split(':')[2]);
      }
    }

    if (updatedCategories.length > 0) {
      await pipeline.exec();
      return res.status(200).json({ 
        updated: true, 
        categories: updatedCategories 
      });
    }

    return res.status(200).json({ 
      updated: false, 
      message: 'No scores were higher than existing records' 
    });

  } catch (error) {
    console.error('Error in submit score:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}