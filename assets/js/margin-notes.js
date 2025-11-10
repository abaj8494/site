/**
 * Margin Notes - For displaying notes in the left sidebar
 */

document.addEventListener("DOMContentLoaded", function () {
  // Set global flag to indicate margin notes system is being initialized
  window.marginNotesInitialized = true;

  // Global margin notes state - check localStorage for saved preference
  const savedState = localStorage.getItem("marginNotesDisabled");
  window.marginNotesDisabled = savedState === "true";

  // Detect if this is likely a mobile device requesting desktop site
  function detectDesktopModeOnMobile() {
    // Check if this is likely a mobile device
    const isMobileBrowser =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    // Check if the viewport width is greater than what we'd expect for the device
    // This happens when "Request desktop site" is used on mobile
    const isWideViewport = window.innerWidth >= 1024;

    // If device width from screen is small but viewport is large, this is likely desktop mode
    const physicalWidth = window.screen.width;
    const isDesktopMode =
      isMobileBrowser && isWideViewport && physicalWidth < 1024;

    return isDesktopMode;
  }

  // Apply desktop view class if needed
  if (detectDesktopModeOnMobile()) {
    document.documentElement.classList.add("desktop-view");
  }

  // Find all margin notes in the document
  const marginNotes = document.querySelectorAll(".margin-note");
  const marginNotesContainer = document.getElementById(
    "margin-notes-container",
  );

  // Track previous window width to detect changes that might indicate desktop mode toggle
  let previousWidth = window.innerWidth;

  // Listen for resize events that might indicate switching to desktop mode
  window.addEventListener(
    "resize",
    debounce(function () {
      // If width changed significantly, check for desktop mode again
      if (Math.abs(window.innerWidth - previousWidth) > 200) {
        if (detectDesktopModeOnMobile()) {
          document.documentElement.classList.add("desktop-view");
        } else {
          document.documentElement.classList.remove("desktop-view");
        }

        // Update positions in case display mode changed
        updateAllNotePositions();
        previousWidth = window.innerWidth;
      }
    }, 250),
  );

  if (!marginNotesContainer || marginNotes.length === 0) {
    return;
  }

  // Clear any existing margin notes
  marginNotesContainer.innerHTML = "";

  // Spacing between margin notes
  const noteSpacing = 10; // px

  // Variables for scroll handling
  let isScrolling;
  let notesHidden = false;

  // Process each margin note
  marginNotes.forEach((note, index) => {
    const noteContent = note.getAttribute("data-note");
    if (!noteContent) return;

    // Create a unique ID for this note
    const noteId = `margin-note-${index}`;
    note.setAttribute("id", noteId);

    // Create the margin note element
    const marginNoteElement = document.createElement("div");
    marginNoteElement.className = "margin-note-item";
    marginNoteElement.innerHTML = noteContent;
    marginNotesContainer.appendChild(marginNoteElement);

    // Trigger MathJax/KaTeX processing for the new content
    if (typeof window.MathJax !== "undefined" && window.MathJax.Hub) {
      window.MathJax.Hub.Queue([
        "Typeset",
        window.MathJax.Hub,
        marginNoteElement,
      ]);
    } else if (typeof window.renderMathInElement !== "undefined") {
      window.renderMathInElement(marginNoteElement);
    }

    // Position the margin note to align with its reference
    positionMarginNote(note, marginNoteElement);

    // Get indicator element
    const indicator = note.querySelector(".margin-note-indicator");

    // Add hover event to the note itself
    note.addEventListener("mouseenter", () => {
      // Show margin notes if they were hidden
      if (notesHidden) {
        showMarginNotes();
      }
      marginNoteElement.classList.add("active");
      note.classList.add("active");
    });

    note.addEventListener("mouseleave", () => {
      marginNoteElement.classList.remove("active");
      note.classList.remove("active");
    });

    // Add specific hover event to the indicator symbol
    if (indicator) {
      // Add click event to toggle margin notes system
      indicator.addEventListener("click", (e) => {
        // Toggle the entire margin notes system
        toggleMarginNotes();

        // Prevent default behavior and stop propagation
        e.preventDefault();
        e.stopPropagation();
      });

      // Test if the element is actually clickable
      indicator.style.cursor = "pointer";
      indicator.style.userSelect = "none";

      // Keep hover event as well
      indicator.addEventListener("mouseenter", (e) => {
        // Always show margin notes when hovering over indicator
        showMarginNotes();
        marginNoteElement.classList.add("active");
        note.classList.add("active");
        // Prevent event from bubbling to parent
        e.stopPropagation();
      });
    }

    marginNoteElement.addEventListener("mouseenter", () => {
      note.classList.add("active");
      marginNoteElement.classList.add("active");
    });

    marginNoteElement.addEventListener("mouseleave", () => {
      note.classList.remove("active");
      marginNoteElement.classList.remove("active");
    });
  });

  // Check if there are any folded headings on the page and disable all margin notes if so
  const collapsedSections = document.querySelectorAll(
    ".collapsible-content:not(.show)",
  );
  if (collapsedSections.length > 0) {
    // There are collapsed sections, so disable all margin notes
    if (!window.marginNotesDisabled) {
      toggleMarginNotes(); // Use the existing Ctrl-M mechanism
    }
  }

  // Apply the disabled state if it was loaded from localStorage
  if (window.marginNotesDisabled) {
    // Apply disabled state immediately
    if (marginNotesContainer) {
      marginNotesContainer.style.display = "none";
    }
    const allMarginNotes = document.querySelectorAll(".margin-note");
    allMarginNotes.forEach((note) => {
      note.classList.add("disabled");
      note.style.borderBottomColor = "#ff6b6b";
      note.style.color = "#ff6b6b";
      note.style.backgroundColor = "rgba(255, 107, 107, 0.1)";
      const indicator = note.querySelector(".margin-note-indicator");
      if (indicator) {
        indicator.style.color = "#ff6b6b";
      }
    });
  }

  // Ensure the sticky header doesn't affect the margin notes container
  // by adding a class to exempt it from sticky-header effects
  if (marginNotesContainer.parentElement) {
    marginNotesContainer.parentElement.classList.add("no-sticky-effect");
  }

  // Update positions after images and other resources load
  window.addEventListener("load", function () {
    updateAllNotePositions();
  });

  // Update position on window resize
  window.addEventListener(
    "resize",
    debounce(() => {
      updateAllNotePositions();
    }, 150),
  );

  // Better scroll handling
  window.addEventListener(
    "scroll",
    function () {
      // Clear any existing timer for margin notes
      window.clearTimeout(isScrolling);

      // Hide margin notes when scrolling in ANY direction
      if (!notesHidden) {
        hideMarginNotes();
      }

      // Set a timeout to run after scrolling ends
      isScrolling = setTimeout(() => {
        // Show margin notes when scrolling stops
        if (notesHidden) {
          showMarginNotes();
        }
      }, 500);
    },
    { passive: true },
  );

  /**
   * Hide the margin notes
   */
  function hideMarginNotes() {
    if (!notesHidden) {
      marginNotesContainer.classList.add("hidden");
      notesHidden = true;
    }
  }

  /**
   * Show the margin notes
   */
  function showMarginNotes() {
    if (notesHidden) {
      marginNotesContainer.classList.remove("hidden");
      notesHidden = false;

      // Force recalculation of margin note positions
      updateAllNotePositions();
    }
  }

  /**
   * Update positions of all margin notes
   */
  function updateAllNotePositions() {
    const marginNotes = document.querySelectorAll(".margin-note");
    const marginNotesElements = document.querySelectorAll(".margin-note-item");

    if (marginNotes.length === marginNotesElements.length) {
      marginNotes.forEach((note, index) => {
        positionMarginNote(note, marginNotesElements[index]);
      });
    }
  }

  /**
   * Position a margin note relative to its reference in the text
   */
  function positionMarginNote(reference, marginNote) {
    // Check if we're on mobile view - don't position if in mobile mode unless we're in desktop view
    const isMobile = window.innerWidth <= 1024;
    const isDesktopView =
      document.documentElement.classList.contains("desktop-view");

    // If mobile but not desktop view, don't position - it will be fixed at bottom
    if (isMobile && !isDesktopView) {
      return;
    }

    const refRect = reference.getBoundingClientRect();
    const containerRect = document
      .getElementById("margin-notes-container")
      .getBoundingClientRect();

    // Calculate position accounting for scroll
    const topPosition = refRect.top - containerRect.top;

    // Adjust for potential overlap with previous notes
    let adjustedTop = topPosition;
    const noteHeight = marginNote.offsetHeight;
    const siblingNotes = document.querySelectorAll(
      '.margin-note-item:not([data-for="' + reference.id + '"])',
    );

    // Check for overlap with other notes and adjust if needed
    siblingNotes.forEach((sibling) => {
      const siblingTop = parseInt(sibling.style.top, 10) || 0;
      const siblingBottom = siblingTop + sibling.offsetHeight + noteSpacing;

      // If there would be overlap
      if (
        (adjustedTop >= siblingTop && adjustedTop <= siblingBottom) ||
        (adjustedTop + noteHeight >= siblingTop &&
          adjustedTop + noteHeight <= siblingBottom)
      ) {
        // Position it below the sibling note
        adjustedTop = siblingBottom + noteSpacing;
      }
    });

    // Position the margin note
    marginNote.style.top = `${adjustedTop}px`;
    marginNote.setAttribute("data-for", reference.id);
  }

  /**
   * Toggle margin notes on/off
   */
  function toggleMarginNotes() {
    window.marginNotesDisabled = !window.marginNotesDisabled;
    const marginNotesContainer = document.getElementById(
      "margin-notes-container",
    );
    const allMarginNotes = document.querySelectorAll(".margin-note");

    // Save state to localStorage
    localStorage.setItem("marginNotesDisabled", window.marginNotesDisabled);

    if (window.marginNotesDisabled) {
      // Disable margin notes
      if (marginNotesContainer) {
        marginNotesContainer.style.display = "none";
      }

      // Turn margin note indicators red
      allMarginNotes.forEach((note) => {
        note.classList.add("disabled");
        // Change the entire note styling to red
        note.style.borderBottomColor = "#ff6b6b";
        note.style.color = "#ff6b6b";
        note.style.backgroundColor = "rgba(255, 107, 107, 0.1)";

        const indicator = note.querySelector(".margin-note-indicator");
        if (indicator) {
          indicator.style.color = "#ff6b6b";
        }
      });
    } else {
      // Enable margin notes
      if (marginNotesContainer) {
        marginNotesContainer.style.display = "";
      }

      // Restore normal margin note indicators
      allMarginNotes.forEach((note) => {
        note.classList.remove("disabled");
        // Restore original blue styling
        note.style.borderBottomColor = "";
        note.style.color = "";
        note.style.backgroundColor = "";

        const indicator = note.querySelector(".margin-note-indicator");
        if (indicator) {
          indicator.style.color = "";
        }
      });
    }
  }

  // Add keyboard shortcut to toggle margin notes (Ctrl+M)
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "m") {
      e.preventDefault();
      toggleMarginNotes();
    }
  });

  // Make functions globally available
  window.toggleMarginNotes = toggleMarginNotes;
  window.updateAllNotePositions = updateAllNotePositions;

  /**
   * Debounce function to limit frequent calls
   */
  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
});
