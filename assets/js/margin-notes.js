/**
 * Margin Notes - A script to handle floating margin notes in the left sidebar
 */
document.addEventListener("DOMContentLoaded", function () {
  console.log("Margin notes script loaded and running");

  // Find all margin notes in the document
  const marginNotes = document.querySelectorAll(".margin-note");
  console.log("Found margin notes:", marginNotes.length);

  const marginNotesContainer = document.getElementById(
    "margin-notes-container",
  );
  console.log("Margin notes container found:", marginNotesContainer !== null);

  if (!marginNotesContainer) {
    console.error("Margin notes container not found! Can't continue.");
    return;
  }

  // Clear any existing margin notes
  marginNotesContainer.innerHTML = "";

  // Process each margin note
  marginNotes.forEach((note, index) => {
    const noteContent = note.getAttribute("data-note");
    console.log(`Processing note ${index}:`, noteContent);

    // Create a unique ID for this note
    const noteId = `margin-note-${index}`;
    note.setAttribute("id", noteId);

    // Create the margin note element
    const marginNoteElement = document.createElement("div");
    marginNoteElement.className = "margin-note-item";
    marginNoteElement.innerHTML = noteContent;
    marginNoteElement.setAttribute("data-for", noteId);
    marginNotesContainer.appendChild(marginNoteElement);

    // Position the margin note next to its reference
    positionMarginNote(note, marginNoteElement);

    // Add hover event to highlight the connection
    note.addEventListener("mouseenter", () => {
      console.log(`Hovering note ${index}`);
      marginNoteElement.classList.add("active");
      note.classList.add("active");
    });

    note.addEventListener("mouseleave", () => {
      marginNoteElement.classList.remove("active");
      note.classList.remove("active");
    });

    marginNoteElement.addEventListener("mouseenter", () => {
      note.classList.add("active");
    });

    marginNoteElement.addEventListener("mouseleave", () => {
      note.classList.remove("active");
    });
  });

  // Update positions after images and other resources load
  window.addEventListener("load", function () {
    console.log("Window loaded, repositioning notes");
    const marginNotes = document.querySelectorAll(".margin-note");
    marginNotes.forEach((note) => {
      const noteId = note.getAttribute("id");
      const marginNote = document.querySelector(
        `.margin-note-item[data-for="${noteId}"]`,
      );
      if (marginNote) {
        positionMarginNote(note, marginNote);
      }
    });
  });

  // Update position on window resize
  window.addEventListener(
    "resize",
    debounce(() => {
      console.log("Window resized, repositioning notes");
      const marginNotes = document.querySelectorAll(".margin-note");
      marginNotes.forEach((note) => {
        const noteId = note.getAttribute("id");
        const marginNote = document.querySelector(
          `.margin-note-item[data-for="${noteId}"]`,
        );
        if (marginNote) {
          positionMarginNote(note, marginNote);
        }
      });
    }, 150),
  );

  // Handle position updates on scroll
  window.addEventListener(
    "scroll",
    debounce(() => {
      const marginNotes = document.querySelectorAll(".margin-note");
      marginNotes.forEach((note) => {
        const noteId = note.getAttribute("id");
        const marginNote = document.querySelector(
          `.margin-note-item[data-for="${noteId}"]`,
        );
        if (marginNote) {
          positionMarginNote(note, marginNote);
        }
      });
    }, 50),
  );
});

/**
 * Position a margin note relative to its reference in the text
 */
function positionMarginNote(reference, marginNote) {
  const refRect = reference.getBoundingClientRect();
  const containerRect = document
    .getElementById("margin-notes-container")
    .getBoundingClientRect();

  // Calculate position accounting for scroll
  const topPosition = refRect.top - containerRect.top;
  console.log("Positioning note:", reference.id);
  console.log("Reference rect:", {
    top: refRect.top,
    left: refRect.left,
    height: refRect.height,
  });
  console.log("Container rect:", {
    top: containerRect.top,
    left: containerRect.left,
    height: containerRect.height,
  });
  console.log("Initial top position:", topPosition);

  // Adjust for potential overlap with previous notes
  let adjustedTop = topPosition;
  const noteHeight = marginNote.offsetHeight;
  const siblingNotes = document.querySelectorAll(
    '.margin-note-item:not([data-for="' + reference.id + '"])',
  );

  // Check for overlap with other notes and adjust if needed
  siblingNotes.forEach((sibling) => {
    const siblingTop = parseInt(sibling.style.top, 10) || 0;
    const siblingBottom = siblingTop + sibling.offsetHeight;

    // If there would be overlap
    if (
      (adjustedTop >= siblingTop && adjustedTop <= siblingBottom) ||
      (adjustedTop + noteHeight >= siblingTop &&
        adjustedTop + noteHeight <= siblingBottom)
    ) {
      // Position it below the sibling note
      adjustedTop = siblingBottom + 4;
      console.log("Adjusted position due to overlap:", adjustedTop);
    }
  });

  console.log("Final top position:", adjustedTop);

  // Position the margin note
  marginNote.style.top = `${adjustedTop}px`;
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
