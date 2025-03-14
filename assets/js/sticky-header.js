// This script is deprecated - using the new scroll-handler.js script instead
console.log(
  "[Sticky Header] This script is deprecated. Using scroll-handler.js instead.",
);

// Commented out to prevent conflicts
/*
// Variables for scroll handling
let isScrolling;
let lastScrollTop = 0;

// Better scroll handling
window.addEventListener(
  "scroll",
  function () {
    // Get current scroll position
    const st = window.scrollY || document.documentElement.scrollTop;
    const header =
      document.querySelector(".sticky-header") ||
      document.querySelector("header");
    const sidebarTree = document.querySelector(".sidebar-tree");

    // Clear any existing timer
    window.clearTimeout(isScrolling);

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
      // Nothing to do when scrolling stops for header/sidebar
    }, 500);
  },
  { passive: true },
);
*/
