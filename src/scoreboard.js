const STATE_LABELS = {
  idle: 'IDLE',
  countdown: 'GET READY',
  playing: 'LIVE',
  roundEnd: 'FINISH',
  intermission: 'NEXT ROUND',
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char]
  })
}

export function renderScoreboard(game) {
  const container = document.getElementById('leaderboard')
  if (!container) return

  const teams = game.teams || []
  const claimable = game.grid ? game.grid.claimableTiles : 0
  const rows = teams.map((team) => ({
    team,
    tiles: game.territoryCounts ? game.territoryCounts.get(team.id) || 0 : 0,
    viewers: game.countTeamMarbles ? game.countTeamMarbles(team.id) : 0,
  }))
  rows.sort((a, b) => b.tiles - a.tiles || b.viewers - a.viewers)

  let html = ''
  rows.forEach((row, index) => {
    const { team, tiles } = row
    const flag = team.flagImage
      ? `<img class="sb-flag" src="${escapeHtml(team.flagImage)}" alt="" />`
      : `<span class="sb-emoji">${escapeHtml(team.emoji || '🏳️')}</span>`
    const percent = claimable ? Math.round((tiles / claimable) * 100) : 0
    const cls = team.eliminated ? 'sb-entry out' : 'sb-entry'
    const crown = index === 0 && tiles > 0 && !team.eliminated ? '<span class="sb-crown">♛</span>' : ''
    html += `<div class="${cls}">
      <span class="sb-rank">${index + 1}</span>
      ${flag}
      <span class="sb-name">${escapeHtml(team.name?.en || '')}${crown}</span>
      <span class="sb-terr">${percent}%</span>
      <span class="sb-score">${row.viewers}</span>
    </div>`
  })
  container.innerHTML = html

  const stateEl = document.getElementById('round-state')
  if (stateEl) stateEl.textContent = STATE_LABELS[game.round?.state] || ''
}
