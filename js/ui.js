// ui.js — DOM UI controller
export class UIManager {
  constructor() {
    this.menuScreen = document.getElementById('menu-screen');
    this.hud = document.getElementById('hud');
    this.gameoverScreen = document.getElementById('gameover-screen');

    this.scoreEl = document.getElementById('score-value');
    this.coinsEl = document.getElementById('coins-value');
    this.distanceEl = document.getElementById('distance-value');
    this.powerupIndicator = document.getElementById('powerup-indicator');

    this.finalScore = document.getElementById('final-score');
    this.finalCoins = document.getElementById('final-coins');
    this.finalDistance = document.getElementById('final-distance');
    this.finalBest = document.getElementById('final-best');
    this.newBestBadge = document.getElementById('new-best');
    this.menuBest = document.getElementById('menu-best');
  }

  showMenu(bestScore) {
    this.menuScreen.classList.add('active');
    this.hud.classList.remove('active');
    this.gameoverScreen.classList.remove('active');
    if (this.menuBest) {
      this.menuBest.textContent = bestScore > 0 ? `BEST: ${bestScore}` : '';
    }
  }

  showPlaying() {
    this.menuScreen.classList.remove('active');
    this.hud.classList.add('active');
    this.gameoverScreen.classList.remove('active');
  }

  showGameOver(score, coins, distance, bestScore, isNewBest) {
    this.menuScreen.classList.remove('active');
    this.hud.classList.remove('active');
    this.gameoverScreen.classList.add('active');

    this.finalScore.textContent = score;
    this.finalCoins.textContent = coins;
    this.finalDistance.textContent = `${distance}m`;
    this.finalBest.textContent = bestScore;
    if (this.newBestBadge) {
      this.newBestBadge.style.display = isNewBest ? 'block' : 'none';
    }
  }

  updateHUD(score, coins, distance) {
    this.scoreEl.textContent = score;
    this.coinsEl.textContent = coins;
    this.distanceEl.textContent = `${distance}m`;
  }

  updatePowerups(effects) {
    if (!this.powerupIndicator) return;
    if (effects.length === 0) {
      this.powerupIndicator.innerHTML = '';
      return;
    }
    this.powerupIndicator.innerHTML = effects.map(e => {
      const icons = { magnet: '🧲', shield: '🛡️', x2: '✕2' };
      const t = Math.ceil(e.time);
      return `<div class="powerup-badge ${e.type}">${icons[e.type] || e.type} ${t}s</div>`;
    }).join('');
  }
}
