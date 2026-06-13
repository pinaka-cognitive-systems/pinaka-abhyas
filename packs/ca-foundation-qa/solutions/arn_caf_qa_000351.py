def solve():
    # x^3 - 6x^2 + 11x - 6 = 0, roots 1,2,3 (Vieta sum=6)
    # Given root x=2, sum of other two = 6-2=4
    # Verify by finding all roots
    roots = []
    for x in range(-10, 11):
        if x**3 - 6*x**2 + 11*x - 6 == 0:
            roots.append(x)
    assert 2 in roots, "x=2 must be a root"
    other_roots = [r for r in roots if r != 2]
    total_other = sum(other_roots)
    # option mapping: 1->3, 2->4, 3->5, 4->2
    options = {1: 3, 2: 4, 3: 5, 4: 2}
    for k, v in options.items():
        if v == total_other:
            return {"value": total_other, "option_key": k}

if __name__ == "__main__":
    print(solve())
