# Space Chicken assistant instructions

Space Chicken is one of two Ailardi browser games. Its sibling NovaWing lives at `/home/adam/rtype-prototype`.

## Deployment map

- This project: `/home/adam/spacechicken`
- Cloudflare Pages project: `space-chicken`
- Public game route: `https://space-chicken.ailardi.com/`
- NovaWing public route: `https://novawing.ailardi.com/`
- Shared landing/router source: `/home/adam/rtype-prototype/hub`
- Shared landing: `https://ailardi.com/`

The `ailardi.com` apex is owned by the static `ailardi-landing` Pages project. This game has its own direct Pages custom domain, so it does not pass through a Worker. Keep this game's assets and imports relative to its root.

## Build and deploy

From this directory:

```bash
npm run check
npm run build:cloudflare
npx wrangler pages deploy dist --project-name space-chicken --branch main
```

Use `npx wrangler whoami` before Cloudflare operations. NovaWing is deployed separately from `/home/adam/rtype-prototype`; do not modify or redeploy it for an isolated Space Chicken change.

## Assistant workflow

This file is for Codex, Grok, and other coding assistants. The game itself should not gain navigation/setup links unless explicitly requested. Cross-project context belongs here and in the Ailardi Arcade hub. Preserve unrelated existing working-tree changes when editing this repository.

Level, enemy, animation, and weapon work goes through `skills/`. Read `docs/ART_SKILLS.md` and the matching `SKILL.md`. Paint new art in canvas code. Do not generate images.
