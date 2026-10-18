# GAMING HUB — repaired source (incremental release)

## Run
Install Node.js compatible with Vite 8, run `npm install`, `npm run lint`, `npm run build`, then `npm run dev`. Supply server-side API keys using `.env.example` as a guide. Never commit `.env`.

## Release gates / known limitations
- This ZIP is source code, not proof of successful production deployment.
- Seven internal games are included; third-party catalog entries have **not** been independently verified for live play, commercial licenses, or mobile compatibility. Do not advertise the catalog as 150 verified games.
- Cross-origin iframe `load` events cannot establish gameplay success. Test each game manually on real devices, including touch, restart, embed permission, and commercial licensing.
- Replace/add canonical and social absolute URLs and generate an accurate sitemap only after choosing the final public domain. The old temporary preview-domain SEO references were removed.
- AdSense approval, affiliate contracts, revenue and rankings are not included or guaranteed.
- This incremental repair does not claim to satisfy all acceptance criteria in the master prompt.

## Final handoff status (honest release gate)
The public catalog is restricted to the seven bundled self-hosted titles. 144 external entries are retained in `src/data/gamesCatalog.ts` for later rights and gameplay review, but are NOT presented as verified playable titles. `GAME_AUDIT.csv` covers the original 150 entries; the new original runner is additional (151 catalog entries total). Historical ratings/play counts in external catalog data are not evidence of real traffic and must not be displayed as such. The seven bundled games have source code, but real-device gameplay has not been independently certified. Build and TypeScript checks require installing dependencies; in this environment `npm run lint` cannot resolve `vite/client` because node_modules is absent. No live deployment, AdSense approval, affiliate contract or guaranteed income is included.

## Additional implementation
Original Neon Runner is included with touch/keyboard controls, coin collection, restart, pause and increasing difficulty. No claim of device certification is made. Historical play/rating counters were removed from player display.
