import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outVideos = join(root, "demo-output", "videos");
const outFlows = join(root, "demo-output", "flows", "videos");
const resultsDir = join(root, "test-results");

async function findVideos(dir) {
  const found = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) found.push(...(await findVideos(p)));
    else if (name === "video.webm") found.push(p);
  }
  return found;
}

await mkdir(outVideos, { recursive: true });
await mkdir(outFlows, { recursive: true });
const videos = await findVideos(resultsDir);

const friendly = (folder) => {
  if (folder.includes("full-solo-demo") || folder.includes("mode-select-through-3min")) {
    if (folder.includes("full-solo-mobile")) return "full-solo-journey-mobile.webm";
    return "full-solo-journey.webm";
  }
  if (folder.includes("complete-journey") || folder.includes("3min-round-explore")) return "full-journey-desktop.webm";
  if (folder.includes("mobile-clip") || folder.includes("mobile-gameplay")) return "mobile-clip.webm";
  if (folder.includes("promo-cameo")) return "promo-cameo.webm";
  if (folder.includes("full-post-game")) return "flow-post-game-journey.webm";
  if (folder.includes("in-game-trading")) return "flow-UF-04-in-game-trading.webm";
  if (folder.includes("review-modal-and-save")) return "flow-UF-08-review-save-gate.webm";
  if (folder.includes("continue-to-landing")) return "flow-UF-11-landing-intro.webm";
  if (folder.includes("landing-tutorial-reopen")) return "flow-UF-12-landing-tutorial.webm";
  const uf = folder.match(/UF-(\d+)[^-]*-(.+?)(?:-flow-desktop)?$/i);
  if (uf) return `flow-UF-${uf[1]}-${uf[2]}.webm`;
  const m = folder.match(/(UF-\d+[^-]*)/);
  if (m) return `flow-${m[1]}.webm`;
  return `${folder}.webm`;
};

for (const src of videos.sort()) {
  const folder = src.split(/[/\\]/).slice(-2, -1)[0];
  const name = friendly(folder);
  const dest = name.startsWith("flow-")
    ? join(outFlows, name)
    : join(outVideos, name);
  await copyFile(src, dest);
  console.log("copied", dest);
}
console.log(`Collected ${videos.length} videos`);
