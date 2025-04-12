/**
 * Margin Notes - For displaying notes in the left sidebar
 */
console.log("[Margin Notes] Script loading...");

document.addEventListener("DOMContentLoaded", function () {
  console.log("[Margin Notes] DOM loaded, initializing...");

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

    console.log(
      `[Margin Notes] Device detection: Mobile browser: ${isMobileBrowser}, Viewport width: ${window.innerWidth}, Physical width: ${physicalWidth}, Desktop mode: ${isDesktopMode}`,
    );

    return isDesktopMode;
  }

  // Apply desktop view class if needed
  if (detectDesktopModeOnMobile()) {
    document.documentElement.classList.add("desktop-view");
    console.log(
      "[Margin Notes] Desktop view on mobile detected, applying special styling",
    );
  }

  // Find all margin notes in the document
  const marginNotes = document.querySelectorAll(".margin-note");
  const marginNotesContainer = document.getElementById(
    "margin-notes-container",
  );

  console.log(
    `[Margin Notes] Found ${marginNotes.length} margin notes in document`,
  );
  console.log(
    `[Margin Notes] Container exists: ${marginNotesContainer !== null}`,
  );

  // Track previous window width to detect changes that might indicate desktop mode toggle
  let previousWidth = window.innerWidth;

  // Listen for resize events that might indicate switching to desktop mode
  window.addEventListener(
    "resize",
    debounce(function () {
      // If width changed significantly, check for desktop mode again
      if (Math.abs(window.innerWidth - previousWidth) > 200) {
        console.log(
          `[Margin Notes] Window width changed from ${previousWidth} to ${window.innerWidth}, checking desktop mode`,
        );

        if (detectDesktopModeOnMobile()) {
          document.documentElement.classList.add("desktop-view");
          console.log(
            "[Margin Notes] Desktop view on mobile detected after resize",
          );
        } else {
          document.documentElement.classList.remove("desktop-view");
          console.log(
            "[Margin Notes] Standard view mode detected after resize",
          );
        }

        // Update positions in case display mode changed
        updateAllNotePositions();
        previousWidth = window.innerWidth;
      }
    }, 250),
  );

  if (!marginNotesContainer || marginNotes.length === 0) {
    console.warn("[Margin Notes] No container or notes found, exiting");
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

    console.log(
      `[Margin Notes] Processing note ${index}: "${noteContent.substring(0, 30)}${noteContent.length > 30 ? "..." : ""}"`,
    );

    // Create a unique ID for this note
    const noteId = `margin-note-${index}`;
    note.setAttribute("id", noteId);

    // Create the margin note element
    const marginNoteElement = document.createElement("div");
    marginNoteElement.className = "margin-note-item";
    marginNoteElement.innerHTML = noteContent;
    marginNotesContainer.appendChild(marginNoteElement);

    // Trigger MathJax/KaTeX processing for the new content
    if (window.MathJax) {
      MathJax.typesetPromise([marginNoteElement]).catch((err) =>
        console.log("MathJax typeset error:", err),
      );
    } else if (window.renderMathInElement) {
      renderMathInElement(marginNoteElement);
    }

    // Position the margin note to align with its reference
    positionMarginNote(note, marginNoteElement);

    // Get indicator element
    const indicator = note.querySelector(".margin-note-indicator");

    // Add hover event to the note itself
    note.addEventListener("mouseenter", () => {
      console.log(`[Margin Notes] Hovering note ${index}`);
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
      // Add click event for pulsation
      indicator.addEventListener("click", (e) => {
        console.log(`[Margin Notes] Clicked indicator for note ${index}`);
        // Show margin notes if they were hidden
        showMarginNotes();
        // Add pulsate class to create pulsation effect
        marginNoteElement.classList.add("pulsate");
        marginNoteElement.classList.add("active");
        note.classList.add("active");

        // Remove pulsate class after animation completes
        setTimeout(() => {
          marginNoteElement.classList.remove("pulsate");
        }, 1000);

        // Prevent default behavior and stop propagation
        e.preventDefault();
        e.stopPropagation();
      });

      // Keep hover event as well
      indicator.addEventListener("mouseenter", (e) => {
        console.log(`[Margin Notes] Hovering indicator for note ${index}`);
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

  // Ensure the sticky header doesn't affect the margin notes container
  // by adding a class to exempt it from sticky-header effects
  if (marginNotesContainer.parentElement) {
    marginNotesContainer.parentElement.classList.add("no-sticky-effect");
  }

  // Update positions after images and other resources load
  window.addEventListener("load", function () {
    console.log("[Margin Notes] Window loaded, updating positions");
    updateAllNotePositions();
  });

  // Update position on window resize
  window.addEventListener(
    "resize",
    debounce(() => {
      console.log("[Margin Notes] Window resized, updating positions");
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
        console.log("[Margin Notes] Scrolling has stopped");
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
      console.log("[Margin Notes] Notes hidden");
    }
  }

  /**
   * Show the margin notes
   */
  function showMarginNotes() {
    if (notesHidden) {
      marginNotesContainer.classList.remove("hidden");
      notesHidden = false;
      console.log("[Margin Notes] Notes shown");

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
      console.log(
        `[Margin Notes] Mobile view detected for ${reference.id}, not positioning vertically`,
      );
      return;
    }

    const refRect = reference.getBoundingClientRect();
    const containerRect = document
      .getElementById("margin-notes-container")
      .getBoundingClientRect();

    // Calculate position accounting for scroll
    const topPosition = refRect.top - containerRect.top;
    console.log(
      `[Margin Notes] Positioning note ${reference.id} at top: ${topPosition}px`,
    );

    // Debug info
    console.log("[Margin Notes] Reference rect:", {
      top: refRect.top,
      left: refRect.left,
      height: refRect.height,
    });
    console.log("[Margin Notes] Container rect:", {
      top: containerRect.top,
      left: containerRect.left,
      height: containerRect.height,
    });

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
        console.log(
          `[Margin Notes] Adjusted position for ${reference.id} due to overlap: ${adjustedTop}px`,
        );
      }
    });

    // Position the margin note
    marginNote.style.top = `${adjustedTop}px`;
    marginNote.setAttribute("data-for", reference.id);
  }

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

  console.log("[Margin Notes] Initialization complete");
});
