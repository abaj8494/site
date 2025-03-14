// Sticky header functionality
window.addEventListener("scroll", () => {
  const header = document.querySelector(".sticky-header");

  // Don't apply sticky behavior to elements that should be exempt
  if (
    header &&
    !header.classList.contains("no-sticky-effect") &&
    !header.closest(".sidebar-container") &&
    !header.closest(".no-sticky-effect")
  ) {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
});
