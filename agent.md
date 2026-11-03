# Personal website: agent & author guide

Minimal static site (About / Blog / Resume). Markdown in `content/` is rendered to HTML in `dist/` by `build.js`. No framework, one dependency (`marked`).

## Commands
- `npm install` once
- `npm run dev`: build, watch and serve at http://localhost:3000
- `npm run build`: output the deployable site to `dist/`

## Layout
- `site.config.json`: name, tagline, **site URL** (set to the real domain before deploying), email, GitHub, LinkedIn
- `content/about.md`: About page (first paragraph renders as the large intro line)
- `content/resume.md`: Resume. Use `### Title, Company | Start – End` for entries (dates align right). Search for `TODO` and fill in
- `content/posts/*.md`: blog posts; the filename is the URL slug
- `templates/layout.html`: page shell (header, nav, footer, meta tags)
- `static/`: copied as is to the site root (`style.css`, favicon, images)
- `build.js`: generator; also writes `sitemap.xml`, `robots.txt`, `feed.xml`

## Writing a post
Create `content/posts/my-post.md`:

```
---
title: My post title
date: 2026-11-01
summary: One or two sentences shown on the blog list and in search results.
draft: true   # optional; omit to publish
---
Markdown body here.
```

Images: put them in `static/images/` and reference `![alt](/images/pic.png)`.

## Conventions for agents
- Keep it simple: no JS frameworks, no extra dependencies unless clearly needed.
- Design: serif headings, sans body, narrow column, hairline dividers, light/dark via CSS only. Styles live in `static/style.css`.
- Never edit `dist/`; it is generated.
- Do not invent facts about the author in resume or about content; leave `TODO` instead.

## Deploy (Cloudflare Pages, free)
1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect repo.
3. Build command `npm run build`, output directory `dist`.
4. Add a custom domain, then update `url` in `site.config.json`.
5. Submit `/sitemap.xml` to Google Search Console and Bing Webmaster Tools; link the site from LinkedIn/GitHub.

GitHub Pages also works: publish `dist/` with a GitHub Actions workflow.
