"""Executable solution for arn_caf_qa_000964.

NPV of uneven net cash flows with mid-life overhaul and terminal salvage.
Year1 = +20000; Year2 = 20000 - 10000 = +10000; Year3 = 20000 + 8000 = +28000.
Discount, subtract 50000 cost. NPV ~ -2518 -> do not buy -> option 1.
"""


def solve():
    cost = 50000.0
    df = [0.9091, 0.8264, 0.7513]
    net = [20000, 20000 - 10000, 20000 + 8000]  # [20000, 10000, 28000]

    pv = sum(c * d for c, d in zip(net, df))
    npv = pv - cost  # ~ -2517.6

    option_key = 1
    return {"value": round(npv), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
