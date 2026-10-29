"""
Week 1 · 用 40 行代码建立"内存墙"直觉 (Roofline 模型)
------------------------------------------------------------
目标：不动 GPU，先掌握 AI Infra 最核心的一张图：算力 vs 带宽。

核心公式：
    算术强度 I = FLOPs / Bytes      （每搬运 1 字节做多少运算）
    峰值 FLOPS = min(算力峰值, 带宽 × I)
    分水岭 I*   = 算力峰值 / 带宽   （低于它是带宽受限，高于它是算力受限）

运行：
    <python> week1_roofline.py
"""

import sys

# Windows 控制台默认 GBK，这里强制 UTF-8。必须在任何 print 之前执行。
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# 只改这张表来验证你的理解：值都是公开规格的近似量级
DEVICES = {
    # 名字: (算力_FP16_TFLOPS, 显存带宽_GB/s)
    "RTX 3060 12G":       (25.6, 360),
    "RTX 3090 24G":       (71.0, 936),
    "RTX 4060 8G":        (30.4, 272),
    "RTX 4090 24G":       (165.0, 1008),
    "L40S 48G":           (362.0, 864),
    "A100 40G SXM":       (312.0, 1555),
    "H100 80G SXM":       (989.0, 3350),
}


def ridge_point(tflops: float, gbs: float) -> float:
    """返回分水岭算术强度 I*（单位 FLOP/Byte）。"""
    # TFLOPs -> FLOP/s 是 *1e12；GB/s -> Byte/s 是 *1e9
    return (tflops * 1e12) / (gbs * 1e9)


def analyze(name: str, flops: float, nbytes: float) -> dict:
    tflops, gbs = DEVICES[name]
    intensity = flops / nbytes
    t_ridge = ridge_point(tflops, gbs)
    bandwidth_bound = intensity < t_ridge
    if bandwidth_bound:
        us = nbytes / (gbs * 1e9) * 1e6
        achieved = (flops / us) / 1e6  # TFLOPs
    else:
        us = flops / (tflops * 1e12) * 1e6
        achieved = tflops
    return {
        "device": name,
        "intensity": intensity,
        "ridge": t_ridge,
        "bound": "带宽受限" if bandwidth_bound else "算力受限",
        "time_us": us,
        "achieved_tflops": achieved,
        "efficiency": achieved / tflops,
    }


def show(title: str, flops: float, nbytes: float) -> None:
    print(f"\n== {title} ==")
    print(f"{'device':<16}{'I(FLOP/B)':>11}{'I*':>9}{'瓶颈':>9}{'耗时(us)':>11}{'有效TFLOPS':>12}{'效率':>8}")
    for name in DEVICES:
        r = analyze(name, flops, nbytes)
        print(
            f"{r['device']:<16}{r['intensity']:>11.1f}{r['ridge']:>9.1f}"
            f"{r['bound']:>10}{r['time_us']:>11.1f}{r['achieved_tflops']:>12.1f}"
            f"{r['efficiency'] * 100:>7.1f}%"
        )


if __name__ == "__main__":
    # 场景 1：矩阵乘法 C[M,K] @ W[K,N]，M=1（LLM 解码阶段的矩阵-向量乘）
    # FLOPs = 2*M*K*N；Bytes = 权重 K*N*2(fp16) + 激活 M*K*2
    M, K, N = 1, 4096, 4096
    show(
        f"GEMV：M=1, K=N={K}（解码时的单 token）",
        2 * M * K * N,
        K * N * 2 + M * K * 2,
    )

    # 场景 2：同样的权重，但 M=256（训练 / prefill 阶段大 batch）
    M = 256
    show(
        f"GEMM：M={M}, K=N={K}（大 batch / prefill）",
        2 * M * K * N,
        K * N * 2 + M * K * 2,
    )

    print(
        "\n结论：同样的权重，M 从 1 涨到 256，算术强度涨了约 256 倍，"
        "从'搬权重'变成'算乘法'。\n这就是为什么推理要靠 batching（吃满算力）、"
        "训练靠大 batch（摊薄权重搬运）。"
    )
