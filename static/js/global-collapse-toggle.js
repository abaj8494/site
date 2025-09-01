document.addEventListener("DOMContentLoaded", function () {
  const globalToggle = document.getElementById("global-collapse-toggle");

  if (!globalToggle) return; // Exit if button doesn't exist on this page

  let isGlobalExpanded = false; // Track global state: false = ▶ (closed), true = ▼ (expanded)

  // Function to get all collapsible toggle buttons on the page
  function getAllToggleButtons() {
    return document.querySelectorAll(".toggle-button");
  }

  // Function to get all collapsible content containers
  function getAllCollapsibleContent() {
    return document.querySelectorAll(".collapsible-content");
  }

  // Function to update the global toggle button appearance
  function updateGlobalToggleState() {
    const toggleButtons = getAllToggleButtons();
    if (toggleButtons.length === 0) return;

    // Check current state of all toggle buttons
    const expandedButtons = Array.from(toggleButtons).filter(
      (btn) => btn.getAttribute("aria-expanded") === "true",
    );

    // If all buttons are expanded, show ▼ (expanded state)
    // If some or none are expanded, show ▶ (collapsed state)
    const allExpanded =
      expandedButtons.length === toggleButtons.length &&
      toggleButtons.length > 0;

    isGlobalExpanded = allExpanded;
    globalToggle.textContent = isGlobalExpanded ? "▼" : "▶";
    globalToggle.setAttribute("aria-expanded", isGlobalExpanded);
  }

  // Function to expand all collapsible sections
  function expandAll() {
    const toggleButtons = getAllToggleButtons();
    const toggleStates = JSON.parse(localStorage.getItem("toggleStates")) || {};

    toggleButtons.forEach((button) => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";

      if (!isExpanded) {
        // Find the associated content
        const wrapper = button.closest(".collapsible-wrapper");
        if (wrapper) {
          const content = wrapper.nextElementSibling;
          if (content && content.classList.contains("collapsible-content")) {
            // Expand the section
            button.setAttribute("aria-expanded", "true");
            button.textContent = "▼";
            content.classList.add("show");

            // Handle margin notes if the function exists
            if (window.toggleMarginNotesInSection) {
              window.toggleMarginNotesInSection(content, true);
            }

            // Update localStorage
            const toggleId = button
              .closest(".collapsible-wrapper")
              .querySelector("h1, h2, h3, h4, h5, h6")
              ?.getAttribute("data-toggle-id");
            if (toggleId) {
              toggleStates[toggleId] = true;
            }
          }
        }
      }
    });

    // Save updated states
    localStorage.setItem("toggleStates", JSON.stringify(toggleStates));

    // Update global button state
    isGlobalExpanded = true;
    globalToggle.textContent = "▼";
    globalToggle.setAttribute("aria-expanded", "true");
  }

  // Function to collapse all collapsible sections
  function collapseAll() {
    const toggleButtons = getAllToggleButtons();
    const toggleStates = JSON.parse(localStorage.getItem("toggleStates")) || {};

    toggleButtons.forEach((button) => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";

      if (isExpanded) {
        // Find the associated content
        const wrapper = button.closest(".collapsible-wrapper");
        if (wrapper) {
          const content = wrapper.nextElementSibling;
          if (content && content.classList.contains("collapsible-content")) {
            // Collapse the section
            button.setAttribute("aria-expanded", "false");
            button.textContent = "▶";
            content.classList.remove("show");

            // Handle margin notes if the function exists
            if (window.toggleMarginNotesInSection) {
              window.toggleMarginNotesInSection(content, false);
            }

            // Update localStorage
            const toggleId = button
              .closest(".collapsible-wrapper")
              .querySelector("h1, h2, h3, h4, h5, h6")
              ?.getAttribute("data-toggle-id");
            if (toggleId) {
              toggleStates[toggleId] = false;
            }
          }
        }
      }
    });

    // Save updated states
    localStorage.setItem("toggleStates", JSON.stringify(toggleStates));

    // Update global button state
    isGlobalExpanded = false;
    globalToggle.textContent = "▶";
    globalToggle.setAttribute("aria-expanded", "false");
  }

  // Main click handler for global toggle
  globalToggle.addEventListener("click", function () {
    if (isGlobalExpanded) {
      // Currently expanded (▼), so collapse all
      collapseAll();
    } else {
      // Currently collapsed (▶), so expand all
      expandAll();
    }
  });

  // Initialize the global toggle state based on current page state
  // Wait a bit for other scripts to finish setting up collapsible content
  setTimeout(() => {
    updateGlobalToggleState();

    // Set up observers to watch for changes to individual toggle buttons
    const observer = new MutationObserver(function (mutations) {
      let shouldUpdate = false;
      mutations.forEach(function (mutation) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "aria-expanded" &&
          mutation.target.classList.contains("toggle-button")
        ) {
          shouldUpdate = true;
        }
      });

      if (shouldUpdate) {
        setTimeout(updateGlobalToggleState, 10); // Small delay to ensure state is settled
      }
    });

    // Observe all toggle buttons for aria-expanded changes
    getAllToggleButtons().forEach((button) => {
      observer.observe(button, {
        attributes: true,
        attributeFilter: ["aria-expanded"],
      });
    });

    // Also observe the document for new toggle buttons being added
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }, 200);
});

