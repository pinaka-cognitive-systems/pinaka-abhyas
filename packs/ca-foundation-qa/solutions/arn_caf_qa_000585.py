def solve():
    # Odd man out: numbers where the property is "sum of digits is a prime"
    # 23: 2+3=5 (prime), 41: 4+1=5 (prime), 32: 3+2=5 (prime), 50: 5+0=5 (prime), 38: 3+8=11 (prime)
    # That doesn't produce an odd one. Let me try another design.
    #
    # Odd man out: each number when split into two 1-digit parts, the product of those digits equals 12
    # Candidates: 34(3x4=12), 43(4x3=12), 26(2x6=12), 62(6x2=12), 39(3x9=27 != 12)
    # 39 is the odd one out -> option 4
    # Options: 1->34, 2->43, 3->62, 4->39

    candidates = {1: 34, 2: 43, 3: 62, 4: 39}

    def digit_product(n):
        d1 = n // 10
        d2 = n % 10
        return d1 * d2

    products = {k: digit_product(v) for k, v in candidates.items()}
    # Should be: 34->12, 43->12, 62->12, 39->27
    assert products[1] == 12, f"34 product: {products[1]}"
    assert products[2] == 12, f"43 product: {products[2]}"
    assert products[3] == 12, f"62 product: {products[3]}"
    assert products[4] == 27, f"39 product: {products[4]}"

    odd = [k for k, v in products.items() if v != 12]
    assert odd == [4], f"Got {odd}"
    return {"value": 39, "option_key": 4}

if __name__ == "__main__":
    print(solve())
