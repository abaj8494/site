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
    hoverDelay: 300,
    fadeOutDuration: 200,
    maxPopups: 5,
    debug: false,
    minWidth: 320,
    minHeight: 120,
    initialPositionMargin: 20,
    loadingTimeout: 5000,
  },

  // State
  popupContainer: null,
  activeHoverTimer: null,
  activeLink: null,
  popupCounter: 0,
  linkRegistry: new WeakMap(),
  dragging: {
    active: false,
    popup: null,
    offsetX: 0,
    offsetY: 0,
  },

  // Initialize the popup system
  init() {
    this.log("Initializing popup system");
    this.createContainer();
    this.bindGlobalEvents();
    this.setupLinkHandlers();
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
    // Handle dragging
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("mouseup", this.handleMouseUp.bind(this));

    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown.bind(this));

    // Handle zooming
    window.addEventListener("resize", this.repositionPopups.bind(this));
  },

  // Set up link handlers for popup triggering
  setupLinkHandlers() {
    // Select all links that don't have no-popup class
    const links = document.querySelectorAll(
      "a:not(.no-popup):not([href^='#']):not([href^='javascript:'])",
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

  // Handle mouse enter on links
  handleLinkMouseEnter(event) {
    const link = event.currentTarget;
    this.log(`Mouse entered link: ${link.href}`);

    // Clear any existing timer
    if (this.activeHoverTimer) {
      clearTimeout(this.activeHoverTimer);
    }

    this.activeLink = link;

    // Start timer for popup
    this.activeHoverTimer = setTimeout(() => {
      this.spawnPopupForLink(link, event);
    }, this.config.hoverDelay);
  },

  // Handle mouse leave on links
  handleLinkMouseLeave() {
    this.log("Mouse left link");

    // Clear hover timer
    if (this.activeHoverTimer) {
      clearTimeout(this.activeHoverTimer);
      this.activeHoverTimer = null;
    }

    this.activeLink = null;
  },

  // Handle click on links with modifier keys
  handleLinkClick(event) {
    const link = event.currentTarget;

    // If shift or ctrl is pressed, spawn popup and prevent navigation
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      event.preventDefault();
      this.spawnPopupForLink(link, event, true); // true = pinned
      return false;
    }
  },

  // Create a popup for a link
  spawnPopupForLink(link, event, pinned = false) {
    // If we're already at max popups, remove the oldest one
    if (this.popupContainer.children.length >= this.config.maxPopups) {
      const oldestPopup = this.popupContainer.firstChild;
      if (oldestPopup) {
        this.despawnPopup(oldestPopup);
      }
    }

    // Create popup element
    const popup = document.createElement("DIV");
    popup.className = "popup loading";
    popup.dataset.linkHref = link.href;
    popup.dataset.popupId = ++this.popupCounter;
    popup.dataset.sourceUrl = link.href;

    if (pinned) {
      popup.classList.add("pinned");
    }

    // Position popup near the link
    const linkRect = link.getBoundingClientRect();
    const initialX = linkRect.right + 10;
    const initialY = window.scrollY + linkRect.top - 20;

    popup.style.left = `${initialX}px`;
    popup.style.top = `${initialY}px`;
    popup.style.minWidth = `${this.config.minWidth}px`;
    popup.style.minHeight = `${this.config.minHeight}px`;

    // Set initial opacity to 0
    popup.style.opacity = "0";

    // Create the popup structure (title bar, scroll view, content view)
    this.createPopupStructure(popup, link);

    // Add to container
    this.popupContainer.appendChild(popup);

    // Ensure popup is within viewport
    this.adjustPopupPosition(popup);

    // Fade in
    setTimeout(() => {
      popup.style.opacity = "1";
    }, 50);

    // Load content
    this.loadPopupContent(popup, link);

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

    // Title text (make it clickable)
    const titleText = document.createElement("A");
    titleText.className = "popup-title-bar-title";
    titleText.textContent = link.textContent.trim() || link.href;
    titleText.href = link.href;
    titleText.target = "_blank";
    titleText.rel = "noopener";
    titleText.title = "Open in new tab";
    // Prevent the mousedown event from propagating (would conflict with drag)
    titleText.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    titleBar.appendChild(titleText);

    // Buttons container
    const buttonsContainer = document.createElement("DIV");
    buttonsContainer.className = "popup-title-bar-buttons";

    // Pin button
    const pinButton = document.createElement("BUTTON");
    pinButton.className = "popup-title-bar-button pin-button";
    pinButton.title = "Pin popup";
    pinButton.innerHTML = '<span class="popup-icon pin"></span>';
    pinButton.addEventListener("click", (e) => {
      e.stopPropagation();
      popup.classList.toggle("pinned");
    });
    buttonsContainer.appendChild(pinButton);

    // Maximize button
    const maxButton = document.createElement("BUTTON");
    maxButton.className = "popup-title-bar-button maximize-button";
    maxButton.title = "Maximize";
    maxButton.innerHTML = '<span class="popup-icon maximize"></span>';
    maxButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMaximizePopup(popup);
    });
    buttonsContainer.appendChild(maxButton);

    // Close button
    const closeButton = document.createElement("BUTTON");
    closeButton.className = "popup-title-bar-button close-button";
    closeButton.title = "Close";
    closeButton.innerHTML = '<span class="popup-icon close"></span>';
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.despawnPopup(popup);
    });
    buttonsContainer.appendChild(closeButton);

    titleBar.appendChild(buttonsContainer);
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

    // Add mouseleave event to make popup disappear when mouse leaves
    if (!popup.classList.contains("pinned")) {
      popup.addEventListener("mouseleave", () => {
        // Only close if not pinned
        if (!popup.classList.contains("pinned")) {
          this.despawnPopup(popup);
        }
      });
    }
  },

  // Load content into popup
  loadPopupContent(popup, link) {
    const contentView = popup.contentView;
    const url = link.href;

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
    }, this.config.loadingTimeout);

    // Fetch the content
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

        // Add title if available
        const pageTitle = doc.querySelector("h1") || doc.querySelector("title");
        if (pageTitle) {
          const titleElement = document.createElement("H2");
          titleElement.className = "popup-title";
          titleElement.textContent = pageTitle.textContent;
          popupContent.appendChild(titleElement);
        }

        // Add content body
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

        // Setup link handlers for the new content
        this.setupRecursivePopups(popup);
      })
      .catch((error) => {
        clearTimeout(loadingTimeout);
        contentView.innerHTML = `<div class="popup-error">Error loading content: ${error.message}</div>`;
        popup.classList.remove("loading");
      });
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
        <div class="popup-title">External Link</div>
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

  // Enable recursive popups inside existing popups
  setupRecursivePopups(popup) {
    // Find all links inside this popup that should have popups
    const links = popup.querySelectorAll(
      "a:not(.no-popup):not([href^='javascript:'])",
    );

    links.forEach((link) => {
      // Skip links that already have handlers
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

    // Make all links non-popup and target="_blank"
    const links = element.querySelectorAll("a");
    links.forEach((link) => {
      link.classList.add("no-popup");
      link.target = "_blank";
      link.rel = "noopener";
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

  // Toggle maximize state of popup
  toggleMaximizePopup(popup) {
    popup.classList.toggle("zoomed");

    // Update button icon
    const maxButton = popup.querySelector(".maximize-button .popup-icon");
    if (maxButton) {
      if (popup.classList.contains("zoomed")) {
        maxButton.classList.remove("maximize");
        maxButton.classList.add("restore");
        maxButton.parentElement.title = "Restore";
      } else {
        maxButton.classList.remove("restore");
        maxButton.classList.add("maximize");
        maxButton.parentElement.title = "Maximize";
      }
    }
  },

  // Remove a popup
  despawnPopup(popup) {
    popup.classList.add("fading");
    popup.style.opacity = "0";

    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, this.config.fadeOutDuration);
  },

  // Adjust popup position to ensure it's within viewport
  adjustPopupPosition(popup) {
    const rect = popup.getBoundingClientRect();
    const margin = this.config.initialPositionMargin;

    // Check if popup is outside viewport
    if (rect.right > window.innerWidth - margin) {
      popup.style.left = `${window.innerWidth - rect.width - margin}px`;
    }

    if (rect.bottom > window.innerHeight - margin) {
      popup.style.top = `${window.scrollY + window.innerHeight - rect.height - margin}px`;
    }

    if (rect.left < margin) {
      popup.style.left = `${margin}px`;
    }

    if (rect.top < margin) {
      popup.style.top = `${window.scrollY + margin}px`;
    }
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
    };

    popup.classList.add("dragging");

    // Bring to front
    this.bringToFront(popup);
  },

  // Handle mousemove for dragging
  handleMouseMove(event) {
    if (!this.dragging.active) return;

    const popup = this.dragging.popup;

    // Calculate new position
    const x = event.clientX - this.dragging.offsetX;
    const y = event.clientY - this.dragging.offsetY;

    // Set new position
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
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
};

// Initialize popups when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "%c🔍 DOM loaded, initializing popup system...",
    "color: blue; font-weight: bold",
  );
  window.Popups.init();
});
