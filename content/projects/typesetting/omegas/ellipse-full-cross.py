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
# Helper Functions
# -------------------------------------------------

def bernstein(n, i, t):
    """Bernstein polynomial C(n,i)*(1-t)^(n-i)*t^i"""
    return comb(n, i) * (1 - t)**(n - i) * t**i

def rational_quadratic_ellipse_arc(a, b, start_angle, end_angle, num_samples=50):
    """
    Returns (x, y) arrays for a *rational quadratic* Bézier arc of the ellipse
    x^2/a^2 + y^2/b^2 = 1, spanning start_angle..end_angle (in radians),
    plus the 3 control points [P0, P1, P2].

    Uses P0, P2 on the ellipse at the endpoints of the arc,
    and a special P1 + weight w1 that makes the arc exact.
    """
    # Endpoints of the arc
    P0 = np.array([a*cos(start_angle), b*sin(start_angle)])
    P2 = np.array([a*cos(end_angle),   b*sin(end_angle)])
    
    # Mid-angle
    mid_angle = 0.5*(start_angle + end_angle)

    # For a quarter arc (π/2 wide), we can use the well-known formula:
    #   w1 = sqrt(a^2 + b^2) / (a + b)
    # and set P1 in the bounding-box corner (±a, ±b) for that quadrant.

    w1 = sqrt(a*a + b*b) / (a + b)

    sign_x = np.sign(cos(mid_angle))  # +1 or -1
    sign_y = np.sign(sin(mid_angle))  # +1 or -1
    P1 = np.array([sign_x*a, sign_y*b])

    # Evaluate the rational quadratic for t in [0, 1]
    t_vals = np.linspace(0, 1, num_samples)
    w0 = 1.0
    w2 = 1.0

    curve_x, curve_y = [], []
    for t in t_vals:
        numerator  = (1 - t)**2 * w0 * P0 + 2*t*(1 - t) * w1 * P1 + t**2 * w2 * P2
        denominator = (1 - t)**2 * w0 + 2*t*(1 - t) * w1 + t**2 * w2
        Q = numerator / denominator
        curve_x.append(Q[0])
        curve_y.append(Q[1])

    return np.array(curve_x), np.array(curve_y), [P0, P1, P2]


def quartic_ellipse_arc_approx(a, b, start_angle, end_angle, num_samples=50):
    """
    Returns (x, y) arrays for a quartic Bézier that *approximates* 
    the ellipse arc start_angle..end_angle,
    plus the 5 control points [B0..B4].
    """
    # Endpoints
    B0 = np.array([a*cos(start_angle), b*sin(start_angle)])
    B4 = np.array([a*cos(end_angle),   b*sin(end_angle)])

    # We'll place the intermediate points in a heuristic manner.
    mid_angle = 0.5*(start_angle + end_angle)
    mid_pt = np.array([a*cos(mid_angle), b*sin(mid_angle)])
    
    # Heuristic ratio for B1 and B3:
    ratio = 0.55
    
    B1 = B0 + ratio*(mid_pt - B0)
    B3 = B4 + ratio*(mid_pt - B4)
    B2 = mid_pt  # near midpoint; can tweak for better approximation

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
    return np.array(px), np.array(py), [B0, B1, B2, B3, B4]


# -------------------------------------------------
# 2) Construct the *entire ellipse* via 4 arcs of Rational Quadratic
# -------------------------------------------------
quarter_angles = [0, pi/2, pi, 3*pi/2, 2*pi]

rbez_x_full = []
rbez_y_full = []
rbez_ctrl_points = []  # collect control points for all 4 arcs

for i in range(4):
    start_a = quarter_angles[i]
    end_a   = quarter_angles[i+1]
    bx, by, ctrl_pts = rational_quadratic_ellipse_arc(a, b, start_a, end_a, num_samples=80)
    rbez_x_full.extend(bx)
    rbez_y_full.extend(by)
    rbez_ctrl_points.extend(ctrl_pts)


# -------------------------------------------------
# 3) Construct the entire ellipse via 4 arcs of Quartic Polynomial (approx)
# -------------------------------------------------
poly_x_full = []
poly_y_full = []
quartic_ctrl_points = []

for i in range(4):
    start_a = quarter_angles[i]
    end_a   = quarter_angles[i+1]
    px, py, ctrl_pts = quartic_ellipse_arc_approx(a, b, start_a, end_a, 80)
    poly_x_full.extend(px)
    poly_y_full.extend(py)
    quartic_ctrl_points.extend(ctrl_pts)


# -------------------------------------------------
# PLOT EVERYTHING
# -------------------------------------------------
plt.figure(figsize=(8,8))

# 1) Exact parametric ellipse
plt.plot(x_ellipse, y_ellipse, 'k-', label="Exact ellipse (parametric)")

# 2) Rational Quadratic arcs
plt.plot(rbez_x_full, rbez_y_full, 'r--', label="Rational Quadratic (exact, 4 arcs)")

# Plot the rational quadratic control points:
ctrl_rx = [p[0] for p in rbez_ctrl_points]
ctrl_ry = [p[1] for p in rbez_ctrl_points]
plt.scatter(ctrl_rx, ctrl_ry, color='red', s=30, marker='x', label='Rational Quad control pts')

# 3) Quartic arcs
plt.plot(poly_x_full, poly_y_full, 'b-.', label="Quartic Bézier (approx, 4 arcs)")

# Plot the quartic control points:
ctrl_qx = [p[0] for p in quartic_ctrl_points]
ctrl_qy = [p[1] for p in quartic_ctrl_points]
plt.scatter(ctrl_qx, ctrl_qy, color='blue', s=30, marker='o', alpha=0.5,
            label='Quartic control pts')

plt.axis('equal')
plt.legend()
plt.title("Full Ellipse: Parametric vs. 4-Arc Rational Quadratic vs. 4-Arc Quartic Bézier")
plt.xlabel("x")
plt.ylabel("y")
plt.show()

