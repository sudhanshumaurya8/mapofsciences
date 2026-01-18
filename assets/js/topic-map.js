/****************************************************
 * topic-map.js
 * ----------------------------------
 * FINAL STABLE VERSION
 * - Nested JSON → flat indexed tree
 * - Breadcrumb restored
 * - Parent + children navigation
 * - Hover tooltip
 * - Sidebar context restored
 * - Zoom + pan
 ****************************************************/

const DATA_PATH = "data/tree-textile.json";

/* ---------- SVG + DOM ---------- */

const svg = document.getElementById("mindmap");
const breadcrumbEl = document.getElementById("breadcrumb");
const contextEl = document.getElementById("context");
const tooltipEl = document.getElementById("tooltip");

/* ---------- LAYOUT ---------- */

const LEVEL_GAP_X = 280;
const LEVEL_GAP_Y = 110;
const BOX_HEIGHT = 44;
const BOX_RADIUS = 6;
const TEXT_PADDING = 16;

/* ---------- STATE ---------- */

let TREE_INDEX = {};
let ACTIVE_NODE = null;

let viewBox = { x: 0, y: 0, w: 1400, h: 900 };
let isPanning = false;
let panStart = { x: 0, y: 0 };

/* ---------- INIT ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const topicId = new URLSearchParams(window.location.search).get("id");
  if (!topicId) return;

  fetch(DATA_PATH)
    .then(r => r.json())
    .then(root => {
      buildIndex(root, null);
      ACTIVE_NODE = TREE_INDEX[topicId];
      if (!ACTIVE_NODE) return;
      renderAll();
    });

  initZoomPan();
});

/* ---------- TREE INDEX ---------- */

function buildIndex(node, parentId) {
  TREE_INDEX[node.id] = {
    id: node.id,
    title: node.title,
    context: node.context || {},
    parent: parentId,
    children: (node.children || []).map(c => c.id)
  };

  (node.children || []).forEach(c => buildIndex(c, node.id));
}

/* ---------- RENDER ---------- */

function renderAll() {
  clearSVG();
  renderBreadcrumb();
  renderContext();
  renderMap();
}

/* ---------- MAP ---------- */

function renderMap() {
  const cx = 420;
  const cy = 450;

  const active = measureNode(ACTIVE_NODE, cx, cy, false);

  const children = ACTIVE_NODE.children.map(id => TREE_INDEX[id]);

  const childNodes = children.map((c, i) => {
    const y = cy + (i - (children.length - 1) / 2) * LEVEL_GAP_Y;
    return measureNode(c, cx + LEVEL_GAP_X, y, true);
  });

  childNodes.forEach(c => drawCurve(active, c));

  drawNode(active, true, false);
  childNodes.forEach(c => drawNode(c, false, true));

  updateViewBox();
}

/* ---------- NODE MEASURE ---------- */

function measureNode(node, x, y, leftAlign) {
  const charWidth = 7.2;
  const width = Math.min(
    Math.max(node.title.length * charWidth + 48, 160),
    360
  );

  return { ...node, x, y, width, leftAlign };
}

/* ---------- NODE DRAW ---------- */

function drawNode(n, isActive, leftAlign) {
  const g = document.createElementNS(svg.namespaceURI, "g");
  g.style.cursor = "pointer";

  const rect = document.createElementNS(svg.namespaceURI, "rect");
  rect.setAttribute("x", n.x - n.width / 2);
  rect.setAttribute("y", n.y - BOX_HEIGHT / 2);
  rect.setAttribute("width", n.width);
  rect.setAttribute("height", BOX_HEIGHT);
  rect.setAttribute("rx", BOX_RADIUS);
  rect.setAttribute("fill", "#fff");
  rect.setAttribute("stroke", isActive ? "#0f172a" : "#64748b");
  rect.setAttribute("stroke-width", isActive ? "2.6" : "1.5");

  const text = document.createElementNS(svg.namespaceURI, "text");
  text.setAttribute("y", n.y + 5);
  text.setAttribute("font-size", "13");
  text.setAttribute("fill", "#111827");
  text.style.pointerEvents = "none";

  if (leftAlign) {
    text.setAttribute("x", n.x - n.width / 2 + TEXT_PADDING);
    text.setAttribute("text-anchor", "start");
  } else {
    text.setAttribute("x", n.x);
    text.setAttribute("text-anchor", "middle");
  }

  text.textContent = n.title;

  g.append(rect, text);

  g.addEventListener("click", () => {
    window.location.href = `topic.html?id=${n.id}`;
  });

  g.addEventListener("mouseenter", e => {
    tooltipEl.style.display = "block";
    tooltipEl.innerHTML = `<strong>${n.title}</strong>`;
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
  const offset = (to.y - from.y) * 0.35;

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute(
    "d",
    `M ${startX} ${from.y}
     C ${startX + 80} ${from.y + offset},
       ${endX - 80} ${to.y - offset},
       ${endX} ${to.y}`
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c7d2fe");
  path.setAttribute("stroke-width", "1.4");

  svg.appendChild(path);
}

/* ---------- BREADCRUMB ---------- */

function renderBreadcrumb() {
  const chain = [];
  let n = ACTIVE_NODE;

  while (n) {
    chain.unshift(n);
    n = n.parent ? TREE_INDEX[n.parent] : null;
  }

  breadcrumbEl.innerHTML = chain
    .map((n, i) =>
      i === chain.length - 1
        ? `<strong>${n.title}</strong>`
        : `<a href="topic.html?id=${n.id}">${n.title}</a>`
    )
    .join(" › ");
}

/* ---------- CONTEXT ---------- */

function renderContext() {
  const c = ACTIVE_NODE.context || {};

  contextEl.innerHTML = `
    <h3>${ACTIVE_NODE.title}</h3>
    <p>${c.definition || ""}</p>
    ${c.role ? `<p><strong>Role:</strong> ${c.role}</p>` : ""}
    ${
      Array.isArray(c.references)
        ? `<ul>${c.references
            .map(r => `<li><a href="${r.url}" target="_blank">${r.title}</a></li>`)
            .join("")}</ul>`
        : ""
    }
  `;
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
    svg.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    isPanning = false;
    svg.style.cursor = "grab";
  });

  window.addEventListener("mousemove", e => {
    if (!isPanning) return;
    viewBox.x += (panStart.x - e.clientX) * 0.8;
    viewBox.y += (panStart.y - e.clientY) * 0.8;
    panStart = { x: e.clientX, y: e.clientY };
    updateViewBox();
  });
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
