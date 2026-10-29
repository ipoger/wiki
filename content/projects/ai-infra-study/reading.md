---
title: 精读清单：8 篇论文
description: 带着问题读，读透 8 篇比泛读 100 篇有用。
---

# 精读清单：8 篇论文（读透 > 泛读）

> 每篇只给你 **3–5 个必须回答的问题**。带着问题读，读完写下答案再走。
> 用 [论文笔记模板](reading-template.md) 记录，攒够 8 篇就是一份很扎实的求职材料。

---

## 1. ZeRO: Memory Optimizations Toward Training Trillion Parameter Models
- 链接：https://arxiv.org/abs/1910.02054
- 一句话：把训练时的"静态显存税"（权重/梯度/优化器状态）切到多卡上。
- 要回答：
  1. Stage 1、2、3 各切分了什么？各把静态显存降到原来的几分之几？
  2. 为什么 Stage 3 必须重新做 allgather？代价在哪？
  3. "16 字节/参数"这个数字由哪几项组成？
- 与仓库联系：[`code/week1_memory_budget.py`](/downloads/ai-infra-study/code/week1_memory_budget.py) 里的静态显存项。

---

## 2. Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism
- 链接：https://arxiv.org/abs/1909.08053
- 一句话：Transformer 的张量并行怎么切（列并行 + 行并行配对）。
- 要回答：
  1. MLP 和 Attention 分别是按哪个维度切？
  2. 为什么一次前向只需要 2 次 all-reduce？
  3. 张量并行最多能切到多少卡？受什么限制？

---

## 3. PipeDream / GPipe（流水线并行，二选一精读）
- 链接：https://dl.acm.org/doi/10.1145/3341301.3359646 或 https://arxiv.org/abs/1811.06965
- 一句话：按层切分做流水线，代价是"气泡"。
- 要回答：
  1. 气泡率如何用 `(p-1)/(m+p-1)` 估算（p=卡数，m=微批数）？
  2. 为什么 1F1B 调度比纯前向再反向更省显存？

---

## 4. Efficient Memory Management for LLM Serving with PagedAttention（vLLM）★
- 链接：https://arxiv.org/abs/2309.06180
- 一句话：把 KV cache 按虚拟内存分页管理，消除碎片，吞吐提升 2–4×。
- **这是本仓库最推荐精读的一篇。**
- 要回答：
  1. 传统 KV cache 的碎片浪费分几类？各占多少？
  2. PagedAttention 如何支持"同一次请求内"与"跨请求"共享 KV？
  3. beam search / 并行采样时，copy-on-write 在什么时候触发？
  4. continuous batching 与 paged cache 的关系是什么（一个负责什么，另一个负责什么）？

---

## 5. Orca: A Distributed Serving System for Transformer-Based Generative Models
- 链接：https://www.usenix.org/conference/osdi22/presentation/yu
- 一句话：continuous batching（iteration-level scheduling）的出处。
- 要回答：
  1. 为什么静态 batch 在生成任务上效率低？
  2. "选择性批处理"（selective batching）解决了什么？

---

## 6. FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
- 链接：https://arxiv.org/abs/2205.14135
- 一句话：用 tiling + online softmax 让 attention 不做 HBM 往返。
- 要回答：
  1. 它到底"近似"了什么？（答案：什么都没近似，是精确计算）
  2. online softmax 为什么能分块累加还不丢精度？
  3. 它省的是算力还是带宽？→ 这就连接到 Roofline。

---

## 7. Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving
- 链接：https://arxiv.org/abs/2407.00079
- 一句话：prefill 与 decode 分离，用 CPU/DRAM/SSD 做 KV cache 的分布式缓存（Kimi 线上架构）。
- 要回答：
  1. 为什么要把 prefill 和 decode 分到不同集群？（提示：瓶颈不同）
  2. 长上下文场景下，收益从哪来？
  3. 为负载过载设计的早拒绝（early rejection）策略解决什么问题？

---

## 8. Data Movement Is All You Need: A Case Study on Optimizing Transformers
- 链接：https://arxiv.org/abs/2007.00072
- 一句话：Transformer 训练的瓶颈是数据搬运，不是计算。
- 要回答：
  1. 作者用什么证据得出"memory-bound"的结论？
  2. 结论与第 1 周的 Roofline 分析如何互相印证？

---

## 选读（按方向追加）

| 方向 | 论文 | 链接 |
|---|---|---|
| 量化 | GPTQ | https://arxiv.org/abs/2210.17323 |
| 量化 | LLM.int8 / SmoothQuant | https://arxiv.org/abs/2208.07339 / https://arxiv.org/abs/2211.10438 |
| 稀疏 / MoE | MegaBlocks | https://arxiv.org/abs/2211.15841 |
| 调度 | Alpa（自动并行） | https://arxiv.org/abs/2203.00218 |
| 调度 | Ray | https://www.usenix.org/conference/osdi18/presentation/moritz |
| 单卡推理 | FlexGen | https://arxiv.org/abs/2303.06865 |
| 分布式训练 | DeepSpeed | https://arxiv.org/abs/2201.05596 |

---

## 阅读顺序建议

```
ZeRO (3) → Megatron (2) → PipeDream (3) → FlashAttention (6)
→ PagedAttention (4) → Orca (5) → Mooncake (7) → Data Movement (8)
```

前 4 篇构成"训练系统"，后 4 篇构成"推理系统"。
如果你只读 3 篇：**ZeRO、PagedAttention、FlashAttention**。
