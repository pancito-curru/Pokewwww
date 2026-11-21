# Pokewwwww

Pokémon trivia web app (static React + Vite site on GitHub Pages). Before changing code, read the
architecture, conventions and project status:

@ARCHITECTURE.md

- To add a new game/section, use the `new-section` skill (`.claude/skills/new-section/SKILL.md`).
- Check before publishing: `npx tsc -b`, `npm test`, `npm run build`, plus a browser pass.
- Never rename the `pokewwww-*` localStorage keys (players would lose their progress).
- Commit and push only when the owner approves; every push to `main` deploys.
