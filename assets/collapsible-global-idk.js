
document.addEventListener("DOMContentLoaded", function () {
  const collapsibleWrappers = document.querySelectorAll(".collapsible-wrapper");

  collapsibleWrappers.forEach((wrapper) => {
    const button = wrapper.querySelector(".toggle-button");
    const content = wrapper.querySelector(".collapsible-content");

    // Initialize state based on `aria-expanded` attribute
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    if (!isExpanded) {
      content.style.display = "none"; // Hide if not expanded
    }

    // Add toggle functionality
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", !expanded);
      button.textContent = expanded ? "➕" : "➖";
      content.style.display = expanded ? "none" : "block";
    });
  });
});

