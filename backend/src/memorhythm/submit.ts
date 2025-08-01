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

    // Create composite scoring system where higher rounds are more valuable
    // Score formula: (round * 1000) + actual_score
    // This ensures a 50% score on round 10 beats a 99% score on round 5
    const scoreUpdates = [
      { 
        key: REDIS_KEYS.LEADERBOARD.POSITION, 
        score: position,
        compositeScore: (round * 1000) + position,
        member: `${user}:${position}:${round}`
      },
      { 
        key: REDIS_KEYS.LEADERBOARD.RHYTHM, 
        score: rhythm,
        compositeScore: (round * 1000) + rhythm,
        member: `${user}:${rhythm}:${round}`
      },
      { 
        key: REDIS_KEYS.LEADERBOARD.TOTAL, 
        score: total,
        compositeScore: (round * 1000) + total,
        member: `${user}:${total}:${round}`
      },
      { 
        key: REDIS_KEYS.LEADERBOARD.ROUND, 
        score: round,
        compositeScore: round, // Round category keeps simple scoring
        member: `${user}:${round}:${round}`
      },
    ];

    const pipeline = redis.pipeline();
    let updatedCategories: string[] = [];

    for (const { key, score, compositeScore, member } of scoreUpdates) {
      // For score categories (position, rhythm, total), check if this is a better score
      // considering both the score percentage and the round achieved
      const currentMember = await redis.zrange(key, 0, -1, { 
        withScores: true, 
        byScore: true, 
        rev: true 
      });
      
      // Find if this user already has an entry
      const userEntries = currentMember.filter((item, index) => 
        index % 2 === 0 && typeof item === 'string' && item.startsWith(`${user}:`)
      );
      
      let shouldUpdate = true;
      if (userEntries.length > 0) {
        // Get the user's current best composite score
        const userIndex = currentMember.indexOf(userEntries[0]);
        const userCurrentScore = Number(currentMember[userIndex + 1]);
        shouldUpdate = compositeScore > userCurrentScore;
        
        // Remove old entry if we're updating
        if (shouldUpdate) {
          pipeline.zrem(key, userEntries[0]);
        }
      }
      
      if (shouldUpdate) {
        pipeline.zadd(key, { score: compositeScore, member });
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