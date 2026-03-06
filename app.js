/**
 * RouteMaster — Warehouse Order Picker
 * app.js
 *
 * Table of Contents
 * ─────────────────────────────────────
 * 1.  Config
 * 2.  State & Helpers
 * 3.  A* Algorithm  (local fallback)
 * 4.  Input Validation
 * 5.  Grid Builder
 * 6.  Path Animation
 * 7.  Trail Cell Renderer
 * 8.  Output Panel
 * 9.  API Call  (backend / local fallback)
 * 10. Reset
 * 11. Init
 */


/* ─────────────────────────────────────
   1. CONFIG
   Set BACKEND_URL to the teammate's ngrok
   address once the FastAPI server is live.
   Leave as '' to run the local A* fallback.
───────────────────────────────────── */
const BACKEND_URL = 'http://127.0.0.1:8000'; // e.g. 'https://abc123.ngrok.io'


/* ─────────────────────────────────────
   2. STATE & HELPERS
───────────────────────────────────── */
let animSpeed   = 150;   // ms between animation steps
let animHandle  = null;  // setTimeout handle (used to cancel mid-animation)
let currentData = null;  // last result — used by copyOutput()

// Direction map for drawing arrows on frozen trail cells
const DIR_ARROWS = { '0,-1': '←', '0,1': '→', '-1,0': '↑', '1,0': '↓' };

function dirArrow(from, to) {
  const key = `${to[0] - from[0]},${to[1] - from[1]}`;
  return DIR_ARROWS[key] || '·';
}

// Green gradient along the path: early steps = dim, later steps = bright
function pathColor(stepIdx, totalSteps) {
  const t = totalSteps <= 1 ? 1 : stepIdx / (totalSteps - 1);
  const g = Math.round(30  + t * (245 - 30));
  const b = Math.round(60  + t * (255 - 60));
  return `rgb(0,${g},${b})`;
}

function updateSpeed(el) {
  animSpeed = parseInt(el.value);
  document.getElementById('speed-lbl').textContent = animSpeed + 'ms';
}

function loadFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('json-input').value = ev.target.result; };
  reader.readAsText(file);
}

function setEl(id, val) {
  document.getElementById(id).textContent = val;
}

function setMode(text, color) {
  const el = document.getElementById('mode-ind');
  el.textContent   = text;
  el.style.color   = color;
  el.style.borderColor = color + '55';
  el.style.background  = color + '12';
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function copyOutput() {
  if (!currentData) return;
  navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
  toast('JSON copied to clipboard!');
}


/* ─────────────────────────────────────
   3. A* ALGORITHM  (local fallback)

   Finds the shortest path on a 2-D grid
   using the A* best-first search algorithm.

   f(n) = g(n) + h(n)
     g(n) = actual steps taken from start
     h(n) = Manhattan distance to target
            (admissible heuristic for 4-dir grids)

   Priority queue implemented as a sorted array.
   Only enters cells with value 0 or 2.
   4-directional movement only (spec requirement).
───────────────────────────────────── */
function astar(grid, start, target) {
  const t0   = performance.now();
  const rows = grid.length;
  const cols = grid[0].length;
  const [sr, sc] = start;
  const [er, ec] = target;

  // Manhattan distance heuristic
  const h = (r, c) => Math.abs(er - r) + Math.abs(ec - c);

  const heap   = [[h(sr, sc), 0, sr, sc]]; // [f, g, row, col]
  const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const parent = Array.from({ length: rows }, () => Array(cols).fill(null));
  gScore[sr][sc] = 0;

  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up / down / left / right

  while (heap.length) {
    // Pop node with lowest f score
    heap.sort((a, b) => a[0] - b[0]);
    const [, g, r, c] = heap.shift();

    if (g > gScore[r][c]) continue; // stale entry — skip

    // Target reached — reconstruct path by walking parent map
    if (r === er && c === ec) {
      const path = [];
      let cur = [er, ec];
      while (cur) {
        path.unshift(cur);
        cur = parent[cur[0]][cur[1]];
      }
      return {
        path,
        total_steps:       path.length - 1,
        target_reached:    true,
        execution_time_ms: Math.round((performance.now() - t0) * 10) / 10,
      };
    }

    // Expand neighbours
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === 1) continue; // obstacle — blocked
      const ng = g + 1;
      if (ng < gScore[nr][nc]) {
        gScore[nr][nc] = ng;
        parent[nr][nc] = [r, c];
        heap.push([ng + h(nr, nc), ng, nr, nc]);
      }
    }
  }

  // No path found
  return {
    path:              [start],
    total_steps:       0,
    target_reached:    false,
    execution_time_ms: Math.round((performance.now() - t0) * 10) / 10,
  };
}


/* ─────────────────────────────────────
   4. INPUT VALIDATION
   Parses JSON from the textarea and checks
   the required schema. Enforces single target.
───────────────────────────────────── */
function parseInput() {
  const raw = document.getElementById('json-input').value.trim();
  const ta  = document.getElementById('json-input');
  const err = document.getElementById('err-box');

  try {
    const d = JSON.parse(raw);

    if (!d.grid || !d.start || !d.targets)
      throw new Error('Missing required fields: grid, start, targets');

    if (!Array.isArray(d.targets) || d.targets.length !== 1)
      throw new Error('targets must be an array with exactly ONE entry: [[row,col]]');

    ta.classList.remove('error');
    err.style.display = 'none';
    return d;

  } catch (e) {
    ta.classList.add('error');
    err.textContent   = '⚠ ' + e.message;
    err.style.display = 'block';
    return null;
  }
}


/* ─────────────────────────────────────
   5. GRID BUILDER
   Creates DOM cells for every grid position.
   Assigns icons, badges, and coordinate labels.
   Auto-sizes cells to fit the available viewport.
───────────────────────────────────── */
function buildGrid(grid, start, targets) {
  const el   = document.getElementById('wgrid');
  const rows = grid.length;
  const cols = grid[0].length;

  el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  el.innerHTML = '';

  // Size cells to fill available space
  const area  = document.getElementById('grid-area');
  const avail = Math.min(area.clientWidth - 80, area.clientHeight - 80);
  const cs    = Math.max(28, Math.min(64, Math.floor(avail / Math.max(rows, cols))));
  el.style.gap = '4px';

  const [tr, tc] = targets[0];
  const iconSz   = Math.round(cs * 0.38);
  const badgeSz  = Math.max(6, Math.round(cs * 0.14));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell     = document.createElement('div');
      cell.className = 'cell';
      cell.style.width  = cs + 'px';
      cell.style.height = cs + 'px';
      cell.dataset.pos  = `[${r},${c}]`;
      cell.id           = `cell-${r}-${c}`;

      const isStart  = r === start[0] && c === start[1];
      const isTarget = r === tr       && c === tc;

      if (grid[r][c] === 1) {
        // OBSTACLE — hatched background, red ✕
        cell.classList.add('c-obstacle');
        const icon = document.createElement('div');
        icon.className = 'cell-icon';
        icon.style.cssText = `font-size:${iconSz * 1.1}px; color:#f85149;`;
        icon.textContent   = '✕';
        cell.appendChild(icon);

      } else if (isStart) {
        // START POSITION
        cell.classList.add('c-start');
        const icon = document.createElement('div');
        icon.className   = 'cell-icon';
        icon.style.fontSize = iconSz + 'px';
        icon.textContent = '🚶';
        cell.appendChild(icon);

        const badge = document.createElement('div');
        badge.className = 'cell-badge';
        badge.style.cssText = `font-size:${badgeSz}px; background:var(--green); color:#000;`;
        badge.textContent   = 'START';
        cell.appendChild(badge);

      } else if (isTarget) {
        // TARGET ITEM
        cell.classList.add('c-target');
        const icon = document.createElement('div');
        icon.className   = 'cell-icon';
        icon.style.fontSize = iconSz + 'px';
        icon.textContent = '📦';
        cell.appendChild(icon);

        const badge = document.createElement('div');
        badge.className = 'cell-badge';
        badge.style.cssText = `font-size:${badgeSz}px; background:var(--yellow); color:#000;`;
        badge.textContent   = 'ITEM';
        cell.appendChild(badge);

      } else {
        // WALKABLE — faint coordinate label
        cell.classList.add('c-walk');
        const coord = document.createElement('div');
        coord.style.cssText = `
          font-family: 'JetBrains Mono', monospace;
          font-size: ${Math.max(7, cs * 0.18)}px;
          color: rgba(255,255,255,0.08);
          position: absolute; bottom: 2px; left: 3px;
        `;
        coord.textContent = `${r},${c}`;
        cell.appendChild(coord);
      }

      el.appendChild(cell);
    }
  }

  document.getElementById('placeholder').style.display = 'none';
  el.style.display = 'grid';
}


/* ─────────────────────────────────────
   6. PATH ANIMATION
   Steps through the path array one cell at a
   time, showing the moving picker (🚶) as the
   "head", then freezing each cell as a footprint
   trail via freezeTrail().
───────────────────────────────────── */
function animatePath(result) {
  const { path, total_steps, target_reached, execution_time_ms } = result;
  const totalSteps = path.length - 1;
  let step = 0;
  let prevHeadCell = null;

  // Initialise status strip
  document.getElementById('status-strip').classList.add('on');
  document.getElementById('s-reached-wrap').style.display = 'none';
  setEl('s-steps', '0');
  setEl('s-status', 'ROUTING...');
  document.getElementById('s-status').className = 'vo';
  document.getElementById('prog-fill').style.width = '0%';
  setMode('COMPUTING A* PATH...', '#ffd60a');

  // Read cell size from first path cell
  const firstCell = document.getElementById(`cell-${path[0][0]}-${path[0][1]}`);
  const cs      = firstCell ? parseInt(firstCell.style.width) : 40;
  const iconSz  = Math.round(cs * 0.38);
  const stepSz  = Math.max(7, Math.round(cs * 0.18));

  function tick() {
    // ── Animation complete ──
    if (step >= path.length) {
      if (prevHeadCell && !prevHeadCell.classList.contains('c-start'))
        freezeTrail(prevHeadCell, step - 1, totalSteps, path, step - 1);

      document.getElementById('s-reached-wrap').style.display = 'flex';
      setEl('s-reached', target_reached ? 'TRUE' : 'FALSE');
      document.getElementById('s-reached').className = target_reached ? 'vg' : 'vr';
      setEl('s-status', target_reached ? 'TARGET REACHED ✓' : 'NO PATH ✗');
      document.getElementById('s-status').className = target_reached ? 'vg' : 'vr';
      document.getElementById('prog-fill').style.width = '100%';
      document.getElementById('btn-run').disabled = false;
      setMode(target_reached ? 'ROUTE COMPLETE' : 'NO PATH', target_reached ? '#00ff88' : '#ff2d55');
      showOutput(result);
      toast(target_reached ? '✓ Target reached! Route complete.' : '✗ No path to target exists.');
      return;
    }

    const [r, c] = path[step];
    const cell   = document.getElementById(`cell-${r}-${c}`);
    if (!cell) { step++; animHandle = setTimeout(tick, animSpeed); return; }

    // Step 0 is the start cell — skip directly
    if (step === 0) {
      step++;
      animHandle = setTimeout(tick, animSpeed);
      return;
    }

    // Freeze previous head into trail
    if (prevHeadCell && prevHeadCell !== cell)
      freezeTrail(prevHeadCell, step - 1, totalSteps, path, step - 1);

    // ── Final step: target reached ──
    if (step === path.length - 1 && target_reached) {
      cell.classList.remove('c-target', 'c-walk', 'c-path');
      cell.innerHTML = '';
      cell.classList.add('c-reached');

      const icon = document.createElement('div');
      icon.className   = 'cell-icon';
      icon.style.fontSize = iconSz + 'px';
      icon.textContent = '✅';
      cell.appendChild(icon);

      const badge = document.createElement('div');
      badge.className = 'cell-badge';
      badge.style.cssText = `font-size:${Math.max(6, Math.round(cs * 0.14))}px; background:var(--green); color:#000;`;
      badge.textContent   = 'REACHED';
      cell.appendChild(badge);

      prevHeadCell = null;

    } else {
      // ── Moving head — show picker icon ──
      cell.classList.remove('c-walk');
      cell.classList.add('c-head');
      cell.innerHTML = '';

      const pickerIcon = document.createElement('div');
      pickerIcon.className   = 'cell-icon';
      pickerIcon.style.fontSize = iconSz + 'px';
      pickerIcon.textContent = '🚶';
      cell.appendChild(pickerIcon);

      const stepBadge = document.createElement('div');
      stepBadge.className = 'cell-step';
      stepBadge.style.fontSize = stepSz + 'px';
      stepBadge.textContent   = step;
      cell.appendChild(stepBadge);

      prevHeadCell = cell;
    }

    setEl('s-steps', step);
    document.getElementById('prog-fill').style.width =
      Math.round((step / Math.max(1, totalSteps)) * 100) + '%';

    step++;
    animHandle = setTimeout(tick, animSpeed);
  }

  tick();
}


/* ─────────────────────────────────────
   7. TRAIL CELL RENDERER
   Converts a "head" cell into a permanent trail:
   • 👣 footprint icon
   • direction arrow
   • step number
   • green gradient that brightens along the route
───────────────────────────────────── */
function freezeTrail(cell, stepIdx, totalSteps, path, thisStep) {
  if (cell.classList.contains('c-start') || cell.classList.contains('c-reached')) return;

  cell.classList.remove('c-head');
  cell.classList.add('c-path');
  cell.innerHTML = '';

  const cs    = parseInt(cell.style.width) || 40;
  const color = pathColor(stepIdx, totalSteps);
  const ratio = stepIdx / Math.max(1, totalSteps);
  const alpha = 0.12 + 0.18 * ratio;

  // Green gradient fill — brighter as path progresses
  cell.style.background  = `linear-gradient(135deg,
    rgba(0,${Math.round(30 + ratio * 215)},${Math.round(60 + ratio * 195)},${alpha + 0.05}),
    rgba(0,0,${Math.round(40 + ratio * 160)},${alpha}))`;
  cell.style.borderColor = color;
  cell.style.boxShadow   = `0 0 ${4 + ratio * 8}px ${color}55`;

  // 👣 Footprint icon
  const foot = document.createElement('div');
  foot.className = 'cell-icon';
  foot.style.cssText = `font-size:${Math.round(cs * 0.36)}px; opacity:0.75;`;
  foot.textContent   = '👣';
  cell.appendChild(foot);

  // Direction arrow (skip on first and last trail cells)
  if (thisStep > 0 && thisStep < path.length - 1) {
    const arrow = document.createElement('div');
    arrow.className = 'cell-arrow';
    arrow.style.cssText = `font-size:${Math.round(cs * 0.4)}px; color:${color}; opacity:0.7;`;
    arrow.textContent   = dirArrow(path[thisStep - 1], path[thisStep]);
    cell.appendChild(arrow);
  }

  // Step number badge
  const stepNum = document.createElement('div');
  stepNum.className = 'cell-step';
  stepNum.style.cssText = `
    font-size: ${Math.max(7, Math.round(cs * 0.18))}px;
    color: ${color}; opacity: 0.85;
    bottom: 2px; right: 3px; position: absolute;
    font-family: 'JetBrains Mono', monospace; line-height: 1;
  `;
  stepNum.textContent = stepIdx;
  cell.appendChild(stepNum);
}


/* ─────────────────────────────────────
   8. OUTPUT PANEL
   Populates all 4 mandatory schema fields
   and shows the JSON response block.
───────────────────────────────────── */
function showOutput(result) {
  const { total_steps, path, target_reached, execution_time_ms } = result;

  setEl('stat-steps',   total_steps);
  setEl('stat-pathlen', path.length);
  setEl('stat-ms',      execution_time_ms);
  setEl('stat-reached', target_reached ? 'TRUE' : 'FALSE');

  // Color the target_reached box green or red
  const reachedBox = document.getElementById('box-reached');
  const reachedNum = document.getElementById('stat-reached');
  reachedBox.classList.remove('reached-true', 'reached-false');
  reachedNum.classList.remove('reached-true', 'reached-false');
  reachedBox.classList.add(target_reached ? 'reached-true' : 'reached-false');
  reachedNum.classList.add(target_reached ? 'reached-true' : 'reached-false');

  // Bounce animation on each stat number
  ['stat-steps', 'stat-pathlen', 'stat-ms', 'stat-reached'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('pop');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('pop');
  });

  // Render JSON output
  const output = { total_steps, path, target_reached, execution_time_ms };
  document.getElementById('json-out').textContent = JSON.stringify(output, null, 2);
  document.getElementById('out-panel').classList.add('visible');
  currentData = output;
}


/* ─────────────────────────────────────
   9. API CALL
   Posts the grid payload to the backend.
   Falls back to local A* if BACKEND_URL
   is empty or the request fails.
───────────────────────────────────── */
async function runVisualization() {
  if (animHandle) { clearTimeout(animHandle); animHandle = null; }

  const data = parseInput();
  if (!data) return;

  const { grid, start, targets } = data;

  buildGrid(grid, start, targets);
  document.getElementById('btn-run').disabled = true;
  document.getElementById('out-panel').classList.remove('visible');

  let result;

  if (BACKEND_URL) {
    // POST to teammate's FastAPI /solve endpoint
    // Request:  { grid, start, targets }   — targets has ONE entry
    // Response: { total_steps, path, target_reached, execution_time_ms }
    try {
      setMode('CALLING BACKEND...', '#ffd60a');
      const res = await fetch(BACKEND_URL + '/solve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ grid, start, targets }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      result = await res.json();
    } catch (err) {
      console.warn('Backend error, using local A*:', err.message);
      toast('Backend unreachable — using local A*');
      result = astar(grid, start, targets[0]);
    }
  } else {
    result = astar(grid, start, targets[0]);
  }

  animatePath(result);
}


/* ─────────────────────────────────────
   10. RESET
   Returns the page to its initial state.
───────────────────────────────────── */
function resetAll() {
  if (animHandle) { clearTimeout(animHandle); animHandle = null; }

  const wg = document.getElementById('wgrid');
  wg.style.display = 'none';
  wg.innerHTML     = '';

  document.getElementById('placeholder').style.display   = 'block';
  document.getElementById('out-panel').classList.remove('visible');
  document.getElementById('status-strip').classList.remove('on');
  document.getElementById('btn-run').disabled             = false;
  document.getElementById('json-input').classList.remove('error');
  document.getElementById('err-box').style.display        = 'none';
  document.getElementById('prog-fill').style.width        = '0%';
  document.getElementById('s-reached-wrap').style.display = 'none';
  setMode('SYSTEM READY', '#00ff88');
}


/* ─────────────────────────────────────
   11. INIT
   Pre-renders the sample grid on page load.
───────────────────────────────────── */
window.addEventListener('load', () => {
  try {
    const d = JSON.parse(document.getElementById('json-input').value);
    buildGrid(d.grid, d.start, d.targets);
  } catch (e) {
    // Invalid JSON in textarea on load — safe to ignore
  }
});
