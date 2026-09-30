const STATE_LABELS = {
  idle: 'IDLE',
  countdown: 'GET READY',
  playing: 'LIVE',
  roundEnd: 'FINISH',
  intermission: 'NEXT ROUND',
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[char]
  })
}

export function renderScoreboard(game) {
  const container = document.getElementById('leaderboard')
  if (!container) return

  const teams = game.teams || []
  const board = game.scoring.leaderboard(teams.map((team) => team.id))
  const claimable = game.grid ? game.grid.claimableTiles : 0

  let html = ''
  board.forEach((row, index) => {
    const team = teams.find((entry) => entry.id === row.teamId)
    if (!team) return
    const flag = team.flagImage
      ? `<img class="sb-flag" src="${escapeHtml(team.flagImage)}" alt="" />`
      : `<span class="sb-emoji">${escapeHtml(team.emoji || '🏳️')}</span>`
    const tiles = game.territoryCounts ? game.territoryCounts.get(team.id) || 0 : 0
    const percent = claimable ? Math.round((tiles / claimable) * 100) : 0
    html += `<div class="sb-entry">
      <span class="sb-rank">${index + 1}</span>
      ${flag}
      <span class="sb-name">${escapeHtml(team.name?.en || '')}</span>
      <span class="sb-terr">${percent}%</span>
      <span class="sb-score">${Math.round(row.combined)}</span>
    </div>`
  })
  container.innerHTML = html

  const stateEl = document.getElementById('round-state')
  if (stateEl) stateEl.textContent = STATE_LABELS[game.round?.state] || ''
}
