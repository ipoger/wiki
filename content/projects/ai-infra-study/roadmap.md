---
title: 总路线图：17 周
description: 从成本直觉到平台工程的五个阶段，以及能省几个月的避坑清单。
---

# 总路线图：17 周

> 前置条件：会 Python；有本地 Nvidia GPU；数学生疏但不必重新学微积分（见 `02-math-minimum.md`）。
> 每天投入 1.5–2 小时。总时长约 4 个月，之后进入项目期。

## 一、全景图

```
第 1 周     成本直觉        ← 只算账，不写模型
第 2–5 周   AI 基本功        ← 从零训练 GPT
第 6–9 周   训练系统        ← 并行、显存、通信
第 10–13 周 推理系统        ← KV cache、batching、vLLM
第 14–17 周 平台工程        ← K8s、调度、服务化
第 19 周+   项目            ← 量化结果
```

主线分支建议：**第 6 周开始有意识地向"训练系统"或"推理系统"侧倾**。
两者共用基础，但项目深度不同。如果你想进大模型推理岗位，把 9 周押在推理系统上。

---

## 二、逐阶段说明

### 阶段 0：成本直觉（第 1 周）

**目标**：不看任何模型代码，先能用算术回答"这张卡能跑多大的模型、多快"。

| 学什么 | 资源 | 产出 |
|---|---|---|
| Roofline 模型 | [UW CSE599M 讲义](https://courses.cs.washington.edu/courses/cse599m/23sp/notes/roofline.html) | 能说出分水岭算术强度 I* = 算力/带宽 |
| LLM 推理算术 | [Transformer Inference Arithmetic](https://kipp.ly/blog/transformer-inference-arithmetic/) | 手算一次 8B 模型的解码延迟 |
| 显存账本 | [`code/week1_memory_budget.py`](/downloads/ai-infra-study/code/week1_memory_budget.py) | 自己改参数复现 16 B/param 结论 |

**验收**：口述"为什么 decode 阶段靠 batch 加速，prefill 阶段不是"。

### 阶段 1：AI 基本功（第 2–5 周）

**目标**：从"会调 PyTorch"变为"知道每个矩阵乘法在哪、占多少显存、耗时多少"。

| 学什么 | 资源 |
|---|---|
| 反向传播 | [micrograd](https://github.com/karpathy/micrograd)（100 行） |
| 从零实现 GPT | [Karpathy: Zero to Hero](https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ) |
| 训练一个 GPT | [nanoGPT](https://github.com/karpathy/nanoGPT) |
| 效率与量化 | [MIT 6.5940 TinyML & Efficient DL](https://hanlab.mit.edu/courses/2024-fall-65940) |

**验收**：在本地 GPU 上训练 nanoGPT 的 shakespeare_char，成功生成文本。
**关键习惯**：每写一个 `nn.Linear` 就问——FLOPs 多少？权重多少字节？算力受限还是带宽受限？

### 阶段 2：训练系统（第 6–9 周）

| 主题 | 资源 |
|---|---|
| 数据并行 | [PyTorch DDP 教程](https://pytorch.org/tutorials/intermediate/ddp_tutorial.html) |
| 分片与显存 | [FSDP 教程](https://pytorch.org/tutorials/intermediate/FSDP_adavnced_tutorial.html)、[ZeRO 论文](https://arxiv.org/abs/1910.02054) |
| 模型并行 | [Tensor Parallel 教程](https://pytorch.org/tutorials/intermediate/model_parallel_tutorial.html)、[Megatron-LM](https://arxiv.org/abs/1909.08053) |
| 流水线并行 | [Pipeline 教程](https://pytorch.org/tutorials/intermediate/pipeline_tutorial.html)、[PipeDream](https://dl.acm.org/doi/10.1145/3341301.3359646) |
| 课程地图 | [UW CSE 599M](https://courses.cs.washington.edu/courses/cse599m/23sp/) |

**验收**：能画出 DDP / FSDP / TP / PP 四者的**通信量**和**显存分布**对比图。

### 阶段 3：推理系统（第 10–13 周）

| 主题 | 资源 |
|---|---|
| KV cache 管理 | [PagedAttention / vLLM](https://arxiv.org/abs/2309.06180)（**最值得精读的一篇**） |
| 连续批处理 | [Orca](https://www.usenix.org/conference/osdi22/presentation/yu) |
| 线上架构 | [Mooncake](https://arxiv.org/abs/2407.00079) |
| 数据搬运瓶颈 | [Data Movement Is All You Need](https://arxiv.org/abs/2007.00072) |

**验收**：本地起 vLLM，画出 batch × 序列长度 → 吞吐/延迟曲线，并用 Roofline 解释形状。

### 阶段 4：平台工程（第 14–17 周）

| 主题 | 范围（只学够用） |
|---|---|
| Kubernetes | Pod / Deployment / Service / 调度 / GPU device plugin |
| 训练编排 | [Ray](https://www.usenix.org/conference/osdi18/presentation/moritz)、Slurm 基本用法 |
| 实验管理 | MLflow / Weights & Biases |
| 服务化 | [Triton Inference Server](https://github.com/triton-inference-server/server)、vLLM 生产配置 |
| 可观测性 | `nvidia-smi dmon`、[Nsight Systems](https://developer.nvidia.com/nsight-systems) |

**验收**：在 K8s 上部署一个 GPU 推理服务，用 profile 定位并修复一个瓶颈。

### 阶段 5：项目（第 19 周+）

见 [项目说明](projects.md)。三个项目任选其一，必须有**可量化结果**。

---

## 三、避坑清单（能省你几个月）

1. **不要一开始学 Kubernetes / MLOps**。平台工程门槛低、迁移性差；训练/推理系统才是核心。顺序反了会变成"只会写 YAML 的人"。
2. **不要试图"学完"CUDA**。目标是读懂 FlashAttention 的 Triton 实现并改它，不是手写生产级 kernel。
3. **每个概念都要实测一次**。"理论快 2 倍" → 立刻在卡上量。AI Infra 的核心能力是**测量**。
4. **精读 ≤ 8 篇论文**（见 [精读清单](reading.md)）。读透 8 篇比泛读 100 篇有用。
5. **项目 > 学时**。"我让某模型吞吐提升 X%" 比十门课更有说服力。

---

## 四、每周复盘模板

每周日花 10 分钟填：

```
本周完成：
  1.
未完成 / 卡住：
  1.                    卡点性质：概念不懂 / 环境问题 / 时间不够
本周最大的认知更新（一句话）：
下周第一步（具体的、可执行的动作）：
```
