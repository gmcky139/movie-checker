import { append, element } from "./dom";

export function createEmptyState(
  title: string,
  message: string,
  action?: { label: string; href: string },
  headingLevel: "h1" | "h2" = "h2",
): HTMLElement {
  const section = element("section", {
    className: "empty-state",
    attributes: { role: "status" },
  });
  const heading = element(headingLevel, { className: "empty-state__title", text: title });
  const description = element("p", { text: message });
  append(section, heading, description);
  if (action) {
    section.append(
      element("a", {
        className: "button button--primary",
        text: action.label,
        attributes: { href: action.href },
      }),
    );
  }
  return section;
}
