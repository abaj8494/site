/**
 * Margin Notes - For displaying notes in the left sidebar
 */
console.log("[Margin Notes] Script loading...");

document.addEventListener("DOMContentLoaded", function () {
  console.log("[Margin Notes] DOM loaded, initializing...");

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
    const refRect = reference.getBoundingClientRect();
    const containerRect = marginNotesContainer.getBoundingClientRect();

    // Calculate position relative to its reference in the content
    const topPosition = refRect.top - containerRect.top;

    // Ensure we have a minimum top position
    const minTop = 15; // Minimum 15px from the top of the container
    let adjustedTop = Math.max(topPosition, minTop);

    // Adjust for potential overlap with previous notes
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
