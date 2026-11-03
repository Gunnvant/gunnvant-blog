// Static site generator: content/*.md -> dist/. Run with `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const ROOT = import.meta.dirname;
const DIST = path.join(ROOT, "dist");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const layout = fs.readFileSync(path.join(ROOT, "templates/layout.html"), "utf8");
const siteUrl = config.url.replace(/\/$/, "");

const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Minimal front matter: `key: value` lines between --- fences.
function parse(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta = {};
  if (!m) return { meta, body: raw };
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: m[2] };
}

// Resume convention: `### Title, Company | Start – End` renders with the dates on the right.
function render(body) {
  return marked.parse(body).replace(/<h3>(.*?) \| (.*?)<\/h3>/g, '<div class="entry-head"><h3>$1</h3><span class="dates">$2</span></div>');
}

// Wrap resume HTML in sections (split at each <h2>) so print CSS can style the banner and skills.
function sections(html) {
  const [head, ...rest] = html.split(/(?=<h2>)/);
  const slug = (h) => h.replace(/<[^>]+>/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `<div class="cv-head">${head}</div>` + rest.map((r) => `<section class="cv-sec cv-${slug(r.match(/<h2>(.*?)<\/h2>/)[1])}">${r}</section>`).join("");
}

function page({ title, description, urlPath, nav, content, type = "website" }) {
  const full = title ? `${title} · ${config.name}` : config.name;
  const nav_ = ["about", "blog", "resume"].map((n) => {
    const href = n === "about" ? "/" : `/${n}/`;
    return `<a href="${href}"${n === nav ? ' aria-current="page"' : ""}>${n[0].toUpperCase() + n.slice(1)}</a>`;
  }).join("");
  return layout
    .replaceAll("{{title}}", esc(full))
    .replaceAll("{{description}}", esc(description || config.tagline))
    .replaceAll("{{canonical}}", `${siteUrl}${urlPath}`)
    .replaceAll("{{ogtype}}", type)
    .replaceAll("{{name}}", esc(config.name))
    .replaceAll("{{year}}", new Date().getFullYear())
    .replace("{{nav}}", nav_)
    .replace("{{content}}", content);
}

function write(urlPath, html) {
  const out = urlPath.endsWith("/") ? path.join(DIST, urlPath, "index.html") : path.join(DIST, urlPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "static"), DIST, { recursive: true });

const urls = ["/", "/blog/", "/resume/"];

// About
{
  const { meta, body } = parse(path.join(ROOT, "content/about.md"));
  const links = [
    config.email && `<a href="mailto:${esc(config.email)}">Email</a>`,
    config.github && `<a href="${esc(config.github)}">GitHub</a>`,
    config.linkedin && `<a href="${esc(config.linkedin)}">LinkedIn</a>`,
    config.medium && `<a href="${esc(config.medium)}">Medium</a>`,
  ].filter(Boolean).join("");
  const content = `<h1>About</h1><div class="prose about">${render(body)}</div><p class="label">Elsewhere</p><p class="links">${links}</p>`;
  write("/", page({ description: meta.description, urlPath: "/", nav: "about", content }));
}

// Resume
{
  const { meta, body } = parse(path.join(ROOT, "content/resume.md"));
  const pdf = '<button class="download" type="button" onclick="window.print()">Download PDF</button>';
  const content = `<div class="title-row"><h1>Resume</h1>${pdf}</div><div class="prose resume">${sections(render(body))}</div>`;
  write("/resume/", page({ title: "Resume", description: meta.description, urlPath: "/resume/", nav: "resume", content }));
}

// Blog
const postsDir = path.join(ROOT, "content/posts");
const posts = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md")).map((f) => {
  const { meta, body } = parse(path.join(postsDir, f));
  return { slug: f.replace(/\.md$/, ""), body, ...meta };
}).filter((p) => p.draft !== "true").sort((a, b) => new Date(b.date) - new Date(a.date));

const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

for (const p of posts) {
  const urlPath = `/blog/${p.slug}/`;
  urls.push(urlPath);
  const content = `<article><p class="date"><time datetime="${esc(p.date)}">${fmt(p.date)}</time></p><h1>${esc(p.title)}</h1><div class="prose">${render(p.body)}</div></article><p class="back"><a href="/blog/">← All posts</a></p>`;
  write(urlPath, page({ title: p.title, description: p.summary, urlPath, nav: "blog", content, type: "article" }));
}

{
  const list = posts.map((p) => `<li><p class="date">${fmt(p.date)}</p><h2><a href="/blog/${p.slug}/">${esc(p.title)}</a></h2><p>${esc(p.summary)}</p></li>`).join("");
  const content = `<h1>Blog</h1><ul class="posts">${list || "<li>No posts yet.</li>"}</ul>`;
  write("/blog/", page({ title: "Blog", urlPath: "/blog/", nav: "blog", content }));
}

// SEO files
const today = new Date().toISOString().slice(0, 10);
write("/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
write("/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
write("/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(config.name)}</title><link>${siteUrl}/</link><description>${esc(config.tagline)}</description>\n${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${siteUrl}/blog/${p.slug}/</link><guid>${siteUrl}/blog/${p.slug}/</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.summary)}</description></item>`).join("\n")}\n</channel></rss>\n`);

console.log(`Built ${urls.length} pages (${posts.length} posts) -> dist/`);
