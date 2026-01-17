/****************************************************
 * topic-map.js
 * ----------------------------------
 * Responsibilities:
 * - Read topic ID from URL
 * - Load tree JSON
 * - Render SVG mind map (parent + node + children)
 * - Center and highlight active node
 * - Populate breadcrumb
 * - Populate context panel
 * - Handle tooltip
 ****************************************************/

/* ---------- CONFIG ---------- */

const DATA_PATH = "assets/data/tree-textile.json"; // adjust later per domain
const SVG_PADDING = 60;
const NODE_RADIUS = 18;
const LEVEL_GAP_X = 220;
const LEVEL_GAP_Y = 80;

/* ---------- DOM REFERENCES ---------- */

const svg = document.getElementById("mindmap");
const breadcrumbEl = document.getElementById("breadcrumb");
const contextEl = document.getElementById("context");
const tooltipEl = document.getElementById("tooltip");

/* ---------- STATE ---------- */

let TREE_INDEX = {};      // id -> node
let ACTIVE_NODE = null;

/* ---------- INIT ---------- */

document.addEventListener("DOMContentLoaded", init);

function init() {
  const topicId = getTopicIdFromURL();
  if (!topicId) {
    contextEl.innerHTML = "<p>No topic selected.</p>";
    return;
  }

  loadTree(DATA_PATH).then(() => {
    ACTIVE_NODE = TREE_INDEX[topicId];
    if (!ACTIVE_NODE) {
      contextEl.innerHTML = "<p>Topic not found.</p>";
      return;
    }

    render();
  });
}

/* ---------- DATA LOADING ---------- */

function loadTree(path) {
  return fetch(path)
    .then(res => res.json())
    .then(data => {
      data.forEach(node => {
        TREE_INDEX[node.id] = node;
      });
    });
}

/* ---------- URL ---------- */

function getTopicIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/* ---------- RENDER ---------- */

function render() {
  clearSVG();
  renderBreadcrumb(ACTIVE_NODE);
  renderContext(ACTIVE_NODE);
  renderMap(ACTIVE_NODE);
}

/* ---------- SVG MAP ---------- */

function renderMap(node) {
  const parent = TREE_INDEX[node.parent];
  const children = (node.children || []).map(id => TREE_INDEX[id]);

  const centerX = 600;
  const centerY = 400;

  // Parent
  if (parent) {
    drawNode(parent, centerX - LEVEL_GAP_X, centerY, false);
    drawLink(centerX - LEVEL_GAP_X, centerY, centerX, centerY);
  }

  // Active node
  drawNode(node, centerX, centerY, true);

  // Children
  children.forEach((child, index) => {
    const offsetY =
      centerY +
      (index - (children.length - 1) / 2) * LEVEL_GAP_Y;

    drawNode(child, centerX + LEVEL_GAP_X, offsetY, false);
    drawLink(centerX, centerY, centerX + LEVEL_GAP_X, offsetY);
  });

  centerSVG(centerX, centerY);
}

/* ---------- SVG PRIMITIVES ---------- */

function drawNode(node, x, y, isActive) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
  circle.setAttribute("r", NODE_RADIUS);
  circle.setAttribute("fill", "#ffffff");
  circle.setAttribute("stroke", isActive ? "#1f2937" : "#6b7280");
  circle.setAttribute("stroke-width", isActive ? "3" : "1.5");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", x);
  text.setAttribute("y", y + NODE_RADIUS + 14);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "13");
  text.setAttribute("fill", "#111827");
  text.textContent = node.label;

  group.appendChild(circle);
  group.appendChild(text);

  group.addEventListener("click", () => {
    window.location.href = `topic.html?id=${node.id}`;
  });

  group.addEventListener("mouseenter", e => {
    showTooltip(node, e.clientX, e.clientY);
  });

  group.addEventListener("mouseleave", hideTooltip);

  svg.appendChild(group);
}

function drawLink(x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", "#9ca3af");
  line.setAttribute("stroke-width", "1");
  svg.appendChild(line);
}

/* ---------- VIEWPORT ---------- */

function centerSVG(cx, cy) {
  const width = svg.clientWidth;
  const height = svg.clientHeight;

  const viewX = cx - width / 2;
  const viewY = cy - height / 2;

  svg.setAttribute(
    "viewBox",
    `${viewX} ${viewY} ${width} ${height}`
  );
}

function clearSVG() {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

/* ---------- BREADCRUMB ---------- */

function renderBreadcrumb(node) {
  const path = [];
  let current = node;

  while (current) {
    path.unshift(current);
    current = TREE_INDEX[current.parent];
  }

  breadcrumbEl.innerHTML = path
    .map((n, i) => {
      if (i === path.length - 1) {
        return `<strong>${n.label}</strong>`;
      }
      return `<a href="topic.html?id=${n.id}">${n.label}</a>`;
    })
    .join(" &gt; ");
}

/* ---------- CONTEXT PANEL ---------- */

function renderContext(node) {
  contextEl.innerHTML = `
    <h3>${node.label}</h3>

    <p><strong>Definition</strong><br>
    ${node.definition || "No definition available."}</p>

    <p><strong>Summary</strong></p>
    <ul>
      ${(node.summary || []).map(s => `<li>${s}</li>`).join("")}
    </ul>

    <p><strong>Relations</strong></p>
    <ul>
      ${node.parent ? `<li>Parent: ${TREE_INDEX[node.parent].label}</li>` : ""}
      <li>Children: ${(node.children || []).length}</li>
    </ul>
  `;
}

/* ---------- TOOLTIP ---------- */

function showTooltip(node, x, y) {
  tooltipEl.style.display = "block";
  tooltipEl.style.left = x + 12 + "px";
  tooltipEl.style.top = y + 12 + "px";

  tooltipEl.innerHTML = `
    <strong>${node.label}</strong><br>
    ${node.definition || ""}
  `;
}

function hideTooltip() {
  tooltipEl.style.display = "none";
}
