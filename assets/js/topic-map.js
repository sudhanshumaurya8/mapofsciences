/****************************************************
 * topic-map.js
 * ----------------------------------
 * FINAL STABLE VERSION
 * - Nested JSON tree
 * - Rectangular nodes
 * - Left-aligned child text
 * - Curved links to box edges
 * - Auto-sized boxes
 * - Mouse wheel zoom
 * - Drag pan
 * - Correct click navigation
 ****************************************************/

/* ---------- CONFIG ---------- */

const DATA_PATH = "data/tree-textile.json";
const LEVEL_GAP_X = 260;
const LEVEL_GAP_Y = 100;
const BOX_HEIGHT = 44;
const BOX_RADIUS = 6;

/* ---------- DOM ---------- */

const svg = document.getElementById("mindmap");
const breadcrumbEl = document.getElementById("breadcrumb");
const contextEl = document.getElementById("context");

/* ---------- STATE ---------- */

let TREE_INDEX = {};
let ACTIVE_NODE = null;

/* ---------- VIEWPORT STATE ---------- */

let viewBox = { x: 0, y: 0, w: 1200, h: 800 };
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
      renderAll();
    });

  initZoomPan();
});

/* ---------- TREE INDEX ---------- */

function buildIndex(node, parentId) {
  TREE_INDEX[node.id] = {
    id: node.id,
    label: node.title,
    parent: parentId,
    raw: node
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
  const cx = 400;
  const cy = 400;

  const active = drawNode(ACTIVE_NODE, cx, cy, true, false);

  const children = (ACTIVE_NODE.raw.children || [])
    .map(c => TREE_INDEX[c.id]);

  children.forEach((child, i) => {
    const y = cy + (i - (children.length - 1) / 2) * LEVEL_GAP_Y;
    const childNode = drawNode(child, cx + LEVEL_GAP_X, y, false, true);
    drawCurve(active, childNode);
  });

  updateViewBox();
}

/* ---------- NODE ---------- */

function drawNode(node, x, y, isActive, leftAlign) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.style.cursor = "pointer";

  const CHAR_WIDTH = 7.2;
  const PADDING = 20;
  const textWidth = node.label.length * CHAR_WIDTH;
  const boxWidth = Math.min(Math.max(textWidth + PADDING * 2, 140), 320);

  const rect = document.createElementNS(svg.namespaceURI, "rect");
  rect.setAttribute("x", x - boxWidth / 2);
  rect.setAttribute("y", y - BOX_HEIGHT / 2);
  rect.setAttribute("width", boxWidth);
  rect.setAttribute("height", BOX_HEIGHT);
  rect.setAttribute("rx", BOX_RADIUS);
  rect.setAttribute("fill", "#ffffff");
  rect.setAttribute("stroke", isActive ? "#0f172a" : "#64748b");
  rect.setAttribute("stroke-width", isActive ? "2.5" : "1.5");

  const text = document.createElementNS(svg.namespaceURI, "text");
  text.setAttribute("y", y + 5);
  text.setAttribute("font-size", "13");
  text.setAttribute("fill", "#111827");
  text.style.pointerEvents = "none";

  if (leftAlign) {
    text.setAttribute("x", x);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dx", -boxWidth / 2 + 14);
  } else {
    text.setAttribute("x", x);
    text.setAttribute("text-anchor", "middle");
  }

  text.textContent = node.label;

  g.appendChild(rect);
  g.appendChild(text);

  g.addEventListener("click", () => {
    window.location.href = `topic.html?id=${node.id}`;
  });

  svg.appendChild(g);

  return { x, y, boxWidth };
}

/* ---------- CURVE ---------- */

function drawCurve(from, to) {
  const startX = from.x + from.boxWidth / 2;
  const endX = to.x - to.boxWidth / 2;
  const cX = (startX + endX) / 2;

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute(
    "d",
    `M ${startX} ${from.y}
     C ${cX} ${from.y}, ${cX} ${to.y}, ${endX} ${to.y}`
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c7d2fe");
  path.setAttribute("stroke-width", "1.4");

  svg.appendChild(path);
}

/* ---------- ZOOM & PAN ---------- */

function initZoomPan() {
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    viewBox.w *= scale;
    viewBox.h *= scale;
    updateViewBox();
  });

  svg.addEventListener("mousedown", e => {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
  });

  svg.addEventListener("mousemove", e => {
    if (!isPanning) return;
    const dx = (panStart.x - e.clientX) * (viewBox.w / svg.clientWidth);
    const dy = (panStart.y - e.clientY) * (viewBox.h / svg.clientHeight);
    viewBox.x += dx;
    viewBox.y += dy;
    panStart = { x: e.clientX, y: e.clientY };
    updateViewBox();
  });

  svg.addEventListener("mouseup", () => isPanning = false);
  svg.addEventListener("mouseleave", () => isPanning = false);
}

function updateViewBox() {
  svg.setAttribute(
    "viewBox",
    `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
  );
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
        ? `<strong>${n.label}</strong>`
        : `<a href="topic.html?id=${n.id}">${n.label}</a>`
    )
    .join(" › ");
}

function renderContext() {
  const c = ACTIVE_NODE.raw.context || {};
  contextEl.innerHTML = `
    <h3>${ACTIVE_NODE.label}</h3>
    <p>${c.definition || ""}</p>
  `;
}
