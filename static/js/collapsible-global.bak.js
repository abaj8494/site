document.addEventListener("DOMContentLoaded", function () {
  const storageKey = "toggleStates";

  // Retrieve stored toggle states (or initialize to an empty object)
  let toggleStates = JSON.parse(localStorage.getItem(storageKey)) || {};

  // Select all headings globally (e.g., h1 to h6)
  const headings = document.querySelectorAll("h2, h3, h4, h5, h6");

  headings.forEach((heading, index) => {
    // Skip if heading is already wrapped
    if (heading.closest(".collapsible-wrapper")) return;

    // Create a wrapper for the heading and button
    const wrapper = document.createElement("div");
    wrapper.classList.add("collapsible-wrapper");

    // Create a toggle button
    const button = document.createElement("button");
    button.classList.add("toggle-button");

    // Generate a unique ID for the heading using page context and index
    const toggleId = `${window.location.pathname}-toggle-${index}`;
    heading.setAttribute("data-toggle-id", toggleId);

    // Determine initial state from localStorage or default to `folded`
    const isFolded = toggleStates[toggleId] === undefined ? folded === "true" : toggleStates[toggleId] === false;

    // Set initial button state
    button.setAttribute("aria-expanded", !isFolded);
    button.textContent = isFolded ? "▶" : "▼";

    // Wrap the heading and insert the button
    heading.parentNode.insertBefore(wrapper, heading);
    wrapper.appendChild(button);
    wrapper.appendChild(heading);

    // Collect all sibling elements below the heading until the next heading
    const content = document.createElement("div");
    content.classList.add("collapsible-content");
    if (!isFolded) {
      content.classList.add("show"); // Start as visible
    }

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

      // Save state to localStorage
      toggleStates[toggleId] = !isExpanded;
      localStorage.setItem(storageKey, JSON.stringify(toggleStates));
    });
  });
});
