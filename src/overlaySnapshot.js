import { buildStandings } from './scoreboard.js';

export function buildOverlayPayload(game) {
  const teams = buildStandings(game).map((row) => ({
    id: row.id,
    rank: row.rank,
    name: row.team.name?.en || '',
    iso2: row.team.iso2 || '',
    emoji: row.team.emoji || '',
    color: row.team.color,
    flagImage: row.team.flagImage || null,
    tiles: row.tiles,
    percent: row.percent,
    viewers: row.viewers,
    eliminated: row.eliminated,
  }));

  const feed = (game.feed?.items || []).map((item) => ({
    id: item.id,
    text: item.text,
    color: item.color,
  }));

  return {
    type: 'leaderboard',
    round: {
      state: game.round?.state || 'idle',
      timeLeft: Math.round(game.round?.timeLeft || 0),
      autoLoop: !!game.round?.autoLoop,
    },
    claimable: game.grid?.claimableTiles || 0,
    teams,
    feed,
    updatedAt: Date.now(),
  };
}
