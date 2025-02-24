import math
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
import matplotlib.path as mpath
import os

def glyph_to_matplotlib_path(font_path, unicode_val=0x03A9, scale=1.0):
    """
    Loads `font_path` with fontTools, finds the glyph for `unicode_val`,
    and returns a matplotlib.path.Path object for its outline.
    
    Supports either TrueType (glyf) or CFF (PostScript) outlines.
    """
    font = TTFont(font_path)
    cmap = font.getBestCmap()
    if not cmap:
        raise RuntimeError("No usable cmap found in this font.")

    glyph_name = cmap.get(unicode_val)
    if glyph_name is None:
        raise RuntimeError(f"No glyph for U+{unicode_val:X} in this font.")

    if "glyf" in font:
        # TrueType outlines (unlikely for MathJax_Main-Bold, but let's handle it)
        glyf_table = font["glyf"]
        glyph = glyf_table[glyph_name]
        return ttGlyph_to_path(glyph, scale=scale)
    elif "CFF " in font:
        # CFF (PostScript) outlines (typical for MathJax OTF)
        cff  = font["CFF "].cff
        topDict = cff.topDictIndex[0]
        charString = topDict.CharStrings[glyph_name]
        return cffCharString_to_path(charString, scale=scale)
    else:
        raise RuntimeError("Font does not contain 'glyf' or 'CFF ' tables.")


def ttGlyph_to_path(glyph, scale=1.0):
    """
    Very simplified parser for a TrueType glyph's 'coordinates' + 'flags' → matplotlib Path.
    Does not fully handle multiple consecutive off-curve points.
    """
    coords = glyph.coordinates
    endPts = glyph.endPtsOfContours
    flags = glyph.flags

    vertices = []
    codes = []

    start_idx = 0
    for end_idx in endPts:
        contour_coords = coords[start_idx : end_idx+1]
        contour_flags  = flags[start_idx : end_idx+1]
        start_idx = end_idx + 1

        if len(contour_coords) == 0:
            continue

        # MoveTo first point
        x0, y0 = contour_coords[0]
        x0 *= scale
        y0 *= scale
        vertices.append((x0, y0))
        codes.append(mpath.Path.MOVETO)

        i = 1
        while i < len(contour_coords):
            x1, y1 = contour_coords[i]
            x1 *= scale
            y1 *= scale
            onCurve = bool(contour_flags[i] & 1)
            if onCurve:
                # lineTo
                vertices.append((x1, y1))
                codes.append(mpath.Path.LINETO)
                i += 1
            else:
                # off-curve => (quadratic)
                if i+1 < len(contour_coords):
                    x2, y2 = contour_coords[i+1]
                    onCurve2 = bool(contour_flags[i+1] & 1)
                    x2 *= scale
                    y2 *= scale
                    # We'll do a CURVE3 (quadratic)
                    vertices.append((x1, y1))
                    codes.append(mpath.Path.CURVE3)
                    vertices.append((x2, y2))
                    codes.append(mpath.Path.CURVE3)
                    i += 2
                else:
                    i += 1

        # Close contour
        vertices.append(vertices[-1])
        codes.append(mpath.Path.CLOSEPOLY)

    return mpath.Path(vertices, codes)


def cffCharString_to_path(charString, scale=1.0):
    """
    Convert a CFF (Type2) charString to a matplotlib Path using a RecordingPen.
    Typically how MathJax's OTF outlines are stored.
    """
    pen = RecordingPen()
    charString.draw(pen)

    vertices = []
    codes = []

    def close_if_needed():
        if vertices and codes and codes[-1] != mpath.Path.CLOSEPOLY:
            vertices.append(vertices[-1])
            codes.append(mpath.Path.CLOSEPOLY)

    for (cmd, pts) in pen.value:
        if cmd == "moveTo":
            close_if_needed()
            x, y = pts[0]
            x *= scale
            y *= scale
            vertices.append((x, y))
            codes.append(mpath.Path.MOVETO)

        elif cmd == "lineTo":
            for (x, y) in pts:
                x *= scale
                y *= scale
                vertices.append((x, y))
                codes.append(mpath.Path.LINETO)

        elif cmd == "curveTo":
            # cubic segments
            # each group of 3 => (control1, control2, endPoint)
            for i in range(0, len(pts), 3):
                c1x, c1y = pts[i]
                c2x, c2y = pts[i+1]
                ex,  ey  = pts[i+2]
                c1x *= scale
                c1y *= scale
                c2x *= scale
                c2y *= scale
                ex  *= scale
                ey  *= scale
                vertices.append((c1x, c1y))
                codes.append(mpath.Path.CURVE4)
                vertices.append((c2x, c2y))
                codes.append(mpath.Path.CURVE4)
                vertices.append((ex,  ey))
                codes.append(mpath.Path.CURVE4)

        elif cmd == "qCurveTo":
            # not typically used in CFF, skip or implement as needed
            pass
        elif cmd == "closePath":
            close_if_needed()

    close_if_needed()
    return mpath.Path(vertices, codes)


def path_to_svg_d(commands, vertices):
    """
    Convert a matplotlib Path sequence into an SVG 'd' attribute string.
    (commands and vertices are parallel arrays from path.codes & path.vertices)
    """
    path_cmds = []
    idx = 0
    while idx < len(commands):
        cmd = commands[idx]
        x, y = vertices[idx]
        if cmd == mpath.Path.MOVETO:
            path_cmds.append(f"M {x:.2f} {y:.2f}")
        elif cmd == mpath.Path.LINETO:
            path_cmds.append(f"L {x:.2f} {y:.2f}")
        elif cmd == mpath.Path.CURVE3:
            # Quadratic in matplotlib is a two-step approach
            # But let's assume we have pairs: [control, end]
            # The control is at index idx, the end is at index idx+1
            if idx + 1 < len(commands):
                x2, y2 = vertices[idx+1]
                path_cmds.append(f"Q {x:.2f} {y:.2f}, {x2:.2f} {y2:.2f}")
                idx += 1  # skip the next
        elif cmd == mpath.Path.CURVE4:
            # Cubic in matplotlib often comes in triplets: [c1, c2, end]
            # We'll do something similar
            if idx + 2 < len(commands):
                x2, y2 = vertices[idx+1]
                x3, y3 = vertices[idx+2]
                path_cmds.append(f"C {x:.2f} {y:.2f}, {x2:.2f} {y2:.2f}, {x3:.2f} {y3:.2f}")
                idx += 2
        elif cmd == mpath.Path.CLOSEPOLY:
            path_cmds.append("Z")
        idx += 1

    return " ".join(path_cmds)


def export_omega_to_svg(font_path, unicode_val=0x03A9, svg_filename="OmegaBold.svg"):
    # 1) Build the glyph path
    glyph_path = glyph_to_matplotlib_path(font_path, unicode_val=unicode_val, scale=1.0)
    codes = glyph_path.codes
    verts = glyph_path.vertices

    # 2) Convert to 'd' path string
    d_string = path_to_svg_d(codes, verts)

    # 3) Determine bounding box
    xs = [v[0] for v in verts]
    ys = [v[1] for v in verts]
    if not xs or not ys:
        min_x = max_x = min_y = max_y = 0
    else:
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
    width  = max_x - min_x
    height = max_y - min_y

    # 4) Create a minimal SVG doc
    # We'll offset everything so that the glyph is in the visible area 
    # (i.e. near (0,0) at bottom-left). You can also keep it raw if you prefer.
    # We'll translate by -min_x, -min_y in the path's "transform" if you like,
    # but for simplicity let's just define a viewBox that covers the bounding box.

    svg_template = f"""<?xml version="1.0" standalone="no"?>
<svg width="{width:.2f}" height="{height:.2f}"
     viewBox="{min_x:.2f} {min_y:.2f} {width:.2f} {height:.2f}"
     xmlns="http://www.w3.org/2000/svg" version="1.1">
  <path d="{d_string}" fill="black" stroke="none" />
</svg>
"""

    with open(svg_filename, "w", encoding="utf-8") as f:
        f.write(svg_template)

    print(f"Exported U+{unicode_val:X} (Omega) to {svg_filename}")


if __name__ == "__main__":
    # Example usage:
    font_path = "MathJax_Main-Bold.otf"
    export_omega_to_svg(font_path, unicode_val=0x03A9, svg_filename="OmegaBold.svg")

