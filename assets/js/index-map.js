console.log("index-map.js loaded");

const svg = document.getElementById("mindmap");
const NS = "http://www.w3.org/2000/svg";

// Main SVG group (for zoom / pan)
const g = document.createElementNS(NS, "g");
svg.appendChild(g);

/* =========================
   SIZE HELPERS
========================= */

function getSize() {
  const rect = svg.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height
  };
}

/* =========================
   LOAD DATA
========================= */

let SEARCH_INDEX = [];

fetch("data/tree-textile.json")
  .then(res => res.json())
  .then(tree => {
    const root = tree;
    buildSearchIndex(root);
    init(root);
  })
  .catch(err => console.error("Failed to load tree:", err));

/* =========================
   INITIAL DRAW
========================= */

function init(tree) {
  g.innerHTML = ""; // clear SVG

  const { width: WIDTH, height: HEIGHT } = getSize();

  const CENTER_X = WIDTH * 0.25;
  const CENTER_Y = HEIGHT / 2;
  const RIGHT_X  = WIDTH * 0.75;
  const GAP_Y    = 80;

  const root = tree.children ? tree : tree[0];

  // Draw center node
  drawNode(CENTER_X, CENTER_Y, root.title, null);

  if (!root.children || !root.children.length) return;

  const startY = CENTER_Y - ((root.children.length - 1) * GAP_Y) / 2;

  root.children.forEach((child, i) => {
    const y = startY + i * GAP_Y;

    drawConnection(
      CENTER_X + 60,
      CENTER_Y,
      RIGHT_X - 60,
      y
    );

    drawNode(
      RIGHT_X,
      y,
      child.title,
      () => {
        window.location.href = `topic.html?id=${child.id}`;
      }
    );
  });

  autoFit();
}

/* =========================
   DRAW NODE
========================= */

function drawNode(x, y, text, onClick) {
  const group = document.createElementNS(NS, "g");

  const rect = document.createElementNS(NS, "rect");
  rect.setAttribute("x", x - 60);
  rect.setAttribute("y", y - 22);
  rect.setAttribute("width", 120);
  rect.setAttribute("height", 44);
  rect.setAttribute("rx", 10);
  rect.setAttribute("fill", "#eef6ff");
  rect.setAttribute("stroke", "#2563eb");
  rect.setAttribute("stroke-width", 3);

  const label = document.createElementNS(NS, "text");
  label.setAttribute("x", x);
  label.setAttribute("y", y + 6);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-size", "15");
  label.setAttribute("font-family", "Arial");
  label.textContent = text;

  group.appendChild(rect);
  group.appendChild(label);

  if (onClick) {
    group.style.cursor = "pointer";
    group.addEventListener("click", onClick);
  }

  g.appendChild(group);
}

/* =========================
   DRAW CONNECTION
========================= */

function drawConnection(x1, y1, x2, y2) {
  const path = document.createElementNS(NS, "path");

  const d = `
    M ${x1} ${y1}
    C ${x1 + 80} ${y1},
      ${x2 - 80} ${y2},
      ${x2} ${y2}
  `;

  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#9ca3af");   // gray
  path.setAttribute("stroke-width", 2);
  path.setAttribute("stroke-linecap", "round");

  g.appendChild(path);
}

/* =========================
   ZOOM & PAN
========================= */

enableZoomPan(svg, g);

function enableZoomPan(svg, group) {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let sx = 0;
  let sy = 0;

  function update() {
    group.setAttribute(
      "transform",
      `translate(${tx}, ${ty}) scale(${scale})`
    );
  }

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    scale += e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.min(Math.max(scale, 0.4), 3);
    update();
  });

  svg.addEventListener("mousedown", e => {
    dragging = true;
    sx = e.clientX - tx;
    sy = e.clientY - ty;
    svg.style.cursor = "grabbing";
  });

  svg.addEventListener("mousemove", e => {
    if (!dragging) return;
    tx = e.clientX - sx;
    ty = e.clientY - sy;
    update();
  });

  svg.addEventListener("mouseup", stop);
  svg.addEventListener("mouseleave", stop);

  function stop() {
    dragging = false;
    svg.style.cursor = "default";
  }
}

/* =========================
   AUTO FIT
========================= */

function autoFit() {
  const bbox = g.getBBox();
  const rect = svg.getBoundingClientRect();

  const scale = Math.min(
    rect.width / bbox.width,
    rect.height / bbox.height
  ) * 0.9;

  const tx = (rect.width - bbox.width * scale) / 2 - bbox.x * scale;
  const ty = (rect.height - bbox.height * scale) / 2 - bbox.y * scale;

  g.setAttribute(
    "transform",
    `translate(${tx}, ${ty}) scale(${scale})`
  );
}

/* =========================
   SEARCH INDEX
========================= */

function buildSearchIndex(node, path = []) {
  const currentPath = [...path, node.title];

  SEARCH_INDEX.push({
    id: node.id,
    title: node.title,
    path: currentPath.join(" → ")
  });

  if (node.children) {
    node.children.forEach(child =>
      buildSearchIndex(child, currentPath)
    );
  }
}

/* =========================
   SEARCH UI
========================= */

const searchBox = document.getElementById("searchBox");
const searchResults = document.getElementById("searchResults");

searchBox.addEventListener("input", () => {
  const q = searchBox.value.toLowerCase().trim();
  searchResults.innerHTML = "";

  if (q.length < 2) return;

  SEARCH_INDEX
    .filter(item => item.title.toLowerCase().includes(q))
    .slice(0, 12)
    .forEach(item => {
      const div = document.createElement("div");
      div.className = "search-item";
      div.innerHTML = `
        <strong>${item.title}</strong><br>
        <small>${item.path}</small>
      `;
      div.onclick = () => {
        window.location.href = `topic.html?id=${item.id}`;
      };
      searchResults.appendChild(div);
    });
});
