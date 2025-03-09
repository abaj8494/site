document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded and parsed. Starting script...");

  const containers = document.querySelectorAll(".collapsible-container");
  console.log(`Found ${containers.length} collapsible containers.`);

  // Get the collapse level if specified (default is 0, which means no level-based collapse)
  const collapseLvl = window.collapseLvl || 0;
  console.log(`Collapse level set to: ${collapseLvl}`);

  containers.forEach((container, index) => {
    console.log(`Processing container #${index + 1}...`);

    // Traverse upwards to find the parent wrapper containing the heading
    let parent = container.parentElement; // Start with the direct parent
    while (parent && !parent.querySelector("h2, h3, h4, h5, h6")) {
      parent = parent.parentElement; // Move up to the next parent
    }

    if (!parent) {
      console.warn(
        `No valid heading found for container #${index + 1}. Skipping...`,
      );
      return;
    }

    // Find the first valid heading inside the parent
    const heading = parent.querySelector("h2, h3, h4, h5, h6");
    if (!heading) {
      console.warn(
        `No valid heading (H2-H6) found inside parent for container #${index + 1}. Skipping...`,
      );
      return;
    }

    console.log(
      `Heading found for container #${index + 1}:`,
      heading.outerHTML,
    );

    // Get the heading level (2 for h2, 3 for h3, etc.)
    const headingLevel = parseInt(heading.tagName.substring(1));
    console.log(`Heading level: ${headingLevel}`);

    // Create a wrapper for the heading and button
    const wrapper = document.createElement("div");
    wrapper.classList.add("collapsible-wrapper");
    console.log("Created collapsible-wrapper div.");

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

    console.log(
      `Toggle ID for container #${index + 1}: ${toggleId}, Folded: ${isFolded}`,
    );

    // Set initial button state
    button.setAttribute("aria-expanded", !isFolded);
    button.textContent = isFolded ? "▶" : "▼";
    console.log("Toggle button created with initial state:", button.outerHTML);

    // Insert the wrapper before the heading and move the heading inside the wrapper
    heading.parentNode.insertBefore(wrapper, heading); // Insert wrapper before the heading
    wrapper.appendChild(button);
    wrapper.appendChild(heading);
    console.log(
      "Heading and toggle button added to collapsible-wrapper:",
      wrapper.outerHTML,
    );

    // Collect all sibling elements below the container until the next heading
    const content = document.createElement("div");
    content.classList.add("collapsible-content");
    if (!isFolded) {
      content.classList.add("show");
    }

    console.log("Collapsible content container created:", content.outerHTML);

    let sibling = container.nextElementSibling;
    while (sibling && !/^H[2-6]$/.test(sibling.tagName)) {
      const nextSibling = sibling.nextElementSibling;
      content.appendChild(sibling);
      sibling = nextSibling;
    }

    console.log(
      `Content added to collapsible-content for container #${index + 1}:`,
      content.outerHTML,
    );

    // Insert the collapsible content container after the wrapper
    wrapper.after(content);
    console.log(
      "Collapsible content added after the wrapper:",
      wrapper.outerHTML,
    );

    // Add click event to the toggle button
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", !isExpanded);
      button.textContent = isExpanded ? "▶" : "▼";
      content.classList.toggle("show");

      // Save state to localStorage
      toggleStates[toggleId] = !isExpanded;
      localStorage.setItem("toggleStates", JSON.stringify(toggleStates));
      console.log(`Toggle button clicked. Expanded: ${!isExpanded}`);
    });

    console.log(`Finished processing container #${index + 1}.`);
  });

  console.log("Script execution completed.");
});
