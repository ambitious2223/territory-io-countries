import { CONFIG } from './config.js';
import { randomRange, hexToRgba } from './utils.js';
import { Sword } from './sword.js';

export class Marble {
  constructor(x, y, color, name, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = randomRange(-1, 1);
    this.vy = randomRange(-1, 1);
    this.radius = CONFIG.MARBLE_RADIUS;
    this.color = color;
    this.name = name;
    this.hp = CONFIG.MARBLE_HEALTH;
    this.maxHp = CONFIG.MARBLE_HEALTH;
    this.kills = 0;
    this.alive = true;
    this.eliminated = false;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.sword = new Sword(this);
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.scale = 1;

    this.teamId = options.teamId ?? null;
    this.viewerId = options.viewerId ?? null;
    this.isBot = options.isBot ?? false;
    this.avatarUrl = options.avatar || '';
    this.avatarImage = null;
    if (this.avatarUrl) {
      const image = new Image();
      image.src = this.avatarUrl;
      this.avatarImage = image;
    }

    this.steerX = 0;
    this.steerY = 0;

    this.overcharge = false;
    this.shieldBuff = false;
    this.powerupTimer = 0;

    this.totalDamageDealt = 0;
    this.totalDamageTaken = 0;

    this.isClaiming = false;
    this.claimProgress = 0;
    this.claimDelay = CONFIG.CLAIM_DELAY_NEUTRAL;
    this.claimTargetRow = -1;
    this.claimTargetCol = -1;
    this.targetWorldX = 0;
    this.targetWorldY = 0;
    this.hasTarget = false;

    this.role = Math.random() < CONFIG.ROLE_CHOKEPOINT_RATIO ? 'chokepoint' : 'safe';
    this.comboCount = 0;
    this.comboTimer = 0;

    this.zeroTileTimer = 0;
  }

  applyPowerup(type, duration) {
    if (type === 'overcharge') {
      this.overcharge = true;
      this.powerupTimer = duration;
    } else if (type === 'shield') {
      this.shieldBuff = true;
      this.powerupTimer = duration;
    }
  }

  applyKnockback(dx, dy) {
    this.knockbackX += dx * CONFIG.KNOCKBACK_FORCE;
    this.knockbackY += dy * CONFIG.KNOCKBACK_FORCE;
  }

  cancelClaim() {
    if (!this.isClaiming) return false;
    this.isClaiming = false;
    this.claimProgress = 0;
    this.hasTarget = false;
    return true;
  }

  update(dt, grid, allMarbles) {
    if (!this.alive) return null;

    if (this.powerupTimer > 0) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.overcharge = false;
        this.shieldBuff = false;
        this.powerupTimer = 0;
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    if (this.isClaiming) {
      this.checkContested(allMarbles);
      if (!this.isClaiming) {
        this.sword.update(dt);
        return null;
      }

      this.claimProgress += dt;
      const ratio = this.claimProgress / this.claimDelay;
      grid.setFillProgress(this.claimTargetRow, this.claimTargetCol, ratio);

      if (this.claimProgress >= this.claimDelay) {
        grid.paintTile(this.claimTargetRow, this.claimTargetCol, this.color);
        this.isClaiming = false;
        this.claimProgress = 0;
        this.hasTarget = false;

        this.comboCount = Math.min(this.comboCount + 1, CONFIG.COMBO_MAX);
        this.comboTimer = CONFIG.COMBO_WINDOW;

        return { claimed: true, x: this.x, y: this.y, color: this.color, combo: this.comboCount };
      }
      this.sword.update(dt);
      return null;
    }

    this.updateTarget(grid);
    this.moveTowardTarget(dt);
    this.checkArrival(grid);

    this.knockbackX *= CONFIG.KNOCKBACK_DECAY;
    this.knockbackY *= CONFIG.KNOCKBACK_DECAY;
    if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
    if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;

    const maxX = CONFIG.CANVAS_WIDTH - this.radius;
    const maxY = CONFIG.CANVAS_HEIGHT - this.radius;
    if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
    if (this.x > maxX) { this.x = maxX; this.vx *= -1; }
    if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
    if (this.y > maxY) { this.y = maxY; this.vy *= -1; }

    this.sword.update(dt);
    return null;
  }

  checkContested(allMarbles) {
    if (!this.isClaiming) return;
    for (const other of allMarbles) {
      if (other === this || !other.alive) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.CLAIM_CONTEST_RADIUS + other.radius) {
        const cancelled = this.cancelClaim();
        if (cancelled) {
          if (this.onInterrupt) this.onInterrupt(this);
          if (!this.shieldBuff) {
            const nx = dx / dist || 0;
            const ny = dy / dist || 0;
            this.knockbackX -= nx * CONFIG.CLAIM_CANCEL_KNOCKBACK;
            this.knockbackY -= ny * CONFIG.CLAIM_CANCEL_KNOCKBACK;
          }
        }
        return;
      }
    }
  }

  updateTarget(grid) {
    if (this.hasTarget) return;

    const frontier = grid.getFrontierTiles(this.color);
    if (frontier.length === 0) {
      this.hasTarget = false;
      return;
    }

    let best = null;
    let bestScore = -Infinity;

    for (const tile of frontier) {
      const wx = (tile.col + 0.5) * grid.tileSize;
      const wy = (tile.row + 0.5) * grid.tileSize;
      const dx = wx - this.x;
      const dy = wy - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let score = -dist;

      const friendlyNeighbors = grid.getFriendlyNeighborCount(tile.row, tile.col, this.color);
      score += friendlyNeighbors * CONFIG.SHAPE_WEIGHT_NEIGHBOR;

      if (this.role === 'chokepoint') {
        const enemyNeighbors = grid.getEnemyNeighborCount(tile.row, tile.col, this.color);
        score += enemyNeighbors * CONFIG.CHOKEPOINT_ENEMY_BONUS;
      } else {
        score += friendlyNeighbors * CONFIG.SHAPE_WEIGHT_NEIGHBOR;
      }

      if (score > bestScore) {
        bestScore = score;
        best = tile;
      }
    }

    if (best) {
      this.claimTargetRow = best.row;
      this.claimTargetCol = best.col;
      this.targetWorldX = (best.col + 0.5) * grid.tileSize;
      this.targetWorldY = (best.row + 0.5) * grid.tileSize;
      this.hasTarget = true;

      const tileType = grid.getTileType(best.row, best.col, this.color);
      this.claimDelay = tileType === 'enemy' ? CONFIG.CLAIM_DELAY_ENEMY : CONFIG.CLAIM_DELAY_NEUTRAL;
      if (this.overcharge) this.claimDelay = 0.05;
    }
  }

  moveTowardTarget(dt) {
    if (!this.hasTarget) {
      this.applyWander(dt);
      return;
    }

    const dx = this.targetWorldX - this.x;
    const dy = this.targetWorldY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      const nx = dx / dist;
      const ny = dy / dist;
      const speedMult = this.overcharge ? 2.0 : 1;
      const moveSpeed = CONFIG.MARBLE_SPEED * speedMult;
      this.vx = nx * moveSpeed;
      this.vy = ny * moveSpeed;
    }

    const speedMult = this.overcharge ? 2.0 : 1;
    this.x += (this.vx * CONFIG.MARBLE_SPEED * speedMult + this.knockbackX) * dt;
    this.y += (this.vy * CONFIG.MARBLE_SPEED * speedMult + this.knockbackY) * dt;
  }

  applyWander(dt) {
    this.wanderAngle += randomRange(-0.3, 0.3);
    let steerX = Math.cos(this.wanderAngle) * 0.5;
    let steerY = Math.sin(this.wanderAngle) * 0.5;

    const margin = 60;
    if (this.x < margin) steerX += 1;
    if (this.x > CONFIG.CANVAS_WIDTH - margin) steerX -= 1;
    if (this.y < margin) steerY += 1;
    if (this.y > CONFIG.CANVAS_HEIGHT - margin) steerY -= 1;

    for (const other of this._allMarbles || []) {
      if (other === this || !other.alive) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120 && dist > 0) {
        steerX += (dx / dist) * 0.3;
        steerY += (dy / dist) * 0.3;
      }
    }

    const mag = Math.sqrt(steerX * steerX + steerY * steerY);
    if (mag > 0) {
      this.vx += (steerX / mag) * 0.1;
      this.vy += (steerY / mag) * 0.1;
    }

    this.steerX = steerX;
    this.steerY = steerY;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 2) {
      this.vx = (this.vx / speed) * 2;
      this.vy = (this.vy / speed) * 2;
    }

    const speedMult = this.overcharge ? 2.0 : 1;
    this.x += (this.vx * CONFIG.MARBLE_SPEED * speedMult + this.knockbackX) * dt;
    this.y += (this.vy * CONFIG.MARBLE_SPEED * speedMult + this.knockbackY) * dt;
  }

  checkArrival(grid) {
    if (!this.hasTarget) return;

    const dx = this.targetWorldX - this.x;
    const dy = this.targetWorldY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < CONFIG.TILE_SIZE * 0.3) {
      if (grid.isOwnedBy(this.claimTargetRow, this.claimTargetCol, this.color)) {
        this.hasTarget = false;
        return;
      }
      this.isClaiming = true;
      this.claimProgress = 0;
      this.vx = 0;
      this.vy = 0;
      this.x = this.targetWorldX;
      this.y = this.targetWorldY;
    }
  }

  setAllMarbles(allMarbles) {
    this._allMarbles = allMarbles;
  }

  takeDamage(amount, fromX, fromY) {
    if (this.shieldBuff) {
      this.shieldBuff = false;
      this.powerupTimer = 0;
      return false;
    }
    this.hp -= amount;
    this.totalDamageTaken += amount;
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.applyKnockback(dx / dist, dy / dist);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return true;
  }

  draw(ctx) {
    if (!this.alive) return;

    const glowSize = this.radius + 8 + Math.sin(Date.now() * 0.005) * 3;
    const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, glowSize);
    gradient.addColorStop(0, hexToRgba(this.color, 0.9));
    gradient.addColorStop(0.7, hexToRgba(this.color, 0.4));
    gradient.addColorStop(1, hexToRgba(this.color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    if (this.avatarImage && this.avatarImage.complete && this.avatarImage.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        this.avatarImage,
        this.x - this.radius,
        this.y - this.radius,
        this.radius * 2,
        this.radius * 2
      );
      ctx.restore();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (this.shieldBuff) {
      ctx.strokeStyle = '#00AAFF';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.overcharge) {
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.isClaiming) {
      this.drawClaimRing(ctx);
    }

    this.drawLabel(ctx);
    this.drawHPBar(ctx);
  }

  drawClaimRing(ctx) {
    const progress = this.claimProgress / this.claimDelay;
    const pulse = Math.sin(Date.now() * 0.01 * CONFIG.CLAIM_PULSE_SPEED) * 0.15 + 0.85;
    const r = CONFIG.CLAIM_RING_RADIUS * pulse;

    ctx.strokeStyle = hexToRgba(this.color, 0.3);
    ctx.lineWidth = CONFIG.CLAIM_RING_WIDTH;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = CONFIG.CLAIM_RING_WIDTH;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    const barW = 28;
    const barH = 3;
    const bx = this.x - barW / 2;
    const by = this.y + this.radius + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = this.color;
    ctx.fillRect(bx, by, barW * progress, barH);
  }

  drawLabel(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(this.name, this.x, this.y - this.radius - 22);

    ctx.font = 'bold 11px monospace';
    ctx.fillText(`[${this.kills}]`, this.x, this.y - this.radius - 10);
  }

  drawHPBar(ctx) {
    const barWidth = 30;
    const barHeight = 4;
    const bx = this.x - barWidth / 2;
    const by = this.y - this.radius - 6;
    const hpRatio = this.hp / this.maxHp;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, barWidth, barHeight);

    ctx.fillStyle = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f00';
    ctx.fillRect(bx, by, barWidth * hpRatio, barHeight);
  }
}
