const slides = window.DECK_DATA;
const stage = document.getElementById("stage");
const currentEl = document.getElementById("current");
const progressBar = document.getElementById("progressBar");
const toc = document.getElementById("toc");
let index = 0;

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalize(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function partNo(slide) {
  const marker = slide.elements.find((item) => item.type === "text" && /^0\d$/.test(normalize(item.text)));
  return marker ? normalize(marker.text) : String(slide.index).padStart(2, "0");
}

function textItems(slide) {
  if (Array.isArray(slide.appendix) && slide.appendix.length) return slide.appendix;
  const seen = new Set([normalize(slide.title)]);
  return slide.elements
    .filter((item) => item.type === "text")
    .sort((a, b) => (a.y - b.y) || (a.x - b.x))
    .map((item) => normalize(item.text.replaceAll("\n", " / ")))
    .filter((text) => {
      if (!text || text.length < 2) return false;
      if (/^0\d$|^\d$|^PART\s+/i.test(text)) return false;
      if (seen.has(text)) return false;
      seen.add(text);
      return true;
    });
}

function bullets(slide) {
  return Array.isArray(slide.bullets) && slide.bullets.length
    ? slide.bullets
    : textItems(slide).slice(0, 6);
}

function imageItems(slide) {
  if (Array.isArray(slide.images) && slide.images.length) {
    return slide.images.slice(0, 6);
  }
  return slide.elements
    .filter((item) => item.type === "image")
    .filter((item) => {
      const ratio = item.w / Math.max(item.h, 1);
      return item.w * item.h > 18000 && ratio > 0.18 && ratio < 8.0;
    })
    .sort((a, b) => (b.w * b.h) - (a.w * a.h))
    .slice(0, 6);
}

function compactText(text, maxLength = 54) {
  let value = normalize(text)
    .replace(/^核心问题：\s*/, "")
    .replace(/^应对方向：\s*/, "")
    .replace(/^优势\s*/, "")
    .replace(/^劣势\s*/, "")
    .replace(/\s*\/\s*/g, " · ");
  if (value.length <= maxLength) return value;
  const chunks = value.split(/[；;。]/).map((item) => item.trim()).filter(Boolean);
  if (chunks[0] && chunks[0].length <= maxLength) return chunks[0];
  return `${value.slice(0, maxLength - 1)}…`;
}

function refinedItems(slide, limit = 8) {
  const seed = new Set(bullets(slide).map((item) => normalize(item)));
  const blocked = new Set([normalize(slide.title), normalize(slide.originalTitle || "")]);
  const selected = [];
  for (const raw of textItems(slide)) {
    const text = compactText(raw);
    if (!text || text.length < 4) continue;
    if (/^0\d$|^\d$|^PART\s+/i.test(text)) continue;
    if (blocked.has(text) || seed.has(text)) continue;
    if (selected.includes(text)) continue;
    if (text.length < 8 && !/[A-Za-z0-9>]/.test(text)) continue;
    selected.push(text);
    if (selected.length >= limit) break;
  }
  return selected;
}

function mergeUnique(items) {
  const seen = new Set();
  const merged = [];
  for (const raw of items) {
    const text = compactText(raw, 1000);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    merged.push(text);
  }
  return merged;
}

function fullDetailItems(slide) {
  return mergeUnique([...bullets(slide), ...refinedItems(slide, 80)]);
}

function refinementStrip(slide, limit = 5) {
  const items = refinedItems(slide, limit);
  if (!items.length) return "";
  return `<section class="refined-strip">${items.map((item, i) => `<span style="--delay:${(i + 5) * 48}ms"><b>${String(i + 1).padStart(2, "0")}</b>${esc(item)}</span>`).join("")}</section>`;
}

function cardHtml(text, order) {
  const pieces = text.split(/\s*\/\s*/).filter(Boolean);
  const title = pieces[0] || text;
  const copy = pieces.slice(1).join(" · ");
  const compact = text.length < 28;
  return `<div class="insight-card ${compact ? "compact" : ""}" style="--delay:${order * 42}ms">
    <strong>${esc(title)}</strong>
    ${copy ? `<p>${esc(copy)}</p>` : ""}
  </div>`;
}

function renderChapter(slide) {
  const items = [...bullets(slide), ...refinedItems(slide, 2)].slice(0, 4);
  return `<div class="chapter-layout">
    <div class="chapter-mark">PART ${partNo(slide)}</div>
    <h1>${esc(slide.title)}</h1>
    <div class="chapter-line"></div>
    ${items.length ? `<div class="chapter-notes">${items.map((item) => `<span>${esc(item)}</span>`).join("")}</div>` : ""}
  </div>`;
}

function renderAgenda(slide) {
  const items = [...bullets(slide), ...refinedItems(slide, 3)].filter((item) => item.length > 4).slice(0, 8);
  return `<div class="agenda-layout">
    <div class="slide-header"><span>${partNo(slide)}</span><h2>${esc(slide.title)}</h2></div>
    <div class="agenda-list">
      ${items.map((item, i) => `<div class="agenda-row" style="--delay:${i * 55}ms"><em>${String(i + 1).padStart(2, "0")}</em><strong>${esc(item)}</strong></div>`).join("")}
    </div>
  </div>`;
}

function renderHero(slide) {
  const items = bullets(slide);
  const [headline, subtitle = "世界模型如何重塑智能驾驶的进化边界"] = slide.title.split("：");
  return `<div class="hero-layout">
    <p class="eyebrow">${esc(items[0] || "Physical AI / World Model")}</p>
    <h1>${esc(headline)}</h1>
    <p class="subtitle">${esc(subtitle)}</p>
    <div class="hero-meta">${items.slice(1, 3).map((item) => `<span>${esc(item)}</span>`).join("")}</div>
    <svg class="motion-wave" viewBox="0 0 1200 600" aria-hidden="true">
      <path d="M0,420 C240,320 360,480 600,380 C840,280 960,430 1200,330" />
      <path d="M0,470 C220,390 420,520 650,430 C900,330 1000,470 1200,390" />
      <path d="M0,360 C260,260 430,370 650,300 C870,230 1000,350 1200,270" />
    </svg>
  </div>`;
}

function renderTimeline(slide) {
  const items = fullDetailItems(slide);
  const images = imageItems(slide);
  return `<div class="content-layout ${images.length ? "image-priority" : ""}">
    <div class="slide-header"><span>${partNo(slide)}</span><h2>${esc(slide.title)}</h2></div>
    <section class="timeline-row complete-grid">${items.map((item, i) => cardHtml(item, i)).join("")}</section>
    ${renderVisualPanel(images)}
  </div>`;
}

function renderLogicFlow(slide) {
  const items = bullets(slide).slice(0, 5);
  const details = refinedItems(slide, 80);
  const images = imageItems(slide);
  return `<div class="content-layout logic-layout ${images.length ? "image-priority" : ""}">
    <div class="slide-header"><span>${partNo(slide)}</span><h2>${esc(slide.title)}</h2></div>
    <section class="flow-line">${items.map((item, i) => {
      const [label, ...rest] = item.split("：");
      return `<article class="flow-node" style="--delay:${i * 70}ms"><em>${String(i + 1).padStart(2, "0")}</em><strong>${esc(label)}</strong><p>${esc(rest.join("：") || item)}</p></article>`;
    }).join("")}</section>
    ${renderDetailGrid(details)}
    ${renderVisualPanel(images)}
  </div>`;
}

function renderMatrix(slide, labels) {
  const items = bullets(slide).slice(0, labels.length || 4);
  const details = refinedItems(slide, 80);
  const images = imageItems(slide);
  return `<div class="content-layout ${images.length ? "image-priority" : ""}">
    <div class="slide-header"><span>${partNo(slide)}</span><h2>${esc(slide.title)}</h2></div>
    <section class="matrix-grid">${items.map((item, i) => {
      const [label, ...rest] = item.split("：");
      return `<article class="matrix-card" style="--delay:${i * 70}ms"><span>${esc(labels[i] || String(i + 1).padStart(2, "0"))}</span><strong>${esc(label)}</strong><p>${esc(rest.join("：") || item)}</p></article>`;
    }).join("")}</section>
    ${renderDetailGrid(details)}
    ${renderVisualPanel(images)}
  </div>`;
}

function renderPlayerMap(slide) {
  const rows = textItems(slide)
    .map((item) => item.split("|").map((cell) => normalize(cell)).filter(Boolean))
    .filter((row) => row.length >= 2);
  const header = rows.find((row) => row[0] === "维度") || ["维度", "Waymo", "Tesla", "Wayve", "小鹏", "理想", "蔚来"];
  const players = header.slice(1);
  const fields = {};
  for (const row of rows) {
    if (row[0] === "维度") continue;
    fields[row[0]] = row.slice(1);
  }
  return `<div class="content-layout player-layout">
    <div class="slide-header"><span>${partNo(slide)}</span><h2>${esc(slide.title)}</h2></div>
    <section class="player-grid">${players.map((player, i) => `<article class="player-card" style="--delay:${i * 55}ms">
      <h3>${esc(player)}</h3>
      <strong>${esc(fields["模型形态"]?.[i] || "")}</strong>
      <p>${esc(fields["技术本质"]?.[i] || "")}</p>
      <dl>
        <dt>能力</dt><dd>${esc(compactText(fields["核心能力"]?.[i] || "", 1000))}</dd>
        <dt>优势</dt><dd>${esc(compactText(fields["优势"]?.[i] || "", 1000))}</dd>
        <dt>局限</dt><dd>${esc(compactText(fields["局限"]?.[i] || "", 1000))}</dd>
      </dl>
    </article>`).join("")}</section>
  </div>`;
}

function renderDetailGrid(items) {
  if (!items.length) return "";
  return `<section class="detail-grid">${items.map((item, i) => `<div style="--delay:${(i + 4) * 28}ms">${esc(item)}</div>`).join("")}</section>`;
}

function renderFlywheel(slide) {
  const items = fullDetailItems(slide).filter((item) => item.length > 3).slice(0, 8);
  return `<div class="content-layout">
    <div class="slide-header"><span>${partNo(slide)}</span><h2>${esc(slide.title)}</h2></div>
    <section class="flywheel">${items.map((item, i) => `<article style="--i:${i};--delay:${i * 80}ms"><strong>${esc(item.split(" / ")[0])}</strong><p>${esc(item.split(" / ").slice(1).join(" · "))}</p></article>`).join("")}</section>
  </div>`;
}

function renderRoadmap(slide) {
  const items = bullets(slide).slice(0, 3);
  const future = refinedItems(slide, 80);
  return `<div class="content-layout roadmap-layout">
    <div class="slide-header"><span>${partNo(slide)}</span><h2>${esc(slide.title)}</h2></div>
    <section class="roadmap">${items.map((item, i) => `<article style="--delay:${i * 80}ms"><em>${["短期", "中期", "长期"][i] || ""}</em><strong>${esc(item)}</strong></article>`).join("")}</section>
    <section class="capability-tree">${future.map((item, i) => `<span style="--delay:${(i + 3) * 60}ms">${esc(item)}</span>`).join("")}</section>
  </div>`;
}

function renderVisualPanel(images) {
  if (!images.length) return "";
  return `<aside class="visual-panel">
    ${images.map((image, i) => `<figure style="--delay:${(i + 4) * 55}ms"><img src="${esc(image.src)}" alt=""></figure>`).join("")}
  </aside>`;
}

function renderContent(slide) {
  if (slide.layout === "hero") return renderHero(slide);
  if (slide.index === 2) return renderAgenda(slide);
  if (slide.kind === "chapter") return renderChapter(slide);
  if (slide.layout === "timeline") return renderTimeline(slide);
  if (slide.layout === "logic-flow" || slide.layout === "cooperation-flow") return renderLogicFlow(slide);
  if (slide.layout === "player-map") return renderPlayerMap(slide);
  if (slide.layout === "architecture-matrix") return renderMatrix(slide, ["模块化", "两段式", "端到端"]);
  if (slide.layout === "constraint-matrix") return renderMatrix(slide, ["算力", "数据", "迁移", "安全"]);
  if (slide.layout === "flywheel") return renderFlywheel(slide);
  if (slide.layout === "roadmap") return renderRoadmap(slide);

  const items = textItems(slide);
  const images = imageItems(slide);
  const visibleItems = fullDetailItems(slide);
  const hasVisual = images.length > 0;
  const gridClass = visibleItems.length > 24 ? "dense-grid ultra-grid" : slide.kind === "dense" ? "dense-grid" : hasVisual ? "split-grid" : "card-grid";

  return `<div class="content-layout ${hasVisual ? "has-visual" : ""}">
    <div class="slide-header"><span>${partNo(slide)}</span><h2>${esc(slide.title)}</h2></div>
    <section class="${gridClass}">
      ${visibleItems.map((item, i) => cardHtml(item, i)).join("")}
    </section>
    ${hasVisual ? renderVisualPanel(images) : ""}
  </div>`;
}

function render() {
  stage.innerHTML = slides.map((slide, slideIndex) => (
    `<article class="slide semantic-slide ${slide.kind}${slideIndex === index ? " current" : ""}" data-slide="${slideIndex}">
      ${renderContent(slide)}
    </article>`
  )).join("");
}

function go(nextIndex) {
  index = Math.max(0, Math.min(slides.length - 1, nextIndex));
  document.querySelectorAll(".slide").forEach((slide, i) => {
    slide.classList.toggle("current", i === index);
  });
  currentEl.textContent = String(index + 1).padStart(2, "0");
  progressBar.style.width = `${((index + 1) / slides.length) * 100}%`;
  document.title = `${String(index + 1).padStart(2, "0")} ${slides[index].title}`;
}

function fit() {
  const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900) * 0.96;
  document.documentElement.style.setProperty("--scale", Math.max(0.1, scale).toFixed(4));
}

document.getElementById("prev").addEventListener("click", () => go(index - 1));
document.getElementById("next").addEventListener("click", () => go(index + 1));
document.getElementById("openToc").addEventListener("click", () => toc.classList.add("open"));
document.getElementById("closeToc").addEventListener("click", () => toc.classList.remove("open"));

document.querySelectorAll(".toc-item").forEach((button) => {
  button.addEventListener("click", () => {
    go(Number(button.dataset.goto));
    toc.classList.remove("open");
  });
});

window.addEventListener("keydown", (event) => {
  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    go(index + 1);
  }
  if (["ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    go(index - 1);
  }
  if (event.key.toLowerCase() === "o") toc.classList.toggle("open");
  if (event.key === "Home") go(0);
  if (event.key === "End") go(slides.length - 1);
});

window.addEventListener("resize", fit);
render();
fit();
go(0);
