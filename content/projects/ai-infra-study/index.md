---
title: AI Infra 学习路线
description: 给会 Python、数学生疏、有本地 Nvidia GPU 的同学：一份 17 周、可执行、带计算工具的学习计划。
---

# AI Infra 学习路线

> 给「会 Python、数学生疏、有本地 Nvidia GPU」的同学，一份**可执行、有勾选框、带可运行计算工具**的 17 周学习计划。
> 覆盖方向：**训练/推理系统** + **平台工程（MLOps）**。

这不是又一份“资源合集”，而是一个学习工作区：路线图里有带勾选框的逐周任务，笔记里有论文精读清单，代码里有能直接跑的成本计算器，项目里有可写进简历的验收标准。

每天投入 1.5–2 小时，约 4 个月走完主线，然后进入项目期。

## 在线章节

1. [总路线图](roadmap.md) — 五个阶段、里程碑和避坑清单。
2. [逐周任务清单](week-by-week.md) — 17 周 + 项目的可勾选任务，每周照着做。
3. [最小数学集合](math.md) — 只需要 5 个工具，不用重学微积分。
4. [精读清单](reading.md) — 8 篇论文，每篇 3–5 个必须回答的问题；配 [笔记模板](reading-template.md)。
5. [三个项目](projects.md) — 推理性能剖析、mini serving、训练加速对比。
6. [本地环境自检](environment.md) — 第 1 周就要跑通。

## 里程碑

| 阶段 | 周数 | 交付物 | 完成标志 |
| --- | --- | --- | --- |
| 成本直觉 | 第 1 周 | 能算出模型推理延迟与显存需求 | 手算结果与脚本误差 < 20% |
| AI 基本功 | 第 2–5 周 | 在 GPU 上从零训练字符级 GPT | 能解释训练显存被谁占用 |
| 训练系统 | 第 6–9 周 | DDP / FSDP / TP 最小例子跑通 | 能画出并行策略的通信量对比 |
| 推理系统 | 第 10–13 周 | vLLM 压测曲线 + mini server | 吞吐/延迟曲线形状能被 Roofline 解释 |
| 平台工程 | 第 14–17 周 | K8s 上跑一次 GPU 推理服务 | 能用 profile 定位一次瓶颈 |
| 项目 | 第 19 周+ | 三选一做出量化结果 | 写出“我让 X 提升 Y%” |

## 先记住这五条

1. **解码阶段是带宽受限的。** M=1 的矩阵-向量乘，4090 的算力利用率只有约 0.6%。所以单卡推理靠 **batching** 加速，而不是换卡。
2. **训练显存 ≈ 16 字节/参数**（fp16 权重 + 梯度 + fp32 master + Adam 两状态）。8B 模型 ≈ 123GB，**单卡跑不动是对的**，这就是 FSDP/ZeRO 存在的数学原因。
3. **长上下文时 KV cache 会反超权重。** 这是 PagedAttention / vLLM 和 GQA 被广泛采用的直接工程动因。
4. **Prefill 是算力受限、Decode 是带宽受限。** 所谓 “prefill/decode 分离”（如 Mooncake）就是把两种不同瓶颈的负载放到不同资源上。
5. **AI Infra 的核心能力是测量，不是背诵。** 每个“理论加速 X 倍”都要立刻在卡上验证。

## 配套材料

- [下载完整学习包](/downloads/ai-infra-study.zip)（37 KB，包含 `roadmap/`、`notes/`、`code/`、`projects/`、`docs/`）
- 四个计算脚本：
  - [`week1_roofline.py`](/downloads/ai-infra-study/code/week1_roofline.py) — 算力/带宽瓶颈计算器
  - [`week1_memory_budget.py`](/downloads/ai-infra-study/code/week1_memory_budget.py) — 显存账本估算器
  - [`week2_kv_cache.py`](/downloads/ai-infra-study/code/week2_kv_cache.py) — KV cache 与上下文长度、并发的关系
  - [`week3_batching.py`](/downloads/ai-infra-study/code/week3_batching.py) — continuous batching 的吞吐直觉

脚本只依赖 Python 标准库（后两个可选依赖 numpy），目的是让你在还没配好 CUDA 环境时就能先建立成本直觉。

## 建议的使用顺序

1. 第 1 周先跑 `week1_roofline.py` 和 `week1_memory_budget.py`，把自己的显卡规格填进 `DEVICES` 表。
2. 打开 [逐周任务清单](week-by-week.md)，每周开工前把下周任务设为进行中，做完勾掉。
3. 论文按 [精读清单](reading.md) 的顺序读，每篇用[模板](reading-template.md)写一页笔记。
4. 第 18 周从 [三个项目](projects.md) 里选一个，按验收标准做深。
5. 每周日填一次复盘：完成什么、卡在哪、下周第一步。

> 勾选框的状态保存在浏览器本地（`localStorage`），换设备或清缓存后不会同步。

## 原仓库结构

```text
ai-infra-study/
├── README.md
├── roadmap/
│   ├── 00-roadmap.md
│   ├── 01-week-by-week.md
│   └── 02-math-minimum.md
├── notes/
│   ├── 01-reading-list.md
│   └── 02-reading-template.md
├── code/
│   ├── week1_roofline.py
│   ├── week1_memory_budget.py
│   ├── week2_kv_cache.py
│   └── week3_batching.py
├── projects/
│   ├── README.md
│   ├── 01-serving-benchmark/
│   ├── 02-mini-serving-static/
│   └── 03-train-parallel/
└── docs/
    ├── push-to-github.md
    └── local-environment.md
```

## 许可

内容采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，代码采用 MIT。完整许可见下载包内的 `LICENSE`。
