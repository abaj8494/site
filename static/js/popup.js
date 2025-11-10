/**
 * Popup system for link previews
 * A simplified implementation inspired by Gwern.net
 */

// Main popups object
window.Popups = {
  // Configuration
  config: {
    containerID: "popup-container",
    containerParentSelector: "body",
    hoverDelay: 450,
    fadeOutDuration: 200,
    maxPopups: 5,
    debug: false,
    minWidth: 320,
    minHeight: 120,
    initialPositionMargin: 20,
    loadingTimeout: 7500,
    pdfJsPath: "/js/pdf-js/web/viewer.html",
  },

  // State
  popupContainer: null,
  activeHoverTimer: null,
  activeLink: null,
  popupCounter: 0,
  linkRegistry: new WeakMap(),
  popupRegistry: new Map(),
  hoverState: {
    currentLink: null,
    currentPopup: null,
    isLeavingLink: false,
    isLeavingPopup: false,
    leaveTimer: null,
  },
  dragging: {
    active: false,
    popup: null,
    offsetX: 0,
    offsetY: 0,
    lastMoveTime: null,
  },

  // Initialize the popup system
  init() {
    // Create container for all popups
    this.createContainer();

    // Initialize the dragging state
    this.dragging = {
      active: false,
      popup: null,
      offsetX: 0,
      offsetY: 0,
      lastMoveTime: null,
    };

    // Initialize hover tracking
    this.hoverState = {
      currentLink: null,
      currentPopup: null,
      isLeavingPopup: false,
    };

    // Bind events
    this.bindGlobalEvents();

    // Setup link event handlers
    this.setupLinkHandlers();

    // Check if popups were previously disabled
    const wasDisabled = localStorage.getItem("popupsDisabled") === "true";
    if (wasDisabled) {
      document.body.setAttribute("data-popups-disabled", "true");
    }
  },

  // Create popup container if it doesn't exist
  createContainer() {
    if (document.getElementById(this.config.containerID)) {
      this.popupContainer = document.getElementById(this.config.containerID);
      this.log("Using existing popup container");
      return;
    }

    this.popupContainer = document.createElement("DIV");
    this.popupContainer.id = this.config.containerID;
    this.popupContainer.className = "popup-container";

    const parent = document.querySelector(this.config.containerParentSelector);
    if (parent) {
      parent.appendChild(this.popupContainer);
      this.log("Popup container created");
    } else {
      console.error("Could not find popup container parent");
    }
  },

  // Bind global events
  bindGlobalEvents() {
    // Bind global events
    document.addEventListener(
      "mousemove",
      this.handleGlobalMouseMove.bind(this),
    );
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("mouseup", this.handleMouseUp.bind(this));
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("resize", this.repositionPopups.bind(this));

    // Custom event to toggle popups from other UI elements
    document.addEventListener("togglePopups", (event) => {
      const isDisabled =
        document.body.getAttribute("data-popups-disabled") === "true";
      const newDisabledState =
        event.detail?.force != null ? event.detail.force : !isDisabled;

      document.body.setAttribute("data-popups-disabled", newDisabledState);
      localStorage.setItem("popupsDisabled", newDisabledState);

      // Update any eye buttons
      document.querySelectorAll(".popup-eye-button").forEach((btn) => {
        btn.title = newDisabledState ? "Enable popups" : "Disable popups";
        btn.classList.toggle("disabled", newDisabledState);
      });

      // Close popups if disabling
      if (newDisabledState) {
        this.closeAllNonPinnedPopups();
      }
    });
  },

  // Handle global mouse movement to check if we've moved away from popup areas
  handleGlobalMouseMove(event) {
    // If we're not currently tracking any popups, no need to do anything
    if (!this.hoverState.currentPopup && !this.hoverState.currentLink) {
      return;
    }

    // Check if the mouse is over any active popup or its source link
    const isOverPopupOrLink = this.isMouseOverPopupOrLink(event);

    // If we're not over any popup or link, and there's no leave timer yet, start one
    if (!isOverPopupOrLink && !this.hoverState.leaveTimer) {
      this.hoverState.leaveTimer = setTimeout(() => {
        this.log("Mouse not over any popup or source link, closing popups");
        // Close all non-pinned popups
        this.closeAllNonPinnedPopups();
        this.hoverState.leaveTimer = null;
      }, 300); // Increased from 100ms to 300ms for more forgiving hover behavior
    }
    // If we are over a popup or link and there's a leave timer, cancel it
    else if (isOverPopupOrLink && this.hoverState.leaveTimer) {
      clearTimeout(this.hoverState.leaveTimer);
      this.hoverState.leaveTimer = null;
    }
  },

  // Check if the mouse is over any popup or its source link
  isMouseOverPopupOrLink(event) {
    // Get all elements under the mouse cursor
    const elementsUnderCursor = document.elementsFromPoint(
      event.clientX,
      event.clientY,
    );

    // Check if any of those elements is a popup or a source link
    for (const element of elementsUnderCursor) {
      // Check if it's a popup
      if (element.classList && element.classList.contains("popup")) {
        return true;
      }

      // Check if it's a source link that has a popup
      if (element.tagName === "A" && this.linkRegistry.has(element)) {
        return true;
      }

      // Check if it's inside a popup
      if (element.closest(".popup")) {
        return true;
      }
    }

    return false;
  },

  // Close all non-pinned popups
  closeAllNonPinnedPopups() {
    const popups = Array.from(this.popupContainer.children);
    for (const popup of popups) {
      if (!popup.classList.contains("pinned")) {
        this.despawnPopup(popup);
      }
    }
  },

  // Set up link handlers for popup triggering
  setupLinkHandlers() {
    // Select all links, including those containing images and those that are headings
    // Only exclude javascript: links and those with the no-popup class
    const links = document.querySelectorAll(
      "a:not(.no-popup):not([href^='javascript:'])",
    );
    this.log(`Setting up ${links.length} links for popups`);

    links.forEach((link) => {
      // Skip links that already have handlers or should be excluded
      if (this.linkRegistry.has(link) || link.classList.contains("no-popup")) {
        return;
      }

      // Register link events
      link.addEventListener("mouseenter", this.handleLinkMouseEnter.bind(this));
      link.addEventListener("mouseleave", this.handleLinkMouseLeave.bind(this));
      link.addEventListener("click", this.handleLinkClick.bind(this));

      // Mark link as registered
      this.linkRegistry.set(link, true);
    });
  },

  // Handle mouseenter events on links
  handleLinkMouseEnter(event) {
    // Skip if popups are disabled
    if (document.body.getAttribute("data-popups-disabled") === "true") {
      return;
    }

    const link = event.currentTarget;

    // Skip if the link has a data attribute to ignore
    if (link.dataset.popup === "ignore") {
      return;
    }

    // Skip if this is a popup link that's already been activated
    if (link.classList.contains("popup-active")) {
      return;
    }

    // Clear any existing hover timer
    if (this.activeHoverTimer) {
      clearTimeout(this.activeHoverTimer);
      this.activeHoverTimer = null;
    }

    // Store the active link
    this.hoverState.currentLink = link;
    this.hoverState.isLeavingLink = false;

    // Set a timer to show the popup
    this.activeHoverTimer = setTimeout(() => {
      // Make sure we're still hovering
      if (this.hoverState.isLeavingLink) return;

      // Look for existing popup
      const existingPopup = this.findPopupForLink(link);
      if (existingPopup) {
        this.bringToFront(existingPopup);
        return;
      }

      // Create a new popup
      const popup = this.spawnPopupForLink(link, event);

      // Update hover state
      this.hoverState.currentPopup = popup;

      // Mark the link as having an active popup
      link.classList.add("popup-active");

      // Add an event listener to remove the class when the popup is removed
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === "childList" &&
            mutation.removedNodes.length > 0
          ) {
            for (const node of mutation.removedNodes) {
              if (node === popup) {
                link.classList.remove("popup-active");
                observer.disconnect();
              }
            }
          }
        }
      });

      observer.observe(this.popupContainer, { childList: true });
    }, this.config.hoverDelay);
  },

  // Handle mouseleave events on links
  handleLinkMouseLeave(event) {
    // Skip if popups are disabled
    if (document.body.getAttribute("data-popups-disabled") === "true") {
      return;
    }

    const link = event.currentTarget;

    // Skip if the link has a data attribute to ignore
    if (link.dataset.popup === "ignore") {
      return;
    }

    // Clear any pending hover timer
    if (this.activeHoverTimer) {
      clearTimeout(this.activeHoverTimer);
      this.activeHoverTimer = null;
    }

    // Update hover state
    this.hoverState.isLeavingLink = true;

    // Only close non-pinned popups
    // Add a delay before closing to allow moving to the popup
    setTimeout(() => {
      // If we're now hovering the popup, don't close it
      if (this.isMouseOverPopupOrLink(event)) {
        return;
      }

      // Find the popup for this link
      const popup = this.findPopupForLink(link);

      // Only close unpinned popups
      if (popup && !popup.classList.contains("pinned")) {
        // Remove the popup with a fade-out effect
        popup.style.opacity = "0";

        // Remove after fade completes
        setTimeout(() => {
          if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
          }
        }, this.config.fadeOutDuration);
      }
    }, 300); // Increased from 100ms to 300ms for more forgiving hover behavior
  },

  // Handle click events on links
  handleLinkClick(event) {
    // Allow the default link behavior - immediately navigate to the link
    // No need to prevent default or show popups on click

    // The only thing we need to do is close any existing popups that might be showing
    this.closeAllNonPinnedPopups();

    // Log for debugging
    this.log(
      "Link clicked, allowing navigation to: " + event.currentTarget.href,
    );

    // The browser will handle the navigation automatically
  },

  // Find popup associated with a link
  findPopupForLink(link) {
    // Go through all popups in the container
    for (const popup of this.popupContainer.children) {
      if (popup.dataset.linkHref === link.href) {
        return popup;
      }
    }
    return null;
  },

  // Create a popup for a link
  spawnPopupForLink(link, event, pinned = false) {
    // Check if we have too many popups already
    if (this.popupRegistry.size >= this.config.maxPopups) {
      this.closeAllNonPinnedPopups();
    }

    // Create the popup element
    const popup = document.createElement("DIV");
    popup.className = "popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-modal", "false");
    popup.style.opacity = "0";

    // Set initial dimensions
    popup.style.width = `${this.config.minWidth}px`;
    popup.style.height = `${this.config.minHeight + 50}px`; // Start with reasonable height

    // Generate a unique ID for this popup
    const popupId = `popup-${++this.popupCounter}`;
    popup.id = popupId;

    // Add popup to container
    this.popupContainer.appendChild(popup);

    // Set data attributes
    popup.setAttribute("data-link-href", link.href);
    popup.setAttribute("data-spawned-at", Date.now());
    if (pinned) {
      popup.setAttribute("data-pinned", "true");
    }

    // Create popup structure
    this.createPopupStructure(popup, link);

    // Position popup near mouse or link
    this.positionPopup(popup, event, link);

    // Load content
    this.loadPopupContent(popup, link);

    // Register popup
    this.popupRegistry.set(popupId, popup);

    // Bring to front
    this.bringToFront(popup);

    // Fade in
    setTimeout(() => {
      popup.style.opacity = "1";
    }, 10);

    // Add resize capability
    this.addResizeCapability(popup);

    // Return the created popup
    return popup;
  },

  // Create the internal structure of the popup
  createPopupStructure(popup, link) {
    // Create title bar
    const titleBar = document.createElement("DIV");
    titleBar.className = "popup-title-bar";
    titleBar.addEventListener(
      "mousedown",
      this.handleTitleBarMouseDown.bind(this),
    );

    // Enlarge button (left side) - opens the link in the current tab
    const enlargeButton = document.createElement("BUTTON");
    enlargeButton.className = "popup-title-bar-button enlarge-button";
    enlargeButton.title = "Open link in current tab";
    enlargeButton.innerHTML = '<span class="popup-icon enlarge">⛶</span>';

    // Improve event handling with both click and mousedown listeners
    enlargeButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Open the link in the current tab
      window.location.href = link.href;
      console.log("Link opened in current tab");
    });

    // Add mousedown handler as a fallback for desktop browsers
    enlargeButton.addEventListener("mousedown", (e) => {
      // Only handle left mouse button
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
    });

    titleBar.appendChild(enlargeButton);

    // Add custom resize capability
    this.addResizeCapability(popup);

    // Store the original dimensions so we can restore on double-click
    popup.originalWidth = popup.style.width;
    popup.originalHeight = popup.style.height;

    // Add double-click handler to restore original dimensions
    popup.addEventListener("dblclick", (e) => {
      // Only if clicking on edges (not content)
      if (
        !e.target.closest(".popframe-content-view") &&
        !e.target.closest(".popup-title-bar")
      ) {
        if (popup.originalWidth && popup.originalHeight) {
          popup.style.width = popup.originalWidth;
          popup.style.height = popup.originalHeight;
        }
      }
    });

    // Title text (make it clickable)
    const titleText = document.createElement("A");
    titleText.className = "popup-title-bar-title";

    // Determine title text based on link content
    let titleContent = "";

    // If link contains an image, use alt text or "Image" as the title
    const linkImage = link.querySelector("img");
    if (linkImage) {
      titleContent = linkImage.alt || "Image";
    }
    // If link is a heading or contains a heading, use the heading text
    else if (
      link.closest("h1, h2, h3, h4, h5, h6") ||
      link.querySelector("h1, h2, h3, h4, h5, h6")
    ) {
      const heading =
        link.closest("h1, h2, h3, h4, h5, h6") ||
        link.querySelector("h1, h2, h3, h4, h5, h6");
      titleContent = heading.textContent.trim();
    }
    // Otherwise use the link text or href
    else {
      titleContent = link.textContent.trim() || link.href;
    }

    titleText.textContent = titleContent;
    titleText.href = link.href;

    // Use the same target as the original link, or default to current tab
    titleText.target = link.target || "_self";

    // For external links, use _blank with noopener
    if (this.isExternalLink(link.href)) {
      titleText.target = "_blank";
      titleText.rel = "noopener";
      titleText.title = "Open in new tab";
    } else {
      titleText.title = "Open link";
    }

    // Prevent the mousedown event from propagating (would conflict with drag)
    titleText.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    // Add explicit click handler to ensure proper behavior
    titleText.addEventListener("click", (e) => {
      e.stopPropagation();
      // No need to prevent default as we want the link to work
      console.log("Title clicked, opening in new tab");
    });

    // Create a title wrapper that will take up the flex space
    const titleWrapper = document.createElement("DIV");
    titleWrapper.style.flex = "1";
    titleWrapper.style.textAlign = "center";
    titleWrapper.appendChild(titleText);

    titleBar.appendChild(titleWrapper);

    // Close button (right side)
    const closeButton = document.createElement("BUTTON");
    closeButton.className = "popup-title-bar-button close-button";
    closeButton.title = "Close";
    closeButton.innerHTML = '<span class="popup-icon close">×</span>';

    // Improve event handling with both click and mousedown listeners
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Get a reference to the popup
      const popup = e.currentTarget.closest(".popup");
      if (!popup) return;

      // Force immediate removal
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
        console.log("Popup forcefully closed");
      }
    });

    // Add mousedown handler as a fallback for desktop browsers
    closeButton.addEventListener("mousedown", (e) => {
      // Only handle left mouse button
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      // Get a reference to the popup
      const popup = e.currentTarget.closest(".popup");
      if (!popup) return;

      // Force immediate removal
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
        console.log("Popup forcefully closed via mousedown");
      }
    });

    titleBar.appendChild(closeButton);

    popup.appendChild(titleBar);

    // Create scroll view
    const scrollView = document.createElement("DIV");
    scrollView.className = "popframe-scroll-view";
    popup.scrollView = scrollView; // Store reference for convenience
    popup.appendChild(scrollView);

    // Create content view
    const contentView = document.createElement("DIV");
    contentView.className = "popframe-content-view";
    scrollView.appendChild(contentView);

    // Store references
    popup.contentView = contentView;
    popup.titleBar = titleBar;
    popup.titleText = titleText;

    // Add mouseenter event to track when we're inside the popup
    popup.addEventListener("mouseenter", () => {
      this.hoverState.currentPopup = popup;
      this.hoverState.isLeavingPopup = false;
    });

    // Enable resizing for the popup
    popup.addEventListener("mousedown", (e) => {
      // Don't interfere with normal title bar drag operations
      if (e.target.closest(".popup-title-bar")) {
        return;
      }

      // Don't interfere with button clicks
      if (e.target.closest("button")) {
        return;
      }
    });
  },

  // Load content into popup
  loadPopupContent(popup, link) {
    const contentView = popup.contentView;
    const url = link.href;

    // Check if link is a PDF file
    if (url.toLowerCase().endsWith(".pdf")) {
      this.loadPdfPreview(popup, link);
      return;
    }

    // Check if link is an internal fragment/anchor link
    if (
      url.startsWith("#") ||
      (url.includes("#") &&
        new URL(url, window.location.href).pathname ===
          window.location.pathname)
    ) {
      this.loadAnchorContent(popup, link);
      return;
    }

    // Check if the link is external
    const isExternal = this.isExternalLink(url);

    if (isExternal) {
      // Display an external link message instead of trying to fetch
      this.loadExternalLinkPreview(popup, url);
      return;
    }

    // Create timeout for loading
    const loadingTimeout = setTimeout(() => {
      contentView.innerHTML =
        '<div class="popup-error">Loading timed out</div>';
      popup.classList.remove("loading");
      // Still need to adjust position even if loading failed
      this.adjustPopupPosition(popup);
    }, this.config.loadingTimeout);

    // For math content, load the page in an iframe to leverage existing math rendering
    const hasMathParam =
      url.includes("math=true") ||
      document.querySelector(`a[href="${url}"][data-math="true"]`);

    if (hasMathParam) {
      // Mark this popup as having an iframe
      popup.classList.add("has-iframe");

      // Create an iframe for math content
      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.src = url;

      // Set up load handler
      iframe.onload = () => {
        clearTimeout(loadingTimeout);
        popup.classList.remove("loading");

        try {
          // Extract title from iframe
          const iframeTitle = iframe.contentDocument.querySelector("title");
          if (iframeTitle && popup.titleText) {
            popup.titleText.textContent = iframeTitle.textContent;
          }

          // Size the iframe based on content
          setTimeout(() => {
            this.adjustPopupPosition(popup);
          }, 100);
        } catch (e) {
          // Handle cross-origin issues
          console.error("Could not access iframe content:", e);
        }
      };

      // Clear content view and add iframe
      contentView.innerHTML = "";
      contentView.appendChild(iframe);
      return;
    }

    // Regular content fetch for non-math pages
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        // Clear timeout
        clearTimeout(loadingTimeout);

        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Extract title
        const title = doc.querySelector("title");
        if (title && popup.titleText) {
          popup.titleText.textContent = title.textContent;
        }

        // Extract content - prefer the main content area or article
        let content =
          doc.querySelector("main") ||
          doc.querySelector("article") ||
          doc.querySelector(".content") ||
          doc.querySelector("#content");

        // Fallback to body if no content found
        if (!content) {
          content = doc.body;
        }

        // Create popup content structure
        const popupContent = document.createElement("DIV");
        popupContent.className = "popup-content";

        // Add content body - no extra title needed since we have one in the title bar
        const popupBody = document.createElement("DIV");
        popupBody.className = "popup-body";

        // Clone the content
        const clonedContent = content.cloneNode(true);

        // Process the content
        this.processPopupContent(clonedContent);

        popupBody.appendChild(clonedContent);
        popupContent.appendChild(popupBody);

        // Set the content
        contentView.innerHTML = "";
        contentView.appendChild(popupContent);

        // Remove loading class
        popup.classList.remove("loading");

        // Position the popup after content has loaded and rendered
        setTimeout(() => {
          this.adjustPopupPosition(popup);
        }, 10);

        // Ensure popups don't nest too deeply by limiting recursion
        popup.dataset.popupDepth = link.closest(".popup")
          ? parseInt(link.closest(".popup").dataset.popupDepth || "0") + 1
          : 1;

        // Only set up recursive popups if we're not too deep
        if (parseInt(popup.dataset.popupDepth) < 3) {
          // Setup link handlers for the new content
          this.setupRecursivePopups(popup);
        }
      })
      .catch((error) => {
        clearTimeout(loadingTimeout);
        contentView.innerHTML = `<div class="popup-error">Error loading content: ${error.message}</div>`;
        popup.classList.remove("loading");
        // Still adjust position even if there's an error
        this.adjustPopupPosition(popup);
      });
  },

  // Load content for anchor/fragment links
  loadAnchorContent(popup, link) {
    // Get the fragment ID from the link
    const href = link.getAttribute("href");
    const fragmentId = href.includes("#")
      ? href.substring(href.indexOf("#"))
      : "";

    if (!fragmentId) {
      popup.contentView.innerHTML =
        '<div class="popup-error">No fragment identifier found in link</div>';
      popup.classList.remove("loading");
      return;
    }

    // Mark this popup as having an iframe
    popup.classList.add("has-iframe");

    // Position exactly at the link with no offset
    const linkRect = link.getBoundingClientRect();
    popup.style.left = `${linkRect.left}px`;
    popup.style.top = `${window.scrollY + linkRect.top}px`;
    popup.style.width = "auto";

    // Create the URL for the iframe (current page with fragment)
    const iframeSrc =
      window.location.pathname + window.location.search + fragmentId;

    // Create an iframe for the content
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.src = iframeSrc;

    // Set up a loading timeout
    const loadingTimeout = setTimeout(() => {
      popup.contentView.innerHTML =
        '<div class="popup-error">Loading timed out</div>';
      popup.classList.remove("loading");
      this.adjustPopupPosition(popup);
    }, this.config.loadingTimeout);

    // Set up load handler to highlight the target and adjust positioning
    iframe.onload = () => {
      clearTimeout(loadingTimeout);
      popup.classList.remove("loading");

      try {
        const iframeDocument = iframe.contentDocument;

        // Find the target element
        let targetElement = iframeDocument.querySelector(fragmentId);

        // For footnotes that use the "name" attribute instead of "id"
        if (!targetElement && fragmentId.startsWith("#fn")) {
          targetElement = iframeDocument.querySelector(
            `[name="${fragmentId.substring(1)}"]`,
          );
        }

        // If still not found, check for elements that have the ID as a substring
        // (handles cases like "fn1" vs "fn1:1" or variations in ID formats)
        if (!targetElement) {
          const idWithoutHash = fragmentId.substring(1);
          const possibleMatches = iframeDocument.querySelectorAll(
            `[id*="${idWithoutHash}"], [name*="${idWithoutHash}"]`,
          );
          if (possibleMatches.length > 0) {
            targetElement = possibleMatches[0];
          }
        }

        // If we found the target, highlight it and scroll to it
        if (targetElement) {
          // Add a class to ensure collapsible content is visible if target is inside one
          // Check if the target element is inside a collapsible section
          let collapsibleParent = targetElement.closest(".collapsible-content");
          if (collapsibleParent) {
            // Force the collapsible content to be visible
            collapsibleParent.classList.add("show");

            // Find and update the associated toggle button if needed
            const containerId = collapsibleParent.closest(
              ".collapsible-container",
            )?.id;
            if (containerId) {
              const toggleButton = iframeDocument.querySelector(
                `[aria-controls="${containerId}"]`,
              );
              if (toggleButton) {
                toggleButton.setAttribute("aria-expanded", "true");
                toggleButton.textContent = "▼";
              }
            }
          }

          // Add a small delay to ensure the DOM updates have taken effect
          setTimeout(() => {
            // Scroll to the target with a smooth behavior and offset
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });

            // Apply highlight styling and animation to the target
            targetElement.style.backgroundColor = "rgba(255, 255, 0, 0.5)";
            targetElement.style.padding = "5px";
            targetElement.style.borderRadius = "3px";
            targetElement.style.animation = "target-highlight 2s ease";

            // Check if this is a footnote and add a label
            if (fragmentId.startsWith("#fn")) {
              const footnoteLabel = document.createElement("span");
              footnoteLabel.textContent = "Footnote:";
              footnoteLabel.style.fontWeight = "bold";
              footnoteLabel.style.marginRight = "5px";
              footnoteLabel.style.color = "var(--accent)";

              if (targetElement.firstChild) {
                targetElement.insertBefore(
                  footnoteLabel,
                  targetElement.firstChild,
                );
              } else {
                targetElement.appendChild(footnoteLabel);
              }
            }

            // Set the title based on the content
            if (popup.titleText) {
              if (fragmentId.startsWith("#fn")) {
                popup.titleText.textContent =
                  "Footnote " + fragmentId.substring(3);
              } else {
                // Try to find a heading within the section first
                const heading = targetElement.querySelector(
                  "h1, h2, h3, h4, h5, h6",
                );
                if (heading) {
                  popup.titleText.textContent = heading.textContent;
                } else if (targetElement.tagName.match(/^H[1-6]$/)) {
                  popup.titleText.textContent = targetElement.textContent;
                } else {
                  popup.titleText.textContent =
                    "Section " + fragmentId.substring(1);
                }
              }
            }

            // Remove sidebar elements to save space and focus on content
            const sidebarElements = iframeDocument.querySelectorAll(
              ".sidebar, .toc, nav.TableOfContents",
            );
            sidebarElements.forEach((el) => {
              if (el) el.style.display = "none";
            });

            // Force layout recalculation to ensure proper scrolling
            iframe.style.height = "500px";

            // Measure content width and adjust the popup width
            const contentWidth = Math.max(
              targetElement.scrollWidth,
              targetElement.parentElement
                ? targetElement.parentElement.scrollWidth
                : 0,
              600, // Minimum reasonable width
            );

            popup.style.width = `${contentWidth}px`;

            // Adjust position to keep on screen
            this.adjustPopupPosition(popup);
          }, 100);
        } else {
          popup.contentView.innerHTML = `<div class="popup-error">Target element "${fragmentId}" not found</div>`;
        }
      } catch (e) {
        popup.contentView.innerHTML = `<div class="popup-error">Error: ${e.message}</div>`;
        this.log("Error in iframe load handler:", e);
      }
    };

    // Clear content and add iframe
    popup.contentView.innerHTML = "";
    popup.contentView.appendChild(iframe);
  },

  // Helper to determine if a URL is external
  isExternalLink(url) {
    // If it's a relative URL, it's not external
    if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
      return false;
    }

    try {
      // Check if the hostname matches the current site
      const currentHost = window.location.hostname;
      const urlHost = new URL(url).hostname;
      return currentHost !== urlHost;
    } catch {
      // If there's an error parsing the URL, assume it's external
      return true;
    }
  },

  // Load a preview for external links
  loadExternalLinkPreview(popup, url) {
    const contentView = popup.contentView;

    try {
      // Parse the URL to get more information
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;

      // Update the title
      if (popup.titleText) {
        popup.titleText.textContent = hostname;
      }

      // Create a nice preview for external links
      const externalContent = document.createElement("DIV");
      externalContent.className = "popup-content external-link-preview";

      // Add favicon if available
      let faviconHtml = "";
      try {
        faviconHtml = `<img src="https://${hostname}/favicon.ico" class="external-favicon" onerror="this.style.display='none';" />`;
      } catch {
        // Ignore favicon errors
      }

      externalContent.innerHTML = `
        <div class="popup-body">
          <div class="external-link-info">
            ${faviconHtml}
            <p><strong>Website:</strong> ${hostname}</p>
            <p><strong>Path:</strong> ${pathname || "/"}</p>
            <p>This is an external link. Click the title to open it in a new tab.</p>
          </div>
        </div>
      `;

      // Set the content
      contentView.innerHTML = "";
      contentView.appendChild(externalContent);

      // Remove loading class
      popup.classList.remove("loading");
    } catch {
      // If there's an error, show a simple message
      contentView.innerHTML = `
        <div class="popup-error">
          <p>This is an external link to:</p>
          <p><a href="${url}" target="_blank" rel="noopener">${url}</a></p>
        </div>
      `;
      popup.classList.remove("loading");
    }
  },

  // Process popup content to clean it up
  processPopupContent(element) {
    if (!element) return;

    // Remove scripts and iframes for security
    const scriptsAndIframes = element.querySelectorAll("script, iframe");
    scriptsAndIframes.forEach((node) => node.remove());

    // Remove sidebars and navigation
    const elementsToRemove = element.querySelectorAll(
      '.sidebar, .sidebar-tree, [class*="sidebar"], nav, footer, header',
    );
    elementsToRemove.forEach((node) => node.remove());

    // Process links differently - DON'T add no-popup class to all links
    const links = element.querySelectorAll("a");
    links.forEach((link) => {
      // Only external links should open in new tabs
      if (this.isExternalLink(link.href)) {
        link.target = "_blank";
        link.rel = "noopener";
        link.classList.add("no-popup"); // No popup for external links
      } else {
        // Keep internal links functional for recursive popups
        link.classList.remove("no-popup");
      }
    });

    // Fix relative image paths
    const images = element.querySelectorAll("img");
    images.forEach((img) => {
      if (img.src && img.src.startsWith("/")) {
        // Get the base URL
        const baseUrl = window.location.origin;
        img.src = baseUrl + img.getAttribute("src");
      }
    });
  },

  // Enable recursive popups inside existing popups
  setupRecursivePopups(popup) {
    // Find all links inside this popup that should have popups
    const links = popup.querySelectorAll(
      "a:not(.no-popup):not([href^='javascript:'])",
    );

    links.forEach((link) => {
      // Skip links that already have handlers
      if (this.linkRegistry.has(link)) {
        return;
      }

      // Register link events
      link.addEventListener("mouseenter", this.handleLinkMouseEnter.bind(this));
      link.addEventListener("mouseleave", this.handleLinkMouseLeave.bind(this));
      link.addEventListener("click", this.handleLinkClick.bind(this));

      // Mark link as registered
      this.linkRegistry.set(link, true);

      // Add visual indicator for links with popups
      link.classList.add("has-popup");
    });
  },

  // Remove a popup
  despawnPopup(popup) {
    // Don't close pinned popups
    if (popup.classList.contains("pinned")) {
      return;
    }

    // Get popup ID and clean up registry
    const popupId = popup.dataset.popupId;
    if (popupId && this.popupRegistry.has(parseInt(popupId))) {
      this.popupRegistry.delete(parseInt(popupId));
    }

    // If this is the current popup in the hover state, clear it
    if (this.hoverState.currentPopup === popup) {
      this.hoverState.currentPopup = null;
    }

    // Remove immediately
    if (popup.parentNode) {
      popup.parentNode.removeChild(popup);
      this.log("Popup removed from DOM");
    }
  },

  // Adjust popup position to ensure it's within viewport
  adjustPopupPosition(popup) {
    // First let the popup render with its natural size
    setTimeout(() => {
      const rect = popup.getBoundingClientRect();
      // Increase margin to ensure popups aren't right at the edge
      const margin = this.config.initialPositionMargin || 50; // Increased from 20 to 50
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Check if on mobile (screen width below 768px)
      const isMobile = window.innerWidth <= 768;

      // For mobile, center horizontally and just worry about vertical positioning
      if (isMobile) {
        // Center horizontally with a fixed width
        const mobileWidth = Math.min(viewport.width - 20, this.config.minWidth);
        popup.style.width = `${mobileWidth}px`;
        popup.style.left = `${(viewport.width - mobileWidth) / 2}px`;

        // Adjust vertical position to ensure it's visible
        let newTop = parseFloat(popup.style.top);

        // Make sure it's not too high
        if (rect.top < margin) {
          newTop = margin;
        }

        // Make sure it's not too low
        if (
          rect.bottom > viewport.height - margin &&
          rect.height < viewport.height - margin * 2
        ) {
          newTop = viewport.height - rect.height - margin;
        } else if (rect.bottom > viewport.height - margin) {
          // If popup is taller than viewport, position to show the top
          newTop = margin;
        }

        popup.style.top = `${newTop}px`;

        // Log for debugging
        this.log(
          `Mobile positioned popup: width=${mobileWidth}, left=${popup.style.left}, top=${newTop}`,
        );
        return;
      }

      // Desktop positioning logic
      // Get current rect for positioning calculations
      const currentRect = popup.getBoundingClientRect();

      // Original position (parse as float to handle potential non-numeric values)
      let newLeft = parseFloat(popup.style.left) || currentRect.left;
      let newTop = parseFloat(popup.style.top) || currentRect.top;

      // Standard edge checking for all popups
      // Check right edge
      if (currentRect.right > viewport.width - margin) {
        newLeft = viewport.width - currentRect.width - margin;
      }

      // Check bottom edge
      if (currentRect.bottom > viewport.height - margin) {
        newTop = viewport.height - currentRect.height - margin;
      }

      // Check left edge
      if (currentRect.left < margin) {
        newLeft = margin;
      }

      // Check top edge
      if (currentRect.top < margin) {
        newTop = margin;
      }

      // Apply position if needed (only adjust position if necessary)
      popup.style.left = `${Math.round(newLeft)}px`;
      popup.style.top = `${Math.round(newTop)}px`;

      // Log for debugging
      this.log(
        `Positioned popup: width=${currentRect.width}, left=${newLeft}, top=${newTop}`,
      );
    }, 10);
  },

  // Reposition all popups (e.g., after window resize)
  repositionPopups() {
    const popups = Array.from(this.popupContainer.children);
    popups.forEach((popup) => {
      if (!popup.classList.contains("zoomed")) {
        this.adjustPopupPosition(popup);
      }
    });
  },

  // Handle mousedown on popup title bar (for dragging)
  handleTitleBarMouseDown(event) {
    // Only handle left mouse button
    if (event.button !== 0) return;

    const titleBar = event.currentTarget;
    const popup = titleBar.closest(".popup");

    if (!popup) return;

    // Prevent text selection during drag
    event.preventDefault();

    // Compute offset within title bar
    const rect = popup.getBoundingClientRect();

    this.dragging = {
      active: true,
      popup: popup,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      lastMoveTime: null,
    };

    popup.classList.add("dragging");

    // Bring to front
    this.bringToFront(popup);
  },

  // Handle mouse move during dragging
  handleMouseMove(event) {
    if (!this.dragging.active || !this.dragging.popup) return;

    // Use throttling to prevent performance issues
    const now = Date.now();
    if (!this.dragging.lastMoveTime) this.dragging.lastMoveTime = 0;

    // Throttle to ~500fps (quartered from before)
    if (now - this.dragging.lastMoveTime < 2) return;
    this.dragging.lastMoveTime = now;

    // Calculate new position based on mouse movement and initial offset
    const newLeft = event.clientX - this.dragging.offsetX;
    const newTop = event.clientY - this.dragging.offsetY;

    // Add boundaries to prevent losing the popup off-screen
    const popup = this.dragging.popup;
    const rect = popup.getBoundingClientRect();
    const minVisibleSize = 100; // Minimum visible size to ensure popup can be retrieved

    // Calculate bounded positions
    const boundedLeft = Math.min(
      Math.max(newLeft, -rect.width + minVisibleSize),
      window.innerWidth - minVisibleSize,
    );

    const boundedTop = Math.min(
      Math.max(newTop, -rect.height + minVisibleSize),
      window.innerHeight - minVisibleSize,
    );

    // Apply the new position
    popup.style.left = `${boundedLeft}px`;
    popup.style.top = `${boundedTop}px`;
  },

  // Handle mouseup to end dragging
  handleMouseUp() {
    if (!this.dragging.active) return;

    const popup = this.dragging.popup;
    popup.classList.remove("dragging");

    // Reset dragging state
    this.dragging = {
      active: false,
      popup: null,
      offsetX: 0,
      offsetY: 0,
      lastMoveTime: null,
    };

    // Ensure popup is within viewport
    this.adjustPopupPosition(popup);
  },

  // Bring a popup to the front
  bringToFront(popup) {
    // Add to end of container (will be on top due to DOM order)
    this.popupContainer.appendChild(popup);
  },

  // Handle key events (like Escape to close popups)
  handleKeyDown(event) {
    if (event.key === "Escape") {
      // Close all non-pinned popups or just the top one
      const popups = Array.from(this.popupContainer.children);
      if (popups.length > 0) {
        this.log(`Escape key pressed, closing ${popups.length} popups`);
        popups.forEach((popup) => this.despawnPopup(popup));
        event.preventDefault();
        event.stopPropagation();
      }
    }
  },

  // Logging helper
  log(message) {
    if (this.config.debug) {
      console.log(`[Popups] ${message}`);
    }
  },

  // Helper function to measure natural content width
  measureNaturalContentWidth(popup) {
    // Create a clone of the popup for measuring
    const clone = popup.cloneNode(true);

    // Set styles for measuring natural width
    clone.style.position = "absolute";
    clone.style.visibility = "hidden";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.width = "auto";
    clone.style.maxWidth = "none";
    clone.style.minWidth = "0";

    // Add to document to measure
    document.body.appendChild(clone);

    // Measure natural width
    const naturalWidth = clone.getBoundingClientRect().width;

    // Clean up
    document.body.removeChild(clone);

    // Return the natural width, with a minimum cap
    return Math.max(naturalWidth, this.config.minWidth);
  },

  // Add custom resize capability to popup
  addResizeCapability(popup) {
    // Create resize handles for all 8 directions (4 corners + 4 edges)
    const directions = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

    // Create and append all resize handles
    directions.forEach((dir) => {
      const handle = document.createElement("DIV");
      handle.className = `popup-resize-handle ${dir}`;
      handle.setAttribute("data-direction", dir);
      popup.appendChild(handle);

      // Add mousedown event listener for each handle
      handle.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Start resizing - bind to this closure
        let resizing = true;
        const direction = dir;

        // Get the current popup position and size
        const rect = popup.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = rect.width;
        const startHeight = rect.height;
        const startLeft = parseInt(popup.style.left) || rect.left;
        const startTop = parseInt(popup.style.top) || rect.top;

        // Get the scroll view element for later use
        const scrollView = popup.querySelector(".popframe-scroll-view");

        // Force the popup to have explicit width, height and position
        popup.style.width = `${rect.width}px`;
        popup.style.height = `${rect.height}px`;
        popup.style.left = `${startLeft}px`;
        popup.style.top = `${startTop}px`;

        // Set the body cursor based on direction
        document.body.style.cursor = getComputedStyle(handle).cursor;

        // Add a class to the popup to indicate it's being resized
        popup.classList.add("resizing");

        // Bring the popup to front
        if (typeof window.Popups.bringToFront === "function") {
          window.Popups.bringToFront(popup);
        }

        // Variables for throttling
        let lastMoveTime = Date.now();
        const throttleInterval = 2; // Reduced from 8ms to 2ms (4x faster)

        // Handle mousemove for resize with throttling
        function handleMouseMove(e) {
          if (!resizing) return;

          // Throttle resize operations to prevent losing the window
          const now = Date.now();
          if (now - lastMoveTime < throttleInterval) return;
          lastMoveTime = now;

          // Calculate position changes
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;

          // Get minimum dimensions
          const minWidth = 150;
          const minHeight = 100;

          // Calculate new dimensions and position based on resize direction
          let newWidth = startWidth;
          let newHeight = startHeight;
          let newLeft = startLeft;
          let newTop = startTop;

          // Add safety bounds to prevent window from disappearing
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const minVisibleSize = 50; // Minimum visible area to prevent losing the popup

          // Handle width and horizontal position changes
          if (direction.includes("e")) {
            // East (right) edge - only width changes
            newWidth = Math.max(minWidth, startWidth + deltaX);
            // Ensure the popup doesn't expand beyond the viewport
            newWidth = Math.min(
              newWidth,
              viewportWidth - newLeft - minVisibleSize,
            );
          } else if (direction.includes("w")) {
            // West (left) edge - width and left position both change
            const widthChange = deltaX;
            newWidth = Math.max(minWidth, startWidth - widthChange);

            // Only adjust the left position if we haven't hit the minimum width
            if (newWidth > minWidth) {
              newLeft = Math.min(
                startLeft + widthChange,
                viewportWidth - minVisibleSize,
              );
              // Ensure at least part of the popup remains visible
              newLeft = Math.max(newLeft, -newWidth + minVisibleSize);
            }
          }

          // Handle height and vertical position changes
          if (direction.includes("s")) {
            // South (bottom) edge - only height changes
            newHeight = Math.max(minHeight, startHeight + deltaY);
            // Ensure the popup doesn't expand beyond the viewport
            newHeight = Math.min(
              newHeight,
              viewportHeight - newTop - minVisibleSize,
            );
          } else if (direction.includes("n")) {
            // North (top) edge - height and top position both change
            const heightChange = deltaY;
            newHeight = Math.max(minHeight, startHeight - heightChange);

            // Only adjust the top position if we haven't hit the minimum height
            if (newHeight > minHeight) {
              newTop = Math.min(
                startTop + heightChange,
                viewportHeight - minVisibleSize,
              );
              // Ensure at least part of the popup remains visible
              newTop = Math.max(newTop, -newHeight + minVisibleSize);
            }
          }

          // Apply the new dimensions and position
          popup.style.width = `${newWidth}px`;
          popup.style.height = `${newHeight}px`;
          popup.style.left = `${newLeft}px`;
          popup.style.top = `${newTop}px`;

          // Update immediately instead of waiting for next animation frame
          if (scrollView) {
            scrollView.style.maxHeight = `calc(100% - var(--popup-title-bar-height))`;
            // Ensure content stretches to fill the new size
            scrollView.style.height = `calc(${newHeight}px - var(--popup-title-bar-height))`;
          }
        }

        // Handle mouseup to end resize
        function handleMouseUp() {
          resizing = false;
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);

          // Reset resizing state
          popup.classList.remove("resizing");
          document.body.style.cursor = "";

          // Ensure content layout updates
          if (scrollView) {
            scrollView.style.maxHeight = `calc(100% - var(--popup-title-bar-height))`;
            // Set explicit height to ensure content fills the container
            scrollView.style.height = `calc(100% - var(--popup-title-bar-height))`;
          }
        }

        // Add document event listeners
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      });
    });
  },

  // Position the popup relative to the source
  positionPopup(popup, event, link) {
    // Default position is centered on screen
    let posX = window.innerWidth / 2 - this.config.minWidth / 2;
    let posY = window.innerHeight / 3; // Position in the upper third of screen

    // If we have event coordinates, use those
    if (event && event.clientX && event.clientY) {
      // Position popup very close to cursor, with slight overlap to create a bridge
      // Use negative offset to create overlap, eliminating the "no-mans-land" gap
      posX = event.clientX - 5; // Slight overlap to the left
      posY = event.clientY - 5; // Slight overlap above

      // Ensure the cursor is over the popup by checking if we need to adjust
      if (posX < 0) posX = event.clientX + 2;
      if (posY < 0) posY = event.clientY + 2;
    }
    // If no event, position near the link
    else if (link) {
      const linkRect = link.getBoundingClientRect();
      // Position with slight overlap to create a bridge
      posX = linkRect.right - 3; // Slight overlap with link
      posY = linkRect.top - 3; // Slight overlap with link

      // If positioning would push off right edge, position to the left of the link
      if (posX + this.config.minWidth > window.innerWidth) {
        posX = Math.max(0, linkRect.left - this.config.minWidth + 3); // Overlap on left side
      }
    }

    // Apply initial position
    popup.style.left = `${posX}px`;
    popup.style.top = `${posY}px`;

    // Use consistent dimensions for all popups - 450px by default
    const standardWidth = 450;
    const standardHeight = 400;

    popup.style.width = `${standardWidth}px`;
    popup.style.height = `${standardHeight}px`;

    // Fine-tune position after the popup is rendered
    this.adjustPopupPosition(popup);
  },

  // Load PDF content in an iframe for preview
  loadPdfPreview(popup, link) {
    const contentView = popup.contentView;

    // Get the URL
    const url = link.href;

    // Mark this popup as having an iframe and add a special class for PDF styling
    popup.classList.add("has-iframe", "pdf-preview");

    // Create loading indicator
    contentView.innerHTML =
      '<div class="popup-loading">Loading PDF preview...</div>';

    // Update the title
    if (popup.titleText) {
      // Extract filename from URL
      const filename = url.split("/").pop();
      popup.titleText.textContent = `PDF: ${filename}`;
    }

    // Create a container for better size control
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.overflow = "hidden";
    container.style.display = "flex";
    container.style.flexDirection = "column";

    // Create the iframe for PDF content
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.flexGrow = "1";
    iframe.src = url;

    // Add the iframe to the container
    container.appendChild(iframe);

    // Apply some essential styles to the content view
    contentView.style.padding = "0";
    contentView.style.margin = "0";
    contentView.style.height = "calc(100% - 40px)"; // Account for title bar
    contentView.style.display = "flex";
    contentView.style.flexDirection = "column";
    contentView.style.overflow = "hidden";

    // Ensure that the popup body also fills available space
    const popupBody = popup.querySelector(".popup-body") || contentView;
    if (popupBody) {
      popupBody.style.height = "100%";
      popupBody.style.display = "flex";
      popupBody.style.flexDirection = "column";
      popupBody.style.overflow = "hidden";
      popupBody.style.padding = "0";
      popupBody.style.margin = "0";
    }

    // Set up load handler
    iframe.onload = () => {
      // Remove loading class
      popup.classList.remove("loading");

      // Make the popup larger to accommodate the PDF viewer controls
      popup.style.minWidth = "800px";
      popup.style.minHeight = "600px";

      // Ensure all popup parts have full height
      // This is critical for proper height allocation
      popup.style.display = "flex";
      popup.style.flexDirection = "column";

      // Set fixed height on container
      container.style.height = contentView.offsetHeight + "px";

      // Adjust position after content has loaded
      setTimeout(() => {
        this.adjustPopupPosition(popup);
      }, 50);
    };

    // Clear content view and add container
    contentView.innerHTML = "";
    contentView.appendChild(container);

    // Add basic resize capability
    this.makeIframeResponsive(popup);

    // Add a resize handler specifically for fixing height on resize
    const resizeHandler = () => {
      if (container.offsetHeight < contentView.offsetHeight) {
        container.style.height = contentView.offsetHeight + "px";
      }
    };

    // Create a MutationObserver to handle dynamic resize
    if (window.MutationObserver) {
      const observer = new MutationObserver(resizeHandler);
      observer.observe(popup, { attributes: true, attributeFilter: ["style"] });
      popup._pdfObserver = observer; // Store for cleanup
    }

    // Add a resize event for window resize
    window.addEventListener("resize", resizeHandler);

    // Create a cleanup function
    popup._pdfCleanup = () => {
      window.removeEventListener("resize", resizeHandler);
      if (popup._pdfObserver) {
        popup._pdfObserver.disconnect();
        delete popup._pdfObserver;
      }
    };

    // Handle popup close to clean up resources
    const originalDespawn = this.despawnPopup;
    if (originalDespawn && !this._pdfDespawnOverridden) {
      this.despawnPopup = (popupToClose) => {
        if (popupToClose._pdfCleanup) {
          popupToClose._pdfCleanup();
        }
        return originalDespawn.call(this, popupToClose);
      };
      this._pdfDespawnOverridden = true;
    }
  },

  // Ensure PDF-specific styles are added to the document
  ensurePdfStyles() {
    // Check if we've already added the styles
    if (document.getElementById("popup-pdf-styles")) {
      return;
    }

    // Create style element
    const style = document.createElement("style");
    style.id = "popup-pdf-styles";
    style.textContent = `
      /* Keep the main popup container with proper background */
      .popup.pdf-preview {
        padding: 0 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        /* Don't make the main popup transparent */
      }
      
      /* Keep the title bar visible with its original styling */
      .popup.pdf-preview .popup-title-bar {
        margin-bottom: 0 !important;
        flex-shrink: 0 !important;
        /* Keep original background */
      }
      
      /* Only make the content area transparent for PDF viewing */
      .popup.pdf-preview .popup-content-view {
        padding: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        height: calc(100% - 40px) !important; /* Exact calculation for title bar */
        background-color: transparent !important;
      }
      
      .popup.pdf-preview .popup-body {
        padding: 0 !important;
        margin: 0 !important;
        height: 100% !important;
        background-color: transparent !important;
      }
      
      .popup.pdf-preview .pdf-iframe-wrapper {
        width: 100% !important;
        height: 100% !important;
        flex: 1 !important;
        overflow: hidden !important;
        display: block !important;
        position: relative !important;
        background-color: transparent !important;
      }
      
      /* Ensure resize handles remain visible */
      .popup.pdf-preview .popup-resize-handle {
        z-index: 10 !important;
      }
      
      /* Add a special class for when popup is being resized */
      .popup.pdf-preview.resizing .pdf-iframe-wrapper iframe {
        pointer-events: none !important; /* Disable iframe interaction during resize */
      }
    `;

    // Add to document head
    document.head.appendChild(style);
  },

  // Make the iframe responsive to popup resizing
  makeIframeResponsive(popup) {
    // Create a ResizeObserver to watch for size changes to the popup
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          // When popup size changes, update any internal elements if needed
          if (entry.target === popup) {
            // No need to manually update the iframe size as we're using
            // 100% width/height with absolute positioning, but we could add
            // special handling here if needed
          }
        }
      });

      // Start observing the popup
      resizeObserver.observe(popup);

      // Store the observer reference for cleanup
      popup.setAttribute("data-has-resize-observer", "true");
      popup._resizeObserver = resizeObserver;
    }

    // Handle popup resize start - disable iframe interaction during resize
    popup.addEventListener(
      "mousedown",
      (e) => {
        // Check if this is a resize handle
        if (e.target.classList.contains("popup-resize-handle")) {
          // Add a class to disable iframe pointer events during resize
          popup.classList.add("resizing");
        }
      },
      true,
    );

    // Handle popup resize end - re-enable iframe interaction
    document.addEventListener(
      "mouseup",
      () => {
        if (popup.classList.contains("resizing")) {
          popup.classList.remove("resizing");
        }
      },
      true,
    );
  },
};

// Initialize popups when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  window.Popups.init();
});
