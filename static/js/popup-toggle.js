/**
 * Popup toggle button functionality
 * Allows users to enable/disable the popup system from the header
 */

document.addEventListener("DOMContentLoaded", () => {
  const popupToggle = document.getElementById("popup-toggle");

  if (!popupToggle) {
    return;
  }

  // Initialize button state based on localStorage
  const isDisabled = localStorage.getItem("popupsDisabled") === "true";
  if (isDisabled) {
    popupToggle.classList.add("disabled");
    popupToggle.title = "Enable Popups";
  } else {
    popupToggle.title = "Disable Popups";
  }

  // Handle button clicks
  popupToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle the disabled state
    const currentlyDisabled =
      document.body.getAttribute("data-popups-disabled") === "true";
    const newDisabledState = !currentlyDisabled;

    // Update the body attribute
    document.body.setAttribute("data-popups-disabled", newDisabledState);

    // Update localStorage
    localStorage.setItem("popupsDisabled", newDisabledState);

    // Update button appearance and title
    popupToggle.classList.toggle("disabled", newDisabledState);
    popupToggle.title = newDisabledState ? "Enable Popups" : "Disable Popups";

    // Close any open popups if disabling
    if (newDisabledState && window.Popups) {
      window.Popups.closeAllNonPinnedPopups();
    }

    // Log for debugging
    console.log(`Popups ${newDisabledState ? "disabled" : "enabled"}`);
  });
});
