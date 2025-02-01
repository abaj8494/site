let lastScrollPosition = 0;
let ticking = false;

window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const header = document.querySelector(".sticky-header");
      const sidebarTree = document.querySelector(".sidebar-tree");
      const currentScroll = window.scrollY;

      // Only hide header and sidebar when scrolling down and past threshold
      if (currentScroll > lastScrollPosition && currentScroll > 50) {
        header.classList.add("scrolled");
        sidebarTree.classList.add("hidden"); // Hide sidebar completely when scrolling down
      } else if (currentScroll < lastScrollPosition) {
        header.classList.remove("scrolled");
        sidebarTree.classList.remove("hidden"); // Reappear the sidebar when scrolling up
      }

      lastScrollPosition = currentScroll;
      ticking = false;
    });

    ticking = true;
  }
});
