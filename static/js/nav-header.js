document.addEventListener("DOMContentLoaded", function () {
  // Get the SVG overlay element.
  const svg = document.getElementById("arrow-svg");
  if (!svg) {
    console.error("SVG element with id 'arrow-svg' not found.");
    return;
  }

  const svgNS = "http://www.w3.org/2000/svg";

  // Create the arrowhead marker if it doesn't exist.
  function createMarker() {
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(svgNS, "defs");
      svg.appendChild(defs);
    }
    if (!svg.querySelector("#arrowhead")) {
      const marker = document.createElementNS(svgNS, "marker");
      marker.setAttribute("id", "arrowhead");
      marker.setAttribute("markerWidth", "10");
      marker.setAttribute("markerHeight", "7");
      marker.setAttribute("refX", "0");
      marker.setAttribute("refY", "3.5");
      marker.setAttribute("orient", "auto");

      const polygon = document.createElementNS(svgNS, "polygon");
      // Use a CSS class so that our stylesheet can set its fill and opacity.
      polygon.classList.add("nav-arrow-head");
      polygon.setAttribute("points", "0 0, 10 3.5, 0 7");

      marker.appendChild(polygon);
      defs.appendChild(marker);
    }
  }

  // Remove any existing arrow paths (but leave defs intact).
  function clearArrows() {
    const defs = svg.querySelector("defs");
    while (svg.childNodes.length > (defs ? 1 : 0)) {
      svg.removeChild(svg.lastChild);
    }
  }

  // Main function to draw arrows.
  // This function recalculates all positions so that the curves stay attached
  // to the Navigation header (even if scrolling causes them to warp).
  function drawArrows() {
    // Do not draw arrows on narrow (mobile) viewports.
    if (window.innerWidth < 768) {
      clearArrows();
      return;
    }

    createMarker();
    clearArrows();

    // Get the Navigation heading element and its inner text element.
    const navHeading = document.getElementById("nav-heading");
    if (!navHeading) {
      console.error("Navigation heading with id 'nav-heading' not found.");
      return;
    }
    const navText = navHeading.querySelector(".nav-text");
    if (!navText) {
      console.error(
        "Element with class 'nav-text' not found inside #nav-heading.",
      );
      return;
    }
    const navRect = navText.getBoundingClientRect();

    // Compute the starting point S using a custom formula.
    // This places the start near the word rather than the full header width.
    const S = {
      x: navRect.right + 10,
      y: navRect.top + navRect.height / 2,
    };

    // For this version we are not adding any extra upward or horizontal shift
    // (U and dX remain 0), but you can adjust them if needed.
    const U = 0;
    const dX = 0;
    const M = {
      x: S.x + dX,
      y: S.y - U,
    };

    // Define a constant offset so that the arrows finish below the header.
    // Here the header is about 40px in height.
    const headerOffset = 40;

    // Define target selectors for your navigation links.
    const targets = [
      { selector: 'nav#menu a[href="/work/"]' },
      { selector: 'nav#menu a[href="/words/"]' },
      { selector: 'nav#menu a[href="/blog/"]' },
      { selector: 'nav#menu a[href="/about/"]' },
      { selector: 'nav#menu a[href="/resources/"]' },
    ];

    targets.forEach(function (target) {
      const targetElem = document.querySelector(target.selector);
      if (!targetElem) {
        console.warn("Target not found for selector: " + target.selector);
        return;
      }
      const targetRect = targetElem.getBoundingClientRect();
      // E is the endpoint at the center of the target element, shifted downward.
      const E = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2 + headerOffset,
      };

      // Define control points for a smooth two‑segment cubic Bézier curve.
      // Segment 1: from S to M.
      const CP1_1 = {
        x: S.x,
        y: S.y - U / 2, // Forces an initially vertical tangent.
      };
      const CP2_1 = {
        x: M.x - 20, // Slightly to the left of M to create a smooth bend.
        y: M.y,
      };

      // Segment 2: from M to E.
      // For smooth joining, mirror CP2_1 into the second segment.
      const CP1_2 = {
        x: M.x + 20,
        y: M.y,
      };
      // Choose CP2_2 roughly halfway (vertically) between M and E.
      const CP2_2 = {
        x: E.x,
        y: (M.y + E.y) / 2,
      };

      // Build the path string as two joined cubic Bézier segments.
      const d =
        `M ${S.x} ${S.y} ` +
        `C ${CP1_1.x} ${CP1_1.y}, ${CP2_1.x} ${CP2_1.y}, ${M.x} ${M.y} ` +
        `C ${CP1_2.x} ${CP1_2.y}, ${CP2_2.x} ${CP2_2.y}, ${E.x} ${E.y}`;

      // Create the path element.
      const path = document.createElementNS(svgNS, "path");
      path.classList.add("nav-arrow");
      path.setAttribute("marker-end", "url(#arrowhead)");
      path.setAttribute("d", d);

      // Animate the drawing of the arrow using the stroke-dash technique.
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
      void path.getBoundingClientRect(); // force reflow to trigger the animation
      path.style.transition = "stroke-dashoffset 2s ease";
      path.style.strokeDashoffset = "0";

      // Append the path to the SVG overlay.
      svg.appendChild(path);
    });
  }

  // Draw the arrows on initial load.
  drawArrows();
  // Redraw on window resize (to update positions on zoom/resizing).
  window.addEventListener("resize", drawArrows);
  // Also redraw on scroll so that the curves stay attached to the Navigation header.
  window.addEventListener("scroll", drawArrows);

  // Additionally, update arrow positions whenever a collapsible toggle button is pressed.
  // This listens to clicks on any element with the class "toggle-button".
  document.querySelectorAll(".toggle-button").forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      // Use a small delay to allow layout changes to take effect.
      setTimeout(drawArrows, 50);
    });
  });
});
