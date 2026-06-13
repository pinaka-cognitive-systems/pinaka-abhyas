def solve():
    h0 = 64   # initial drop height in metres
    r = 0.5   # each bounce reaches half the previous height
    # Initial fall
    initial_fall = h0
    # After bouncing: up h0*r, down h0*r, up h0*r^2, down h0*r^2, ...
    # Total bounce distance = 2 * (h0*r + h0*r^2 + ...) = 2 * h0*r / (1-r)
    bounce_total = 2 * h0 * r / (1 - r)   # 2 * 64 * 0.5 / 0.5 = 128
    total_distance = initial_fall + bounce_total   # 64 + 128 = 192
    total_distance = int(total_distance)
    # options: 1->256, 2->192, 3->128, 4->320
    options = {1: 256, 2: 192, 3: 128, 4: 320}
    option_key = [k for k, v in options.items() if v == total_distance][0]
    return {"value": total_distance, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
