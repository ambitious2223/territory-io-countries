import { buildStandings } from './scoreboard.js';
import { getLanguage } from './i18n.js';

export function buildOverlayPayload(game) {
  const teams = buildStandings(game).map((row) => ({
    id: row.id,
    rank: row.rank,
    name: row.team.name?.en || '',
    nameAr: row.team.name?.ar || row.team.name?.en || '',
    iso2: row.team.iso2 || '',
    emoji: row.team.emoji || '',
    color: row.team.color,
    flagImage: row.team.flagImage || null,
    tiles: row.tiles,
    percent: row.percent,
    eliminated: row.eliminated,
  }));

  return {
    type: 'leaderboard',
    lang: getLanguage(),
    round: {
      state: game.round?.state || 'idle',
      timeLeft: Math.round(game.round?.timeLeft || 0),
      autoLoop: !!game.round?.autoLoop,
    },
    claimable: game.grid?.claimableTiles || 0,
    teams,
    updatedAt: Date.now(),
  };
}
