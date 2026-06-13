def solve():
    # n^2 + n - 72 = 0 => (n-8)(n+9) = 0 => n=8 (positive)
    import math
    a, b, c = 1, 1, -72
    disc = b*b - 4*a*c
    x1 = (-b + math.sqrt(disc)) / (2*a)
    x2 = (-b - math.sqrt(disc)) / (2*a)
    n = x1 if x1 > 0 else x2
    # option mapping: 1->7, 2->8, 3->9, 4->6
    options = {1: 7, 2: 8, 3: 9, 4: 6}
    for k, v in options.items():
        if abs(v - n) < 1e-9:
            return {"value": int(n), "option_key": k}

if __name__ == "__main__":
    print(solve())
