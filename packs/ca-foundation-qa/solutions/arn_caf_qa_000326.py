import math

def solve():
    # log_2(64) = ?
    # 64 = 2^6
    result = int(math.log2(64))
    # options: 1->5, 2->4, 3->6, 4->8
    option_map = {5: 1, 4: 2, 6: 3, 8: 4}
    option_key = option_map[result]
    return {"value": result, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
