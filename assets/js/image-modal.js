/**
 * Image Modal / Lightbox with Zoom Functionality
 * Allows users to click images to view them in a modal with zoom capabilities
 */

(function () {
  "use strict";

  const DEBUG = {{ if hugo.IsDevelopment }}true{{ else }}false{{ end }};

  let currentZoomLevel = 1;
  let currentZoomScale = 1; // For continuous zoom with scroll
  let modalOverlay = null;
  let modalImage = null;
  let modalContent = null; // Can be img or svg
  let modalContainer = null;
  
  // Panning state
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panOffsetX = 0;
  let panOffsetY = 0;
  let startPanOffsetX = 0;
  let startPanOffsetY = 0;
  
  // Scroll debounce for sharpening
  let scrollTimeout = null;

  // Initialize the modal on DOM ready
  function initImageModal() {
    createModalElements();
    attachImageClickHandlers();
    observeNewImages();
  }

  // Track which elements already have handlers
  const handledElements = new WeakSet();

  // Create modal HTML structure
  function createModalElements() {
    // Check if modal already exists
    const existingModal = document.querySelector(".image-modal-overlay");
    if (existingModal) {
      modalOverlay = existingModal;
      modalContainer = existingModal.querySelector(".image-modal-container");
      return;
    }

    // Create overlay - this will cover the entire viewport
    modalOverlay = document.createElement("div");
    modalOverlay.className = "image-modal-overlay";
    // Note: Don't set inline display styles, let CSS handle it

    // Create container
    modalContainer = document.createElement("div");
    modalContainer.className = "image-modal-container";

    // Create close button
    const closeButton = document.createElement("div");
    closeButton.className = "image-modal-close";
    closeButton.setAttribute("aria-label", "Close modal");
    closeButton.setAttribute("role", "button");
    closeButton.setAttribute("tabindex", "0");

    // Assemble modal
    modalOverlay.appendChild(modalContainer);
    modalOverlay.appendChild(closeButton);
    
    // Append to body
    document.body.appendChild(modalOverlay);

    // Attach modal event listeners
    closeButton.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
    
    modalOverlay.addEventListener("click", handleOverlayClick);
    document.addEventListener("keydown", handleKeyPress);
    
    if (DEBUG) console.log("Modal created and should be hidden");
  }

  // Attach click handlers to all images and SVGs in content
  function attachImageClickHandlers() {
    // Target both images and SVGs in main content area
    const contentImages = document.querySelectorAll(
      ".content img, main img, article img, .content svg, main svg, article svg"
    );

    if (DEBUG) console.log(`Found ${contentImages.length} images/SVGs to attach handlers to`);

    let newHandlersCount = 0;

    contentImages.forEach((img) => {
      // Skip if already handled
      if (handledElements.has(img)) {
        return;
      }

      // Skip images that shouldn't open in modal
      if (
        img.classList.contains("no-modal") ||
        img.closest(".no-modal") ||
        img.closest(".image-modal-overlay") // Don't attach to modal images
      ) {
        if (DEBUG) console.log("Skipping element with no-modal class:", img);
        return;
      }

      // Skip very small images (likely icons)
      if (img.tagName.toLowerCase() === "img" && 
          (img.width < 100 || img.height < 100)) {
        if (DEBUG) console.log("Skipping small image:", img.width, "x", img.height);
        return;
      }

      // Mark as handled
      handledElements.add(img);
      newHandlersCount++;

      // Make image/svg clickable
      img.style.cursor = "pointer";
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "Click to enlarge image");
      
      if (DEBUG) console.log("Attached handler to:", img.tagName, img);

      // Click handler
      img.addEventListener("click", function (e) {
        if (DEBUG) console.log("Image/SVG clicked:", this);
        e.preventDefault();
        e.stopPropagation();
        openModal(this);
      });

      // Keyboard support for accessibility
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(this);
        }
      });
    });

    if (newHandlersCount > 0) {
      if (DEBUG) console.log(`Attached ${newHandlersCount} new handlers`);
    }
  }

  // Observe DOM for dynamically added images/SVGs
  function observeNewImages() {
    // Create a MutationObserver to watch for new images/SVGs
    const observer = new MutationObserver((mutations) => {
      let shouldReattach = false;

      for (const mutation of mutations) {
        // Check if any added nodes are images/SVGs or contain them
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === "IMG" || node.tagName === "SVG") {
              shouldReattach = true;
              break;
            }
            // Check if the added node contains images/SVGs
            if (node.querySelector && node.querySelector("img, svg")) {
              shouldReattach = true;
              break;
            }
          }
        }
        if (shouldReattach) break;
      }

      if (shouldReattach) {
        if (DEBUG) console.log("New images/SVGs detected, attaching handlers...");
        attachImageClickHandlers();
      }
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    if (DEBUG) console.log("MutationObserver started, watching for new images/SVGs");
  }

  // Open modal with selected image
  function openModal(imgElement) {
    if (DEBUG) console.log("Opening modal for element:", imgElement);
    
    // Clear previous content
    if (modalContent) {
      modalContent.remove();
      modalContent = null;
    }
    
    // Handle SVG elements - clone them directly to preserve vector quality
    if (imgElement.tagName.toLowerCase() === "svg") {
      modalContent = imgElement.cloneNode(true);
      modalContent.setAttribute("class", "image-modal-content zoom-1x");
      
      // Get the actual rendered size of the original SVG
      const originalRect = imgElement.getBoundingClientRect();
      let scaledWidth = originalRect.width * 2.5;
      let scaledHeight = originalRect.height * 2.5;
      
      // Cap at 90% of viewport dimensions
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.9;
      
      // If scaled size exceeds viewport, scale down proportionally
      if (scaledWidth > maxWidth || scaledHeight > maxHeight) {
        const widthRatio = maxWidth / scaledWidth;
        const heightRatio = maxHeight / scaledHeight;
        const scaleRatio = Math.min(widthRatio, heightRatio);
        
        scaledWidth *= scaleRatio;
        scaledHeight *= scaleRatio;
        
        if (DEBUG) console.log(`SVG size capped to fit 90% viewport, scaled down by ${scaleRatio.toFixed(2)}`);
      }
      
      // Set the modal SVG size
      modalContent.style.width = `${scaledWidth}px`;
      modalContent.style.height = `${scaledHeight}px`;
      modalContent.style.maxWidth = "none";
      modalContent.style.maxHeight = "none";
      modalContent.style.cursor = "zoom-in";
      
      if (DEBUG) console.log(`SVG cloned directly for vector rendering, scaled from ${originalRect.width}×${originalRect.height} to ${scaledWidth}×${scaledHeight} (target 2.5x)`);
    } else {
      // Handle regular images
      modalContent = document.createElement("img");
      modalContent.className = "image-modal-content zoom-1x";
      
      // Start with the most basic: the src attribute
      let imgSrc = imgElement.getAttribute("src");
      
      // If currentSrc is available and different, prefer it (browser's choice from srcset)
      if (imgElement.currentSrc && imgElement.currentSrc !== imgElement.src) {
        imgSrc = imgElement.currentSrc;
      }
      
      if (DEBUG) console.log("Image source found:", imgSrc);
      
      // Ensure we have a valid src
      if (!imgSrc || imgSrc === "") {
        console.error("Could not find valid image source for element:", imgElement);
        return;
      }

      modalContent.src = imgSrc;
      modalContent.alt = imgElement.alt || "";
      
      // Add error handler
      modalContent.onerror = function() {
        console.error("Failed to load image:", imgSrc);
      };
      
      modalContent.onload = function() {
        if (DEBUG) console.log("Image loaded successfully:", imgSrc);
      };
    }

    // Add event handlers to the content
    modalContent.addEventListener("mousedown", handleMouseDown);
    modalContent.addEventListener("wheel", handleMouseWheel, { passive: false });
    
    // Add to container
    modalContainer.appendChild(modalContent);

    // Set initial zoom: 0.8x for SVGs (zoomed out to show more), 1x for images
    const isSVG = modalContent.tagName.toLowerCase() === "svg";
    currentZoomLevel = 1;
    currentZoomScale = isSVG ? 0.8 : 1;
    panOffsetX = 0;
    panOffsetY = 0;
    updateTransform();
    updateCursor();
    
    // Show modal immediately
    modalOverlay.classList.add("active");
    document.body.classList.add("image-modal-open");
  }

  // Close modal
  function closeModal() {
    if (!modalOverlay) return;
    
    modalOverlay.classList.remove("active");
    document.body.classList.remove("image-modal-open");
    currentZoomLevel = 1;
    currentZoomScale = 1;
    panOffsetX = 0;
    panOffsetY = 0;

    // Clear content after animation
    setTimeout(() => {
      if (modalContent) {
        modalContent.remove();
        modalContent = null;
      }
    }, 300);
    
    if (DEBUG) console.log("Modal closed");
  }

  // Handle clicks on the overlay (outside image)
  function handleOverlayClick(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  }

  // Handle mouse down to start panning or clicking
  function handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    panStartX = e.clientX;
    panStartY = e.clientY;
    startPanOffsetX = panOffsetX;
    startPanOffsetY = panOffsetY;
    isPanning = false; // Not panning until mouse moves

    // Add document-level listeners for move and up
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    if (currentZoomLevel > 1) {
      modalContent.style.cursor = "grabbing";
    }
  }

  // Handle mouse move for panning
  function handleMouseMove(e) {
    const deltaX = e.clientX - panStartX;
    const deltaY = e.clientY - panStartY;
    
    // If mouse has moved more than 5px, it's a pan, not a click
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      isPanning = true;
    }

    if (isPanning) {
      panOffsetX = startPanOffsetX + deltaX;
      panOffsetY = startPanOffsetY + deltaY;
      updateTransform();
    }
  }

  // Handle mouse up to end panning or register click
  function handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    // Remove document-level listeners
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    // If it wasn't a pan, treat it as a click to zoom
    if (!isPanning) {
      handleImageClick();
    }

    isPanning = false;
    updateCursor();
  }

  // Handle clicks on the image itself (zoom in/out)
  function handleImageClick() {
    if (DEBUG) console.log("Image clicked in modal, current zoom:", currentZoomLevel, "scale:", currentZoomScale);

    // Toggle between 1x and 2x (100% zoom)
    if (currentZoomLevel === 1) {
      currentZoomLevel = 2;
      currentZoomScale = 2;
    } else {
      currentZoomLevel = 1;
      currentZoomScale = 1;
      // Reset pan when zooming out
      panOffsetX = 0;
      panOffsetY = 0;
    }

    if (DEBUG) console.log("New zoom level:", currentZoomLevel, "scale:", currentZoomScale);
    updateTransform();
    updateCursor();
  }

  // Update zoom level class on image
  function updateZoomClass() {
    if (!modalContent) return;
    
    // Handle SVG elements differently (they have read-only className)
    if (modalContent.tagName.toLowerCase() === "svg") {
      let classes = "image-modal-content zoom-" + currentZoomLevel + "x";
      if (currentZoomLevel > 1) {
        classes += " zoomed";
      }
      modalContent.setAttribute("class", classes);
    } else {
      modalContent.classList.remove("zoom-1x", "zoom-2x", "zoomed");
      modalContent.classList.add(`zoom-${currentZoomLevel}x`);
      if (currentZoomLevel > 1) {
        modalContent.classList.add("zoomed");
      }
    }
    
    if (DEBUG) console.log("Zoom class updated to:", `zoom-${currentZoomLevel}x`);
    if (DEBUG) console.log("Computed transform:", window.getComputedStyle(modalContent).transform);
  }

  // Update cursor based on zoom level
  function updateCursor() {
    if (!modalContent) return;
    
    if (currentZoomLevel === 1) {
      modalContent.style.cursor = "zoom-in";
    } else {
      modalContent.style.cursor = "grab";
    }
    
    if (DEBUG) console.log("Cursor updated to:", modalContent.style.cursor);
  }

  // Update transform with both zoom and pan
  function updateTransform() {
    if (!modalContent) return;
    
    // For SVGs, manipulate viewBox for perfect vector scaling
    if (modalContent.tagName.toLowerCase() === "svg") {
      updateSVGZoom();
    } else {
      // For regular images, use CSS transform with currentZoomScale
      const scale = currentZoomScale;
      const translateZ = (scale - 1) * 30;
      
      modalContent.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px) scale(${scale}) translateZ(${translateZ}px)`;
      modalContent.style.transformOrigin = "center center";
    }
    
    if (DEBUG) console.log(`Transform updated: zoom level ${currentZoomLevel}, scale ${currentZoomScale}, pan (${panOffsetX}, ${panOffsetY})`);
  }

  // Update SVG zoom by manipulating viewBox for crisp vector rendering
  function updateSVGZoom() {
    if (!modalContent || modalContent.tagName.toLowerCase() !== "svg") return;
    
    const originalViewBox = modalContent.getAttribute("data-original-viewbox");
    
    // Store original viewBox on first call
    if (!originalViewBox) {
      const currentViewBox = modalContent.getAttribute("viewBox");
      if (currentViewBox) {
        modalContent.setAttribute("data-original-viewbox", currentViewBox);
      }
    }
    
    const viewBox = originalViewBox || modalContent.getAttribute("viewBox");
    if (!viewBox) {
      // Fallback to CSS transform if no viewBox
      const scale = currentZoomScale;
      const translateZ = (scale - 1) * 30;
      modalContent.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px) scale(${scale}) translateZ(${translateZ}px)`;
      modalContent.style.transformOrigin = "center center";
      return;
    }
    
    // Parse viewBox: "minX minY width height"
    const parts = viewBox.split(/\s+/).map(parseFloat);
    if (parts.length !== 4) return;
    
    const [origMinX, origMinY, origWidth, origHeight] = parts;
    
    // Calculate new viewBox based on zoom scale
    const scale = currentZoomScale;
    const newWidth = origWidth / scale;
    const newHeight = origHeight / scale;
    
    // Center the zoomed view, adjusted by pan offset
    // Convert pan offset to viewBox coordinates
    // Pan offset moves the viewBox, not the canvas itself
    const baseDimensions = modalContent.getBoundingClientRect();
    const panFactorX = (panOffsetX / (baseDimensions.width || 1)) * newWidth;
    const panFactorY = (panOffsetY / (baseDimensions.height || 1)) * newHeight;
    
    const newMinX = origMinX + (origWidth - newWidth) / 2 - panFactorX;
    const newMinY = origMinY + (origHeight - newHeight) / 2 - panFactorY;
    
    modalContent.setAttribute("viewBox", `${newMinX} ${newMinY} ${newWidth} ${newHeight}`);
    
    // Canvas size is already set to 2x on modal open - don't override it
    // Only the viewBox changes for zoom and pan, canvas stays at its initial doubled size
    modalContent.style.transform = '';
    
    if (DEBUG) console.log(`SVG updated: ${scale}x zoom, viewBox adjusted for zoom/pan`);
  }

  // Handle keyboard events
  function handleKeyPress(e) {
    if (!modalOverlay.classList.contains("active")) return;

    if (e.key === "Escape") {
      closeModal();
    }
  }

  // Handle mouse wheel for continuous zooming
  function handleMouseWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!modalContent) return;

    // Adjust zoom scale continuously
    const zoomStep = 0.1;
    const minZoom = 0.5;
    const maxZoom = 4;

    if (e.deltaY < 0) {
      // Scroll up - zoom in
      currentZoomScale = Math.min(currentZoomScale + zoomStep, maxZoom);
    } else {
      // Scroll down - zoom out
      currentZoomScale = Math.max(currentZoomScale - zoomStep, minZoom);
    }

    if (DEBUG) console.log("Scroll zoom:", currentZoomScale.toFixed(2) + "x");
    
    // Debounce transform update - apply after scroll settles for smooth performance
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    // Immediate feedback for smooth scrolling
    updateTransform();
    
    // Final precise update after scroll settles
    scrollTimeout = setTimeout(() => {
      updateTransform();
      if (DEBUG) console.log("Scroll settled, final transform applied");
    }, 100);
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      if (DEBUG) console.log("Image modal initializing...");
      initImageModal();
      
      // Recheck for images after delays (for dynamically rendered content like TikZ)
      setTimeout(() => {
        if (DEBUG) console.log("Rechecking for images after 500ms...");
        attachImageClickHandlers();
      }, 500);
      
      setTimeout(() => {
        if (DEBUG) console.log("Rechecking for images after 1500ms...");
        attachImageClickHandlers();
      }, 1500);
      
      setTimeout(() => {
        if (DEBUG) console.log("Rechecking for images after 3000ms...");
        attachImageClickHandlers();
      }, 3000);
      
      // Safety check: ensure modal doesn't have active class
      setTimeout(() => {
        if (modalOverlay && modalOverlay.classList.contains("active")) {
          console.warn("Modal was unexpectedly active, closing it");
          closeModal();
        } else {
          if (DEBUG) console.log("Modal verified as hidden");
        }
      }, 100);
    });
  } else {
    if (DEBUG) console.log("Image modal initializing...");
    initImageModal();
    
    // Recheck for images after delays (for dynamically rendered content like TikZ)
    setTimeout(() => {
      if (DEBUG) console.log("Rechecking for images after 500ms...");
      attachImageClickHandlers();
    }, 500);
    
    setTimeout(() => {
      if (DEBUG) console.log("Rechecking for images after 1500ms...");
      attachImageClickHandlers();
    }, 1500);
    
    setTimeout(() => {
      if (DEBUG) console.log("Rechecking for images after 3000ms...");
      attachImageClickHandlers();
    }, 3000);
    
    // Safety check: ensure modal doesn't have active class
    setTimeout(() => {
      if (modalOverlay && modalOverlay.classList.contains("active")) {
        console.warn("Modal was unexpectedly active, closing it");
        closeModal();
      } else {
        if (DEBUG) console.log("Modal verified as hidden");
      }
    }, 100);
  }
})();

