def solve():
    # x^2 - 14x + 40 = 0 => (x-4)(x-10) = 0 => x=4 or x=10
    import math
    a, b, c = 1, -14, 40
    disc = b*b - 4*a*c
    x1 = (-b - math.sqrt(disc)) / (2*a)
    x2 = (-b + math.sqrt(disc)) / (2*a)
    smaller = min(x1, x2)
    # option mapping: 1->2, 2->4, 3->10, 4->8
    options = {1: 2, 2: 4, 3: 10, 4: 8}
    for k, v in options.items():
        if abs(v - smaller) < 1e-9:
            return {"value": int(smaller), "option_key": k}

if __name__ == "__main__":
    print(solve())
