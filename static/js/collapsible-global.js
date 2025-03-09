document.addEventListener("DOMContentLoaded", function () {
  const storageKey = "toggleStates";

  // Retrieve stored toggle states (or initialize to an empty object)
  let toggleStates = JSON.parse(localStorage.getItem(storageKey)) || {};

  // Get the collapse level if specified (default is 0, which means no level-based collapse)
  const collapseLvl = window.collapseLvl || 0;

  // Select all headings globally (e.g., h1 to h6)
  const headings = document.querySelectorAll("h2, h3, h4, h5, h6");

  headings.forEach((heading, index) => {
    // Skip if heading is already wrapped
    if (heading.closest(".collapsible-wrapper")) return;

    // Get the heading level (2 for h2, 3 for h3, etc.)
    const headingLevel = parseInt(heading.tagName.substring(1));

    // Create a wrapper for the heading and button
    const wrapper = document.createElement("div");
    wrapper.classList.add("collapsible-wrapper");

    // Create a toggle button
    const button = document.createElement("button");
    button.classList.add("toggle-button");

    // Generate a unique ID for the heading using page context and index
    const toggleId = `${window.location.pathname}-toggle-${index}`;
    heading.setAttribute("data-toggle-id", toggleId);

    // Determine initial state based on:
    // 1. localStorage if it exists
    // 2. level-based collapse setting if specified
    // 3. default folded state
    let isFolded;
    if (toggleStates[toggleId] !== undefined) {
      // If we have a stored state, use it
      isFolded = toggleStates[toggleId] === false;
    } else if (collapseLvl > 0) {
      // If collapseLvl is specified, collapse all headings deeper than the specified level
      isFolded = headingLevel > collapseLvl;
    } else {
      // Otherwise use the default folded state
      isFolded = window.folded === "true";
    }

    // Set initial button state
    button.setAttribute("aria-expanded", !isFolded);
    button.textContent = isFolded ? "▶" : "▼";

    // Wrap the heading and insert the button
    heading.parentNode.insertBefore(wrapper, heading);
    wrapper.appendChild(button);
    wrapper.appendChild(heading);

    // Create the collapsible content container
    const content = document.createElement("div");
    content.classList.add("collapsible-content");
    if (!isFolded) {
      content.classList.add("show"); // Start as visible
    }

    // Collect all sibling elements below the wrapper until the next heading
    let sibling = wrapper.nextElementSibling;
    while (
      sibling &&
      !["H2", "H3", "H4", "H5", "H6"].includes(sibling.tagName)
    ) {
      const nextSibling = sibling.nextElementSibling; // Save reference before moving
      content.appendChild(sibling); // Move the sibling into the collapsible content
      sibling = nextSibling; // Move to the next sibling
    }

    // Additionally, check if this post has a .post-content element
    // that is not a sibling of the heading (e.g. a sibling of .post-header)
    const article = heading.closest("article.post");
    if (article) {
      const postContent = article.querySelector(".post-content");
      if (
        postContent &&
        !postContent.contains(wrapper) // ensures no loop
      ) {
        content.appendChild(postContent);
      }
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
