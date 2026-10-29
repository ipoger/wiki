"""
Week 1 · 内存账本：单卡能跑多大的模型？（显存估算器）
------------------------------------------------------------
AI Infra 面试/实操最高频的一类问题：
    "这张卡能训多大的模型？能跑多大 batch？"

硬约束（训练）：
    显存 ≈ 权重 + 梯度 + 优化器状态 + 激活
    混合精度 AdamW 常见记账（每个参数）：
        权重 fp16 2B + 梯度 fp16 2B + master fp32 4B
        + Adam m fp32 4B + Adam v fp32 4B  ≈ 16 B/param
    激活 ≈ batch × seq_len × hidden × layers × 系数（随实现变化，这里给经验量级）

推理（仅权重）：
    fp16 ≈ 2 B/param，int8 ≈ 1 B，int4 ≈ 0.5 B
    + KV cache：2 × layers × seq × kv_heads × head_dim × dtype
       （MHA: kv_heads = heads；GQA: kv_heads < heads，这就是 GQA 省显存的原因）

运行：
    <python> week1_memory_budget.py
"""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GB = 1024**3

# 以常见开源模型的规格做例子（近似值，用于建立量级感）
MODELS = {
    # 名字: (参数量B, layers, hidden, heads, kv_heads)
    "Llama-3.1-8B (GQA 8 kv heads)": (8.0, 32, 4096, 32, 8),
    "Qwen2.5-7B (GQA 4 kv heads)":   (7.6, 28, 3584, 28, 4),
    "Llama-3.1-70B (GQA 8 kv heads)": (70.6, 80, 8192, 64, 8),
}

STEPS = {"fp32": 4, "fp16/bf16": 2, "int8": 1, "int4": 0.5}


def weight_gb(params_b: float, dtype: str) -> float:
    return params_b * 1e9 * STEPS[dtype] / GB


def kv_cache_gb(layers: int, seq: int, kv_heads: int, head_dim: int, batch: int, dtype: str) -> float:
    # 2 = K 和 V 各一份
    return 2 * layers * seq * kv_heads * head_dim * batch * STEPS[dtype] / GB


def activation_gb(params_b: float, batch: int, seq: int, dtype: str) -> float:
    """极粗估：按经验约 0.5 B/param 的激活峰值（bs=1, seq=2k, 无重算）再线性放大。"""
    base = params_b * 1e9 * 0.5 / GB
    return base * batch * (seq / 2048)


def report(model_name: str) -> None:
    params_b, layers, hidden, heads, kv_heads = MODELS[model_name]
    head_dim = hidden // heads
    print(f"\n=== {model_name} ===")
    print(f"  权重: fp16 {weight_gb(params_b, 'fp16/bf16'):6.1f}GB | "
          f"int8 {weight_gb(params_b, 'int8'):5.1f}GB | int4 {weight_gb(params_b, 'int4'):5.1f}GB")

    print("  推理：权重 + KV cache（batch=1, seq=4096, fp16）")
    for dtype in ("fp16/bf16", "int8", "int4"):
        w = weight_gb(params_b, dtype)
        kv = kv_cache_gb(layers, 4096, kv_heads, head_dim, 1, "fp16/bf16")  # KV 一般保持 fp16
        print(f"    {dtype:>9}: {w + kv:7.1f}GB  (权重 {w:.1f} + KV {kv:.1f})")

    print("  训练：参数/梯度/优化器状态 + 激活（混合精度 AdamW, seq=2048）")
    opt_gb = params_b * 1e9 * 16 / GB
    for batch in (1, 2, 8, 32):
        act = activation_gb(params_b, batch, 2048, "fp16/bf16")
        print(f"    batch={batch:<3}: {opt_gb + act:8.1f}GB  (静态 {opt_gb:.1f} + 激活 {act:.1f})")


if __name__ == "__main__":
    for name in MODELS:
        report(name)

    print(
        "\n要点：\n"
        "1. 训练时每参数约 16 字节的'静态税'，与 batch 无关 —— 所以 ZeRO/FSDP 切的是这部分。\n"
        "2. 长上下文时 KV cache 会反超权重（70B 模型 seq=32k 时尤其明显）—— 这就是 PagedAttention\n"
        "   / vLLM 要解决的问题，也是 GQA 被广泛采用的工程原因。\n"
        "3. 把上面的公式存成一个函数，以后评估任何新模型都能 3 秒出结论。"
    )
