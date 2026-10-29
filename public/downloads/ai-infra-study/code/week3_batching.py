"""
Week 3 · Batching 的吞吐直觉：静态批 vs 连续批
------------------------------------------------------------
生成式推理的"吞吐"为什么远比"延迟"难优化：
    每个请求的生成长度不同，静态 batch 会被最长的那个拖住。

关键量：
    batch 时间 ≈ 预填充时间 + 最大生成长度 × 单步解码时间
    吞吐      = Σ 各请求 token 数 / batch 时间

本脚本用理想化模型（忽略显存上限和调度开销）对比：
    A. 静态批：等一批都生成完才返回 → 短请求白等
    B. 连续批：每步结束后立刻塞入新请求（continuous batching 思想）

运行：
    python code/week3_batching.py
"""

import sys
from statistics import mean

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# 硬件/模型的抽象参数（单位：毫秒）
STEP_MS = 8.0       # 单步 decode 的时间（一个"步"，不是单个 token，这里简化为等长）
PREFILL_MS = 20.0   # 请求的 prefill 时间（简化成每个请求固定）

# 一批请求的生成长度（token 数）：长短混杂是真实负载的常态
REQUESTS = [200, 200, 180, 60, 50, 40, 30, 20, 15, 10, 8, 5]
BATCH_SIZE = 4
# 大 batch 场景：批越大，单个慢请求对整批的拖累越明显
REQUESTS_MANY = [200] * 4 + [10] * 32 + [160] * 8
BATCH_SIZE_MANY = 16


def simulate_static(lengths: list[int], batch_size: int) -> tuple[int, float, int]:
    """静态批：按批切分，每批耗时 = prefill + 该批最大长度 × 步时间。"""
    total_steps = 0
    total_tokens = sum(lengths)
    n_batches = (len(lengths) + batch_size - 1) // batch_size
    for i in range(0, len(lengths), batch_size):
        chunk = lengths[i:i + batch_size]
        total_steps += 1 + max(chunk)         # 1 次 prefill + 被最长者拖住的 decode
    total_ms = total_steps * STEP_MS + n_batches * PREFILL_MS
    return total_steps, total_ms, total_tokens


def simulate_continuous(lengths: list[int], batch_size: int) -> tuple[int, float, int]:
    """
    连续批：任何时候槽位空了就立刻补新请求。
    用简单的"事件推进"模拟：维护在跑请求的剩余长度，每步全部减 1，退出的补新的。
    """
    pending = list(lengths)
    running: list[int] = []
    total_tokens = sum(lengths)
    steps = 0

    # 初始填满
    while pending and len(running) < batch_size:
        running.append(pending.pop(0))

    while running:
        steps += 1
        running = [r - 1 for r in running]
        running = [r for r in running if r > 0]
        while pending and len(running) < batch_size:
            running.append(pending.pop(0))

    # 连续批下 prefill 与 decode 可重叠，这里保守地按每个请求计入 30%
    total_ms = steps * STEP_MS + len(lengths) * PREFILL_MS * 0.3
    return steps, total_ms, total_tokens


def compare(name: str, lengths: list[int], batch_size: int) -> None:
    s_steps, s_ms, tokens = simulate_static(lengths, batch_size)
    c_steps, c_ms, _ = simulate_continuous(lengths, batch_size)
    s_tps = tokens / (s_ms / 1000)
    c_tps = tokens / (c_ms / 1000)

    print(f"\n=== {name} | {len(lengths)} 个请求, batch={batch_size} ===")
    print(f"  生成长度分布: min={min(lengths)} max={max(lengths)} mean={mean(lengths):.1f}")
    print(f"  {'策略':<12}{'总步数':>8}{'总耗时(ms)':>12}{'吞吐(token/s)':>14}")
    print(f"  {'静态批':<12}{s_steps:>8}{s_ms:>12.0f}{s_tps:>14.1f}")
    print(f"  {'连续批':<12}{c_steps:>8}{c_ms:>12.0f}{c_tps:>14.1f}")
    print(f"  → 连续批吞吐提升 {c_tps / s_tps:.2f}x")


if __name__ == "__main__":
    print("说明：这是理想化模型，用于建立量级直觉，不是基准测试。")
    compare("长短混杂负载（真实常态）", REQUESTS, BATCH_SIZE)
    compare("长度相近负载（静态批的甜点）", [200] * 12, BATCH_SIZE)
    compare("极端长尾负载", [400, 400, 400, 12, 10, 8, 6, 5, 4, 3, 2, 2], BATCH_SIZE)
    compare("大 batch + 少量长请求拖累（生产环境典型）", REQUESTS_MANY, BATCH_SIZE_MANY)

    print(
        "\n要点：\n"
        "1. 请求长度越不均匀，静态批浪费越严重 —— 这就是 Orca 提出 iteration-level\n"
        "   scheduling（continuous batching）的动机。\n"
        "2. 长度相近时静态批几乎不吃亏 —— 所以批处理策略要看负载分布，不能迷信一种方案。\n"
        "3. 真实系统的连续批还要处理 KV cache 的抢占、优先级与显存上限，比本模型复杂得多。\n"
        "4. 下一步：在 vLLM 上用固定/随机长度负载实测，比较曲线形状是否与这里一致。"
    )
