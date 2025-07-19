document.addEventListener("DOMContentLoaded", function () {
  const containers = document.querySelectorAll(".collapsible-container");

  // Get the collapse level if specified (default is 0, which means no level-based collapse)
  const collapseLvl = window.collapseLvl || 0;

  containers.forEach((container, index) => {
    // Skip if this container has already been processed or is inside another collapsible content
    if (container.closest(".collapsible-content")) {
      return;
    }

    // Find the current heading level this shortcode is under
    let currentElement = container;
    let targetHeading = null;

    // Traverse backwards to find the most recent heading
    while (currentElement) {
      // Check previous siblings
      let sibling = currentElement.previousElementSibling;
      while (sibling) {
        if (sibling.tagName && /^H[1-6]$/.test(sibling.tagName)) {
          targetHeading = sibling;
          break;
        }
        sibling = sibling.previousElementSibling;
      }

      if (targetHeading) break;

      // If no heading found in siblings, go up to parent and continue searching
      currentElement = currentElement.parentElement;
    }

    if (!targetHeading) {
      return; // No heading found to make collapsible
    }

    // Skip if heading already has a collapsible wrapper
    if (targetHeading.closest(".collapsible-wrapper")) {
      return;
    }

    // Get the heading level (2 for h2, 3 for h3, etc.)
    const headingLevel = parseInt(targetHeading.tagName.substring(1));

    // Create a wrapper for the heading and button
    const wrapper = document.createElement("div");
    wrapper.classList.add("collapsible-wrapper");

    // Create a toggle button
    const button = document.createElement("button");
    button.classList.add("toggle-button");

    // Generate a unique ID for the toggle
    const toggleId = `${window.location.pathname}-toggle-${index}`;
    const toggleStates = JSON.parse(localStorage.getItem("toggleStates")) || {};

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

    // Wrap the heading
    targetHeading.parentNode.insertBefore(wrapper, targetHeading);
    wrapper.appendChild(button);
    wrapper.appendChild(targetHeading);

    // Create collapsible content container
    const content = document.createElement("div");
    content.classList.add("collapsible-content");
    if (!isFolded) {
      content.classList.add("show");
    }

    // Collect all elements after the wrapped heading until the next same-or-higher level heading
    let sibling = wrapper.nextElementSibling;
    const elementsToMove = [];

    while (sibling) {
      const nextSibling = sibling.nextElementSibling;

      // Stop if we hit another heading at the same or higher level
      if (sibling.tagName && /^H[1-6]$/.test(sibling.tagName)) {
        const siblingLevel = parseInt(sibling.tagName.substring(1));
        if (siblingLevel <= headingLevel) {
          break;
        }
        // Continue collecting if it's a lower level heading (sub-heading)
      }

      // Skip if this element contains the wrapper (safety check)
      if (sibling.contains && sibling.contains(wrapper)) {
        sibling = nextSibling;
        continue;
      }

      // Skip empty script/style elements (Hugo artifacts)
      if (
        sibling.tagName &&
        (sibling.tagName.toLowerCase() === "script" ||
          sibling.tagName.toLowerCase() === "style") &&
        (!sibling.textContent || sibling.textContent.trim() === "")
      ) {
        sibling = nextSibling;
        continue;
      }

      // Skip empty text nodes
      if (sibling.nodeType === 3 && sibling.textContent.trim() === "") {
        sibling = nextSibling;
        continue;
      }

      // Skip truly empty paragraphs
      if (
        sibling.tagName &&
        sibling.tagName.toLowerCase() === "p" &&
        (!sibling.textContent || sibling.textContent.trim() === "") &&
        sibling.children.length === 0
      ) {
        sibling = nextSibling;
        continue;
      }

      // Collect this element
      elementsToMove.push(sibling);
      sibling = nextSibling;
    }

    // Move all collected elements into the collapsible content
    elementsToMove.forEach((element) => {
      content.appendChild(element);
    });

    // Insert the collapsible content after the wrapper
    try {
      wrapper.after(content);
    } catch {
      // Fallback insertion methods
      try {
        wrapper.parentNode.insertBefore(content, wrapper.nextSibling);
      } catch {
        wrapper.parentNode.appendChild(content);
      }
    }

    // Add click event to the toggle button
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", !isExpanded);
      button.textContent = isExpanded ? "▶" : "▼";
      content.classList.toggle("show");

      // Save state to localStorage
      toggleStates[toggleId] = !isExpanded;
      localStorage.setItem("toggleStates", JSON.stringify(toggleStates));
    });
  });
});
