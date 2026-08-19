/**
 * puzzle-login.js
 *
 * A portable, reusable puzzle-based login widget.
 * Displays a small 4:3 maze where the user drags a circle from
 * the top entrance to the bottom exit without touching walls.
 * On success, calls an optional onSuccess callback or redirects.
 *
 * Usage:
 *   PuzzleLogin.init({ redirectUrl: '/home' });
 *   PuzzleLogin.init({ onSuccess: () => console.log('solved!') });
 */

(function (global) {
  'use strict';

  // ─── Maze generation ────────────────────────────────────────────────────────

  /**
   * Generate a perfect maze using recursive back-tracking (depth-first search).
   * Returns a 2-D grid of cells, each with flags for open passages:
   *   { top, right, bottom, left }   (true = open, false = wall)
   *
   * @param {number} cols
   * @param {number} rows
   * @param {number} [seed]  - optional numeric seed for determinism
   * @returns {Array<Array<{top:boolean,right:boolean,bottom:boolean,left:boolean}>>}
   */
  function generateMaze(cols, rows, seed) {
    var rng = seededRng(seed !== undefined ? seed : Math.floor(Math.random() * 1e9));

    // Initialise grid – all walls closed
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = { top: false, right: false, bottom: false, left: false, visited: false };
      }
    }

    var directions = [
      { dr: -1, dc: 0, from: 'bottom', to: 'top' },
      { dr: 1,  dc: 0, from: 'top',    to: 'bottom' },
      { dr: 0,  dc: 1, from: 'left',   to: 'right' },
      { dr: 0,  dc: -1, from: 'right', to: 'left' }
    ];

    function carve(r, c) {
      grid[r][c].visited = true;
      var dirs = shuffle(directions.slice(), rng);
      for (var i = 0; i < dirs.length; i++) {
        var d = dirs[i];
        var nr = r + d.dr;
        var nc = c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
          grid[r][c][d.to] = true;
          grid[nr][nc][d.from] = true;
          carve(nr, nc);
        }
      }
    }

    // Start from a random cell in the top row
    var startCol = Math.floor(rng() * cols);
    carve(0, startCol);

    // Ensure entrance at top of column 0 or startCol and exit at bottom
    grid[0][startCol].top = true;
    var exitCol = Math.floor(rng() * cols);
    grid[rows - 1][exitCol].bottom = true;

    // Expose entrance/exit columns for the caller
    grid._entranceCol = startCol;
    grid._exitCol = exitCol;

    return grid;
  }

  /** Seeded pseudo-random number generator (mulberry32) */
  function seededRng(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /** Fisher-Yates shuffle using provided rng */
  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // ─── Maze renderer & interaction ────────────────────────────────────────────

  var COLS = 5;
  var ROWS = 7; // 5×7 gives close to 4:3 aspect when cells are square

  var WALL_COLOR = '#3a3a4a';
  var PATH_COLOR = '#f8f8f8';
  var CIRCLE_COLOR = '#3498db';
  var CIRCLE_BORDER = '#2176ae';
  var EXIT_COLOR = '#27ae60';
  var ENTRANCE_COLOR = '#e67e22';

  /**
   * PuzzleMaze – manages the canvas, maze state and drag interactions.
   */
  function PuzzleMaze(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this._build();
  }

  PuzzleMaze.prototype._build = function () {
    this.maze = generateMaze(COLS, ROWS, this.opts.seed);
    this.entranceCol = this.maze._entranceCol;
    this.exitCol = this.maze._exitCol;

    // Place circle at entrance (top of entrance cell, centred)
    this._resetCircle();
    this.solved = false;
    this.dragging = false;
    this._bindEvents();
    this._render();
  };

  PuzzleMaze.prototype._resetCircle = function () {
    var cell = this._cellSize();
    this.cx = (this.entranceCol + 0.5) * cell.w;
    this.cy = 0; // starts at very top (in the entrance gap)
    this.radius = Math.min(cell.w, cell.h) * 0.32;
  };

  PuzzleMaze.prototype._cellSize = function () {
    return {
      w: this.canvas.width / COLS,
      h: this.canvas.height / ROWS
    };
  };

  // Convert canvas-relative pixel to maze cell
  PuzzleMaze.prototype._toCell = function (px, py) {
    var cell = this._cellSize();
    return {
      col: Math.floor(px / cell.w),
      row: Math.floor(py / cell.h)
    };
  };

  PuzzleMaze.prototype._render = function () {
    var ctx = this.ctx;
    var W = this.canvas.width;
    var H = this.canvas.height;
    var cw = W / COLS;
    var ch = H / ROWS;

    // Background
    ctx.fillStyle = PATH_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Draw cells
    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 2;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = this.maze[r][c];
        var x = c * cw;
        var y = r * ch;

        ctx.beginPath();
        // top wall
        if (!cell.top) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + cw, y);
        }
        // right wall
        if (!cell.right) {
          ctx.moveTo(x + cw, y);
          ctx.lineTo(x + cw, y + ch);
        }
        // bottom wall
        if (!cell.bottom) {
          ctx.moveTo(x, y + ch);
          ctx.lineTo(x + cw, y + ch);
        }
        // left wall
        if (!cell.left) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + ch);
        }
        ctx.stroke();
      }
    }

    // Entrance indicator (top)
    ctx.fillStyle = ENTRANCE_COLOR;
    ctx.fillRect(this.entranceCol * cw + 4, 0, cw - 8, 5);

    // Exit indicator (bottom)
    ctx.fillStyle = EXIT_COLOR;
    ctx.fillRect(this.exitCol * cw + 4, H - 5, cw - 8, 5);

    // Draggable circle
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.solved ? EXIT_COLOR : CIRCLE_COLOR;
    ctx.fill();
    ctx.strokeStyle = this.solved ? '#1a7a45' : CIRCLE_BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // ─── Collision detection ────────────────────────────────────────────────────

  /**
   * Check whether moving the circle centre to (nx, ny) is a valid move.
   * Returns true if allowed, false if it would collide with a wall.
   */
  PuzzleMaze.prototype._isValidPosition = function (nx, ny) {
    var W = this.canvas.width;
    var H = this.canvas.height;
    var r = this.radius;
    var cw = W / COLS;
    var ch = H / ROWS;

    // Allow a small overshoot above canvas (entrance gap) and below (exit)
    var minY = -r;
    var maxY = H + r;

    if (nx - r < 0 || nx + r > W) return false;
    if (ny < minY || ny > maxY) return false;

    // Check circle against every wall segment of every cell it overlaps
    // We probe the 4 cardinal edges of the bounding box
    var probes = [
      { px: nx - r, py: ny },
      { px: nx + r, py: ny },
      { px: nx, py: ny - r },
      { px: nx, py: ny + r }
    ];

    for (var i = 0; i < probes.length; i++) {
      var p = probes[i];
      var col = Math.floor(p.px / cw);
      var row = Math.floor(p.py / ch);

      // Out of bounds probes are only allowed for entrance/exit gaps
      if (row < 0) {
        // Above canvas – only allowed in entrance column
        if (col !== this.entranceCol) return false;
        continue;
      }
      if (row >= ROWS) {
        // Below canvas – only allowed in exit column
        if (col !== this.exitCol) return false;
        continue;
      }
      if (col < 0 || col >= COLS) return false;

      var cell = this.maze[row][col];
      var cx2 = col * cw;
      var cy2 = row * ch;

      // Check distance from circle centre to each closed wall segment
      // Top wall (cell.top is true for entrance, so no special-case needed here)
      if (!cell.top) {
        if (distToSegment(nx, ny, cx2, cy2, cx2 + cw, cy2) < r) return false;
      }
      // Bottom wall
      if (!cell.bottom && row === ROWS - 1 && col === this.exitCol) {
        // exit gap – open
      } else if (!cell.bottom) {
        if (distToSegment(nx, ny, cx2, cy2 + ch, cx2 + cw, cy2 + ch) < r) return false;
      }
      // Left wall
      if (!cell.left) {
        if (distToSegment(nx, ny, cx2, cy2, cx2, cy2 + ch) < r) return false;
      }
      // Right wall
      if (!cell.right) {
        if (distToSegment(nx, ny, cx2 + cw, cy2, cx2 + cw, cy2 + ch) < r) return false;
      }
    }

    return true;
  };

  /** Minimum distance from point (px,py) to segment (x1,y1)-(x2,y2) */
  function distToSegment(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    var t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ─── Event handling ─────────────────────────────────────────────────────────

  PuzzleMaze.prototype._bindEvents = function () {
    var self = this;
    var canvas = this.canvas;

    function getPos(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function isOnCircle(pos) {
      var dx = pos.x - self.cx;
      var dy = pos.y - self.cy;
      return Math.sqrt(dx * dx + dy * dy) <= self.radius * 1.5;
    }

    function onStart(e) {
      if (self.solved) return;
      e.preventDefault();
      var pos = getPos(e);
      if (isOnCircle(pos)) self.dragging = true;
    }

    function onMove(e) {
      if (!self.dragging || self.solved) return;
      e.preventDefault();
      var pos = getPos(e);
      if (self._isValidPosition(pos.x, pos.y)) {
        self.cx = pos.x;
        self.cy = pos.y;
      }
      self._render();
      self._checkSolved();
    }

    function onEnd(e) {
      if (!self.dragging) return;
      e.preventDefault();
      self.dragging = false;
    }

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });

    this._unbindEvents = function () {
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
    };
  };

  PuzzleMaze.prototype._checkSolved = function () {
    var H = this.canvas.height;
    // Solved when circle centre passes below the last row
    if (this.cy >= H + this.radius * 0.5) {
      var col = Math.floor(this.cx / (this.canvas.width / COLS));
      if (col === this.exitCol) {
        this.solved = true;
        this._render();
        if (typeof this.opts.onSolved === 'function') {
          this.opts.onSolved();
        }
      }
    }
  };

  PuzzleMaze.prototype.reset = function () {
    this._unbindEvents && this._unbindEvents();
    this._build();
  };

  PuzzleMaze.prototype.destroy = function () {
    this._unbindEvents && this._unbindEvents();
  };

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * PuzzleLogin.init(options)
   *
   * Options:
   *   container   {HTMLElement|string}  - Where to render. Defaults to document.body (overlay mode).
   *   redirectUrl {string}              - URL to navigate to on success.
   *   onSuccess   {Function}            - Callback called on success (instead of redirect).
   *   title       {string}              - Widget title text.
   *   subtitle    {string}              - Widget subtitle text.
   *   seed        {number}              - Optional fixed maze seed (useful for testing).
   *   canvasSize  {number}              - Internal canvas resolution (default 300).
   */
  var PuzzleLogin = {
    _instance: null,

    init: function (opts) {
      opts = opts || {};

      var title = opts.title || 'Prove you\'re human';
      var subtitle = opts.subtitle || 'Drag the circle through the maze to continue';
      var canvasSize = opts.canvasSize || 300;

      // Build DOM
      var overlay = document.createElement('div');
      overlay.className = 'puzzle-login-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', title);

      var box = document.createElement('div');
      box.className = 'puzzle-login-box';

      var titleEl = document.createElement('p');
      titleEl.className = 'puzzle-login-title';
      titleEl.textContent = title;

      var subtitleEl = document.createElement('p');
      subtitleEl.className = 'puzzle-login-subtitle';
      subtitleEl.textContent = subtitle;

      var wrapper = document.createElement('div');
      wrapper.className = 'puzzle-maze-wrapper';

      var canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = Math.round(canvasSize * (4 / 3)); // portrait 3:4 (height = width * 4/3)
      canvas.setAttribute('aria-label', 'Maze puzzle');

      wrapper.appendChild(canvas);

      var status = document.createElement('p');
      status.className = 'puzzle-login-status';
      status.setAttribute('aria-live', 'polite');
      status.textContent = '';

      var resetBtn = document.createElement('button');
      resetBtn.className = 'puzzle-login-reset';
      resetBtn.textContent = 'New maze';
      resetBtn.type = 'button';

      box.appendChild(titleEl);
      box.appendChild(subtitleEl);
      box.appendChild(wrapper);
      box.appendChild(status);
      box.appendChild(resetBtn);
      overlay.appendChild(box);

      // Determine container
      var container;
      if (opts.container) {
        container = typeof opts.container === 'string'
          ? document.querySelector(opts.container)
          : opts.container;
      } else {
        container = document.body;
      }
      container.appendChild(overlay);

      // Bot-detection heuristic: track whether mouse movement was used
      var humanInteraction = false;
      canvas.addEventListener('mousemove', function () { humanInteraction = true; }, { once: true });
      canvas.addEventListener('touchstart', function () { humanInteraction = true; }, { once: true });

      var mazeOpts = {
        seed: opts.seed,
        onSolved: function () {
          if (!humanInteraction) {
            status.textContent = 'Interaction not detected. Please try again.';
            maze.reset();
            return;
          }
          status.textContent = 'Puzzle solved! Redirecting…';
          status.classList.add('success');

          if (typeof opts.onSuccess === 'function') {
            setTimeout(function () {
              opts.onSuccess();
              overlay.remove();
            }, 600);
          } else if (opts.redirectUrl) {
            setTimeout(function () {
              window.location.href = opts.redirectUrl;
            }, 600);
          } else {
            // Just remove the overlay
            setTimeout(function () { overlay.remove(); }, 800);
          }
        }
      };

      var maze = new PuzzleMaze(canvas, mazeOpts);

      resetBtn.addEventListener('click', function () {
        status.textContent = '';
        status.classList.remove('success');
        humanInteraction = false;
        canvas.addEventListener('mousemove', function () { humanInteraction = true; }, { once: true });
        canvas.addEventListener('touchstart', function () { humanInteraction = true; }, { once: true });
        maze.reset();
      });

      this._instance = { overlay: overlay, maze: maze };
      return this._instance;
    },

    destroy: function () {
      if (this._instance) {
        this._instance.maze.destroy();
        this._instance.overlay.remove();
        this._instance = null;
      }
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────────

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PuzzleLogin: PuzzleLogin, PuzzleMaze: PuzzleMaze, generateMaze: generateMaze };
  } else {
    global.PuzzleLogin = PuzzleLogin;
    global.PuzzleMaze = PuzzleMaze;
    global.generateMaze = generateMaze;
  }

}(typeof window !== 'undefined' ? window : this));
