"""
Week 2 · KV cache 账本：上下文长度与并发如何吃掉显存
------------------------------------------------------------
推理系统里最反直觉的一件事：
    短上下文时，显存几乎全是权重；
    长上下文或高并发时，KV cache 会反超权重，成为"能跑多少并发"的真瓶颈。

公式（GQA 下）：
    每 token 每层 KV 字节 = 2(K 和 V) × kv_heads × head_dim × dtype_bytes
    总 KV 字节 = 层数 × 序列长度 × batch × 每 token 每层 KV 字节

运行：
    python code/week2_kv_cache.py
"""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GB = 1024**3

# 名字: (参数量B, layers, hidden, heads, kv_heads, 单卡显存GiB)
MODELS = {
    "Llama-3.1-8B (GQA)": (8.0, 32, 4096, 32, 8, 24),
    "Qwen2.5-7B (GQA)": (7.6, 28, 3584, 28, 4, 24),
    "Qwen2.5-1.5B (GQA)": (1.5, 28, 1536, 12, 2, 8),
}


def kv_per_token_per_layer(kv_heads: int, head_dim: int, dtype_bytes: int = 2) -> int:
    """返回每层每 token 的 KV 字节数。"""
    return 2 * kv_heads * head_dim * dtype_bytes


def kv_total_gb(layers: int, seq: int, kv_heads: int, head_dim: int, batch: int) -> float:
    return layers * seq * batch * kv_per_token_per_layer(kv_heads, head_dim) / GB


def weight_gb(params_b: float, dtype_bytes: int = 2) -> float:
    return params_b * 1e9 * dtype_bytes / GB


def fmt_ratio(r: float) -> str:
    """把 KV/权重 的倍数格式化成易读形式（避免四舍五入成 0x）。"""
    if r < 0.1:
        return f"{r:.2f}x"
    return f"{r:.1f}x"


def report(name: str) -> None:
    params_b, layers, hidden, heads, kv_heads, vram = MODELS[name]
    head_dim = hidden // heads
    print(f"\n=== {name} | 单卡 {vram}GiB | 权重 fp16 {weight_gb(params_b):.1f}GiB ===")
    print(f"    heads={heads}, kv_heads={kv_heads} → GQA 压缩比 {heads / kv_heads:.0f}x，"
          f"每层每 token KV = {kv_per_token_per_layer(kv_heads, head_dim)} B")

    print(f"\n    {'seq_len':>8} | {'batch=1':>10} | {'batch=8':>10} | {'batch=32':>10} | KV/权重")
    for seq in (512, 2048, 4096, 16384, 32768):
        cells = []
        ratios = []
        for batch in (1, 8, 32):
            kv = kv_total_gb(layers, seq, kv_heads, head_dim, batch)
            cells.append(f"{kv:8.2f}GB")
            ratios.append(kv / weight_gb(params_b))
        print(f"    {seq:>8} | {cells[0]:>10} | {cells[1]:>10} | {cells[2]:>10} "
              f"| {fmt_ratio(ratios[0])} / {fmt_ratio(ratios[1])} / {fmt_ratio(ratios[2])}")

    # 单卡能撑多少并发（留 70% 给 KV，剩余给权重）
    print(f"\n    单卡理论最大并发（seq=4096, 70% 显存给 KV）：")
    for seq in (2048, 4096, 8192):
        budget = vram * 0.7 - weight_gb(params_b)
        per_req = kv_total_gb(layers, seq, kv_heads, head_dim, 1)
        if per_req <= 0:
            print(f"      seq={seq}: 权重已超预算")
            continue
        print(f"      seq={seq:>5}: 约 {max(0, int(budget / per_req))} 并发")


def gqa_ablation() -> None:
    """同样的规格，MHA vs GQA，KV cache 差多少。"""
    print("\n=== GQA 为什么关键（Llama-3-8B 规格，seq=8192, batch=1）===")
    layers, hidden, heads = 32, 4096, 32
    head_dim = hidden // heads
    for label, kv_heads in (("MHA (kv_heads=32)", 32), ("GQA (kv_heads=8)", 8), ("MQA (kv_heads=1)", 1)):
        print(f"    {label:<20}: KV = {kv_total_gb(layers, 8192, kv_heads, head_dim, 1):7.2f} GiB")


if __name__ == "__main__":
    for model_name in MODELS:
        report(model_name)
    gqa_ablation()

    print(
        "\n要点：\n"
        "1. KV cache 与 seq 和 batch 都是线性关系 —— 长上下文 + 高并发是乘法级显存压力。\n"
        "2. 短上下文时 KV 可以忽略；32k 上下文下它会成为主要显存消耗。\n"
        "3. GQA 把 KV cache 降到 1/N，是当下几乎所有开源大模型的默认选择。\n"
        "4. 这就是为什么 vLLM 要按页管理 KV（PagedAttention）：留白式预留会浪费数倍显存。"
    )
