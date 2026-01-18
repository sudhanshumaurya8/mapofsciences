/****************************************************
 * topic-map.js
 * ----------------------------------
 * Stable, corrected version
 * Works with nested JSON tree
 ****************************************************/

/* ---------- CONFIG ---------- */

const DATA_PATH = "data/tree-textile.json";
const NODE_RADIUS = 18;
const ACTIVE_NODE_RADIUS = 21;
const LEVEL_GAP_X = 220;
const LEVEL_GAP_Y = 96;
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
      if (!res.ok) {
        throw new Error(`Failed to load tree (${res.status})`);
      }
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

/* ---------- INDEX ---------- */

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

/* ---------- RENDER ---------- */

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

  if (parent) {
    drawNode(parent, cx - LEVEL_GAP_X, cy, false);
    drawLink(cx - LEVEL_GAP_X, cy, cx, cy);
  }

  drawNode(ACTIVE_NODE, cx, cy, true);

  children.forEach((child, i) => {
    const y = cy + (i - (children.length - 1) / 2) * LEVEL_GAP_Y;
    drawNode(child, cx + LEVEL_GAP_X, y, false);
    drawLink(cx, cy, cx + LEVEL_GAP_X, y);
  });

  svg.setAttribute("viewBox", "0 0 1200 800");
}

/* ---------- SVG ---------- */

function drawNode(node, x, y, isActive) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.style.cursor = "pointer";

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
  circle.setAttribute("r", isActive ? ACTIVE_NODE_RADIUS : NODE_RADIUS);
  circle.setAttribute("fill", "#ffffff");
  circle.setAttribute("stroke", isActive ? "#0f172a" : "#64748b");
  circle.setAttribute("stroke-width", isActive ? "3" : "1.5");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", x);
  text.setAttribute("y", y + NODE_RADIUS + 16);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "13");
  text.setAttribute("fill", "#111827");
  text.textContent = node.label;

  g.appendChild(circle);
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
  });

  g.addEventListener("mouseleave", () => {
    clearTimeout(tooltipTimer);
    tooltipEl.style.display = "none";
  });

  svg.appendChild(g);
}

function drawLink(x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", "#cbd5f5");
  line.setAttribute("stroke-width", "1");
  svg.appendChild(line);
}

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
