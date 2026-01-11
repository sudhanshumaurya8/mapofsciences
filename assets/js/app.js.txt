fetch("data/tree.json")
  .then(response => response.json())
  .then(data => renderNode(data));

function renderNode(node, parent = document.getElementById("tree")) {
  const div = document.createElement("div");
  div.textContent = node.title;
  div.className = "node";

  if (node.page) {
    div.classList.add("clickable");
    div.onclick = () => window.location.href = node.page;
  }

  parent.appendChild(div);

  if (node.children) {
    const container = document.createElement("div");
    container.className = "children";
    parent.appendChild(container);
    node.children.forEach(child => renderNode(child, container));
  }
}
