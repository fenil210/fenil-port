# SEO and GEO report: fenilramoliya.com

Status on 25 October 2026, round two: the research page, the articles and the approved copy are built, checked on a local production build, pushed to `main` and checked again on the live site. Round one (technical, structured data, GEO, accessibility, security headers) goes out in the same push. The dashboard items under "Yours to do" are still open.

## At a glance

| | Live at the start of the day | Now |
| --- | --- | --- |
| Pages a search engine can index | 1 | 13: home, research, the articles index and 10 articles |
| Papers readable as plain text | 4 titles | all 28, with authors, venue, DOI, citations and BibTeX |
| Articles on the site | none (X only) | 10, each linking to its X post |
| Structured data | none | ProfilePage and Person; 28 ScholarlyArticle; Blog; 10 BlogPosting |
| Sitemap, robots policy, llms.txt | none | all three; sitemap lists all 13 pages |
| Markdown copies for agents | none | home, research and every article, kept out of search with `noindex` |
| Lighthouse, home, mobile | 99 / 96 / 100 / 100 | 99 / 100 / 100 / 100 |
| Lighthouse, home, desktop | 97 / 96 / 100 / 100 | 99 / 100 / 100 / 100 |
| Lighthouse, an article, mobile | (no such page) | 100 / 100 / 100 / 100 |

Scores are performance / accessibility / best practices / SEO, measured on the live site after this deploy.

## Setup

**Framework:** Astro 7.4 static site, built with Bun, served by Cloudflare Workers static assets (one small Worker handles `og.mp4`). It is not Next.js, so `nextjs-seo` was not installed.

**Installed at project scope**

| What | Where |
| --- | --- |
| `seo-audit`, `ai-seo`, `copywriting` from coreyhaines31/marketingskills | `.claude/skills/<name>/`, copied in (Markdown only, no scripts), pinned in `skills-lock.json` |
| `claude-seo` 2.5.0 plugin from AgriciDaniel/claude-seo | marketplace and plugin enabled in `.claude/settings.json` (scope: project) |

Claude Code keeps the plugin's code in its own cache (`~/.claude/plugins/cache/agricidaniel-claude-seo/`); a plugin cannot live inside a repo. `/seo setup` put the plugin's Python runtime and headless Chromium in its data folder (`~/.claude/plugins/data/claude-seo-agricidaniel-claude-seo/`), not in your system Python.

Notes:

- `.claude/skills/`, `.claude/settings.json` and `skills-lock.json` are committed; the rest of `.claude/` (including `settings.local.json`) stays ignored.
- The plugin adds a hook that runs a local schema validator (Python standard library only) after every file edit in this repo.
- The plugin's scripts need its own Python: `~/.claude/plugins/data/claude-seo-agricidaniel-claude-seo/.venv/bin/python`. Against a local build, set `CLAUDE_SEO_LOCAL_TARGETS=localhost:8787`, or its SSRF guard refuses localhost.

## How this was checked

- **Round one:** live HTML and headers with curl, as a browser, Googlebot, Bingbot and nine AI crawler user agents; Lighthouse 12 against the live site; claude-seo `agentic_check` and `agent_ux_check`; a web search snapshot for the name.
- **Round two, on the local production build** (`bun run build`, then `bunx wrangler@4 dev --port 8787`, which applies `_headers` as Cloudflare does):
  - Lighthouse 12, all four categories, mobile and desktop, on home, research, the articles index and one article.
  - claude-seo `agentic_check` on home, research and an article.
  - Three claude-seo reviewers: schema, technical and GEO.
  - Playwright at 375 px and 1440 px in both themes on all 14 pages: no horizontal overflow, no console errors.
  - A script that checks every name and headline in each page's JSON-LD against the page's visible text.

## Scorecard (round two)

Live, on fenilramoliya.com after the deploy:

| Page | Mobile | Desktop | Mobile LCP | Mobile CLS |
| --- | --- | --- | --- | --- |
| Home | 99 / 100 / 100 / 100 | 99 / 100 / 100 / 100 | 1.8 s | 0.003 |
| /research/ | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 1.3 s | 0.002 |
| /articles/ | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 1.3 s | 0.022 |
| An article | 100 / 100 / 100 / 100 | 97 / 100 / 100 / 100 | 1.4 s | 0.001 |

On the local production build before the push:

| Page | Mobile | Desktop | Mobile LCP | Mobile CLS |
| --- | --- | --- | --- | --- |
| Home | 98 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 1.8 s | 0.003 |
| /research/ | 98 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 2.0 s | 0.002 |
| /articles/ | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 1.2 s | 0.015 |
| An article | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 1.1 s | 0.001 |

- Total blocking time is 0 ms everywhere.
- The article's 97 on desktop is a 0.6 s first paint over the network; locally it was 100.
- PageSpeed Insights was out of its daily quota, so these are Lighthouse 12 runs from this machine.
- Mobile is Lighthouse's simulated slow 4G, so a 98 run can be a 100 the next time; across four home runs, mobile performance ranged 95 to 99.
- What Lighthouse still lists, none of it failing a category: the home page's DOM size (1,501 elements, mostly the inline drawings, whose size reduction you chose to skip), and a 13 KB saving on one article figure.
- The Lighthouse SEO score only checks the basics (title, description, crawlable links, a valid robots.txt). Structured data, the sitemap and entity signals are covered by the checks below, not by that score.

## Round two: what changed

### Research page (`/research/`)

- All 28 papers as plain text, newest first, one section a year with the year held in the margin.
- Each entry has its ID from your CV (J1 to J6, C1 to C22), the title linking to the paper by DOI, all authors with your name in bold, the full venue with volume and pages, the theme, journal or conference, first author where it applies, the DOI, the Google Scholar citation count, and a "Cite" control that opens the BibTeX with a copy button.
- Fig. 1 is the theme-by-year grid from the home page; each square jumps to its paper. Filters show one theme or your first-author papers. Without JavaScript every paper shows and the filters are hidden.
- Citations and h-index carry their source and date: "from Google Scholar, 25 Oct 2026". C6 is not on Scholar and says so.
- Sources: your research CV for authors, venues, pages and DOIs; Crossref for full venue names; Google Scholar for citations.
- Structured data: `CollectionPage`, an `ItemList` of 28 `ScholarlyArticle`, each with its DOI as an identifier, its authors (you by reference to the Person), its venue as `Periodical` or `CreativeWork`, and its theme. The home page's four "most cited" now use the same `@id`s, so engines can join them.
- `/research.md` holds the same list as Markdown, BibTeX included.

### Articles (`/articles/` and ten articles)

- The ten X articles are on the site at `/articles/<slug>/`, with their own text, figures and code, unchanged. Each says "First published on X" and links to the post, where the replies are.
- What a reader gets:
  - A contents list in the margin on wide screens, with each part's reading time. It fills as each part is read, the way the masthead's edge does, and shows the time left. On phones it is a collapsed "Contents" list.
  - Figures and code numbered and captioned like the home page's figures; code in the site's colours with a copy button.
  - Paragraph numbers in the margin on hover, each a link to that passage.
  - Citations that link to the references, and references that link back.
  - "Continue from paragraph N of M" when a reader comes back to an article they left partway. It is kept in their browser only.
  - At the end: the replies on X, the rest of the series for Field Notes, and the newer and older articles.
  - The colophon's trace (Fig. 11 on the home page) becomes "this read as a trace": each part is a span, timed while it is on screen, next to the estimate. Nothing leaves the page.
- `/articles/` lists every article as a span as long as it takes to read.
- Structured data: `Blog` on the index; `BlogPosting` on each article with headline, dates, cover image, word count, author, the blog it belongs to, a breadcrumb, and the X post as `discussionUrl`.
- Each article has a visible byline ("By Fenil Ramoliya", linking home as `rel="author"`), Open Graph article tags, and its cover as the share image.
- Each article has a Markdown copy at `/articles/<slug>.md`, with its figures written out as their descriptions.
- Titles carry " · Fenil Ramoliya" only when the whole title fits in 60 characters.

### Copy (findings 11, 12 and 16)

- **Bio**, as you approved it, without "in Mumbai" and "cited 191 times". It is the Experience section's intro, the Person's `description` and the summary at the top of `llms.txt`:
  > Fenil Ramoliya is a Software Engineer, AI at Cactus Communications, working mostly on Paperpal. The work is AI agents and the systems they run on: harnesses and runtimes, tools and protocols, and the infrastructure under them. Fenil has a B.Tech in Computer Science and Engineering from Nirma University and 28 peer-reviewed papers.
- **Meta description** (138 characters): "Fenil Ramoliya builds AI agents and the systems they run on. Software Engineer, AI at Cactus Communications, with 28 peer-reviewed papers."
- **Headings:** Research, Projects, Travel, and an h2 "Contact" with the email large beneath it.
- `llms.txt` no longer lists "Based in". The contact line and the globe still mention Mumbai, as they did before.

### Smaller changes

- **404 page:** the site's header and footer, and links to Articles and Research.
- **Font preload: tested, not shipped.** The heading face is a 132 KB variable font, larger than the compressed home page. Preloading it pushed the home page's mobile LCP from about 1.8 s to 2.7 s (three runs each way), because it competes with the page itself on a slow connection. A comment in `Base.astro` records this.
- **Fallback faces instead.** Without the preload, the article page shifted by 0.116 when Newsreader swapped in, because the system serif sets wider and the paragraphs rewrapped. The fallback is now Iowan Old Style or Georgia scaled to Newsreader's widths (89.7% and 91%, measured over article text). The shift is 0.001.
- **robots.txt:** Lighthouse's robots.txt check fails on `Content-Signal` lines, which dropped SEO to 92 on every page. Every signal was "yes" and the Allow rules grant the same, so the signals are now a comment at the top of the file. claude-seo reports `content-signal` as info rather than a pass. Google does not act on content signals. To put the lines back, it is one line per group.
- **CSP:** every page shares one layout now, so there is one inline script and one hash. Astro no longer inlines small page scripts, so editing a page's script can't break the CSP.
- **Sitemap:** each article's `lastmod` is its publish date; only the home page uses the build date.

### Checks run on the local build

| Check | Result |
| --- | --- |
| Lighthouse 12 | Accessibility, best practices and SEO 100 on all 8 runs; performance 98 to 100 |
| claude-seo `agentic_check` (home, research, an article) | All core checks pass (server-rendered, robots reachable, AI groups, user agents, llms.txt, Markdown delivery, 404); `content-signal` info, as above |
| claude-seo schema review | Fixed: dangling `isPartOf` references, `about` as a `Thing`, ImageObject keys, `sameAs` on articles. Removed the breadcrumb from research and the articles index, which show no trail |
| claude-seo technical review | 13 of 13 pages: 200, self canonical, one h1, `lang`, viewport, Markdown alternate, valid sitemap; no broken internal links; no skipped heading levels. Fixed: research description (165 → 146 characters), two article titles over 60 |
| claude-seo GEO review | Fixed: Person `sameAs` on every page, visible byline, BibTeX in `research.md`, author on each post in the index |
| JSON-LD against visible text | Every headline and name appears on its page, apart from "Home" in the article breadcrumb and list labels |
| Playwright, 14 pages × 2 widths × 2 themes | No horizontal overflow, no console errors |

### Checked on the live site after the deploy

- All 13 sitemap pages: 200, self canonical, one h1, titles of 60 characters or less, and the structured data above.
- `/llms-full.txt`, `/index.md`, `/research.md` and the article Markdown copies: served as text with `noindex`.
- `/no-such-page`: 404, with the header and footer.
- Security headers on, the CSP still report-only, and no CSP reports in the console on an article.
- `/_astro/` files cached for a year.
- robots.txt has no `Content-Signal` lines, so Cloudflare is not adding its managed block.
- claude-seo `agentic_check` on home, research and an article: all core checks pass, including the response to each AI crawler user agent.
- Still open in the dashboard: `http://` and `www.` both return 200 instead of redirecting (findings 6 and 8).

### Reviewer suggestions not taken

- **Paper summaries** (GEO): each paper has a citation record but no sentence an answer engine could quote. Adding one per paper from its abstract would help, but that is 28 pieces of copy for you to approve. Listed under follow-ups.
- **Headings inside articles** (GEO): some long articles have no internal headings. Adding them would change your text.
- **Paperpal in `llms.txt`** (GEO): flagged as a product name. It's public and you approved it.
- **16:9 and 1:1 cover crops** (schema): Google suggests them for Discover. The covers are 5:2 X cards; new crops need new images.
- **Publisher as an Organization** (schema): a Person is valid schema.org, and this is a personal site.
- **Markdown copies indexable** (GEO): they stay `noindex` so search engines list the pages, not duplicates. Agents can still fetch them.

### Follow-ups

1. One-sentence summaries for the 28 papers, from their abstracts, for your approval.
2. Switch the CSP from report-only to enforced once the live console stays clean for a few days.
3. The home page's figures skip Fig. 8.
4. `/og.mp4`, `/og.png` and the icons are served with `max-age=0`.

## Where you stand in search today

- "Fenil Ramoliya" returns LinkedIn, ResearchGate, Google Scholar, the F-Transformer paper (Nature and PMC) and a contact-aggregator page. Your site, GitHub and X do not appear yet.
- No pages from fenilramoliya.com showed up in search. That is normal days after launch, but nothing is telling Google about the site yet. Submitting the sitemap (finding 1) is now worth more: 13 pages instead of one.
- No other person with your name competes for these results.
- Profiles found: LinkedIn, Google Scholar and GitHub (consistent with the site), X (linked from the site), ResearchGate (probably yours, not confirmed).

## What to expect

With no namesakes and consistent profiles, the site should rank for "Fenil Ramoliya" once it is indexed. The articles are the first pages that can be found for searches other than your name, such as their titles and topics. Each article now builds authority for this domain instead of only for X. Broad searches such as "AI engineer" are still not realistic without links from other sites.

## Yours to do

In dashboards, when you're ready:

- Search Console and Bing Webmaster Tools: add the site and submit the sitemap
- Always Use HTTPS and HSTS
- the www redirect
- the AI bot settings check
- Crawler Hints
- turn off Web Analytics' automatic setup
- the LinkedIn headline
- GitHub's website field

## Findings (round one)

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
4. **No sitemap.** `/sitemap.xml` returns 404.
5. **robots.txt says nothing.** The live file is Cloudflare's managed Content Signals preamble: comments only, no groups, no Sitemap line.
6. **Plain http is not redirected to https.** `http://fenilramoliya.com/` returns 200.
   *Fix (you):* Cloudflare, SSL/TLS, Edge Certificates: turn on Always Use HTTPS, then HSTS.
   *Check:* `curl -I http://fenilramoliya.com/` returns 301 to https.
7. **The main heading reads "Fenil Ramoliyabuilds AI agents…" to crawlers that don't apply CSS.**

### Medium

8. **www serves a second copy of the site,** and your GitHub profile's website field points to www.
   *Fix (you):* a Cloudflare Redirect Rule from www to the bare domain (301), and set GitHub's website field to `https://fenilramoliya.com`.
   *Check:* `curl -I https://www.fenilramoliya.com/` returns 301.
9. **No 404 page.**
10. **No llms.txt.**
11. **Meta description is 193 characters.**
12. **No single passage that answers "Who is Fenil Ramoliya?".**
13. **Profiles disagree on your title.** LinkedIn's headline says "SDE @Cactus Communications"; the site, GitHub and Scholar say "Software Engineer, AI".
    *Fix (you):* align the LinkedIn headline.
14. **Low-contrast text (accessibility).**
15. **Cloudflare Web Analytics is injected for real browsers,** while the footer says "Nothing leaves this page."

### Low

16. **Section headings are stylistic.**
17. **Title** could also say what you build. Optional.
18. **Social tags** missing.
19. **Icons:** only an SVG favicon.
20. **Caching:** hashed files in `/_astro/` are served with `max-age=0`.
21. **Articles live only on X.** X is hard for crawlers, so your writing builds no authority for this site.
22. **Crawler Hints** (Cloudflare, Caching settings) pings Bing through IndexNow when pages change. One toggle.

### Status by finding

| # | Finding | Status |
| --- | --- | --- |
| 1 | Not submitted to Google or Bing | Yours (dashboard). The sitemap now lists 13 pages |
| 2 | AI crawler blocking at Cloudflare unverified | Yours (dashboard). Not testable from here |
| 3 | No structured data | Fixed (`da5a057`), extended to the new pages in round two |
| 4 | No sitemap | Fixed (`7e91355`), all 13 pages in round two |
| 5 | robots.txt says nothing | Fixed (`7e91355`); content signals moved into a comment in round two |
| 6 | http not redirected to https | Yours (dashboard) |
| 7 | h1 reads "Ramoliyabuilds" | Fixed (`7e91355`) |
| 8 | www duplicate | Yours (dashboard, GitHub) |
| 9 | No 404 page | Fixed (`7e91355`); header and footer in round two |
| 10 | No llms.txt | Fixed (`6ed9c08`); covers research and articles in round two |
| 11 | Meta description too long | Fixed in round two (138 characters) |
| 12 | No "who is" passage | Fixed in round two (the bio) |
| 13 | LinkedIn title disagrees | Yours (LinkedIn) |
| 14 | Low-contrast text | Fixed (`ad15cbe`) |
| 15 | Web Analytics vs footer line | Yours: turn off automatic setup |
| 16 | Stylistic headings | Fixed in round two |
| 17 | Title | Kept as it is, as decided |
| 18 | Social tags | Fixed (`7e91355`) |
| 19 | Icons | Fixed (`7e91355`) |
| 20 | `/_astro/` caching | Fixed (`7e91355`) |
| 21 | Articles only on X | Fixed in round two: 10 articles on the site |
| 22 | Crawler Hints | Yours (dashboard) |

## Decisions

25 October 2026, round one:

1. **AI training crawlers:** allowed, with search and answer crawlers.
2. **ResearchGate in `sameAs`:** on hold until you confirm the profile is yours.
3. **Project setup:** committed (`.claude/skills`, `.claude/settings.json`, `skills-lock.json`); `settings.local.json` stays ignored.
4. **Cloudflare analytics:** you turn off Web Analytics' automatic setup in the dashboard; the footer line stays as it is.

25 October 2026, round two:

5. **Copy:** bio, description and headings approved, with "in Mumbai" and "cited 191 times" removed.
6. **Research page and articles on the site:** yes. Articles stay as written on X.
7. **SVG size reduction:** skipped for now.
8. **Font preload:** you asked for it; measured, it made mobile LCP worse, so it is not shipped (above).
9. **Content signals:** written as a robots.txt comment so the Lighthouse robots check passes. Reversible.

## Round one details

### Technical (`7e91355`)

- **h1 (7):** a space between the two lines of the heading.
- **Sitemap (4):** `/sitemap.xml`, generated at build time.
- **robots.txt (5):** allow everything; explicit groups for search (Googlebot, Bingbot, Applebot, DuckDuckBot), AI answers (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User) and AI training (GPTBot, ClaudeBot, CCBot, Google-Extended); the Sitemap line. Cloudflare may prepend its managed Content Signals block. If that block says `ai-train=no`, it contradicts this file, so turn off Cloudflare's managed robots.txt in the dashboard.
- **404 page (9):** `src/pages/404.astro` (noindex) and `not_found_handling: "404-page"`.
- **Social tags (18):** `og:site_name`, `og:locale`, `og:image:alt`, `twitter:creator`, `twitter:image` (`e0dadd9`) and `twitter:image:alt`.
- **Icons (19):** `/favicon.ico` (48 px) and `/apple-touch-icon.png` (180 px).
- **Caching (20):** `/_astro/*` gets `Cache-Control: public, max-age=31536000, immutable` from `public/_headers`.

### Structured data (`da5a057`)

- One graph per page, built from the same content the page shows.
- Home: `ProfilePage` whose main entity is `Person` (name, job title, Cactus Communications, Nirma University, Mumbai, email, awards from the Recognition list, `knowsAbout` from the systems and research themes, `sameAs` for both GitHub accounts, LinkedIn, Google Scholar and X), `WebSite`, eight `SoftwareSourceCode` and the four most-cited papers.
- `image` is left out because the site has no photo; Google recommends one but does not require it.

### GEO (`6ed9c08`)

- `/llms.txt`: a summary with the bio, role, research numbers, the site's sections, profiles, projects and articles. `/llms-full.txt` and `/index.md` hold the home page as Markdown. All are generated from the same content as the pages.
- The Markdown copies send `X-Robots-Tag: noindex`, so search engines list the pages, not duplicates. Each page links its copy as `rel="alternate" type="text/markdown"`.

### Accessibility (`ad15cbe`)

- Muted text is #7f7f79 in the dark theme (4.76:1) and #6e6e68 in the light theme (4.74:1).
- Each drawing has a one-line label; numerals in drawings are `aria-hidden`, and the drawings are `data-nosnippet`.

### Security headers (`acd59cf`)

- `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, and a CSP in report-only mode.

## How to check after the deploy

Replace the domain with `http://localhost:8787` to run these against a local build.

```bash
curl -s https://fenilramoliya.com/sitemap.xml | grep -c "<loc>"
```

Expect 13.

```bash
curl -sI https://fenilramoliya.com/articles/the-nine-dials.md | grep -iE "content-type|x-robots"
```

Expect `text/markdown` and `noindex`.

```bash
curl -s https://fenilramoliya.com/research/ | grep -o '"@type":"ScholarlyArticle"' | wc -l
```

Expect 28.

Then paste `https://fenilramoliya.com/articles/the-nine-dials/` into Google's Rich Results Test, which should find an Article and a breadcrumb.
