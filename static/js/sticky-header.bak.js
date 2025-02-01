let lastScrollPosition = 0;
let ticking = false;

window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const header = document.querySelector(".sticky-header");
      const currentScroll = window.scrollY;

      // Only hide header when scrolling down and past threshold
      if (currentScroll > lastScrollPosition && currentScroll > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }

      lastScrollPosition = currentScroll;
      ticking = false;
    });

    ticking = true;
  }
});
