/**
 * Global Scroll Handler
 * Controls header and sidebar visibility on scroll
 */
console.log("[Scroll Handler] Initializing...");

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("[Scroll Handler] DOM loaded");

  // Variables for scroll handling
  let isScrolling;
  let lastScrollTop = 0;

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

      // Debug log element presence
      if (!header) console.log("[Scroll Handler] Warning: No header found");
      if (!sidebarTree)
        console.log("[Scroll Handler] Warning: No sidebar-tree found");

      // Clear any existing timer
      window.clearTimeout(isScrolling);

      // Log current scroll position
      console.log(
        `[Scroll Handler] Scroll position: ${st}, direction: ${st > lastScrollTop ? "DOWN" : "UP"}`,
      );

      // Fade elements based on scroll direction
      if (st > lastScrollTop && st > 50) {
        // Scrolling DOWN past threshold
        if (header) {
          header.classList.add("fade-out");
          header.classList.add("scrolled"); // Keep for backward compatibility
          console.log("[Scroll Handler] Hiding header");
        }

        if (sidebarTree) {
          sidebarTree.classList.add("fade-out");
          console.log("[Scroll Handler] Hiding sidebar-tree");
        }
      } else if (st < lastScrollTop) {
        // Scrolling UP - show elements
        if (header) {
          header.classList.remove("fade-out");
          header.classList.remove("scrolled");
          console.log("[Scroll Handler] Showing header");
        }

        if (sidebarTree) {
          sidebarTree.classList.remove("fade-out");
          console.log("[Scroll Handler] Showing sidebar-tree");
        }
      }

      // Update last scroll position
      lastScrollTop = st <= 0 ? 0 : st; // For mobile or negative scrolling

      // Set a timeout to run after scrolling ends
      isScrolling = setTimeout(() => {
        console.log("[Scroll Handler] Scrolling has stopped");
      }, 500);
    },
    { passive: true },
  );

  console.log("[Scroll Handler] Setup complete");
});
