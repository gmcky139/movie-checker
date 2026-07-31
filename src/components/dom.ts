type ElementOptions = {
  className?: string;
  text?: string;
  attributes?: Record<string, string>;
};

export function element<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    node.setAttribute(name, value);
  }
  return node;
}

export function append(parent: Node, ...children: Array<Node | string>): void {
  for (const child of children) {
    parent.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
}
