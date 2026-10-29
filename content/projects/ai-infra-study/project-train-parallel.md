---
title: 项目 3：训练加速对比
description: 用 DDP 与 FSDP 训练同一个模型，解释加速比为什么低于线性。
---

# 项目 3：训练加速对比（DDP vs FSDP）

## 目标

用 DDP 和 FSDP 训练**同一个模型**，测量吞吐、显存、通信开销，并解释"为什么实测加速比低于线性"。

这个项目教的是分布式训练最关键的能力：**能定位出性能损失在哪**。

## 环境（硬性要求）

- **2 张及以上同型号 GPU**（不同型号会因负载不均导致结论失真）
- 单卡用户：可租用 2×GPU 的云实例，或跳过此项目选项目 1/2
- Python 3.10+、`torch`（建议 ≥ 2.4）、`torchrun`

## 技术路线

### Step 1：基线（单卡）
- 在 1 张卡上训练一个小模型（如 0.5B–1B，或小 transformer），记录：
  - 每步耗时（`torch.cuda.Event` 计时，**不要用 `time.time`**）
  - 峰值显存（`max_memory_allocated`）
- 这是所有加速比的**分母**。

### Step 2：DDP
- 用 `torchrun --nproc_per_node=2` 启动
- 记录：每步耗时、显存、加速比 = 2 × 单卡吞吐 / 双卡总吞吐
- **关键观察**：显存几乎没降（每个进程都有一份完整模型）。

### Step 3：FSDP
- 换成 `FullyShardedDataParallel`
- 对比：显存降了多少？吞吐掉的多少？
- 解释代价：**每层前向要 all-gather，反向要 reduce-scatter**，通信量与层数相关。

### Step 4：profile
- 用 `torch.profiler` 抓一次训练 step
- 在时间轴上标出：compute / communication / 等待
- 计算通信占比（这是你的核心交付物之一）

### Step 5（挑战）：扩展到超显存
- 逐步增大模型，直到单卡 DDP 显存不够而 FSDP 还能跑
- 记录"临界点"：多大模型必须用 FSDP

## 验收标准

- [ ] 一张加速比图：DDP、FSDP 在 1/2 GPU 下的相对吞吐
- [ ] 一张显存图：DDP vs FSDP 的峰值显存随模型规模的曲线
- [ ] profile 截图或数字：通信占比是多少
- [ ] 一段文字：**FSDP 在这个模型上是否划算？为什么？**（答案取决于模型大小和卡间带宽）

## 常见陷阱

1. **批大小没对齐**：DDP 下每卡 batch 相同意味着全局 batch 翻倍，比较吞吐时要声明口径。
2. **数据加载成为瓶颈**：先用 `num_workers=0` 或预生成数据排除 DataLoader 的干扰，否则你测的是磁盘。
3. **FSDP 的 `auto_wrap_policy` 没配**：不 wrap 就没有分片，会误以为 FSDP 没用。
4. **`no_sync` 的误解**：DDP 梯度累积时要用 `no_sync` 才不代表每步都通信。
5. **NCCL 拓扑**：跨 NUMA/跨 PCIe 的卡间通信差异巨大，注意看 `nvidia-smi topo -m`。

## 与论文的联系

- FSDP ≈ **ZeRO Stage 3**：把参数、梯度、优化器状态全部分片。
- 你的显存曲线应该能与 [`code/week1_memory_budget.py`](/downloads/ai-infra-study/code/week1_memory_budget.py) 的"静态税"预测对上；
  对不上时，差距往往来自**激活显存**和**分片临时缓冲区**，这就是这张图的全部价值。
