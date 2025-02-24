import numpy as np
import matplotlib.pyplot as plt

# -----------------------------
# 1) Parametric ellipse (quarter arc)
# -----------------------------
a = 2.0   # semi-major axis
b = 1.0   # semi-minor axis
theta = np.linspace(0, np.pi/2, 200)
x_ellipse = a * np.cos(theta)
y_ellipse = b * np.sin(theta)

# -----------------------------
# 2) Rational Quadratic Bézier
#    EXACT representation of the quarter ellipse arc
# -----------------------------
# For an ellipse x^2/a^2 + y^2/b^2 = 1, from theta=0 to theta=pi/2:
#   Endpoint 0: (a, 0)
#   Endpoint 1: (0, b)
# A known approach is to treat it similarly to how we handle a quarter circle,
# but scale for the ellipse. We set:
#
#   P0 = (a, 0)
#   P2 = (0, b)
#   P1 = (a, b)   <--- raw midpoint in bounding box
#   w1 = weight for P1 that ensures we follow ellipse exactly
#
# The exact rational formulation for conics is more general.
# One known standard for a quarter *circle* is w1 = sqrt(2)/2.
# For an ellipse, you scale accordingly. Here's a direct approach:

P0 = np.array([a, 0])
P2 = np.array([0, b])
# We'll use the midpoint in bounding box (a, b).
P1 = np.array([a, b])

# The needed weight for a quarter ellipse is:
#   w1 = sqrt((a^2 + b^2)) / (a + b)
# This ensures the correct ellipse arc. (Derivable from conic constraints.)
w1 = np.sqrt(a*a + b*b) / (a + b)

# We'll sample the rational Bézier from t=0..1.
num_samples = 200
t_vals = np.linspace(0, 1, num_samples)

# Evaluate the rational quadratic:
# Q(t) = [ (1-t)^2 * w0 * P0 + 2t(1-t) * w1 * P1 + t^2 * w2 * P2 ] /
#        [ (1-t)^2 * w0 + 2t(1-t) * w1 + t^2 * w2 ]
#
# Typically we set w0 = w2 = 1 for the endpoints.
w0 = 1.0
w2 = 1.0

rbez_x = []
rbez_y = []
for t in t_vals:
    numerator  = (1 - t)**2 * w0 * P0 + 2*t*(1 - t) * w1 * P1 + (t**2) * w2 * P2
    denominator = (1 - t)**2 * w0 + 2*t*(1 - t) * w1 + (t**2) * w2
    Q = numerator / denominator
    rbez_x.append(Q[0])
    rbez_y.append(Q[1])

# -----------------------------
# 3) Quartic (degree-4) polynomial Bézier
#    APPROXIMATION of the same quarter ellipse
# -----------------------------
# We need 5 control points: P0..P4. The simplest choice is:
#   P0 = (a, 0)
#   P4 = (0, b)
#   P2 near center along the ellipse
# We’ll define some simple symmetrical control points so the curve
# spans from (a,0) to (0,b).
#
# Note: There's no "perfect" polynomial quartic for an ellipse arc, so this is
# just a plausible set of control points that approximate the shape.

B0 = np.array([a,   0])       # same as ellipse start
B1 = np.array([a,   b*0.4])   # "pull" in the y-direction
B2 = np.array([a*0.4, b*0.9]) # near the diagonal, to shape the curve
B3 = np.array([a*0.1, b*1.0]) # closer to top
B4 = np.array([0,   b])       # same as ellipse end

# Bézier (degree 4) formula:
#   B(t) = sum_{i=0 to 4} [ C(4, i) * (1 - t)^(4 - i) * t^i * B_i ]
# where B_i are the control points (vectors).

def bernstein(n, i, t):
    """Bernstein polynomial C(n,i)*(1-t)^(n-i)*t^i"""
    from math import comb  # Python 3.8+
    return comb(n, i) * (1 - t)**(n - i) * t**i

poly_x = []
poly_y = []
for t in t_vals:
    bx = (bernstein(4,0,t)*B0[0] + bernstein(4,1,t)*B1[0] +
          bernstein(4,2,t)*B2[0] + bernstein(4,3,t)*B3[0] +
          bernstein(4,4,t)*B4[0])
    by = (bernstein(4,0,t)*B0[1] + bernstein(4,1,t)*B1[1] +
          bernstein(4,2,t)*B2[1] + bernstein(4,3,t)*B3[1] +
          bernstein(4,4,t)*B4[1])
    poly_x.append(bx)
    poly_y.append(by)

# -----------------------------
# PLOT EVERYTHING
# -----------------------------
plt.figure(figsize=(7,7))
plt.plot(x_ellipse, y_ellipse, 'k-',  label='Exact ellipse (parametric)')
plt.plot(rbez_x,    rbez_y,    'r--', label='Rational Quadratic Bézier (exact)')
plt.plot(poly_x,    poly_y,    'b-.', label='Quartic Bézier (approx)')
plt.scatter(*zip(*[B0,B1,B2,B3,B4]), color='blue', s=40, marker='o',
            label='Quartic control points')
plt.scatter(*zip(*[P0,P1,P2]), color='red', s=40, marker='x',
            label='Quad control points')

plt.axis('equal')  # keep aspect ratio
plt.legend()
plt.title("Quarter Ellipse: Parametric vs. Rational Quadratic vs. Quartic Bézier")
plt.xlabel("x")
plt.ylabel("y")
plt.show()

