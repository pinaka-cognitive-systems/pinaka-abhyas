def solve():
    # L3 odd man out: each number is simultaneously
    #   (a) a product of exactly two distinct primes (semiprimes with distinct factors)
    #   (b) expressible as the sum of two positive perfect squares
    #
    # 10 = 2*5 (two distinct primes) AND 1^2+3^2=10 -> fits both
    # 26 = 2*13 (two distinct primes) AND 1^2+5^2=26 -> fits both
    # 34 = 2*17 (two distinct primes) AND 3^2+5^2=34 -> fits both
    # 15 = 3*5 (two distinct primes) BUT 15: 1+14(no),4+11(no),9+6(no) -> NOT sum of two squares
    # So 15 satisfies (a) but NOT (b) -> 15 is the odd one out

    import math

    def is_product_two_distinct_primes(n):
        def is_prime(x):
            if x < 2:
                return False
            if x == 2:
                return True
            if x % 2 == 0:
                return False
            for i in range(3, int(x**0.5)+1, 2):
                if x % i == 0:
                    return False
            return True
        # Find all factor pairs
        for a in range(2, int(n**0.5)+1):
            if n % a == 0:
                b = n // a
                if is_prime(a) and is_prime(b) and a != b:
                    return True
        return False

    def is_sum_of_two_pos_squares(n):
        for a in range(1, int(math.isqrt(n))+1):
            b_sq = n - a*a
            if b_sq > 0:
                b = int(math.isqrt(b_sq))
                if b*b == b_sq:
                    return True
        return False

    candidates = {1: 10, 2: 26, 3: 15, 4: 34}

    # 15: semiprime=True, sum_of_squares=False
    odd = [k for k, v in candidates.items()
           if not (is_product_two_distinct_primes(v) and is_sum_of_two_pos_squares(v))]
    assert odd == [3], f"Got {odd}"
    return {"value": 15, "option_key": 3}

if __name__ == "__main__":
    print(solve())
