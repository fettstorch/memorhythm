import type { ScoreSubmission, LeaderboardResponse, ScoreCategory } from '../../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export async function submitScore(submission: ScoreSubmission): Promise<{ updated: boolean; categories?: string[] }> {
  const response = await fetch(`${API_BASE_URL}/api/memorhythm/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit score: ${response.statusText}`);
  }

  return response.json();
}

export async function getLeaderboard(category: ScoreCategory, limit = 10): Promise<LeaderboardResponse> {
  const url = `${API_BASE_URL}/api/memorhythm/leaderboard/${category}?limit=${limit}`;
  console.log('Fetching leaderboard from:', url);
  console.log('API_BASE_URL:', API_BASE_URL);
  
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
  }

  return response.json();
}