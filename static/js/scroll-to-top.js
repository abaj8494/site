/**
 * Scroll to top button functionality
 * Fades in when user scrolls down more than 25% of the page
 * Floats in the left sidebar and tracks with scrolling
 */

document.addEventListener("DOMContentLoaded", () => {
  const scrollToTopButton = document.getElementById("scroll-to-top");
  const sidebarContainer = document.querySelector(".sidebar-container");

  if (!scrollToTopButton || !sidebarContainer) {
    return;
  }

  // Throttle function to limit how often we update position
  let scrollTimeout;
  const throttleDelay = 16; // ~60fps

  // Update button position and visibility
  const updateButton = () => {
    // Calculate how far down the page we've scrolled
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    // Calculate scroll percentage
    const scrollPercentage = (scrollTop / documentHeight) * 100;

    // Show button if scrolled more than 25%
    if (scrollPercentage > 25) {
      scrollToTopButton.classList.add("visible");
    } else {
      scrollToTopButton.classList.remove("visible");
    }

    // Position the button to float in the visible area of the sidebar
    const sidebarRect = sidebarContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate desired position: near bottom of viewport
    const bottomOffset = 80; // Distance from bottom of viewport
    let desiredTop = viewportHeight - bottomOffset;

    // Keep button within sidebar bounds
    const buttonHeight = 48; // 3rem
    const minTop = Math.max(sidebarRect.top + 20, 20); // At least 20px from top
    const maxTop = sidebarRect.bottom - buttonHeight - 20; // At least 20px from bottom

    // Clamp the position
    const finalTop = Math.max(minTop, Math.min(desiredTop, maxTop));

    // Apply the position
    scrollToTopButton.style.top = `${finalTop}px`;

    // Calculate horizontal position within sidebar
    const sidebarLeft = sidebarRect.left;
    const sidebarWidth = sidebarRect.width;
    const buttonLeft = sidebarLeft + sidebarWidth / 2;
    scrollToTopButton.style.left = `${buttonLeft}px`;
  };

  // Listen for scroll events with throttling
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateButton();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );

  // Also update on resize
  window.addEventListener(
    "resize",
    () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(updateButton, 100);
    },
    { passive: true },
  );

  // Handle button click - scroll to top quickly
  scrollToTopButton.addEventListener("click", (e) => {
    e.preventDefault();

    // Scroll to top with smooth behavior
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  // Initialize button position and visibility
  updateButton();
});

