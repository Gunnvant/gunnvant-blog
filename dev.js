// Dev server: rebuilds on change and serves dist/ at http://localhost:3000
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = import.meta.dirname;
const build = () => { try { execFileSync("node", ["build.js"], { cwd: ROOT, stdio: "inherit" }); } catch {} };
build();

let timer;
for (const dir of ["content", "templates", "static", "site.config.json", "build.js"]) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(build, 100); });
}

const types = { ".html": "text/html", ".css": "text/css", ".xml": "application/xml", ".pdf": "application/pdf", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".txt": "text/plain" };
http.createServer((req, res) => {
  let p = path.join(ROOT, "dist", decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!p.startsWith(path.join(ROOT, "dist")) || !fs.existsSync(p)) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(3000, () => console.log("http://localhost:3000"));
