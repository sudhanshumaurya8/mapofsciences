const svg = document.getElementById("mindmap");
const NS = "http://www.w3.org/2000/svg";

// SVG group (needed for zoom/pan later)
const g = document.createElementNS(NS, "g");
svg.appendChild(g);

// Layout constants
const WIDTH = svg.clientWidth;
const HEIGHT = svg.clientHeight;

const CENTER_X = WIDTH * 0.25;
const CENTER_Y = HEIGHT / 2;

const RIGHT_X = WIDTH * 0.65;
const GAP_Y = 80;

// Read topic id from URL
const params = new URLSearchParams(window.location.search);
const topicId = params.get("id");

if (!topicId) {
  alert("No topic selected");
}

// Load full tree
fetch("data/tree.json")
  .then(res => res.json())
  .then(tree => {
    const node = findNodeById(tree, topicId);
    if (!node) {
      alert("Topic not found");
      return;
    }
    render(node);
  });

/* =========================
   RENDER LOGIC
========================= */

function render(node) {
  // Draw center node
  drawNode(CENTER_X, CENTER_Y, node.title, null);

  if (!node.children || node.children.length === 0) return;

  const startY = CENTER_Y - ((node.children.length - 1) * GAP_Y) / 2;

  node.children.forEach((child, i) => {
    const y = startY + i * GAP_Y;

    drawConnection(
      CENTER_X + 90,
      CENTER_Y,
      RIGHT_X,
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
}

/* =========================
   TREE SEARCH
========================= */

function findNodeById(node, id) {
  if (node.id === id) return node;

  if (!node.children) return null;

  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/* =========================
   SVG DRAWING
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
  path.setAttribute("stroke", "#2563eb");
  path.setAttribute("stroke-width", 3);

  g.appendChild(path);
}
