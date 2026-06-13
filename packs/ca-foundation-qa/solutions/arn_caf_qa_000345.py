def solve():
    # Kavya capital = 2k, Lakshmi = k
    # Kavya months = 9, Lakshmi months = 12
    # Capital-time: Kavya = 18k, Lakshmi = 12k
    # Ratio 18:12 = 3:2, total parts = 5
    kavya_ct = 2 * 9   # 18
    lakshmi_ct = 1 * 12  # 12
    total_parts = kavya_ct + lakshmi_ct
    profit = 50000
    kavya_share = (kavya_ct / total_parts) * profit
    return {"value": kavya_share, "option_key": 3}

if __name__ == "__main__":
    print(solve())
