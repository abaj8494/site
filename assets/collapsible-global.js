document.addEventListener("DOMContentLoaded", function () {
  // Select all headings globally (e.g., h1 to h6)
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

  headings.forEach((heading) => {
    // Create a wrapper div
    const wrapper = document.createElement("div");
    wrapper.classList.add("collapsible-section");

    // Create a toggle button
    const button = document.createElement("button");
    button.classList.add("toggle-button");
    button.textContent = "➕";
    button.setAttribute("aria-expanded", "false");

    // Insert the button before the heading
    heading.parentNode.insertBefore(wrapper, heading);
    wrapper.appendChild(button);
    wrapper.appendChild(heading);

    // Create a collapsible content div and move the next siblings into it
    const content = document.createElement("div");
    content.classList.add("collapsible-content");

    let sibling = heading.nextElementSibling;
    while (sibling && !["H1", "H2", "H3", "H4", "H5", "H6"].includes(sibling.tagName)) {
      content.appendChild(sibling);
      sibling = heading.nextElementSibling; // Update after moving
    }

    wrapper.appendChild(content);

    // Add toggle functionality
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", !isExpanded);
      button.textContent = isExpanded ? "➕" : "➖";
      content.classList.toggle("show");
    });
  });
});
