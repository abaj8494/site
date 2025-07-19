/**
 * Global Scroll Handler
 * Controls header and sidebar visibility on scroll
 */

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", function () {
  // Variables for scroll handling
  let isScrolling;
  let lastScrollTop = 0;
  let notesHidden = false;

  // Better scroll handling
  window.addEventListener(
    "scroll",
    function () {
      // Get current scroll position
      const st = window.scrollY || document.documentElement.scrollTop;

      // Find elements to control
      const header =
        document.querySelector(".sticky-header") ||
        document.querySelector("header");
      const sidebarTree = document.querySelector(".sidebar-tree");
      const marginNotesContainer = document.querySelector(".margin-notes");

      // Clear any existing timer
      window.clearTimeout(isScrolling);

      // Hide margin notes while scrolling
      if (marginNotesContainer && !notesHidden) {
        marginNotesContainer.classList.add("hidden");
        notesHidden = true;
      }

      // Fade elements based on scroll direction
      if (st > lastScrollTop && st > 50) {
        // Scrolling DOWN past threshold
        if (header) {
          header.classList.add("fade-out");
          header.classList.add("scrolled"); // Keep for backward compatibility
        }

        if (sidebarTree) {
          sidebarTree.classList.add("fade-out");
        }
      } else if (st < lastScrollTop) {
        // Scrolling UP - show elements
        if (header) {
          header.classList.remove("fade-out");
          header.classList.remove("scrolled");
        }

        if (sidebarTree) {
          sidebarTree.classList.remove("fade-out");
        }
      }

      // Update last scroll position
      lastScrollTop = st <= 0 ? 0 : st; // For mobile or negative scrolling

      // Set a timeout to run after scrolling ends
      isScrolling = setTimeout(() => {
        // Show margin notes when scrolling stops
        if (marginNotesContainer && notesHidden) {
          marginNotesContainer.classList.remove("hidden");
          notesHidden = false;
        }
      }, 500);
    },
    { passive: true },
  );
});
