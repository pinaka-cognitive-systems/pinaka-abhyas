import math

def solve():
    # 240/v - 240/(v+20) = 1
    # 4800 = v^2 + 20v
    # v^2 + 20v - 4800 = 0
    # discriminant = 400 + 19200 = 19600, sqrt = 140
    # v = (-20 + 140)/2 = 60
    a, b, c = 1, 20, -4800
    disc = b**2 - 4*a*c
    v = (-b + math.sqrt(disc)) / (2 * a)
    # Verify
    assert abs(240/v - 240/(v+20) - 1) < 1e-9, "Verification failed"
    return {"value": v, "option_key": 3}

if __name__ == "__main__":
    print(solve())
