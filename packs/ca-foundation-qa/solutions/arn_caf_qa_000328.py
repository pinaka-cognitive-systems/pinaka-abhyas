import math

def solve():
    # log_3(81) + log_3(1/3)
    log3_81 = math.log(81, 3)   # = 4.0
    log3_1_3 = math.log(1/3, 3) # = -1.0
    result = round(log3_81 + log3_1_3)  # 3
    # options: 1->3, 2->5, 3->4, 4->-1
    option_map = {3: 1, 5: 2, 4: 3, -1: 4}
    option_key = option_map[result]
    return {"value": result, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
