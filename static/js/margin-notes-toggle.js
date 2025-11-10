/**
 * Margin Notes toggle button functionality
 * Allows users to enable/disable margin notes from the header
 */

document.addEventListener("DOMContentLoaded", () => {
  const marginNotesToggle = document.getElementById("margin-notes-toggle");

  if (!marginNotesToggle) {
    return;
  }

  // Initialize button state based on localStorage or global state
  const checkInitialState = () => {
    const savedState = localStorage.getItem("marginNotesDisabled");
    const isDisabled = savedState === "true" || window.marginNotesDisabled;
    
    if (isDisabled) {
      marginNotesToggle.classList.add("disabled");
      marginNotesToggle.title = "Enable Margin Notes";
      
      // If localStorage says disabled but window doesn't, toggle it
      if (savedState === "true" && !window.marginNotesDisabled && window.toggleMarginNotes) {
        window.toggleMarginNotes();
      }
    } else {
      marginNotesToggle.title = "Disable Margin Notes";
    }
  };

  // Check initial state after a short delay to ensure margin-notes.js has loaded
  setTimeout(checkInitialState, 100);

  // Handle button clicks
  marginNotesToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle using the existing margin notes system
    if (window.toggleMarginNotes) {
      window.toggleMarginNotes();

      // Update button appearance based on new state
      const isDisabled = window.marginNotesDisabled;
      marginNotesToggle.classList.toggle("disabled", isDisabled);
      marginNotesToggle.title = isDisabled
        ? "Enable Margin Notes"
        : "Disable Margin Notes";

      // Save state to localStorage
      localStorage.setItem("marginNotesDisabled", isDisabled);

      // Log for debugging
      console.log(`Margin notes ${isDisabled ? "disabled" : "enabled"}`);
    } else {
      console.warn("Margin notes system not initialized");
    }
  });
});

