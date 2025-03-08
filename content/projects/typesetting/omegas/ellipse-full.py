import numpy as np
import matplotlib.pyplot as plt
from math import comb, sqrt, cos, sin, pi

# -----------------------------
# 1) Parametric ellipse (full 0..2π)
# -----------------------------
a = 2.0   # semi-major axis
b = 1.0   # semi-minor axis

theta = np.linspace(0, 2*pi, 400)
x_ellipse = a * np.cos(theta)
y_ellipse = b * np.sin(theta)

# -------------------------------------------------
# Helper Functions for Rational Quadratic Arc
# -------------------------------------------------
def rational_quadratic_ellipse_arc(a, b, start_angle, end_angle, num_samples=50):
    """
    Returns x, y arrays for a *rational quadratic* Bézier arc of the ellipse
    x^2/a^2 + y^2/b^2 = 1, spanning start_angle..end_angle (in radians).

    Uses three control points P0, P1, P2 and weights w0=1, w1, w2=1,
    where w1 ensures the ellipse is *exact* for that arc.
    """
    # Endpoints
    P0 = np.array([a*cos(start_angle), b*sin(start_angle)])
    P2 = np.array([a*cos(end_angle),   b*sin(end_angle)])
    
    # "Middle" angle for the arc
    mid_angle = 0.5*(start_angle + end_angle)
    # Naive midpoint of bounding box would be (a, b), but for arbitrary arcs,
    # we find the midpoint *on the ellipse boundary* in angle terms, or something similar.
    # However, a simpler standard approach for a *quarter arc* uses a known formula for w1.
    # For each quadrant, the arc is 90°, so we can adapt the quarter-arc formula:
    #   w1 = sqrt(a^2 + b^2) / (a + b)  (if the arc is exactly 90° from 0..π/2).
    #
    # But we want a general approach for arcs of any angle.
    #
    # A simpler universal approach is:
    #  - P1 is the ellipse point at mid_angle
    #  - We'll compute w1 from "conic" constraints. However, deriving the exact formula
    #    for an arbitrary arc can be non-trivial. 
    #
    # For 90° arcs specifically (like each quadrant), we can directly reuse the quarter-ellipse logic.
    # We'll do exactly that for each quadrant: start_angle..start_angle+π/2.

    # So let's assume each segment is exactly π/2 wide.
    # Then the standard weight for a quarter ellipse is:
    w1 = sqrt(a*a + b*b) / (a + b)
    # For the control point P1, if it's strictly a quarter arc, a classical solution is:
    #   P1 = intersection of tangents from P0 and P2 if this were a perfect ellipse arc.
    # But an easier approach that works well: place P1 at the "corner" of the bounding box
    # for that quadrant. For example:
    #   Quadrant 1 arc:   P1 ~ (a, b)
    #   Quadrant 2 arc:   P1 ~ (-a, b)
    # etc.
    #
    # We'll do a sign-based approach to place P1 in the correct quadrant box corner:
    #    sign_x = sign of cos(mid_angle)
    #    sign_y = sign of sin(mid_angle)
    # so that P1 is (sign_x*a, sign_y*b).
    #
    # This is the typical approach used to piece four arcs for a circle/ellipse in standard position.

    sign_x = np.sign(cos(mid_angle))  # either +1 or -1
    sign_y = np.sign(sin(mid_angle))  # either +1 or -1
    P1 = np.array([sign_x*a, sign_y*b])
    print(f"p1 is {P1}")

    t_vals = np.linspace(0, 1, num_samples)
    w0 = 1.0
    w2 = 1.0

    curve_x, curve_y = [], []
    for t in t_vals:
        numerator  = (1 - t)**2 * w0 * P0 + 2*t*(1 - t) * w1 * P1 + (t**2) * w2 * P2
        denominator = (1 - t)**2 * w0 + 2*t*(1 - t) * w1 + (t**2) * w2
        Q = numerator / denominator
        curve_x.append(Q[0])
        curve_y.append(Q[1])
    return np.array(curve_x), np.array(curve_y)

# -------------------------------------------------
# 2) Rational Quadratic Bézier for the *entire* ellipse
#    We'll piece together 4 arcs, each spanning 90°
# -------------------------------------------------
rbez_x_full = []
rbez_y_full = []
quarter_angles = [0, pi/2, pi, 3*pi/2, 2*pi]  # 4 segments

for i in range(4):
    start_a = quarter_angles[i]
    end_a   = quarter_angles[i+1]
    bx, by  = rational_quadratic_ellipse_arc(a, b, start_a, end_a, num_samples=80)
    rbez_x_full.extend(bx)
    rbez_y_full.extend(by)

# -------------------------------------------------
# 3) Quartic (degree-4) polynomial Bézier for the *entire* ellipse
#    We'll do it similarly: 4 arcs, each approximating a quadrant.
# -------------------------------------------------
def bernstein(n, i, t):
    """Bernstein polynomial C(n,i)*(1-t)^(n-i)*t^i"""
    return comb(n, i) * (1 - t)**(n - i) * t**i

def quartic_ellipse_arc_approx(a, b, start_angle, end_angle, num_samples=50):
    """
    Returns x, y for a quartic Bézier that *approximates* the ellipse arc
    from start_angle..end_angle. 
    We pick 5 control points somewhat 'by hand' in that quadrant.
    """
    # Endpoints
    B0 = np.array([a*cos(start_angle), b*sin(start_angle)])
    B4 = np.array([a*cos(end_angle),   b*sin(end_angle)])

    # We'll place the intermediate points "somewhat" along radial lines
    # or along the ellipse bounding box corners to shape the curve.
    #
    # This is not an exact method (it's an approximation).
    # For each quadrant, we can guess intermediate control points to "hug" the ellipse.
    # A simple approach: place B2 near the midpoint angle, and B1, B3 partway there.
    #
    mid_angle = 0.5*(start_angle + end_angle)
    # We can sample the actual midpoint on the ellipse
    mid_pt = np.array([a*cos(mid_angle), b*sin(mid_angle)])
    
    # Let's define a "ratio" that determines how strongly B1, B3 pull toward the midpoint
    # This is purely heuristic:
    ratio = 0.55  # tweak to get a decent shape

    B1 = B0 + ratio*(mid_pt - B0)
    B3 = B4 + ratio*(mid_pt - B4)
    # Place B2 near the midpoint itself (slightly adjusting for better shape).
    B2 = mid_pt  # you could tweak if desired

    # Evaluate the quartic Bézier
    t_vals = np.linspace(0, 1, num_samples)
    px, py = [], []
    for t in t_vals:
        bx = (bernstein(4,0,t)*B0[0] + bernstein(4,1,t)*B1[0] +
              bernstein(4,2,t)*B2[0] + bernstein(4,3,t)*B3[0] +
              bernstein(4,4,t)*B4[0])
        by = (bernstein(4,0,t)*B0[1] + bernstein(4,1,t)*B1[1] +
              bernstein(4,2,t)*B2[1] + bernstein(4,3,t)*B3[1] +
              bernstein(4,4,t)*B4[1])
        px.append(bx)
        py.append(by)
    return np.array(px), np.array(py), [B0,B1,B2,B3,B4]

# Build the entire ellipse from 4 quartic arcs
poly_x_full = []
poly_y_full = []
quartic_ctrl_points = []  # to plot them, if desired

for i in range(4):
    start_a = quarter_angles[i]
    end_a   = quarter_angles[i+1]
    px, py, ctrl_pts = quartic_ellipse_arc_approx(a, b, start_a, end_a, 80)
    poly_x_full.extend(px)
    poly_y_full.extend(py)
    quartic_ctrl_points.extend(ctrl_pts)  # store for scatter-plot

# -------------------------------------------------
# PLOT EVERYTHING
# -------------------------------------------------
plt.figure(figsize=(8,8))

# Plot the parametric ellipse
plt.plot(x_ellipse, y_ellipse, 'k-', label="Exact ellipse (parametric)")

# Plot the 4 rational-quadratic arcs (stitched) for the full ellipse
plt.plot(rbez_x_full, rbez_y_full, 'r--', label="Rational Quadratic (exact, 4 arcs)")

# Plot the 4 quartic arcs (stitched) for the full ellipse
plt.plot(poly_x_full, poly_y_full, 'b-.', label="Quartic Bézier (approx, 4 arcs)")

# Optionally, show the quartic control points:
# (They come in multiples of 5 for each arc; you can see how they're distributed)
ctrl_x = [p[0] for p in quartic_ctrl_points]
ctrl_y = [p[1] for p in quartic_ctrl_points]
plt.scatter(ctrl_x, ctrl_y, color='blue', s=20, marker='o', alpha=0.5,
            label='Quartic control points')

plt.axis('equal')  # maintain aspect ratio
plt.legend()
plt.title("Full Ellipse: Parametric vs. 4-Arc Rational Quadratic vs. 4-Arc Quartic Bézier")
plt.xlabel("x")
plt.ylabel("y")
plt.show()

