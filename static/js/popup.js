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
    debug: true,
    minWidth: 320,
    minHeight: 120,
    initialPositionMargin: 20,
    loadingTimeout: 7500,
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

    console.log(
      `%c🔍 Popup system initialized (${wasDisabled ? "disabled" : "enabled"})`,
      "color: green; font-weight: bold",
    );
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

      console.log(
        `%c👁 Popups ${newDisabledState ? "disabled" : "enabled"}`,
        `color: ${newDisabledState ? "red" : "green"}; font-weight: bold`,
      );
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
      }, 100); // Small delay to account for edge cases and movement between elements
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

  // Handle mouse hover on links
  handleLinkMouseEnter(event) {
    // Skip if popups are disabled
    if (document.body.getAttribute("data-popups-disabled") === "true") {
      return;
    }

    const link = event.currentTarget;

    // Track current link
    this.hoverState.currentLink = link;

    // Skip if the link has a data attribute to ignore
    if (link.dataset.popup === "ignore") {
      this.log("Skipping link with data-popup=ignore");
      return;
    }

    // Clear any existing hover timeout
    if (this.activeHoverTimer) {
      clearTimeout(this.activeHoverTimer);
      this.activeHoverTimer = null;
    }

    // Set a timeout to spawn the popup
    this.activeHoverTimer = setTimeout(() => {
      // Check again if we're still hovering (could have moved away during timeout)
      if (this.hoverState.currentLink !== link) {
        this.log("No longer hovering link, cancelling popup spawn");
        return;
      }

      // Check if a popup already exists for this link
      const existingPopup = this.findPopupForLink(link);
      if (existingPopup) {
        this.log("Popup already exists for this link");
        return;
      }

      // Now we can spawn the popup
      this.spawnPopupForLink(link, event);
    }, this.config.hoverDelay);
  },

  // Handle mouse leaving links
  handleLinkMouseLeave(event) {
    // Skip if popups are disabled
    if (document.body.getAttribute("data-popups-disabled") === "true") {
      return;
    }

    const link = event.currentTarget;

    // Clear hover state for this link
    if (this.hoverState.currentLink === link) {
      this.hoverState.currentLink = null;
    }

    // Clear any pending popup creation
    if (this.activeHoverTimer) {
      clearTimeout(this.activeHoverTimer);
      this.activeHoverTimer = null;
    }
  },

  // Handle click events on links
  handleLinkClick(event) {
    // Skip if popups are disabled
    if (document.body.getAttribute("data-popups-disabled") === "true") {
      return;
    }

    const link = event.currentTarget;

    // Skip if user clicks with control/command to open in new tab
    if (event.ctrlKey || event.metaKey) {
      this.log("Control/command click detected, allowing default behavior");
      return;
    }

    // Skip if the link has a data attribute to ignore
    if (link.dataset.popup === "ignore") {
      this.log("Skipping link with data-popup=ignore");
      return;
    }

    // If the link has a target="_blank", let it open normally
    if (link.target === "_blank") {
      this.log("Link has target=_blank, allowing default behavior");
      return;
    }

    // Prevent the default navigation
    event.preventDefault();

    // Find existing popup or create a new one
    const existingPopup = this.findPopupForLink(link);
    if (existingPopup) {
      // If already exists, just pin it and bring to front
      existingPopup.classList.add("pinned");
      this.bringToFront(existingPopup);
      this.log("Found existing popup, pinning and bringing to front");
    } else {
      // Create a new pinned popup
      this.spawnPopupForLink(link, event, true);
    }
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
    const popupId = ++this.popupCounter;
    popup.dataset.popupId = popupId;
    popup.dataset.linkHref = link.href;
    popup.dataset.sourceUrl = link.href;

    // Store the link-popup relationship for tracking
    this.popupRegistry.set(popupId, { popup, sourceLink: link });

    // Update hover state
    this.hoverState.currentPopup = popup;

    if (pinned) {
      popup.classList.add("pinned");
    }

    // Position popup directly at the link location
    const linkRect = link.getBoundingClientRect();

    // Position exactly at the link location
    const initialX = linkRect.left;
    const initialY = window.scrollY + linkRect.top;

    popup.style.left = `${initialX}px`;
    popup.style.top = `${initialY}px`;

    // Set minimum dimensions but allow content to determine actual size
    popup.style.minWidth = `${this.config.minWidth}px`;
    popup.style.minHeight = `${this.config.minHeight}px`;
    popup.style.width = "auto";
    popup.style.maxWidth = "none"; // Allow natural width initially

    // Set initial opacity to 0
    popup.style.opacity = "0";

    // Create the popup structure (title bar, scroll view, content view)
    this.createPopupStructure(popup, link);

    // Add to container
    this.popupContainer.appendChild(popup);

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
    titleText.target = "_blank";
    titleText.rel = "noopener";
    titleText.title = "Open in new tab";

    // Prevent the mousedown event from propagating (would conflict with drag)
    titleText.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    titleBar.appendChild(titleText);

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
  },

  // Load content into popup
  loadPopupContent(popup, link) {
    const contentView = popup.contentView;
    const url = link.href;

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

    // Add fading class
    popup.classList.add("fading");
    popup.style.opacity = "0";

    // Remove from DOM after animation
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, this.config.fadeOutDuration);
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

      // Ensure natural width is maintained if possible
      // Prevent automatic shrinking when at screen edges
      const naturalWidth = Math.max(rect.width, this.config.minWidth);

      // Original position
      let newLeft = parseFloat(popup.style.left);
      let newTop = parseFloat(popup.style.top);

      // Track offsets
      let leftOffset = 0;
      let topOffset = 0;

      // Check right edge - if it would go off-screen, calculate the exact offset
      // and add extra shift for better visibility
      if (rect.right > viewport.width - margin) {
        leftOffset = viewport.width - margin - rect.right;
        // Apply an additional shift to move it further away from the edge
        leftOffset = leftOffset * 1.5; // Increase shift by 50%
        newLeft = newLeft + leftOffset;
      }

      // Check bottom edge - if it would go off-screen, calculate the exact offset
      // and add extra shift for better visibility
      if (rect.bottom > viewport.height - margin) {
        topOffset = viewport.height - margin - rect.bottom;
        // Apply an additional shift to move it further away from the edge
        topOffset = topOffset * 1.5; // Increase shift by 50%
        newTop = newTop + topOffset;
      }

      // Check left edge
      if (rect.left < margin) {
        leftOffset = margin - rect.left;
        // Apply an additional shift for better visibility
        leftOffset = leftOffset * 1.5; // Increase shift by 50%
        newLeft = newLeft + leftOffset;
      }

      // Check top edge
      if (rect.top < margin) {
        topOffset = margin - rect.top;
        // Apply an additional shift for better visibility
        topOffset = topOffset * 1.5; // Increase shift by 50%
        newTop = newTop + topOffset;
      }

      // Apply position if needed (only adjust position if necessary)
      popup.style.left = `${newLeft}px`;
      popup.style.top = `${newTop}px`;

      // Fix width to preserve the natural content width
      // This is key to ensuring headings show their full content width
      popup.style.width = `${naturalWidth}px`;

      // Log for debugging
      this.log(
        `Positioned popup: width=${naturalWidth}, left=${newLeft} (offset=${leftOffset}), top=${newTop} (offset=${topOffset})`,
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
};

// Initialize popups when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "%c🔍 DOM loaded, initializing popup system...",
    "color: blue; font-weight: bold",
  );
  window.Popups.init();
});
