export function overlayRows(payload, options = {}) {
  const limit = Number(options.rows) || 12;
  const arabic = options.lang === 'ar';
  const teams = (payload && payload.teams ? payload.teams : []).slice(0, limit);
  return teams.map((team, index) => ({
    id: String(team.id),
    rank: index + 1,
    label: arabic && team.nameAr ? team.nameAr : team.name,
    percent: Number(team.percent) || 0,
    eliminated: Boolean(team.eliminated),
    emoji: team.emoji || '🏳️',
    flagImage: team.flagImage || '',
    crown: index === 0 && team.tiles > 0 && !team.eliminated,
  }));
}

export function overlaySignature(payload, options = {}) {
  const rows = overlayRows(payload, options);
  return JSON.stringify({
    lang: options.lang || 'en',
    state: (payload && payload.round && payload.round.state) || 'idle',
    timeLeft: (payload && payload.round && payload.round.timeLeft) || 0,
    rows: rows.map((row) => [row.id, row.label, row.percent, row.eliminated, row.flagImage, row.emoji, row.crown]),
  });
}
