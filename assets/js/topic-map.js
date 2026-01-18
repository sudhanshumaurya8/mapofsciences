/****************************************************
 * topic-map.js
 * ----------------------------------
 * FINAL CORRECT VERSION
 * - True left-aligned child text
 * - Curves never cross labels
 * - Links rendered BELOW nodes
 * - Auto-sized boxes
 * - Zoom + pan
 * - Correct navigation
 ****************************************************/

const DATA_PATH = "data/tree-textile.json";

const LEVEL_GAP_X = 300;
const LEVEL_GAP_Y = 110;

const BOX_HEIGHT = 44;
const BOX_RADIUS = 6;
const TEXT_PADDING_LEFT = 16;

const svg = document.getElementById("mindmap");
const breadcrumbEl = document.getElementById("breadcrumb");
const contextEl = document.getElementById("context");

let TREE_INDEX = {};
let ACTIVE_NODE = null;

let viewBox = { x: 0, y: 0, w: 1400, h: 900 };
let panning = false;
let panStart = { x: 0, y: 0 };

/* ---------------- INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  fetch(DATA_PATH)
    .then(r => r.json())
    .then(root => {
      indexTree(root, null);
      ACTIVE_NODE = TREE_INDEX[id];
      render();
    });

  initZoomPan();
});

/* ---------------- TREE ---------------- */

function indexTree(node, parent) {
  TREE_INDEX[node.id] = { ...node, parent };
  (node.children || []).forEach(c => indexTree(c, node.id));
}

/* ---------------- RENDER ---------------- */

function render() {
  clearSVG();
  renderBreadcrumb();
  renderContext();
  renderMap();
}

/* ---------------- MAP ---------------- */

function renderMap() {
  const cx = 420;
  const cy = 450;

  const active = measureNode(ACTIVE_NODE, cx, cy, false);

  const children = (ACTIVE_NODE.children || [])
    .map(id => TREE_INDEX[id]);

  const childNodes = children.map((c, i) => {
    const y = cy + (i - (children.length - 1) / 2) * LEVEL_GAP_Y;
    return measureNode(c, cx + LEVEL_GAP_X, y, true);
  });

  // DRAW LINKS FIRST (important!)
  childNodes.forEach(c => drawCurve(active, c));

  // DRAW NODES ON TOP
  drawNode(active, true, false);
  childNodes.forEach(c => drawNode(c, false, true));

  updateViewBox();
}

/* ---------------- NODE MEASURE ---------------- */

function measureNode(node, x, y, leftAlign) {
  const charWidth = 7.2;
  const width = Math.min(
    Math.max(node.title.length * charWidth + 48, 160),
    360
  );

  return {
    id: node.id,
    label: node.title,
    x,
    y,
    width,
    leftAlign
  };
}

/* ---------------- NODE DRAW ---------------- */

function drawNode(n, isActive, leftAlign) {
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

  if (leftAlign) {
    text.setAttribute("x", n.x - n.width / 2 + TEXT_PADDING_LEFT);
    text.setAttribute("text-anchor", "start");
  } else {
    text.setAttribute("x", n.x);
    text.setAttribute("text-anchor", "middle");
  }

  text.textContent = n.label;

  g.appendChild(rect);
  g.appendChild(text);

  g.addEventListener("click", () => {
    window.location.href = `topic.html?id=${n.id}`;
  });

  svg.appendChild(g);
}

/* ---------------- CURVES ---------------- */

function drawCurve(from, to) {
  const startX = from.x + from.width / 2;
  const endX = to.x - to.width / 2;

  const offset = (to.y - from.y) * 0.35;

  const c1x = startX + 80;
  const c2x = endX - 80;

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute(
    "d",
    `M ${startX} ${from.y}
     C ${c1x} ${from.y + offset},
       ${c2x} ${to.y - offset},
       ${endX} ${to.y}`
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c7d2fe");
  path.setAttribute("stroke-width", "1.4");

  svg.appendChild(path);
}

/* ---------------- UI ---------------- */

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
  contextEl.innerHTML = `<h3>${ACTIVE_NODE.title}</h3><p>${c.definition || ""}</p>`;
}

/* ---------------- ZOOM + PAN ---------------- */

function initZoomPan() {
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.12 : 0.88;
    viewBox.w *= scale;
    viewBox.h *= scale;
    updateViewBox();
  });

  svg.addEventListener("mousedown", e => {
    panning = true;
    panStart = { x: e.clientX, y: e.clientY };
  });

  svg.addEventListener("mousemove", e => {
    if (!panning) return;
    const dx = (panStart.x - e.clientX) * (viewBox.w / svg.clientWidth);
    const dy = (panStart.y - e.clientY) * (viewBox.h / svg.clientHeight);
    viewBox.x += dx;
    viewBox.y += dy;
    panStart = { x: e.clientX, y: e.clientY };
    updateViewBox();
  });

  svg.addEventListener("mouseup", () => (panning = false));
  svg.addEventListener("mouseleave", () => (panning = false));
}

function updateViewBox() {
  svg.setAttribute(
    "viewBox",
    `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
  );
}
