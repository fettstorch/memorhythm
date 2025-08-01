import { Redis } from '@upstash/redis';

export function createRedisClient({ readonly = false }: { readonly?: boolean } = {}) {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: readonly 
      ? process.env.KV_REST_API_READ_ONLY_TOKEN!
      : process.env.KV_REST_API_TOKEN!,
  });
}

export const REDIS_KEYS = {
  LEADERBOARD: {
    POSITION: 'memorhythm:leaderboard:position',
    RHYTHM: 'memorhythm:leaderboard:rhythm', 
    TOTAL: 'memorhythm:leaderboard:total',
    ROUND: 'memorhythm:leaderboard:round',
  },
} as const;

export function getLeaderboardKey(category: string): string {
  const key = REDIS_KEYS.LEADERBOARD[category.toUpperCase() as keyof typeof REDIS_KEYS.LEADERBOARD];
  if (!key) {
    throw new Error(`Invalid leaderboard category: ${category}`);
  }
  return key;
}