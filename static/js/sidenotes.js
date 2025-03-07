/**
 * sidenotes.js - Convert Hugo footnotes into margin sidenotes
 *
 * This script transforms standard Hugo-generated footnotes into sidenotes
 * that appear in the left sidebar under the sidebar-tree. Sidenotes are more
 * reader-friendly as they don't require the user to jump to the bottom of the page.
 *
 * Inspired by Gwern.net's sidenotes implementation and Edward Tufte's design.
 *
 * Basic usage: Just include this script and ensure your footnotes are generated
 * with Hugo's standard markdown footnote syntax (e.g., [^1]).
 */

// Initialize the Sidenotes object as soon as DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Create Sidenotes namespace to avoid global pollution
  window.Sidenotes = {
    // Configuration
    minimumViewportWidthForSidenotes: "768px",
    sidenoteSpacing: 16, // Spacing between sidenotes in pixels
    sidenotePadding: 8, // Padding around sidenotes

    // State variables
    sidenotes: [],
    citations: [],
    sidenotesContainer: null,
    hiddenSidenoteStorage: null,
    displacedSidenotes: [],
    positionUpdateQueued: false,

    // Media queries for responsive behavior
    mediaQueries: {
      viewportWidthBreakpoint: window.matchMedia(`(min-width: 768px)`),
    },

    /**
     * Find a sidenote by its note number
     */
    sidenoteOfNumber: function (number) {
      return (
        this.sidenotes.find(
          (sidenote) => this.noteNumber(sidenote) == number,
        ) || null
      );
    },

    /**
     * Find a citation by its note number
     */
    citationOfNumber: function (number) {
      return (
        this.citations.find(
          (citation) => this.noteNumber(citation) == number,
        ) || null
      );
    },

    /**
     * Extract note number from a footnote element
     */
    noteNumber: function (element) {
      if (!element) return null;

      // Extract the number from the ID
      const id = element.id || "";
      if (id.startsWith("fn:")) {
        return id.substring(3);
      } else if (id.startsWith("fnref:")) {
        return id.substring(6);
      } else if (element.classList.contains("sidenote")) {
        return id.substring(3); // 'sn:' prefix
      }

      // If no ID pattern matches, try to get from data-ref attribute
      return element.dataset.ref || null;
    },

    /**
     * Find counterpart of an element (citation↔sidenote)
     */
    counterpart: function (element) {
      if (!element) return null;

      const number = this.noteNumber(element);
      return element.classList.contains("sidenote")
        ? this.citationOfNumber(number)
        : this.sidenoteOfNumber(number);
    },

    /**
     * Generate IDs for footnotes and sidenotes
     */
    footnoteIdForNumber: function (number) {
      return "fn:" + number;
    },

    sidenoteIdForNumber: function (number) {
      return "sn:" + number;
    },

    /**
     * Check if URL hash points to a sidenote or footnote
     */
    hashMatchesSidenote: function () {
      return /^#sn:\d+$/.test(location.hash);
    },

    hashMatchesFootnote: function () {
      return /^#fn:\d+$/.test(location.hash);
    },

    noteNumberFromHash: function () {
      const match = location.hash.match(/^#(?:fn:|sn:)(\d+)$/);
      return match ? match[1] : "";
    },

    /**
     * Update the footnote-back arrow orientation in sidenotes
     */
    updateFootnoteBackArrowOrientationForSidenote: function (sidenote) {
      const citation = this.counterpart(sidenote);
      if (!citation) return;

      // No need to adjust arrows in this implementation
    },

    /**
     * Queue an update for sidenote positions
     */
    updateSidenotePositionsIfNeeded: function () {
      if (this.hiddenSidenoteStorage == null) return;

      if (this.positionUpdateQueued) return;

      this.positionUpdateQueued = true;

      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        this.positionUpdateQueued = false;
        this.updateSidenotePositions();
      });
    },

    /**
     * Update targeting when hash changes
     */
    updateTargetCounterpart: function () {
      console.log("Sidenotes.updateTargetCounterpart");

      // If viewport is too narrow, don't do anything
      if (!this.mediaQueries.viewportWidthBreakpoint.matches) return;

      // Clear existing targeting
      document
        .querySelectorAll(".footnote-ref, .footnote, .sidenote")
        .forEach((el) => el.classList.remove("targeted"));

      // Get hash-targeted element
      const hash = location.hash;
      const target = hash.match(/^#(fn:|sn:)/)
        ? document.getElementById(hash.substring(1))
        : null;

      // Find counterpart
      const counterpart = this.counterpart(target);

      // Mark target and counterpart
      if (target) target.classList.add("targeted");
      if (counterpart) counterpart.classList.add("targeted");
    },

    /**
     * Calculate and set positions for sidenotes
     */
    updateSidenotePositions: function () {
      console.log("Sidenotes.updateSidenotePositions");

      // If we're in footnotes mode, don't do anything
      if (!this.mediaQueries.viewportWidthBreakpoint.matches) return;

      // Update sidenote visibility based on their citation visibility
      this.sidenotes.forEach((sidenote) => {
        const citation = this.counterpart(sidenote);
        // Hide sidenotes whose citations are hidden
        const isHidden = citation ? citation.offsetParent === null : true;
        sidenote.classList.toggle("hidden", isHidden);

        // Move to sidenotes container if not hidden
        if (!sidenote.classList.contains("hidden")) {
          if (
            sidenote.parentElement === this.hiddenSidenoteStorage ||
            !sidenote.parentElement
          ) {
            this.sidenotesContainer.appendChild(sidenote);
          }
        } else {
          this.hiddenSidenoteStorage.appendChild(sidenote);
        }
      });

      // Simple layout: just position sidenotes sequentially
      this.arrangeSidenotes();

      // Make sidenotes container visible
      this.sidenotesContainer.style.visibility = "";
    },

    /**
     * Arrange sidenotes within their container to avoid overlaps
     */
    arrangeSidenotes: function () {
      const sidenotes = Array.from(
        this.sidenotesContainer.querySelectorAll(".sidenote"),
      );

      // Reset all positions
      sidenotes.forEach((sidenote) => {
        sidenote.style.position = "relative";
        sidenote.style.marginTop = "1rem";
        sidenote.style.marginBottom = "1rem";
      });
    },

    /**
     * Clean up sidenotes
     */
    deconstructSidenotes: function () {
      console.log("Sidenotes.deconstructSidenotes");

      this.sidenotes = [];
      this.citations = [];

      if (this.sidenotesContainer) this.sidenotesContainer.remove();
      this.sidenotesContainer = null;

      if (this.hiddenSidenoteStorage) this.hiddenSidenoteStorage.remove();
      this.hiddenSidenoteStorage = null;
    },

    /**
     * Construct sidenotes from footnotes
     */
    constructSidenotes: function () {
      console.log("Sidenotes.constructSidenotes");

      // Create infrastructure if needed
      if (!this.hiddenSidenoteStorage) {
        // Find the sidebar-tree element
        const sidebarTree = document.querySelector(".sidebar-tree");

        if (!sidebarTree) {
          console.error("Could not find .sidebar-tree element");
          return;
        }

        // Create sidenotes container after the sidebar-tree
        this.sidenotesContainer = document.createElement("DIV");
        this.sidenotesContainer.id = "sidenotes-container";
        this.sidenotesContainer.className = "sidenotes-container";
        this.sidenotesContainer.style.visibility = "hidden";

        // Insert after sidebar-tree
        sidebarTree.parentNode.insertBefore(
          this.sidenotesContainer,
          sidebarTree.nextSibling,
        );

        // Create hidden storage for sidenotes
        this.hiddenSidenoteStorage = document.createElement("DIV");
        this.hiddenSidenoteStorage.id = "hidden-sidenote-storage";
        this.hiddenSidenoteStorage.style.display = "none";
        document.body.appendChild(this.hiddenSidenoteStorage);

        this.sidenotes = [];
        this.citations = [];
      }

      // Find all footnote references not already processed
      const newCitations = Array.from(
        document.querySelectorAll(".footnote-ref"),
      ).filter((citation) => {
        // Only process citations we haven't seen before
        return !this.citations.includes(citation);
      });

      // Add to our citations collection
      this.citations.push(...newCitations);

      // Create sidenotes for each citation
      newCitations.forEach((citation) => {
        const noteNumber = this.noteNumber(citation);

        // Create the sidenote container
        const sidenote = document.createElement("DIV");
        sidenote.className = "sidenote";
        sidenote.id = this.sidenoteIdForNumber(noteNumber);

        // Create wrapper divs
        const outerWrapper = document.createElement("DIV");
        outerWrapper.className = "sidenote-outer-wrapper";
        sidenote.appendChild(outerWrapper);

        const innerWrapper = document.createElement("DIV");
        innerWrapper.className = "sidenote-inner-wrapper";
        outerWrapper.appendChild(innerWrapper);

        // Create self-link for sidenote
        const selfLink = document.createElement("A");
        selfLink.className = "sidenote-self-link";
        selfLink.href = "#" + this.sidenoteIdForNumber(noteNumber);
        selfLink.textContent = noteNumber;
        sidenote.appendChild(selfLink);

        // Find the footnote content and clone it
        const footnote = document.getElementById(
          this.footnoteIdForNumber(noteNumber),
        );

        if (footnote) {
          // Clone the footnote content
          const footnoteContent = footnote.cloneNode(true);

          // Remove backref if present (we'll handle it differently in sidenotes)
          const backref = footnoteContent.querySelector(".footnote-backref");
          if (backref) backref.remove();

          // Add content to the sidenote
          innerWrapper.appendChild(footnoteContent);

          // Add custom back reference
          const backLink = document.createElement("A");
          backLink.className = "footnote-backref";
          backLink.href = "#" + citation.id;
          backLink.innerHTML = "↩";
          innerWrapper.appendChild(backLink);
        }

        // Add to our sidenotes collection
        this.sidenotes.push(sidenote);
      });

      // Add the new sidenotes to the hidden storage
      this.hiddenSidenoteStorage.append(...this.sidenotes);

      // Add mouse hover interactions
      this.sidenotes.forEach((sidenote) => {
        const citation = this.counterpart(sidenote);
        if (!citation) return;

        // When mouse enters sidenote, highlight citation
        sidenote.addEventListener("mouseenter", () => {
          citation.classList.add("highlighted");
          sidenote.classList.add("hovering");
        });

        // When mouse leaves sidenote, unhighlight citation
        sidenote.addEventListener("mouseleave", () => {
          citation.classList.remove("highlighted");
          sidenote.classList.remove("hovering");
        });

        // When mouse enters citation, highlight sidenote
        citation.addEventListener("mouseenter", () => {
          sidenote.classList.add("highlighted");
          citation.classList.add("hovering");
        });

        // When mouse leaves citation, unhighlight sidenote
        citation.addEventListener("mouseleave", () => {
          sidenote.classList.remove("highlighted");
          citation.classList.remove("hovering");
        });
      });

      // Calculate sidenote heights after they're in the DOM
      setTimeout(() => {
        // Update positions
        this.updateSidenotePositions();
      }, 100);
    },

    /**
     * Setup event listeners and initialize
     */
    setup: function () {
      console.log("Sidenotes.setup");

      // Listen for viewport width changes to toggle between modes
      this.mediaQueries.viewportWidthBreakpoint.addEventListener(
        "change",
        () => {
          this.updateSidenotePositionsIfNeeded();
        },
      );

      // Listen for hash changes to highlight appropriate sidenote/citation
      window.addEventListener("hashchange", () => {
        this.updateTargetCounterpart();
      });

      // Listen for resize events to update sidenote positions
      window.addEventListener("resize", () => {
        this.updateSidenotePositionsIfNeeded();
      });

      // Construct sidenotes
      this.constructSidenotes();

      // Initial update of target counterpart
      this.updateTargetCounterpart();
    },
  };

  // Initialize sidenotes
  window.Sidenotes.setup();

  // Add CSS for sidenotes
  const style = document.createElement("style");
  style.textContent = `
    /* Sidenotes container */
    .sidenotes-container {
      margin-top: 2rem;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
    
    /* Sidenotes */
    .sidenote {
      position: relative;
      box-sizing: border-box;
      margin: 1rem 0;
      padding: 0.5rem;
      font-size: 0.8rem;
      line-height: 1.3;
      opacity: 0.8;
      transition: opacity 0.2s;
      background-color: var(--color-bg);
      border-left: 1px solid var(--color-border);
      max-width: 100%;
    }
    
    .sidenote:hover,
    .sidenote.highlighted {
      opacity: 1;
    }
    
    /* Sidenote inner structure */
    .sidenote-outer-wrapper {
      max-height: 20vh;
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    .sidenote-inner-wrapper {
      position: relative;
    }
    
    /* Sidenote self-link (number) */
    .sidenote-self-link {
      position: absolute;
      top: 0;
      left: -0.8em;
      font-size: 0.7rem;
      color: var(--color-primary);
      text-decoration: none;
    }
    
    /* Citation (footnote ref) styling */
    .footnote-ref {
      font-size: 0.7em;
      vertical-align: super;
      line-height: 0;
      transition: background-color 0.2s;
    }
    
    .footnote-ref.highlighted,
    .footnote-ref.hovering {
      background-color: var(--color-highlight, #ffec99);
    }
    
    /* Hide original footnotes when in sidenote mode */
    @media (min-width: 768px) {
      .footnotes {
        display: none;
      }
    }
  `;

  document.head.appendChild(style);
});
