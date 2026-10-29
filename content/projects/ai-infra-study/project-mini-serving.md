---
title: 项目 2：Mini Serving 引擎
description: 手写静态 batching 与 KV cache，真正读懂 PagedAttention。
---

# 项目 2：Mini Serving 引擎（静态批 + 预分配 KV cache）

## 目标

用 PyTorch 从零实现一个**最小但真实**的 LLM serving 引擎，亲手管理 KV cache，用来对比 HuggingFace `generate` 的吞吐。

做完这个项目，你会真正读懂 PagedAttention 在解决什么问题——因为你会亲手踩到它的坑。

## 环境

- 单张 ≥ 8GB 显存的 GPU（用 1.5B 级模型，如 Qwen2.5-1.5B）
- Python 3.10+、`torch`、`transformers`、`fastapi`、`uvicorn`
- 不需要 vLLM（这个项目的意义就是自己实现）

## 技术路线（从简到繁，逐步加难度）

### Step 1：朴素逐请求生成
- 一次只处理 1 个请求，直接调用 `generate`，记录 baseline 吞吐。
- 这一步的目的是建立对照组。

### Step 2：静态 batching
- 把 N 个请求拼成一个 batch，用**左 padding** 对齐。
- 关键点：正确设置 `attention_mask` 和 `position_ids`，否则 padding 会污染 attention。
- 记录吞吐提升倍数。

### Step 3：手工 KV cache
- 不使用框架的高层 cache 接口，自己维护 `past_key_values`：
  - prefill 阶段：一次前向，把 KV 存进 cache
  - decode 阶段：每步只送 1 个 token，复用 cache，拼接新 KV
- 对比第 2 步的显存占用，理解 cache 到底省了什么。

### Step 4（挑战）：预分配固定容量的 cache 池
- 预分配一个 `[max_batch, layers, max_seq, kv_heads, head_dim]` 的连续张量池
- 手动管理每个请求的槽位分配与回收
- **观察**：当请求长度差异大时，预分配池的浪费有多大？（这正是 PagedAttention 的动机）

### Step 5（可选）：加一个 HTTP 接口
- 用 FastAPI 暴露 `/generate`
- 用 `locust` 或简单脚本做压测

## 验收标准

- [ ] 一张吞吐对比图：`generate` 逐请求 / 静态 batch / 手工 KV cache
- [ ] 显存对比：手工管理 KV cache 后显存如何变化
- [ ] 写清"我在 Step 4 遇到了什么问题，PagedAttention 如何解决它"
- [ ] 代码可直接跑（一条命令起服务）

## 常见陷阱

1. **position_ids 算错**：左 padding 时必须显式传 `position_ids`，否则生成位置偏移。这是新手第一大 bug。
2. **attention_mask 的维度**：decode 阶段要同时照顾 padding mask 和 cache mask，两者混用非常容易出错。
3. **KV cache 的 layernorm/rotary 处理**：用 `use_cache=True` 时，新的 token 要按绝对位置算 rotary，不要从 cache 起点算。
4. **用 `torch.no_grad()` 包住**：否则 decode 逐步生成会累计计算图，显存爆炸。
5. **不要用训练模式的 `attention` 实现**：GQA 模型在 merge kv heads 时有专门逻辑，务必用模型官方的 `_forward` 路径。

## 与论文的联系

- 你在 Step 4 遇到的就是 **PagedAttention 论文第 2 节**描述的内存碎片问题。
- 你在 Step 2 加强的正是 **Orca** 的静态 batching，而 Orca 的下一层贡献是 iteration-level scheduling。
- 建议把本项目的实验结果直接写进对应论文的笔记里（`notes/papers/`）。
