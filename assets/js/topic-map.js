/****************************************************
 * topic-map.js
 * ----------------------------------
 * FINAL STABLE VERSION
 * - Correct SVG binding
 * - Left-aligned child text
 * - Curved links
 * - Auto-sized boxes
 * - Zoom + pan
 * - Correct navigation
 ****************************************************/

const DATA_PATH = "data/tree-textile.json";

/* ---------- CONFIG ---------- */
const LEVEL_GAP_X = 300;
const LEVEL_GAP_Y = 110;
const BOX_HEIGHT = 44;
const BOX_RADIUS = 6;
const TEXT_PADDING_LEFT = 16;

/* ---------- DOM ---------- */
const svg = document.getElementById("mindmap");
const breadcrumbEl = document.getElementById("breadcrumb");
const contextEl = document.getElementById("context");

if (!svg) {
  alert("SVG not found (id mismatch)");
  throw new Error("SVG #mindmap not found");
}
const tooltip = document.getElementById("tooltip");

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
    });

  initZoomPan();
});

/* ---------- TREE INDEX ---------- */
function indexTree(node, parent) {
  TREE_INDEX[node.id] = { ...node, parent };
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
  const cx = 500;
  const cy = 450;

  const active = measureNode(ACTIVE_NODE, cx, cy, false);

  // -------- PARENT NODE --------
  let parentNode = null;
  if (ACTIVE_NODE.parent) {
    const parent = TREE_INDEX[ACTIVE_NODE.parent];
    parentNode = measureNode(parent, cx - LEVEL_GAP_X, cy, false);
    drawCurve(parentNode, active);
  }

  // -------- CHILD NODES --------
  const children = (ACTIVE_NODE.children || []).map(c => TREE_INDEX[c.id]);

  const childNodes = children.map((c, i) => {
    const y = cy + (i - (children.length - 1) / 2) * LEVEL_GAP_Y;
    return measureNode(c, cx + LEVEL_GAP_X, y, true);
  });

  // Draw links first
  childNodes.forEach(c => drawCurve(active, c));

  // Draw nodes
  if (parentNode) drawNode(parentNode, false);
  drawNode(active, true);
  childNodes.forEach(c => drawNode(c, false));

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
function drawNode(n, isActive) {
  const g = document.createElementNS(svg.namespaceURI, "g");
  g.style.cursor = "pointer";

  const rect = document.createElementNS(svg.namespaceURI, "rect");
  rect.setAttribute("x", n.x - n.width / 2);
  rect.setAttribute("y", n.y - BOX_HEIGHT / 2);
  rect.setAttribute("width", n.width);
  rect.setAttribute("height", BOX_HEIGHT);
  rect.setAttribute("rx", BOX_RADIUS);
  rect.setAttribute("fill", "#ffffff");
  rect.setAttribute("stroke", isActive ? "#0f172a" : "#64748b");
  rect.setAttribute("stroke-width", isActive ? "2.6" : "1.5");

  const text = document.createElementNS(svg.namespaceURI, "text");
  text.setAttribute("y", n.y + 5);
  text.setAttribute("font-size", "13");
  text.setAttribute("fill", "#111827");
  text.style.pointerEvents = "none";

  if (n.leftAlign) {
    text.setAttribute("x", n.x - n.width / 2 + TEXT_PADDING_LEFT);
    text.setAttribute("text-anchor", "start");
  } else {
    text.setAttribute("x", n.x);
    text.setAttribute("text-anchor", "middle");
  }

  text.textContent = n.title;

  g.appendChild(rect);
  g.appendChild(text);

  g.addEventListener("click", () => {
    window.location.href = `topic.html?id=${n.id}`;
  });
g.addEventListener("mouseenter", e => {
  if (!n.context?.definition) return;

  tooltip.style.display = "block";
  tooltip.style.left = e.clientX + 12 + "px";
  tooltip.style.top = e.clientY + 12 + "px";
  tooltip.innerHTML = `<strong>${n.title}</strong><br>${n.context.definition}`;
});

g.addEventListener("mouseleave", () => {
  tooltip.style.display = "none";
});

  svg.appendChild(g);
}

/* ---------- CURVES ---------- */
function drawCurve(from, to) {
  const startX = from.x + from.width / 2;
  const endX = to.x - to.width / 2;

  const c1x = startX + 90;
  const c2x = endX - 90;

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute(
    "d",
    `M ${startX} ${from.y}
     C ${c1x} ${from.y},
       ${c2x} ${to.y},
       ${endX} ${to.y}`
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c7d2fe");
  path.setAttribute("stroke-width", "1.4");

  svg.appendChild(path);
}

/* ---------- UI ---------- */
function clearSVG() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

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

function renderContext() {
  const c = ACTIVE_NODE.context || {};
  contextEl.innerHTML = `
    <h3>${ACTIVE_NODE.title}</h3>
    <p>${c.definition || ""}</p>
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
    const dx = (panStart.x - e.clientX) * (viewBox.w / svg.clientWidth);
    const dy = (panStart.y - e.clientY) * (viewBox.h / svg.clientHeight);
    viewBox.x += dx;
    viewBox.y += dy;
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
