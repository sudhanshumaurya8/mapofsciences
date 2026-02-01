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
  const cy = 450;

  const LEFT_X = 400;
  const CHILD_OFFSET = 320;

  const children = ACTIVE_NODE.children || [];

  const active = measureNode(ACTIVE_NODE, LEFT_X, cy);

  /* ---------- CHILDREN ---------- */
  const childNodes = children.map((c, i) => {
    const y = cy + (i - (children.length - 1) / 2) * 70;
    return measureNode(c, LEFT_X + CHILD_OFFSET, y);
  });

  /* ---------- CURVES ---------- */
  childNodes.forEach(c => drawCurve(active, c, 1));

  /* ---------- NODES ---------- */
  drawNode(active, true);
  childNodes.forEach(c => drawNode(c, false));

  updateViewBox();
}

/* ---------- HOVER GRANDCHILDREN ---------- */
function showGrandchildren(childNode) {
  clearTransient();

  const grandchildren = childNode.children || [];
  if (!grandchildren.length) return;

  const START_X = childNode.x + 320;
  const SPACING = 34;

  grandchildren.forEach((gc, i) => {
    const y =
      childNode.y +
      (i - (grandchildren.length - 1) / 2) * SPACING;

    const gcNode = measureNode(gc, START_X, y, "grandchild");

    drawCurve(childNode, gcNode, 2);
    drawNode(gcNode, false, true);
  });
}

function clearTransient() {
  [...svg.querySelectorAll(".grandchild, .gc-curve")].forEach(el =>
    el.remove()
  );
}

/* ---------- NODE MEASURE ---------- */
function measureNode(node, x, y, level = "normal") {
  const base =
    level === "grandchild"
      ? node.title.length * 6 + 36
      : node.title.length * 7.2 + 48;

  const width = Math.min(
    Math.max(base, level === "grandchild" ? 120 : 160),
    360
  );

  return { ...node, x, y, width, _level: level };
}

/* ---------- NODE DRAW ---------- */
function drawNode(n, isActive, isGrandchild = false) {
  const g = document.createElementNS(svg.namespaceURI, "g");
  g.style.cursor = "pointer";

  if (isGrandchild) g.classList.add("grandchild");

  const rect = document.createElementNS(svg.namespaceURI, "rect");
  rect.setAttribute("x", n.x);

  const height = n._level === "grandchild" ? 30 : 44;
  rect.setAttribute("y", n.y - height / 2);
  rect.setAttribute("height", height);
  rect.setAttribute("width", n.width);
  rect.setAttribute("rx", 6);
  rect.setAttribute("fill", "#fff");
  rect.setAttribute("stroke", isActive ? "#0f172a" : "#64748b");
  rect.setAttribute("stroke-width", isActive ? "2.5" : "1.4");

  const text = document.createElementNS(svg.namespaceURI, "text");
  text.setAttribute("y", n.y + 5);
  text.setAttribute(
    "font-size",
    n._level === "grandchild" ? "11" : "13"
  );
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

  const tooltipWidth = tooltipEl.offsetWidth || 260;

  // children → left side, others → right side
  const xOffset = !isActive && !isGrandchild
    ? e.clientX - tooltipWidth - 16
    : e.clientX + 12;

  tooltipEl.style.left = xOffset + "px";
  tooltipEl.style.top = e.clientY + 12 + "px";
});

  g.addEventListener("mouseleave", () => {
    tooltipEl.style.display = "none";
  });

  if (!isActive && !isGrandchild) {
    g.addEventListener("mouseenter", () => {
      showGrandchildren(n);
    });

    g.addEventListener("mouseleave", () => {
      clearTransient();
    });
  }

  svg.appendChild(g);
}

/* ---------- CURVES ---------- */
function drawCurve(from, to, depth = 1) {
  const startX = from.x + from.width;
  const endX = to.x;

  const curveOffset =
    depth === 1 ? 40 :
    depth === 2 ? 10 :
    40;

  const path = document.createElementNS(svg.namespaceURI, "path");

  path.setAttribute(
    "d",
    `
      M ${startX} ${from.y}
      C ${startX + curveOffset} ${from.y},
        ${endX - curveOffset} ${to.y},
        ${endX} ${to.y}
    `
  );

  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c7d2fe");
  path.setAttribute("stroke-width", "1.4");

  if (depth === 2) path.classList.add("gc-curve");

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

  let html = `<h3>${ACTIVE_NODE.title}</h3>`;

  if (ctx.definition) {
    html += `<p><strong>Definition</strong></p><p>${ctx.definition}</p>`;
  }

  if (ctx.role) {
    html += `<p><strong>Role</strong></p><p>${ctx.role}</p>`;
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

 if (Array.isArray(ctx.books) && ctx.books.length > 0) {
  html += `
    <p><strong>Books</strong></p>
    <ul>
      ${ctx.books
        .map(
          b =>
            `<li>
               <em>${b.title}</em><br>
               ${b.author}${b.publisher ? `, ${b.publisher}` : ""}
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
