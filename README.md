Crazy Chat — A playful, animated WebSocket chat

Project description
-------------------
Crazy Chat is a lightweight, browser-based chat demo built on a minimal Node.js WebSocket server. It focuses on delivering an engaging, playful front-end experience: animated backgrounds, per-user avatars and colors, interactive reaction buttons, flying emoji, sound cues, and a canvas-driven confetti effect for celebratory messages.

Key features
- Real-time messaging over WebSockets (rooms support)
- Animated message bubbles and per-user avatars with deterministic colors
- Clickable reaction buttons (client-side) and reaction animations
- Confetti canvas animation on joins and trigger words
- Subtle audio feedback and send animations for tactile UX

Tech stack
- Node.js + native `http` + `ws` for the minimal server
- Vanilla JavaScript and CSS for the front-end (no build step)

Run locally
1. cd int-222/chatroom
2. node server.js
3. Open http://localhost:3000 in a browser

Notes & extension ideas
- Reactions are currently client-only; a server-side persistence layer could be added.
- Add typing indicators, message history (persisted), emoji picker, or per-room themes.
- Accessibility: ensure color contrast and ARIA attributes for production usage.

Enjoy the craziness — and let me know if you want a theme toggle or persistent reactions! 