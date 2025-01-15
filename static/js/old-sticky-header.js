let lastScrollPosition = 0;
let ticking = false;

window.addEventListener("scroll", () => {
  console.log("Scroll event fired"); // Debug log 1

  if (!ticking) {
    window.requestAnimationFrame(() => {
      const header = document.querySelector(".sticky-header");
      const currentScroll = window.scrollY;

      console.log("Current scroll position:", currentScroll); // Debug log 2
      console.log("Last scroll position:", lastScrollPosition); // Debug log 3

      if (currentScroll > lastScrollPosition && currentScroll > 50) {
        console.log("Adding scrolled class"); // Debug log 4
        header.classList.add("scrolled");
      } else {
        console.log("Removing scrolled class"); // Debug log 5
        header.classList.remove("scrolled");
      }

      lastScrollPosition = currentScroll;
      ticking = false;
    });

    ticking = true;
  }
});
