/****************************************************
 * topic-map.js
 * FINAL STABLE VERSION
 * - Nested JSON support
 * - Parent = back navigation
 * - Breadcrumb restored
 * - Tooltip restored
 * - Zoom + pan
 ****************************************************/

const DATA_PATH = "data/tree-textile.json";

/* ---------- SVG ---------- */
const svg = document.getElementById("style");
if (!svg) {
  alert("SVG not found (id mismatch)");
  throw new Error("SVG not found");
}

/* ---------- UI ---------- */
const breadcrumbEl = document.getElementById("breadcrumb");
const contextEl = document.getElementById("context");
const tooltipEl = document.getElementById("tooltip");

/* ---------- STATE ---------- */
let TREE_INDEX = {};
let ACTIVE_NODE = null;

let viewBox = { x: 0, y: 0, w: 1400, h: 900 };
let isPanning = false;
let panStart = { x: 0, y: 0 };

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  fetch(DATA_PATH)
    .then(r => r.json())
    .then(root => {
      indexTree(root, null);
      ACTIVE_NODE = TREE_INDEX[id];
      if (!ACTIVE_NODE) return;
      render();
      initZoomPan();
    });
});

/* ---------- TREE INDEX ---------- */
function indexTree(node, parentId) {
  TREE_INDEX[node.id] = { ...node, parent: parentId };
  (node.children || []).forEach(c => indexTree(c, node.id));
}

/* ---------- RENDER ---------- */
function render() {
  clearSVG();
  renderBreadcrumb();
  renderContext();
  renderMap();
}

/* ---------- MAP ---------- */
function renderMap() {
  const cx = 400;
  const cy = 450;

  const LEFT_X = 400;     // shared left edge
const CHILD_OFFSET = 260;

const active = measureNode(ACTIVE_NODE, LEFT_X, cy, false);

const childNodes = children.map((c, i) => {
  const y = cy + (i - (children.length - 1) / 2) * 90;
  return measureNode(c, LEFT_X + CHILD_OFFSET, y, false);
});


  childNodes.forEach(c => drawCurve(active, c));

  drawNode(active, true);
  childNodes.forEach(c => drawNode(c, false));

  updateViewBox();
}

/* ---------- NODE MEASURE ---------- */
function measureNode(node, x, y, leftAlign) {
  const width = Math.min(Math.max(node.title.length * 7.2 + 48, 160), 360);
  return { ...node, x, y, width, leftAlign };
}

/* ---------- NODE DRAW ---------- */
function drawNode(n, isActive) {
  const g = document.createElementNS(svg.namespaceURI, "g");
  g.style.cursor = "pointer";

  const rect = document.createElementNS(svg.namespaceURI, "rect");
rect.setAttribute("x", n.x);
  rect.setAttribute("y", n.y - 22);
  rect.setAttribute("width", n.width);
  rect.setAttribute("height", 44);
  rect.setAttribute("rx", 6);
  rect.setAttribute("fill", "#fff");
  rect.setAttribute("stroke", isActive ? "#0f172a" : "#64748b");
  rect.setAttribute("stroke-width", isActive ? "2.5" : "1.4");

  const text = document.createElementNS(svg.namespaceURI, "text");
  text.setAttribute("y", n.y + 5);
  text.setAttribute("font-size", "13");
  text.setAttribute("fill", "#111827");
  text.setAttribute("pointer-events", "none");

 text.setAttribute("x", n.x + n.width / 2);
 text.setAttribute("text-anchor", "middle");

  text.textContent = n.title;

  g.appendChild(rect);
  g.appendChild(text);

  g.addEventListener("click", () => {
    if (isActive && n.parent) {
      window.location.href = `topic.html?id=${n.parent}`;
    } else {
      window.location.href = `topic.html?id=${n.id}`;
    }
  });

  g.addEventListener("mouseenter", e => {
    const def = n.context?.definition;
    if (!def) return;
    tooltipEl.innerHTML = `<strong>${n.title}</strong><br>${def}`;
    tooltipEl.style.display = "block";
    tooltipEl.style.left = e.clientX + 12 + "px";
    tooltipEl.style.top = e.clientY + 12 + "px";
  });

  g.addEventListener("mouseleave", () => {
    tooltipEl.style.display = "none";
  });

  svg.appendChild(g);
}

/* ---------- CURVES ---------- */
function drawCurve(from, to) {
  const startX = from.x + from.width / 2;
  const endX = to.x - to.width / 2;

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute(
    "d",
    `M ${startX} ${from.y}
     C ${startX + 80} ${from.y},
       ${endX - 80} ${to.y},
       ${endX} ${to.y}`
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c7d2fe");
  path.setAttribute("stroke-width", "1.4");

  svg.appendChild(path);
}

/* ---------- BREADCRUMB ---------- */
function renderBreadcrumb() {
  const path = [];
  let n = ACTIVE_NODE;

  while (n) {
    path.unshift(n);
    n = n.parent ? TREE_INDEX[n.parent] : null;
  }

  breadcrumbEl.innerHTML = path
    .map((n, i) =>
      i === path.length - 1
        ? `<strong>${n.title}</strong>`
        : `<a href="topic.html?id=${n.id}">${n.title}</a>`
    )
    .join(" › ");
}

/* ---------- CONTEXT ---------- */
function renderContext() {
  const ctx = ACTIVE_NODE.context || {};

  let html = `
    <h3>${ACTIVE_NODE.title}</h3>
  `;

  if (ctx.definition) {
    html += `
      <p><strong>Definition</strong></p>
      <p>${ctx.definition}</p>
    `;
  }

  if (ctx.role) {
    html += `
      <p><strong>Role</strong></p>
      <p>${ctx.role}</p>
    `;
  }

  if (Array.isArray(ctx.references) && ctx.references.length > 0) {
    html += `
      <p><strong>References</strong></p>
      <ul>
        ${ctx.references
          .map(
            r =>
              `<li>
                 <a href="${r.url}" target="_blank" rel="noopener noreferrer">
                   ${r.title}
                 </a>
               </li>`
          )
          .join("")}
      </ul>
    `;
  }

  contextEl.innerHTML = html;
}

/* ---------- ZOOM + PAN ---------- */
function initZoomPan() {
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const scale = e.deltaY < 0 ? 0.9 : 1.1;
    viewBox.w *= scale;
    viewBox.h *= scale;
    updateViewBox();
  });

  svg.addEventListener("mousedown", e => {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mousemove", e => {
    if (!isPanning) return;
    viewBox.x += (panStart.x - e.clientX) * 0.8;
    viewBox.y += (panStart.y - e.clientY) * 0.8;
    panStart = { x: e.clientX, y: e.clientY };
    updateViewBox();
  });

  window.addEventListener("mouseup", () => (isPanning = false));
}

function updateViewBox() {
  svg.setAttribute(
    "viewBox",
    `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
  );
}

function clearSVG() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}
