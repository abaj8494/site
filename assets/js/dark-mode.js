function getTheme() {
  if (localStorage && localStorage.getItem("theme")) {
    // User preference
    return localStorage.getItem("theme");
  }
  if (window.matchMedia) {
    // OS preference
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  // Undefined
}

function setTheme(theme) {
  // Main theme
  document.documentElement.setAttribute("data-theme", theme);

  // Prism theme (if applicable)
  const prismDark = document.getElementById("prism-dark");
  const prismLight = document.getElementById("prism-light");
  if (prismDark && prismLight) {
    prismDark.toggleAttribute("disabled", theme === "light");
    prismLight.toggleAttribute("disabled", theme === "dark");
  }

  // Store user preference
  localStorage.setItem("theme", theme);
}

// Initial load
const theme = getTheme();
if (theme) setTheme(theme);

// A universal toggle function that doesn’t depend on the clicked element's classes
function toggleThemeDirect() {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || getTheme();
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme);
}

// Wait for the DOM content before adding event listeners
document.addEventListener("DOMContentLoaded", function () {
  // Attach to any toggle button(s)
  const toggleButtons = document.querySelectorAll(".theme__toggle");
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      toggleThemeDirect();
    });
  });

  // Attach to the text link with the ID darkModeTextToggle
  const textToggle = document.getElementById("darkModeTextToggle");
  if (textToggle) {
    textToggle.addEventListener("click", function (e) {
      e.preventDefault();
      toggleThemeDirect();
    });
  }
});
