document.addEventListener("DOMContentLoaded", function () {
  const toc = document.querySelector(".post-content .custom-toc");
  const sidebar = document.querySelector(".sidebar");

  if (toc && sidebar) {
    sidebar.appendChild(toc);
    toc.style.display = "block"; // Ensure it is visible in the sidebar
  }
});
