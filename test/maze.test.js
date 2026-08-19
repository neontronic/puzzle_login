/**
 * Tests for puzzle-login core logic (Node.js / Jest, no DOM required).
 */

'use strict';

const { generateMaze, PuzzleMaze, PuzzleLogin } = require('../src/puzzle-login');

// ─── generateMaze ────────────────────────────────────────────────────────────

describe('generateMaze', () => {
  const COLS = 5;
  const ROWS = 7;

  let maze;
  beforeEach(() => {
    maze = generateMaze(COLS, ROWS, 42);
  });

  test('returns a grid with correct dimensions', () => {
    expect(maze.length).toBe(ROWS);
    maze.forEach(row => expect(row.length).toBe(COLS));
  });

  test('every cell has top/right/bottom/left boolean properties', () => {
    maze.forEach(row => {
      row.forEach(cell => {
        ['top', 'right', 'bottom', 'left'].forEach(wall => {
          expect(typeof cell[wall]).toBe('boolean');
        });
      });
    });
  });

  test('walls are symmetric between adjacent cells', () => {
    // right wall of (r,c) === left wall of (r,c+1)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        expect(maze[r][c].right).toBe(maze[r][c + 1].left);
      }
    }
    // bottom wall of (r,c) === top wall of (r+1,c)
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        expect(maze[r][c].bottom).toBe(maze[r + 1][c].top);
      }
    }
  });

  test('exactly one entrance at top row', () => {
    const openTops = maze[0].filter(cell => cell.top);
    expect(openTops.length).toBe(1);
  });

  test('exactly one exit at bottom row', () => {
    const openBottoms = maze[ROWS - 1].filter(cell => cell.bottom);
    expect(openBottoms.length).toBe(1);
  });

  test('exposes _entranceCol and _exitCol', () => {
    expect(maze._entranceCol).toBeGreaterThanOrEqual(0);
    expect(maze._entranceCol).toBeLessThan(COLS);
    expect(maze._exitCol).toBeGreaterThanOrEqual(0);
    expect(maze._exitCol).toBeLessThan(COLS);
  });

  test('generates different mazes with different seeds', () => {
    const maze1 = generateMaze(COLS, ROWS, 1);
    const maze2 = generateMaze(COLS, ROWS, 2);
    // At least one cell should differ
    let differs = false;
    outer: for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (maze1[r][c].right !== maze2[r][c].right) {
          differs = true;
          break outer;
        }
      }
    }
    expect(differs).toBe(true);
  });

  test('generates the same maze with the same seed', () => {
    const mazeA = generateMaze(COLS, ROWS, 99);
    const mazeB = generateMaze(COLS, ROWS, 99);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        expect(mazeA[r][c]).toEqual(mazeB[r][c]);
      }
    }
  });

  test('maze is fully connected (all cells reachable from entrance)', () => {
    const entranceCol = maze._entranceCol;
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));

    function dfs(r, c) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || visited[r][c]) return;
      visited[r][c] = true;
      if (maze[r][c].top)    dfs(r - 1, c);
      if (maze[r][c].bottom) dfs(r + 1, c);
      if (maze[r][c].left)   dfs(r, c - 1);
      if (maze[r][c].right)  dfs(r, c + 1);
    }

    dfs(0, entranceCol);

    visited.forEach((row, r) => {
      row.forEach((v, c) => {
        expect(v).toBe(true);
      });
    });
  });
});
