/****************************************************
 * topic-map.js
 * ----------------------------------
 * Clean, stable implementation
 * - Nested JSON
 * - Rectangular nodes
 * - Curved links to box edges
 * - Auto-sized boxes
 ****************************************************/

/* ---------- CONFIG ---------- */

const DATA_PATH = "data/tree-textile.json";
const LEVEL_GAP_X = 260;
const LEVEL_GAP_Y = 100;
const BOX_HEIGHT = 44;
const BOX_RADIUS = 6;
const TOOLTIP_DELAY = 200;

/* ---------- DOM ---------- */

const svg = document.getElementById("mindmap");
const breadcrumbEl = document.getElementById("breadcrumb");
const contextEl = document.getElementById("context");
const tooltipEl = document.getElementById("tooltip");

/* ---------- STATE ---------- */

let TREE_INDEX = {};
let ACTIVE_NODE = null;
let tooltipTimer = null;

/* ---------- INIT ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const topicId = new URLSearchParams(window.location.search).get("id");

  if (!topicId) {
    contextEl.innerHTML = "<p>No topic selected.</p>";
    return;
  }

  fetch(DATA_PATH)
    .then(res => {
      if (!res.ok) throw new Error(`Tree load failed (${res.status})`);
      return res.json();
    })
    .then(root => {
      buildIndex(root, null);
      ACTIVE_NODE = TREE_INDEX[topicId];

      if (!ACTIVE_NODE) {
        contextEl.innerHTML = "<p>Topic not found.</p>";
        return;
      }

      renderAll();
    })
    .catch(err => {
      console.error(err);
      contextEl.innerHTML = "<p>Error loading tree.</p>";
    });
});

/* ---------- TREE INDEX ---------- */

function buildIndex(node, parentId) {
  TREE_INDEX[node.id] = {
    id: node.id,
    label: node.title,
    parent: parentId,
    raw: node
  };

  if (Array.isArray(node.children)) {
    node.children.forEach(child => buildIndex(child, node.id));
  }
}

/* ---------- RENDER PIPELINE ---------- */

function renderAll() {
  clearSVG();
  renderBreadcrumb();
  renderContext();
  renderMap();
}

/* ---------- MAP ---------- */

function renderMap() {
  const cx = 600;
  const cy = 400;

  const parent = ACTIVE_NODE.parent
    ? TREE_INDEX[ACTIVE_NODE.parent]
    : null;

  const children = Array.isArray(ACTIVE_NODE.raw.children)
    ? ACTIVE_NODE.raw.children.map(c => TREE_INDEX[c.id])
    : [];

  // Parent
  let parentRender = null;
  if (parent) {
    parentRender = drawNode(parent, cx - LEVEL_GAP_X, cy, false);
    drawCurve(
      parentRender,
      { x: cx, y: cy, boxWidth: ACTIVE_NODE.boxWidth }
    );
  }

  // Active
  const activeRender = drawNode(ACTIVE_NODE, cx, cy, true);

  // Children
  children.forEach((child, i) => {
    const y =
      cy + (i - (children.length - 1) / 2) * LEVEL_GAP_Y;

    const childRender = drawNode(
      child,
      cx + LEVEL_GAP_X,
      y,
      false
    );

    drawCurve(activeRender, childRender);
  });

  svg.setAttribute("viewBox", "0 0 1200 800");
}

/* ---------- NODES ---------- */

function drawNode(node, x, y, isActive) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.style.cursor = "pointer";

  const CHAR_WIDTH = 7.2;
  const PADDING_X = 20;

  const textWidth = node.label.length * CHAR_WIDTH;
  const boxWidth = Math.min(
    Math.max(textWidth + PADDING_X * 2, 140),
    300
  );

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", x - boxWidth / 2);
  rect.setAttribute("y", y - BOX_HEIGHT / 2);
  rect.setAttribute("width", boxWidth);
  rect.setAttribute("height", BOX_HEIGHT);
  rect.setAttribute("rx", BOX_RADIUS);
  rect.setAttribute("ry", BOX_RADIUS);
  rect.setAttribute("fill", "#ffffff");
  rect.setAttribute(
    "stroke",
    isActive ? "#0f172a" : "#64748b"
  );
  rect.setAttribute("stroke-width", isActive ? "2.5" : "1.5");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", x);
  text.setAttribute("y", y + 5);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "13");
  text.setAttribute("fill", "#111827");
  text.textContent = node.label;

  g.appendChild(rect);
  g.appendChild(text);

  g.addEventListener("click", () => {
    window.location.href = `topic.html?id=${node.id}`;
  });

  g.addEventListener("mouseenter", e => {
    tooltipTimer = setTimeout(() => {
      tooltipEl.style.display = "block";
      tooltipEl.style.left = e.clientX + 12 + "px";
      tooltipEl.style.top = e.clientY + 12 + "px";
      tooltipEl.innerHTML = `<strong>${node.label}</strong>`;
    }, TOOLTIP_DELAY);

    if (!isActive) rect.setAttribute("stroke", "#1e40af");
  });

  g.addEventListener("mouseleave", () => {
    clearTimeout(tooltipTimer);
    tooltipEl.style.display = "none";
    rect.setAttribute(
      "stroke",
      isActive ? "#0f172a" : "#64748b"
    );
  });

  svg.appendChild(g);

  return { x, y, boxWidth };
}

/* ---------- CURVED LINKS ---------- */

function drawCurve(from, to) {
  const startX = from.x + from.boxWidth / 2;
  const endX = to.x - to.boxWidth / 2;
  const controlX = (startX + endX) / 2;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    `M ${startX} ${from.y}
     Q ${controlX} ${from.y}, ${endX} ${to.y}`
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c7d2fe");
  path.setAttribute("stroke-width", "1.4");

  svg.appendChild(path);
}

/* ---------- UTIL ---------- */

function clearSVG() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

/* ---------- BREADCRUMB ---------- */

function renderBreadcrumb() {
  const path = [];
  let current = ACTIVE_NODE;

  while (current) {
    path.unshift(current);
    current = current.parent ? TREE_INDEX[current.parent] : null;
  }

  breadcrumbEl.innerHTML = path
    .map((n, i) =>
      i === path.length - 1
        ? `<strong>${n.label}</strong>`
        : `<a href="topic.html?id=${n.id}">${n.label}</a>`
    )
    .join(" &gt; ");
}

/* ---------- CONTEXT ---------- */

function renderContext() {
  const ctx = ACTIVE_NODE.raw.context || {};

  contextEl.innerHTML = `
    <h3>${ACTIVE_NODE.label}</h3>
    <p><strong>Definition</strong></p>
    <p>${ctx.definition || "No definition available."}</p>
    ${
      ctx.role
        ? `<p><strong>Role</strong></p><p>${ctx.role}</p>`
        : ""
    }
    ${
      Array.isArray(ctx.references)
        ? `<p><strong>References</strong></p>
           <ul>
             ${ctx.references
               .map(r => `<li><a href="${r.url}" target="_blank">${r.title}</a></li>`)
               .join("")}
           </ul>`
        : ""
    }
  `;
}
