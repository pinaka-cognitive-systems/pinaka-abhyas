def solve():
    # P(x) = -2x^3 + 9x^2 + 60x - 200
    # dP/dx = -6x^2 + 18x + 60 = 0 => x^2 - 3x - 10 = 0 => (x-5)(x+2)=0
    # Check all critical points
    def P(x):
        return -2*x**3 + 9*x**2 + 60*x - 200

    def dP(x):
        return -6*x**2 + 18*x + 60

    def d2P(x):
        return -12*x + 18

    # Find critical points by solving x^2 - 3x - 10 = 0
    import math
    a, b, c = 1, -3, -10
    disc = b**2 - 4*a*c
    assert disc >= 0
    x1 = (-b + math.sqrt(disc)) / (2*a)
    x2 = (-b - math.sqrt(disc)) / (2*a)

    # Filter valid (positive output) critical points
    candidates = [x for x in [x1, x2] if x > 0]
    assert len(candidates) == 1
    x_max = int(round(candidates[0]))
    assert x_max == 5
    assert abs(dP(x_max)) < 1e-9
    assert d2P(x_max) < 0  # confirms maximum

    return {"value": x_max, "option_key": 1}

if __name__ == "__main__":
    print(solve())
