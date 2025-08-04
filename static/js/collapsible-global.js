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

    // Handle initial margin notes state
    if (isFolded) {
      toggleMarginNotesInSection(content, false); // false means section is collapsed
    }

    // Add click event to the toggle button
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", !isExpanded);
      button.textContent = isExpanded ? "▶" : "▼"; // Toggle triangle direction
      content.classList.toggle("show");

      // Toggle margin notes within this collapsible section
      toggleMarginNotesInSection(content, !isExpanded);

      // Save state to localStorage
      toggleStates[toggleId] = !isExpanded;
      localStorage.setItem(storageKey, JSON.stringify(toggleStates));
    });
  });

  /**
   * Toggle margin notes within a collapsible section using the same mechanism as Ctrl-M
   * @param {Element} content - The collapsible content container
   * @param {boolean} isExpanded - Whether the section is currently expanded (true) or collapsed (false)
   */
  function toggleMarginNotesInSection(content, isExpanded) {
    // Wait for margin notes system to be initialized if needed
    const executeToggle = () => {
      // Find all margin-note elements within this collapsible content
      const marginNotesInSection = content.querySelectorAll(".margin-note");
      const marginNotesContainer = document.getElementById(
        "margin-notes-container",
      );

      if (!marginNotesContainer) return;

      marginNotesInSection.forEach((marginNote) => {
        // Find the corresponding margin note item in the sidebar
        const noteId = marginNote.getAttribute("id");
        if (!noteId) return;

        // Find margin note items that correspond to this note
        const marginNoteItems =
          marginNotesContainer.querySelectorAll(".margin-note-item");

        marginNoteItems.forEach((item) => {
          const dataFor = item.getAttribute("data-for");
          if (dataFor === noteId) {
            if (!isExpanded) {
              // Section is collapsed - disable the margin note (same as Ctrl-M)
              item.style.display = "none";
              item.setAttribute("data-collapsed-parent", "true");

              // Turn the in-text indicator red (same styling as global toggle)
              marginNote.classList.add("disabled");
              marginNote.style.borderBottomColor = "#ff6b6b";
              marginNote.style.color = "#ff6b6b";
              marginNote.style.backgroundColor = "rgba(255, 107, 107, 0.1)";

              const indicator = marginNote.querySelector(
                ".margin-note-indicator",
              );
              if (indicator) {
                indicator.style.color = "#ff6b6b";
              }
            } else {
              // Section is expanded - check if it's still in another collapsed section
              if (!isMarginNoteInCollapsedSection(marginNote)) {
                // Re-enable the margin note (restore original styling)
                item.style.display = "";
                item.removeAttribute("data-collapsed-parent");

                marginNote.classList.remove("disabled");
                marginNote.style.borderBottomColor = "";
                marginNote.style.color = "";
                marginNote.style.backgroundColor = "";

                const indicator = marginNote.querySelector(
                  ".margin-note-indicator",
                );
                if (indicator) {
                  indicator.style.color = "";
                }

                // Trigger repositioning if available
                if (window.updateAllNotePositions) {
                  setTimeout(window.updateAllNotePositions, 10);
                }
              }
            }
          }
        });
      });
    };

    // Execute immediately or wait for margin notes to be ready
    if (window.marginNotesInitialized) {
      executeToggle();
    } else {
      // Wait a bit for margin notes to initialize
      setTimeout(executeToggle, 100);
    }
  }

  /**
   * Check if a margin note is within any collapsed section
   * @param {Element} marginNote - The margin note element to check
   * @returns {boolean} - True if the note is within a collapsed section
   */
  function isMarginNoteInCollapsedSection(marginNote) {
    let parent = marginNote.parentElement;
    while (parent) {
      if (
        parent.classList &&
        parent.classList.contains("collapsible-content") &&
        !parent.classList.contains("show")
      ) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  // Make functions globally available for use by collapsible-local.js
  window.toggleMarginNotesInSection = toggleMarginNotesInSection;
  window.isMarginNoteInCollapsedSection = isMarginNoteInCollapsedSection;
});
