import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path as MplPath
from fontTools.ttLib import TTFont


##############################################################################
# 1) Helper Functions
##############################################################################

def cffCharStringToPathAndPoints(charString, scale=1.0):
    """
    Convert a CFF (Type 2) charString into a Matplotlib Path,
    and gather separate lists of on-curve (anchor) points and control points.
    """
    from fontTools.pens.recordingPen import RecordingPen
    
    pen = RecordingPen()
    charString.draw(pen)  # 'draw' calls moveTo/lineTo/curveTo/closePath, etc.

    # pen.value is a list of (methodName, pointsList) tuples
    recorded_ops = pen.value

    vertices = []
    codes = []

    # We’ll store anchors vs. control points separately:
    anchor_points = []
    control_points = []

    def close_subpath_if_needed():
        if vertices and codes and codes[-1] != MplPath.CLOSEPOLY:
            vertices.append(vertices[-1])
            codes.append(MplPath.CLOSEPOLY)

    for (method, pts) in recorded_ops:
        if method == "moveTo":
            close_subpath_if_needed()
            x, y = pts[0]
            x *= scale
            y *= scale
            vertices.append((x, y))
            codes.append(MplPath.MOVETO)
            anchor_points.append((x, y))

        elif method == "lineTo":
            for (x, y) in pts:
                x *= scale
                y *= scale
                vertices.append((x, y))
                codes.append(MplPath.LINETO)
                anchor_points.append((x, y))

        elif method == "curveTo":
            # Each set of 3 points => (control1, control2, end)
            for i in range(0, len(pts), 3):
                c1x, c1y = pts[i]
                c2x, c2y = pts[i+1]
                ex,  ey  = pts[i+2]
                c1x *= scale; c1y *= scale
                c2x *= scale; c2y *= scale
                ex  *= scale; ey  *= scale

                # In a cubic curve: first two are control points, last is an anchor
                control_points.append((c1x, c1y))
                control_points.append((c2x, c2y))
                anchor_points.append((ex, ey))

                vertices.append((c1x, c1y))
                codes.append(MplPath.CURVE4)
                vertices.append((c2x, c2y))
                codes.append(MplPath.CURVE4)
                vertices.append((ex,  ey))
                codes.append(MplPath.CURVE4)

        elif method == "qCurveTo":
            # Quadratic curves are less common in CFF, but exist in some fonts.
            # Each group is (control1, ..., controlN, end)
            # Not fully implemented here. If needed, implement similarly.
            pass

        elif method == "closePath":
            close_subpath_if_needed()

    close_subpath_if_needed()
    path = MplPath(vertices, codes)
    return path, anchor_points, control_points


def ttGlyphToPathAndPoints(ttGlyph, scale=1.0):
    """
    Convert a TrueType glyph ('glyf') to a Matplotlib Path,
    collecting on-curve points (anchors) and off-curve (control) points.
    (Caveat: we do a simplified approach to consecutive off-curves.)
    """
    coords = ttGlyph.coordinates
    endPts = ttGlyph.endPtsOfContours
    flags = ttGlyph.flags

    vertices = []
    codes = []

    anchor_points = []
    control_points = []

    start_index = 0
    for end_index in endPts:
        contour_coords = coords[start_index:end_index+1]
        contour_flags  = flags[start_index:end_index+1]
        start_index = end_index + 1

        if not len(contour_coords):
            continue

        # MoveTo first point
        x0, y0 = contour_coords[0]
        x0 *= scale
        y0 *= scale
        vertices.append((x0, y0))
        codes.append(MplPath.MOVETO)
        # First point is on-curve by definition in TT
        anchor_points.append((x0, y0))

        i = 1
        while i < len(contour_coords):
            x1, y1 = contour_coords[i]
            x1 *= scale
            y1 *= scale
            onCurve = bool(contour_flags[i] & 1)

            if onCurve:
                # On-curve => lineTo
                vertices.append((x1, y1))
                codes.append(MplPath.LINETO)
                anchor_points.append((x1, y1))
                i += 1
            else:
                # Off-curve => QCURVE to the next on-curve
                control_points.append((x1, y1))  # off-curve
                if i + 1 < len(contour_coords):
                    x2, y2 = contour_coords[i+1]
                    x2 *= scale
                    y2 *= scale
                    onCurve2 = bool(contour_flags[i+1] & 1)
                    if onCurve2:
                        # curve3
                        vertices.append((x1, y1))  # control
                        codes.append(MplPath.CURVE3)
                        vertices.append((x2, y2))  # end
                        codes.append(MplPath.CURVE3)
                        anchor_points.append((x2, y2))
                        i += 2
                    else:
                        # Next is off-curve => advanced logic needed
                        i += 1
                else:
                    i += 1

        # Close the contour
        vertices.append(vertices[-1])
        codes.append(MplPath.CLOSEPOLY)

    path = MplPath(vertices, codes)
    return path, anchor_points, control_points


##############################################################################
# 2) Main Function to Plot Omega + Control Points
##############################################################################

def plotOmegaFromFont(font_path, unicode_val=0x03A9, scale=1.0):
    """Plot the glyph for `unicode_val` (default: U+03A9) from `font_path`,
    with all on-curve anchor points and control points."""
    font = TTFont(font_path)
    cmap = font.getBestCmap()
    if not cmap:
        raise RuntimeError("No usable cmap found in this font.")

    glyph_name = cmap.get(unicode_val)
    if glyph_name is None:
        raise RuntimeError(f"No glyph for U+{unicode_val:X} in this font.")
    print(f"Glyph name for U+{unicode_val:X}: {glyph_name}")

    path = None
    anchor_points = []
    control_points = []

    if 'glyf' in font:
        # TrueType outlines
        glyf_table = font['glyf']
        glyph = glyf_table[glyph_name]
        path, anchor_points, control_points = ttGlyphToPathAndPoints(glyph, scale=scale)

    elif 'CFF ' in font:
        # CFF (PostScript) outlines
        cff = font['CFF '].cff
        topDict = cff.topDictIndex[0]
        charString = topDict.CharStrings[glyph_name]
        path, anchor_points, control_points = cffCharStringToPathAndPoints(charString, scale=scale)

    else:
        raise RuntimeError("No 'glyf' or 'CFF ' table found in font. Not supported here.")

    # Plot with matplotlib
    fig, ax = plt.subplots(figsize=(6,6))

    # 1) Outline
    patch = patches.PathPatch(path, facecolor='black', edgecolor='none', alpha=0.15)
    ax.add_patch(patch)

    # 2) Draw path edges in a thin stroke to visualize segments
    outline_patch = patches.PathPatch(path, facecolor='none', edgecolor='black', linewidth=1.0)
    ax.add_patch(outline_patch)

    # 3) Plot anchor vs control points
    if anchor_points:
        ax.scatter([p[0] for p in anchor_points],
                   [p[1] for p in anchor_points],
                   color='red', marker='o', label='On-curve points')
    if control_points:
        ax.scatter([p[0] for p in control_points],
                   [p[1] for p in control_points],
                   color='blue', marker='x', label='Off-curve controls')

    xs = [v[0] for v in path.vertices]
    ys = [v[1] for v in path.vertices]
    if xs and ys:
        margin = 100
        ax.set_xlim(min(xs)-margin, max(xs)+margin)
        ax.set_ylim(min(ys)-margin, max(ys)+margin)

    ax.set_aspect('equal', 'box')
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.legend(loc='best')
    plt.title(f"Omega (U+{unicode_val:X}) from {font_path}\nShowing anchors (red) + controls (blue)")
    plt.show()


##############################################################################
# 3) Run the code
##############################################################################

if __name__ == "__main__":
    # Example usage
    # -------------
    # If you only have WOFF/WOFF2, consider converting it to OTF/TTF
    # or see if your fontTools can read WOFF directly.
    font_path = "MathJax_Main-Bold.otf"  # or TTF if you have a TrueType version
    plotOmegaFromFont(font_path, unicode_val=0x03A9, scale=1.0)

