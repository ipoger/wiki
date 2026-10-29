---
title: 逐周任务清单
description: 17 周 + 项目的可勾选任务，每周照着做。
---

# 逐周任务清单（直接勾选打卡）

> 用法：把这个文件放进你的 fork，每周开工前把下周任务设为 `in_progress`，做完打 `[x]`。
> 每周至少留 **1 小时给"实测验证"**：任何理论结论都要在 GPU 上跑一次。
>
> 时间有弹性时：优先砍「阅读」，**绝不砍「测量」和「项目」**。

---

## 第 1 周：成本直觉（只算账）

- [ ] 读 [Roofline 讲义](https://courses.cs.washington.edu/courses/cse599m/23sp/notes/roofline.html)，写 5 行笔记：分水岭 I* 是什么、如何判断瓶颈
- [ ] 读 [Transformer Inference Arithmetic](https://kipp.ly/blog/transformer-inference-arithmetic/)
- [ ] 跑 [`code/week1_roofline.py`](/downloads/ai-infra-study/code/week1_roofline.py)，把 DEVICES 表换成你的实际显卡规格，再跑一次
- [ ] 手动计算：Llama-8B fp16 在 batch=1、seq=1024 下的解码耗时理论上限，与脚本对比
- [ ] 跑 [`code/week1_memory_budget.py`](/downloads/ai-infra-study/code/week1_memory_budget.py)，回答：你的卡能推理多大模型？能训练多大模型？
- [ ] 写出结论并贴在 `notes/my-notes.md`：为什么单卡 decode 靠 batching 加速？
- [ ] 环境自检：按 [本地环境自检](environment.md) 确认 CUDA / PyTorch 能识别到 GPU

**验收**：能不看资料，口述"解码为什么是带宽受限"。手算与脚本误差 < 20%。

---

## 第 2–5 周：AI 基本功

### 第 2 周
- [ ] [micrograd](https://github.com/karpathy/micrograd) 全系列视频（前 2 集）
- [ ] 用 micrograd 手写一个 MLP，手推一次梯度
- [ ] 跑通 nanoGPT 的 shakespeare_char（先 `--device=cpu` 也行）

### 第 3 周
- [ ] Zero to Hero：看到"手写反向传播"那几集
- [ ] 在 CUDA GPU 上跑一次 nanoGPT，记录 **batch size 能开多大**
- [ ] 用 `nvidia-smi` + `torch.cuda.max_memory_allocated()` 量出训练显存，与 `week1_memory_budget.py` 的理论值对比并解释差距

### 第 4 周
- [ ] 读完 GPT 实现，能逐层说出每个矩阵的 shape 与参数量
- [ ] MIT 6.5940 前半（编译 / 量化 / 剪枝：只看到能理解"为什么要量化"为止）
- [ ] 亲手做一次 `torch.quantize_per_tensor` 或 bitsandbytes int8，记录精度 / 显存变化

### 第 5 周
- [ ] 自己的小 GPT 训练完成，能生成可读文本
- [ ] 写一份 1 页的「训练显存拆解」：权重 / 梯度 / 优化器状态各占多少
- [ ] 复盘：AI Infra 里你目前最想深入的是训练侧还是推理侧？

**验收**：能解释训练显存被谁占用，并能预测增大 batch 后激活显存怎么变。

---

## 第 6–9 周：训练系统

### 第 6 周
- [ ] [DDP 教程](https://pytorch.org/tutorials/intermediate/ddp_tutorial.html) 跑通（单机多卡或单卡也能跑，记录方法）
- [ ] 读 [ZeRO 论文](https://arxiv.org/abs/1910.02054)，只回答：Stage 1/2/3 各切了什么？省多少？

### 第 7 周
- [ ] [FSDP 教程](https://pytorch.org/tutorials/intermediate/FSDP_adavnced_tutorial.html) 跑通，测一次显存对比
- [ ] 读 [Megatron-LM](https://arxiv.org/abs/1909.08053)，理解张量并行切的是哪个维度

### 第 8 周
- [ ] [Pipeline Parallel 教程](https://pytorch.org/tutorials/intermediate/pipeline_tutorial.html) 跑通
- [ ] 读 [PipeDream](https://dl.acm.org/doi/10.1145/3341301.3359646)，理解气泡（bubble）是什么
- [ ] 画出四种并行策略的通信量对比草图

### 第 9 周
- [ ] 精读 [Data Movement Is All You Need](https://arxiv.org/abs/2007.00072)，写 3 条"为什么内存搬运是瓶颈"的证据
- [ ] 扫一遍 [UW CSE 599M 大纲](https://courses.cs.washington.edu/courses/cse599m/23sp/)，标记你还没覆盖的主题
- [ ] 阶段复盘：DDP / FSDP / TP / PP 的显存与通信对比图完成

**验收**：能对"训练 70B 模型需要几张什么卡"给出有依据的估算。

---

## 第 10–13 周：推理系统

### 第 10 周
- [ ] 精读 [PagedAttention / vLLM](https://arxiv.org/abs/2309.06180)（本阶段最重要）
- [ ] 跑 [`code/week2_kv_cache.py`](/downloads/ai-infra-study/code/week2_kv_cache.py)，理解 KV cache 随 seq/并发增长的曲线
- [ ] 读 [Orca](https://www.usenix.org/conference/osdi22/presentation/yu)，理解 continuous batching 解决什么

### 第 11 周
- [ ] 本地装 vLLM，起一个 7/8B 模型服务
- [ ] 用 `gpu_memory_utilization` / `max_model_len` 不同组合，测 3 组吞吐/延迟

### 第 12 周
- [ ] 读 [Mooncake](https://arxiv.org/abs/2407.00079)，理解 prefill/decode 分离
- [ ] 跑 [`code/week3_batching.py`](/downloads/ai-infra-study/code/week3_batching.py)，对比静态 batch 与 continuous batching 的理论吞吐
- [ ] 画出完整的 batch × seq → 吞吐/延迟曲线，尝试用 Roofline 解释形状

### 第 13 周
- [ ] 写一份 `projects/01-serving-benchmark/REPORT.md`
- [ ] 阶段复盘：prefill 和 decode 的瓶颈差异，能否用一张图讲清？

**验收**：能解释你测出的曲线形状，且与理论预测方向一致。

---

## 第 14–17 周：平台工程

### 第 14 周
- [ ] K8s 基础：Pod / Deployment / Service（本地 minikube 或 kind）
- [ ] 理解 GPU device plugin 为什么需要

### 第 15 周
- [ ] 在 K8s 上部署一个 GPU 推理服务（vLLM 或 Triton Inference Server）
- [ ] 学会用 `kubectl describe / logs / top` 排查一次失败

### 第 16 周
- [ ] 抓一次 Nsight Systems profile，定位一次"GPU 利用率低"
- [ ] 跑一次 `nvidia-smi dmon`，理解各项指标含义

### 第 17 周
- [ ] 读 [Ray 论文](https://www.usenix.org/conference/osdi18/presentation/moritz)，理解它解决什么调度问题
- [ ] 用 MLflow 或 W&B 管一次实验
- [ ] 阶段复盘：写出你的"平台工程最小可用清单"

**验收**：能用 profile 定位一个瓶颈，并解释为什么它是瓶颈。

---

## 第 18 周：缓冲 / 补缺

- [ ] 补齐前 17 周未完成项
- [ ] 从 [项目说明](projects.md) 选定一个项目

## 第 19 周+：项目

- [ ] 按选定项目的验收标准推进
- [ ] 每完成一个里程碑提交一次（commit message 写清"做了什么、测到多少"）
