document.addEventListener("DOMContentLoaded", function () {
  // Select all headings globally (e.g., h1 to h6)
  const headings = document.querySelectorAll("h2, h3, h4, h5, h6");

  headings.forEach((heading) => {
    // Create a wrapper for the heading and button
    const wrapper = document.createElement("div");
    wrapper.classList.add("collapsible-wrapper");

    // Create a toggle button
    const button = document.createElement("button");
    button.classList.add("toggle-button");
    button.setAttribute("aria-expanded", "true"); // Default to expanded
    button.textContent = "▼"; // Default expanded triangle

    // Wrap the heading and insert the button
    heading.parentNode.insertBefore(wrapper, heading);
    wrapper.appendChild(button);
    wrapper.appendChild(heading);

    // Collect all sibling elements below the heading until the next heading
    const content = document.createElement("div");
    content.classList.add("collapsible-content", "show"); // Start as visible

    let sibling = wrapper.nextElementSibling;
    while (sibling && !["H2", "H3", "H4", "H5", "H6"].includes(sibling.tagName)) {
      const nextSibling = sibling.nextElementSibling; // Save reference before moving
      content.appendChild(sibling); // Move the sibling into the collapsible content
      sibling = nextSibling; // Move to the next sibling
    }

    // Insert the collapsible content container after the wrapper
    wrapper.after(content);

    // Add click event to the toggle button
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", !isExpanded);
      button.textContent = isExpanded ? "▶" : "▼"; // Toggle triangle direction
      content.classList.toggle("show");
    });
  });
});
