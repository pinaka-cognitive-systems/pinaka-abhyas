def solve():
    import math
    from itertools import permutations

    n = 8  # 8 seats, 8 people
    # Count valid position-pairs where exactly 2 people sit between A and B
    # => |posA - posB| = 3
    valid_pairs = []
    for i in range(1, n + 1):
        for j in range(i + 1, n + 1):
            if j - i == 3:
                valid_pairs.append((i, j))

    # Each pair: A can go in either slot (2 ordered assignments)
    # Remaining 6 people fill remaining 6 seats: 6!
    ordered_ab = len(valid_pairs) * 2  # 5 * 2 = 10
    remaining_arrangements = math.factorial(6)  # 720
    value = ordered_ab * remaining_arrangements  # 10 * 720 = 7200

    # Verify by brute force enumeration
    people = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    count = 0
    for perm in permutations(people):
        pos_a = perm.index('A')
        pos_b = perm.index('B')
        if abs(pos_a - pos_b) == 3:
            count += 1

    assert count == value, f"Brute force {count} != formula {value}"

    return {"value": value, "option_key": 3}

if __name__ == "__main__":
    print(solve())
