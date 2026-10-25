# SEO and GEO report: fenilramoliya.com

Status on 25 October 2026: the technical, schema, GEO and accessibility changes are committed locally (not pushed, not deployed). Copy changes are drafted for your approval and not committed. The dashboard items are yours. See "Changed so far" at the end.

## Setup

**Framework:** Astro 7.4 static site, built with Bun, served by Cloudflare Workers static assets (one small Worker handles `og.mp4`). It is not Next.js, so `nextjs-seo` was not installed.

**Installed at project scope**

| What | Where |
| --- | --- |
| `seo-audit`, `ai-seo`, `copywriting` from coreyhaines31/marketingskills | `.claude/skills/<name>/`, copied in (Markdown only, no scripts), pinned in `skills-lock.json` |
| `claude-seo` 2.5.0 plugin from AgriciDaniel/claude-seo | marketplace and plugin enabled in `.claude/settings.json` (scope: project) |

Claude Code keeps the plugin's code in its own cache (`~/.claude/plugins/cache/agricidaniel-claude-seo/`); a plugin cannot live inside a repo. `/seo setup` put the plugin's Python runtime and headless Chromium in its data folder (`~/.claude/plugins/data/claude-seo-agricidaniel-claude-seo/`), not in your system Python.

Not installed: `find-skills` (listed as optional), `nextjs-seo` (Next.js only).

Notes:

- `.claude/skills/`, `.claude/settings.json` and `skills-lock.json` are committed; the rest of `.claude/` (including `settings.local.json`) stays ignored.
- The plugin adds a hook that runs a local schema validator (Python standard library only) after every file edit in this repo.
- The plugin's scripts need its own Python: `~/.claude/plugins/data/claude-seo-agricidaniel-claude-seo/.venv/bin/python`. Against a local build, set `CLAUDE_SEO_LOCAL_TARGETS=localhost:8787`, or its SSRF guard refuses localhost.

## How this was checked

- Live HTML and headers with curl, as a browser, Googlebot, Bingbot and nine AI crawler user agents.
- Lighthouse 12 run locally against the live site, mobile and desktop (Google's PageSpeed API was out of anonymous quota).
- claude-seo `agentic_check` (with the user-agent matrix) and `agent_ux_check`.
- A web search snapshot for the name. The search tool is not Google, so rankings are indicative.

## Scorecard

| Lighthouse | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Mobile | 99 | 96 | 100 | 100 |
| Desktop | 97 | 96 | 100 | 100 |

- Mobile: LCP 1.6 s, CLS 0.021, TBT 0 ms. Desktop: LCP 1.0 s.
- Agent accessibility tree (claude-seo heuristic): 100/100, no unnamed controls.
- Every crawler tested gets the full page (200, same 388 KB). All text is in the server HTML; nothing depends on JavaScript.

A Lighthouse SEO score of 100 only means the basics exist (title, description, crawlable links). It does not test structured data, sitemaps, robots policy or entity signals, which is where the gaps are.

## Where you stand in search today

- "Fenil Ramoliya" returns LinkedIn, ResearchGate, Google Scholar, the F-Transformer paper (Nature and PMC) and a contact-aggregator page. Your site, GitHub and X do not appear yet.
- No pages from fenilramoliya.com showed up in search. That is normal days after launch, but nothing is telling Google about the site yet.
- No other person with your name competes for these results.
- Profiles found: LinkedIn, Google Scholar and GitHub (consistent with the site), X (linked from the site), ResearchGate (probably yours, not confirmed).

## Findings

Each item: what is wrong, the evidence, the fix, and how to check it.

### Critical

1. **Not submitted to Google or Bing.** No Search Console or Bing Webmaster Tools property, no sitemap.
   *Fix (you, about 10 minutes):* add a Domain property in Google Search Console (it can verify through Cloudflare DNS), submit the sitemap, request indexing of the home page. Then import the site into Bing Webmaster Tools, which feeds ChatGPT search and Copilot.
   *Check:* GSC URL Inspection says "URL is on Google".

2. **AI crawler blocking at Cloudflare is not verified.** Cloudflare offers to block AI crawlers when a domain is added, and its "Block AI bots" rule matches real crawler IP addresses, which a test from here cannot reproduce. Requests with AI user agents all got the full page, so there is no user-agent rule, but that does not prove the real crawlers get through.
   *Fix (you):* in Cloudflare, check Security settings ("Block AI bots" should be off) and AI Crawl Control (GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot and PerplexityBot allowed).
   *Check:* AI Crawl Control shows allowed requests from those crawlers.

### High

3. **No structured data.** There is no JSON-LD on the page.
   *Fix:* one JSON-LD graph built from `content.ts`, so it cannot drift from what the page shows: `ProfilePage` with `Person` as its main entity (name, job title, works for Cactus Communications, alumni of Nirma University, home location Mumbai, URL, image, email, `sameAs` GitHub, LinkedIn, Scholar and X, `knowsAbout` from the page's own topics, awards from the Recognition list), plus `WebSite`, a `SoftwareSourceCode` entry per project and a `ScholarlyArticle` per paper.
   *Check:* Google Rich Results Test detects ProfilePage; validator.schema.org shows no errors.

4. **No sitemap.** `/sitemap.xml` returns 404.
   *Fix:* generate it at build time with a last-modified date, and reference it from robots.txt.
   *Check:* `/sitemap.xml` returns 200 and Search Console reads it.

5. **robots.txt says nothing.** The live file is Cloudflare's managed Content Signals preamble: comments only, no groups, no Sitemap line. Crawlers are not blocked, but the site states no policy and points to no sitemap.
   *Fix:* ship our own robots.txt (Cloudflare keeps its preamble on top): allow everything, explicit groups for search, answer and training crawlers, a `Content-Signal` line and the Sitemap URL.
   *Check:* claude-seo `agentic_check` passes `robots-ai-groups` and `content-signal`.

6. **Plain http is not redirected to https.** `http://fenilramoliya.com/` returns 200.
   *Fix (you):* Cloudflare, SSL/TLS, Edge Certificates: turn on Always Use HTTPS, then HSTS.
   *Check:* `curl -I http://fenilramoliya.com/` returns 301 to https.

7. **The main heading reads "Fenil Ramoliyabuilds AI agents…" to crawlers that don't apply CSS.** The two lines of the h1 are separate spans with no space between them. GPTBot, ClaudeBot and PerplexityBot read the raw HTML.
   *Fix:* put a space between the spans. Nothing changes visually.
   *Check:* `document.querySelector('h1').textContent` reads as a sentence.

### Medium

8. **www serves a second copy of the site,** and your GitHub profile's website field points to www. The canonical tag already names the bare domain, so this is tidying, not a penalty.
   *Fix (you):* a Cloudflare Redirect Rule from www to the bare domain (301), and set GitHub's website field to `https://fenilramoliya.com`.
   *Check:* `curl -I https://www.fenilramoliya.com/` returns 301.

9. **No 404 page.** Unknown URLs return 404 with an empty body.
   *Fix:* `src/pages/404.astro` and `not_found_handling: "404-page"` in `wrangler.jsonc`.
   *Check:* any unknown URL returns 404 with the page.

10. **No llms.txt.** Google does not use it; some other engines and agents read it.
    *Fix:* `/llms.txt` with a factual summary and links, optionally `/llms-full.txt` with the page's full text as Markdown.
    *Check:* `agentic_check` passes `llms-txt`.

11. **Meta description is 193 characters.** Google cuts it at about 155 to 160.
    *Fix:* a shorter version. This is copy, so I'll draft it for your approval.

12. **No single passage that answers "Who is Fenil Ramoliya?".** The facts are spread over the hero, research stats, experience chart and the contact line ("I live in Mumbai"). AI answers lift a 40 to 60 word passage.
    *Fix:* one short bio with name, role, employer, city, focus and research record, all already on the page. A draft for your approval; nothing new is claimed.

13. **Profiles disagree on your title.** LinkedIn's headline says "SDE @Cactus Communications"; the site, GitHub and Scholar say "Software Engineer, AI". Engines look for agreement across sources.
    *Fix (you):* align the LinkedIn headline.

14. **Low-contrast text (accessibility).** Small grey text (map keys, trace labels) is 3.2:1. Dimmed system entries on desktop are 2.1:1 to 3.2:1. WCAG AA asks for 4.5:1.
    *Fix:* lighten the muted grey and the dimmed state.
    *Check:* Lighthouse `color-contrast` passes.

15. **Cloudflare Web Analytics is injected for real browsers** (`static.cloudflareinsights.com`), while the footer says "Nothing leaves this page." The sentence is about the trace, but a reader can take it to mean the whole page.
    *Decision:* turn off Web Analytics' automatic setup, or keep it and narrow the sentence.

### Low

16. **Section headings are stylistic.** Research is "Private, explainable, secure.", Projects is "Small tools, built after hours", Contact is the email address. Engines use headings to label passages. Optional copy change.
17. **Title** (39 characters, "Fenil Ramoliya · Software Engineer, AI") works for the name. It could also say what you build. Optional.
18. **Social tags:** add `og:image:alt`, `og:site_name`, `og:locale` and `twitter:creator`.
19. **Icons:** there is only an SVG favicon. Add a 180 px apple-touch-icon and a 48 px PNG fallback.
20. **Caching:** hashed files in `/_astro/` are served with `max-age=0`. A `_headers` rule can cache them for a year.
21. **Articles live only on X.** X is hard for crawlers (an automated fetch got HTTP 402), so your writing builds no authority for this site. Publishing on the site and cross-posting to X is the biggest lever for searches that aren't your name, but it is a content decision for later.
22. **Crawler Hints** (Cloudflare, Caching settings) pings Bing through IndexNow when pages change. One toggle.

## What to expect

With no namesakes and consistent profiles, the site should rank for "Fenil Ramoliya" once it is indexed. Broad searches such as "AI engineer Mumbai" are not realistic for a one-page site without on-site writing and links. The realistic win is being found, and described correctly, when someone searches or asks about you or your work.

## Decisions (25 October 2026)

1. **AI training crawlers:** allowed, with search and answer crawlers.
2. **ResearchGate in `sameAs`:** on hold until you confirm the profile is yours.
3. **Project setup:** committed (`.claude/skills`, `.claude/settings.json`, `skills-lock.json`); `settings.local.json` stays ignored.
4. **Cloudflare analytics:** you turn off Web Analytics' automatic setup in the dashboard; the footer line stays as it is.
5. **Copy:** bio, description and headings drafted for your approval; nothing committed.

Yours to do in dashboards, when you're ready: Search Console and Bing, Always Use HTTPS and HSTS, the www redirect, the AI bot settings check, Crawler Hints, Web Analytics automatic setup off, the LinkedIn headline, and GitHub's website field.

## Changed so far

Six local commits on `main` (seven with this report), not pushed. Every push to `main` deploys, so nothing below is live until you push.

| Commit | Area |
| --- | --- |
| `4283124` | project skills and plugin settings |
| `7e91355` | technical |
| `da5a057` | structured data |
| `6ed9c08` | GEO |
| `ad15cbe` | accessibility |
| `e0dadd9` | `twitter:image`, found missing in the final check |

**To check locally:** `bun run build`, then `bunx wrangler@4 dev --port 8787`, and run the commands below against `http://localhost:8787` instead of the live domain. After you push, run them against `https://fenilramoliya.com`.

### Status by finding

| # | Finding | Status |
| --- | --- | --- |
| 1 | Not submitted to Google or Bing | Yours (dashboard). The sitemap it needs now exists |
| 2 | AI crawler blocking at Cloudflare unverified | Yours (dashboard). Not testable from here |
| 3 | No structured data | Fixed (`da5a057`) |
| 4 | No sitemap | Fixed (`7e91355`) |
| 5 | robots.txt says nothing | Fixed (`7e91355`) |
| 6 | http not redirected to https | Yours (dashboard) |
| 7 | h1 reads "Ramoliyabuilds" | Fixed (`7e91355`) |
| 8 | www duplicate | Yours (dashboard, GitHub) |
| 9 | No 404 page | Fixed (`7e91355`) |
| 10 | No llms.txt | Fixed (`6ed9c08`) |
| 11 | Meta description too long | Draft for your approval |
| 12 | No "who is" passage | Draft for your approval |
| 13 | LinkedIn title disagrees | Yours (LinkedIn) |
| 14 | Low-contrast text | Fixed (`ad15cbe`) |
| 15 | Web Analytics vs footer line | Yours: turn off automatic setup |
| 16 | Stylistic headings | Draft for your approval |
| 17 | Title | Optional draft |
| 18 | Social tags | Fixed (`7e91355`) |
| 19 | Icons | Fixed (`7e91355`) |
| 20 | `/_astro/` caching | Fixed (`7e91355`) |
| 21 | Articles only on X | Content decision for later |
| 22 | Crawler Hints | Yours (dashboard) |

### Technical (`7e91355`)

- **h1 (7):** a space between the two lines of the heading. Check: `curl -s https://fenilramoliya.com/ | grep -o '<h1[^>]*>.*</h1>'` shows `</span> <span>`.
- **Sitemap (4):** `/sitemap.xml`, generated at build time with the build date as `lastmod`. Check: `curl -s https://fenilramoliya.com/sitemap.xml` lists `https://fenilramoliya.com/`.
- **robots.txt (5):** allow everything; explicit groups for search (Googlebot, Bingbot, Applebot, DuckDuckBot), AI answers (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User) and AI training (GPTBot, ClaudeBot, CCBot, Google-Extended); `Content-Signal: search=yes, ai-input=yes, ai-train=yes`; the Sitemap line. Check: `curl -s https://fenilramoliya.com/robots.txt`. Cloudflare may prepend its managed Content Signals block. If that block says `ai-train=no`, it contradicts this file, so turn off Cloudflare's managed robots.txt in the dashboard.
- **404 page (9):** `src/pages/404.astro` (noindex) and `not_found_handling: "404-page"`. Check: `curl -sI https://fenilramoliya.com/nope` returns 404, and the page says "Page not found".
- **Social tags (18):** `og:site_name`, `og:locale`, `og:image:alt`, `twitter:creator`, `twitter:image` (`e0dadd9`) and `twitter:image:alt`. Check: view source, or paste the URL into a link-preview tool.
- **Icons (19):** `/favicon.ico` (48 px) and `/apple-touch-icon.png` (180 px), drawn from the SVG favicon. Check: both return 200.
- **Caching (20):** `/_astro/*` gets `Cache-Control: public, max-age=31536000, immutable` from `public/_headers`. Check: `curl -sI` any `/_astro/` file named in the page source.

### Structured data (`da5a057`)

- **JSON-LD (3):** one graph built from `content.ts` at build time, so it states only what the page shows.
  - `ProfilePage` whose main entity is `Person`: name, job title, Cactus Communications, Nirma University, Mumbai, email.
  - The Person's awards are the three Recognition entries marked as awards. `knowsAbout` lists the systems and research themes.
  - `sameAs`: both GitHub accounts, LinkedIn, Google Scholar and X.
  - Also `WebSite`, eight `SoftwareSourceCode` (projects) and four `ScholarlyArticle` (only the papers listed on the page).
  - `dateModified` was left out because the page shows no date. `image` was left out because the site has no photo; Google recommends one but does not require it.
  - Check: Google's Rich Results Test and validator.schema.org on the live URL. Locally, every value in the graph appears in the page text (55 of 55).

### GEO (`6ed9c08`)

- **llms.txt (10):** `/llms.txt`, a summary with who, role, where, research numbers, profiles, projects and articles. `/llms-full.txt` and `/index.md` hold the whole page as Markdown. All three are generated from `content.ts`.
- The two full copies send `X-Robots-Tag: noindex`, so search engines list the page and not a duplicate. The page links to `/index.md` as `rel="alternate" type="text/markdown"`.
- Check: `curl -sI https://fenilramoliya.com/llms.txt` returns 200 `text/plain`, and `curl -sI https://fenilramoliya.com/index.md` returns 200 `text/markdown` with `x-robots-tag: noindex`.
- The full copy lists all 28 papers. On the page they are the matrix's buttons, readable on hover, focus and by screen readers, but not as plain text. A /research page would make them plain text (proposal below).

### Accessibility (`ad15cbe`)

- **Contrast (14):** muted text is #7f7f79 in the dark theme (4.76:1) and #6e6e68 in the light theme (4.74:1). The old greys remain only for lines in the drawings. On wide screens, inactive system entries now recede by colour instead of opacity 0.38, which had left their text at 2.1 to 3.2:1.
- **Figures:** each drawing has a one-line label without reference numerals, for example "Figure 2, agent harnesses and runtimes: context, plan, supervisor, sub-agents, streamed output, sandbox and checkpoints." Fig. 7 has a label too.
- The numerals in drawings, globe pins, legend numbers and "Fig. N" labels are `aria-hidden`, and the drawings are `data-nosnippet`. Whitespace between elements keeps numbers apart for readers of raw HTML, so the old digit runs like "40501012222030" are gone. Nothing changes visually.
- Check: Lighthouse accessibility is 100 on desktop and mobile locally (was 96), with `color-contrast` passing.

### Checks run on the local build

| Check | Result |
| --- | --- |
| claude-seo `agentic_check` | 8 of 8 core checks pass (server-rendered, robots reachable, AI groups, user agents, Content-Signal, llms.txt, Markdown delivery, 404) |
| claude-seo schema review | 3 pass; its two fixes applied (drop `dateModified`, plain email) |
| claude-seo GEO review | 5, 7, 10 pass; 12, 16, 21 open as expected; one wording fix applied (the Markdown no longer claims an order of travel) |
| claude-seo agent-readiness review | 5, 9, 10 pass; 2 not testable locally; 14 and the figure labels fixed in `ad15cbe` |
| claude-seo technical review (final build) | 3, 4, 5, 7, 9, 10, 14, 17, 18, 19, 20 pass; 11 open as expected; 6, 8 not testable locally. Also passes: canonical, `lang`, viewport, one h1, `og.mp4` answering byte ranges with 206 |
| Lighthouse 12 accessibility | 100 desktop, 100 mobile |

Not testable locally: findings 1, 2, 6, 8, 13, 15 and 22 (dashboards and other sites), the Rich Results Test (cannot reach localhost), and the plugin's agent-UX score (its browser guard blocks localhost).

### Found in the final check, not acted on

- **No security headers** (no `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protection or CSP). Outside SEO, but a `/*` block in `public/_headers` covers most of it. A CSP needs care with the one inline script and the inline styles.
- **Figure numbering skips 8:** Figs 1 to 7, then 9, 10, 11.
- **Sitemap `lastmod` is the build date.** That's deliberate (every deploy is a fresh build of one page), but it moves on deploys that change nothing.
- **HTML weight:** 398 KB raw, 115 KB gzipped, of which 314 KB is the inline SVG drawings. Lower coordinate precision would shrink it.
- **No font preload** for the face the h1 uses, probably the largest-paint element.
- `/og.mp4`, `/og.png` and the icons are served with `max-age=0`, so every visit revalidates them.
- The 404 page has only a link home; no header or footer.
- The review flagged "Paperpal" in the copy as a product name. It's a public product, named in the hero with your approval, so no change.

### Copy drafts (not on the site)

Every fact below is already on the page. Nothing changes until you approve it.

**Bio (11, 12):** 57 words, third person so an answer can lift it as it is. It would sit under the Experience heading, as that section's one-line intro (the Travel section has the same kind of line), and replace the Person `description` in the structured data and the summary at the top of `llms.txt`.

> Fenil Ramoliya is a Software Engineer, AI at Cactus Communications in Mumbai, working mostly on Paperpal. The work is AI agents and the systems they run on: harnesses and runtimes, tools and protocols, and the infrastructure under them. Fenil has a B.Tech in Computer Science and Engineering from Nirma University and 28 peer-reviewed papers, cited 191 times.

**Meta description (11):** now 193 characters. Options:

1. *(recommended, 148)* Fenil Ramoliya builds AI agents and the systems they run on. Software Engineer, AI at Cactus Communications in Mumbai, with 28 peer-reviewed papers.
2. *(140)* Fenil Ramoliya builds AI agents and the systems they run on: harnesses and runtimes, tools and protocols, and the infrastructure under them.

**Headings (16):**

| Section | Now | Draft |
| --- | --- | --- |
| Research | Private, explainable, secure. | Research |
| Projects | Small tools, built after hours | Projects |
| Contact | the email address, as the h2 | an h2 "Contact" styled like the other section heads, with the email kept large beneath it |
| Travel (optional) | Elsewhere | Travel, as the nav already calls it |

**Title (17, optional):** keep "Fenil Ramoliya · Software Engineer, AI". It leads with the name people search for. The headline already says what you build.

### Proposed: a /research page

The 28 papers would become plain text on their own page, with title, venue, year and theme, which search engines and AI answers can quote. It would also let `ScholarlyArticle` cover all 28 instead of four. It needs one thing from you: a DOI or publisher link for each paper. I won't invent them; the Google Scholar export has them.
