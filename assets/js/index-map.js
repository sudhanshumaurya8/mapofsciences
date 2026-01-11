const svg = document.getElementById("mindmap");
const NS = "http://www.w3.org/2000/svg";

// SVG group (needed later for zoom/pan)
const g = document.createElementNS(NS, "g");
svg.appendChild(g);

// Layout constants
const WIDTH = svg.clientWidth;
const HEIGHT = svg.clientHeight;

const CENTER_X = WIDTH * 0.25;
const CENTER_Y = HEIGHT / 2;

const RIGHT_X = WIDTH * 0.65;
const GAP_Y = 80;

// Load JSON
fetch("data/tree.json")
  .then(res => res.json())
  .then(tree => init(tree));

function init(tree) {
  const root = tree; // root = Map of Science

  // Draw center node
  drawNode(CENTER_X, CENTER_Y, root.title, null);

  if (!root.children) return;

  const startY = CENTER_Y - ((root.children.length - 1) * GAP_Y) / 2;

  // Draw ONLY level-1 branches
  root.children.forEach((child, i) => {
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
   DRAWING FUNCTIONS
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
