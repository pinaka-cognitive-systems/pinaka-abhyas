def solve():
    # x*(14-x)=48 => x^2 - 14x + 48 = 0 => (x-6)(x-8)=0 => x=6 (smaller)
    import math
    a, b, c = 1, -14, 48
    disc = b*b - 4*a*c
    x1 = (-b - math.sqrt(disc)) / (2*a)
    x2 = (-b + math.sqrt(disc)) / (2*a)
    smaller = min(x1, x2)
    # option mapping: 1->4, 2->5, 3->6, 4->7
    options = {1: 4, 2: 5, 3: 6, 4: 7}
    for k, v in options.items():
        if abs(v - smaller) < 1e-9:
            return {"value": int(smaller), "option_key": k}

if __name__ == "__main__":
    print(solve())
