This widget is a UX friction layer only. Always verify puzzle completion server-side for any protected action or use more secure methods.


## Server-Side Protection Recommendations

All puzzle completion logic runs in the browser and can be bypassed by modifying JavaScript state or calling the `onSuccess` callback directly. The widget should be treated as a UX friction layer only. For any action that requires genuine verification, combine it with one or more of the following server-side patterns.

### 1. Signed completion token

When the puzzle is solved, have the client send a request to your server. The server issues a short-lived signed token (e.g. a HMAC or JWT with a `exp` claim of 5–10 minutes). The token is then submitted alongside the protected form action and verified server-side before the action is allowed to proceed.

```
Client solves puzzle
  → POST /api/puzzle-complete
  ← { token: "<signed JWT>" }   (expires in 5 min)

Client submits form
  → POST /api/login  { token, ...formData }
  ← server verifies token signature + expiry, then proceeds
```

### 2. Session flag

For server-rendered apps, store a `puzzleSolved` flag in the server-side session (e.g. express-session, Redis, database row) when the completion endpoint is called. Check and clear that flag before processing the protected action.

```js
// Express example
app.post('/api/puzzle-complete', (req, res) => {
  req.session.puzzleSolved = true;
  res.sendStatus(204);
});

app.post('/api/submit', (req, res) => {
  if (!req.session.puzzleSolved) return res.status(403).send('Puzzle not solved');
  req.session.puzzleSolved = false; // consume immediately
  // proceed with protected action
});
```

### 3. Rate limiting regardless

Even with a signed token, pair the endpoint with IP-based rate limiting (e.g. express-rate-limit, nginx `limit_req`). This limits brute-force token generation attempts and reduces the value of automating the puzzle at scale.

### 4. Replay prevention

Ensure tokens are single-use: store each issued token ID in a short-lived cache (Redis `SET NX EX`) and reject reuse. Without this, a stolen or intercepted token can be replayed within its validity window.

### 5. What the widget alone cannot prevent

- Headless browsers that solve the maze programmatically
- Replay of a previously captured valid token
- JavaScript evaluation in a browser extension or proxy

For high-value actions (account creation, password reset, payment), layer this widget with a server-side CAPTCHA service (hCaptcha, Cloudflare Turnstile) and your own rate limiting rather than relying on this widget alone.
