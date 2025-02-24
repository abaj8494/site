from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
import matplotlib.pyplot as plt
from matplotlib.path import Path as MplPath
import matplotlib.patches as patches

def cffCharStringToPath(charString, scale=1.0):
    """
    Convert a Type 2 (CFF) charString into a Matplotlib Path.
    We'll use a RecordingPen to capture drawing commands,
    then translate those commands into path segments.
    """
    from fontTools.pens.recordingPen import RecordingPen
    from matplotlib.path import Path as MplPath

    pen = RecordingPen()
    charString.draw(pen)  # "draw" calls pen methods (moveTo, lineTo, curveTo, etc.)

    # In many fontTools versions, the recorded operations are in pen.value
    #  -> a list of (methodName, pointsList) tuples
    recorded_ops = pen.value  # e.g. [("moveTo", [(x,y)]), ("lineTo", [(x,y), ...]), ...]

    vertices = []
    codes = []

    def close_subpath_if_needed():
        if vertices and codes and codes[-1] != MplPath.CLOSEPOLY:
            # Add a CLOSEPOLY referencing the current end point
            vertices.append(vertices[-1])
            codes.append(MplPath.CLOSEPOLY)

    for (method, pts) in recorded_ops:
        if method == "moveTo":
            # Start a new subpath
            close_subpath_if_needed()  # close previous contour if open
            x, y = pts[0]
            vertices.append((x*scale, y*scale))
            codes.append(MplPath.MOVETO)

        elif method == "lineTo":
            # One or more line segments
            for (x, y) in pts:
                vertices.append((x*scale, y*scale))
                codes.append(MplPath.LINETO)

        elif method == "curveTo":
            # 'curveTo' in CFF = cubic curves
            # The points come in groups of three: (c1, c2, endPoint)
            # If there are multiple sets, they're appended in order.
            for i in range(0, len(pts), 3):
                c1x, c1y = pts[i]
                c2x, c2y = pts[i+1]
                ex,  ey  = pts[i+2]
                vertices.append((c1x*scale, c1y*scale))
                codes.append(MplPath.CURVE4)
                vertices.append((c2x*scale, c2y*scale))
                codes.append(MplPath.CURVE4)
                vertices.append((ex*scale,  ey*scale))
                codes.append(MplPath.CURVE4)

        elif method == "qCurveTo":
            # Quadratic curves (less common in CFF, but sometimes used).
            # Each group is: (controlPoint1, ..., controlPointN, endPoint)
            # For brevity, not fully implemented here.
            pass

        elif method == "closePath":
            close_subpath_if_needed()

    # In case the charstring never explicitly closed the last subpath:
    close_subpath_if_needed()

    return MplPath(vertices, codes)

def ttGlyphToPath(glyph, scale=1.0):
    """
    Convert a TTGlyph (TrueType outlines) to a matplotlib Path.
    Simplified approach that handles on-curve/off-curve points.
    """
    coords = glyph.coordinates
    endPts = glyph.endPtsOfContours
    flags  = glyph.flags

    vertices = []
    codes = []
    start_index = 0

    for end_index in endPts:
        contour_coords = coords[start_index:end_index+1]
        contour_flags  = flags[start_index:end_index+1]
        start_index = end_index + 1

        if len(contour_coords) == 0:
            continue

        # MoveTo first point
        x0, y0 = contour_coords[0]
        vertices.append((x0*scale, y0*scale))
        codes.append(MplPath.MOVETO)

        i = 1
        while i < len(contour_coords):
            x1, y1 = contour_coords[i]
            onCurve = bool(contour_flags[i] & 1)
            if onCurve:
                # LineTo on-curve point
                vertices.append((x1*scale, y1*scale))
                codes.append(MplPath.LINETO)
                i += 1
            else:
                # Off-curve => QCURVE to next on-curve
                cx, cy = x1*scale, y1*scale
                if i+1 < len(contour_coords):
                    x2, y2 = contour_coords[i+1]
                    onCurve2 = bool(contour_flags[i+1] & 1)
                    if onCurve2:
                        # curve3 to the next on-curve
                        vertices.append((cx, cy))
                        codes.append(MplPath.CURVE3)
                        vertices.append((x2*scale, y2*scale))
                        codes.append(MplPath.CURVE3)
                        i += 2
                    else:
                        # Next is also off-curve => advanced logic needed.
                        # We'll skip for brevity.
                        i += 1
                else:
                    i += 1

        # Close the contour
        vertices.append(vertices[-1])  # repeat last point
        codes.append(MplPath.CLOSEPOLY)

    return MplPath(vertices, codes)


def plotOmegaFromFont(font_path, unicode_val=0x03A9, scale=1.0):
    font = TTFont(font_path)
    cmap = font.getBestCmap()
    if not cmap:
        raise RuntimeError("No usable cmap found in this font.")

    glyph_name = cmap.get(unicode_val)
    if glyph_name is None:
        raise RuntimeError(f"No glyph for U+{unicode_val:X} in this font.")

    print(f"Glyph name for U+{unicode_val:X}: {glyph_name}")

    if 'glyf' in font:  # TrueType outlines
        glyf_table = font['glyf']
        glyph = glyf_table[glyph_name]
        path = ttGlyphToPath(glyph, scale=scale)
    elif 'CFF ' in font:  # PostScript/CFF outlines
        cff  = font['CFF '].cff
        topDict = cff.topDictIndex[0]
        charString = topDict.CharStrings[glyph_name]
        path = cffCharStringToPath(charString, scale=scale)
    else:
        raise RuntimeError("Font does not contain 'glyf' or 'CFF ' tables. Not supported in this example.")

    # Plot with matplotlib
    fig, ax = plt.subplots(figsize=(5,5))
    patch = patches.PathPatch(path, facecolor='black', edgecolor='none')
    ax.add_patch(patch)

    xs = [v[0] for v in path.vertices]
    ys = [v[1] for v in path.vertices]
    if xs and ys:
        margin = 50
        ax.set_xlim(min(xs)-margin, max(xs)+margin)
        ax.set_ylim(min(ys)-margin, max(ys)+margin)

    ax.set_aspect('equal', 'box')
    # If the Y coordinates appear inverted, uncomment:
    # ax.invert_yaxis()

    plt.title(f"Omega (U+{unicode_val:X}) from {font_path}")
    plt.show()


if __name__ == "__main__":
    # Example usage: set font_path to a MathJax OTF or TTF that uses CFF
    font_path = "MathJax_Main-Bold.otf"
    plotOmegaFromFont(font_path, unicode_val=0x03A9, scale=1.0)

