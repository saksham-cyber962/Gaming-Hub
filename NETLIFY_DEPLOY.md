# Netlify deployment (frontend only)
1. Push the extracted source folder to a private GitHub repository (do not upload .env).
2. Netlify > Add new project > Import existing project > GitHub > select repository.
3. Build command: npm run build; publish directory: dist; Node: 22.
4. Deploy and inspect deploy log. If dependencies or TypeScript fail, resolve before sharing the public URL.
5. The Express server.ts is NOT deployed by this static Netlify configuration. Gemini AI endpoints (/api/gemini/*) require separate backend hosting or conversion to Netlify Functions and secure environment variables. Do not advertise AI as functional until tested.
6. Seven local games are public; 144 external entries remain unverified. Test on desktop and mobile after deploy.
7. Set your real public URL in SEO metadata, canonical tags and sitemap, and check all links.
This ZIP is deployment-prepared source, not a tested dist build or a live deployment. Offline npm install failed because @google/genai was not cached.
