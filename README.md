# puzzle-login

A portable, reusable **maze-puzzle login widget** for websites.  
Instead of passwords, emails or verification codes, the user drags a circle
through a small 4:3 maze from the top entrance to the bottom exit.  
This acts as a lightweight bot deterrent while remaining frictionless for
human visitors.

> **Security note:** Puzzle completion is validated client-side only. Always verify completion server-side before granting access to any protected resource.

---

## Features

- 🧩 **Randomly generated** perfect maze (every run is unique; seeded for tests)
- 🖱️ **Drag-to-navigate** circle with wall-collision detection
- 🕹️ **D-pad buttons** – four directional arrow buttons below the maze so mobile users can navigate without their finger obscuring the view
- 📱 **Touch-friendly** (works on mobile browsers)
- 🤖 **Bot-detection heuristic** – validates that real mouse/touch movement occurred
- ♿ **Accessible** – ARIA roles, `aria-live` status region
- 🎛️ **Configurable** – redirect URL, success callback, title, subtitle, canvas size
- 📦 **Zero runtime dependencies** – single JS + CSS file

---

## Quick Start

### 1. Copy the files

Copy `src/puzzle-login.js` and `src/puzzle-login.css` into your project.

### 2. Add to your HTML

```html
<link rel="stylesheet" href="puzzle-login.css" />
<script src="puzzle-login.js"></script>
```

### 3. Initialise

```js
// Redirect to /home on success
PuzzleLogin.init({ redirectUrl: '/home' });

// Or use a callback
PuzzleLogin.init({
  onSuccess: function () {
    console.log('Puzzle solved – user is verified!');
  }
});
```

Open `demo.html` in your browser to see a live example.

---

## API

### `PuzzleLogin.init(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `redirectUrl` | `string` | `undefined` | URL to navigate to after solving |
| `onSuccess` | `Function` | `undefined` | Callback invoked on success (takes priority over `redirectUrl`) |
| `title` | `string` | `"Prove you're human"` | Widget title |
| `subtitle` | `string` | `"Drag the circle through the maze…"` | Subtitle / instructions |
| `container` | `HTMLElement \| string` | `document.body` | Element (or CSS selector) to append the overlay into |
| `seed` | `number` | random | Fixed RNG seed – useful for reproducible testing |
| `canvasSize` | `number` | `300` | Internal canvas resolution in pixels |

Returns an instance object `{ overlay, maze }`.

### `PuzzleLogin.destroy()`

Removes the widget from the DOM and cleans up event listeners.

---

## npm

```bash
npm install puzzle-login   # once published
```

Then:

```js
// ESM / bundler
import { PuzzleLogin } from 'puzzle-login/src/puzzle-login';
// CommonJS
const { PuzzleLogin } = require('puzzle-login');
```

---

## Development

```bash
npm install
npm test       # runs Jest unit tests
```

---

## How it works

1. A **5 × 7 perfect maze** is generated with a depth-first-search (recursive
   backtracker) algorithm using a seeded PRNG.  Every interior cell is
   reachable, ensuring the puzzle is always solvable.
2. A **circle** is placed at the top entrance.  The user drags it; each frame
   the new position is checked against every wall segment the circle overlaps
   (distance-to-segment comparison with the circle radius).
3. When the circle's centre passes below the bottom edge in the exit column the
   puzzle is **solved** and the configured action (redirect / callback) fires.
4. A minimal **bot-detection heuristic** checks that at least one genuine
   `mousemove` or `touchstart` event was fired before accepting the solution.

---

## License

MIT
