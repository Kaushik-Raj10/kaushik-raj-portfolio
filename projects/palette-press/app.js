'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const harmonies = {
    analogous: [-34, -17, 0, 17, 34],
    complementary: [0, 12, -12, 172, 188],
    triadic: [0, 112, 128, 232, 248]
  };
  const initial = ['#F2C197', '#FF7852', '#C9ADED', '#AF5477', '#4F324C'];
  const key = 'kr-palette-press-v1';
  const hexPattern = /^#[0-9a-f]{6}$/i;
  const harmony = byId('harmony');
  const board = byId('swatches');
  const output = byId('css-output');
  const status = byId('palette-status');
  let colors = initial.slice();
  let locked = initial.map(() => false);

  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Array.isArray(saved.colors) && saved.colors.length === 5 &&
        saved.colors.every(color => typeof color === 'string' && hexPattern.test(color)) &&
        Array.isArray(saved.locked) && saved.locked.length === 5 &&
        saved.locked.every(value => typeof value === 'boolean') &&
        Object.hasOwn(harmonies, saved.harmony)) {
      colors = saved.colors;
      locked = saved.locked;
      harmony.value = saved.harmony;
    }
  } catch { /* A fresh palette also works when storage is unavailable. */ }

  function toHex(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const a = s * Math.min(l, 1 - l);
    function channel(n) {
      const k = (n + hue / 30) % 12;
      const rgb = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * rgb).toString(16).padStart(2, '0');
    }
    return ('#' + channel(0) + channel(8) + channel(4)).toUpperCase();
  }

  function ink(hex) {
    const rgb = hex.slice(1).match(/../g).map(value => {
      const c = parseInt(value, 16) / 255;
      return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
    });
    const luminance = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
    return luminance > .179 ? '#11110F' : '#FFFFFF';
  }

  const tiles = colors.map((_, index) => {
    const tile = document.createElement('div');
    tile.className = 'palette-tile';
    const code = document.createElement('span');
    code.className = 'tile-hex';
    const lock = document.createElement('button');
    lock.type = 'button';
    lock.className = 'lock-color';
    lock.addEventListener('click', () => {
      locked[index] = !locked[index];
      paint();
      status.textContent = 'Color ' + (index + 1) + (locked[index] ? ' locked.' : ' unlocked.');
    });
    tile.append(code, lock);
    board.append(tile);
    return { tile, code, lock };
  });

  function paint() {
    colors.forEach((color, i) => {
      const { tile, code, lock } = tiles[i];
      tile.style.backgroundColor = color;
      tile.style.color = ink(color);
      code.textContent = color;
      lock.textContent = locked[i] ? 'Locked' : 'Lock';
      lock.setAttribute('aria-label', (locked[i] ? 'Unlock' : 'Lock') + ' color ' + (i + 1));
      lock.setAttribute('aria-pressed', String(locked[i]));
    });
    output.value = ':root {\n' + colors.map((color, i) => '  --color-' + (i + 1) + ': ' + color + ';').join('\n') + '\n}';
    byId('generate').disabled = locked.every(Boolean);
    try { localStorage.setItem(key, JSON.stringify({ colors, locked, harmony: harmony.value })); } catch {}
  }

  function generate() {
    if (locked.every(Boolean)) {
      status.textContent = 'Unlock a color to shuffle the palette.';
      paint();
      return;
    }
    const hue = 360 * Math.random();
    const offsets = harmonies[harmony.value];
    const levels = [.8, .65, .71, .47, .29];
    colors = colors.map((color, i) => locked[i] ? color :
      toHex(hue + offsets[i], .46 + Math.random() * .33, levels[i]));
    paint();
    status.textContent = 'New palette ready.';
  }

  byId('generate').addEventListener('click', generate);
  harmony.addEventListener('change', generate);
  byId('copy-css').addEventListener('click', async () => {
    let copied = false;
    try { await navigator.clipboard.writeText(output.value); copied = true; }
    catch {
      output.focus();
      output.select();
      try { copied = document.execCommand('copy'); } catch {}
    }
    status.textContent = copied ? 'CSS copied.' : 'CSS selected. Press Ctrl+C or Command+C to copy.';
  });
  byId('download-css').addEventListener('click', () => {
    const file = new Blob([output.value + '\n'], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'palette.css';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    status.textContent = 'Created palette.css.';
  });
  paint();
})();
