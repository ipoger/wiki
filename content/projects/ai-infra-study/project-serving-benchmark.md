---
title: 项目 1：推理性能剖析
description: 测量并解释 batch、序列长度与吞吐/延迟的关系。
---

# 项目 1：推理性能剖析（Serving Benchmark）

## 目标

部署一个 7–8B 开源模型，系统测量并**解释**以下三条曲线的形状：

1. **吞吐 vs batch size**（固定 seq_len）：为什么不是线性的？
2. **延迟 vs 输出长度**：prefill 和 decode 各占多少？
3. **显存 vs 上下文长度**：KV cache 何时反超权重？

最终把实测曲线与第 1 周 [`code/week1_roofline.py`](/downloads/ai-infra-study/code/week1_roofline.py) / [`code/week2_kv_cache.py`](/downloads/ai-infra-study/code/week2_kv_cache.py) 的**理论预测**对照。

## 环境

- 单张 ≥ 16GB 显存的 GPU（7B/8B 模型 bf16）
- Python 3.10+、`vllm`、`transformers`、`matplotlib`
- 备选：若显存不足，换 1.5B 模型做同样实验（结论方向不变）

## 里程碑

- [ ] **M1** 跑通 vLLM offline 推理（`LLM.generate`），能正确加载模型
- [ ] **M2** 写 `bench.py`：参数化 `batch_size` / `input_len` / `output_len`，输出 csv
- [ ] **M3** 跑完 3 组 sweep，得到 csv
- [ ] **M4** 画图：同一张图上叠加"实测"和"理论上限"
- [ ] **M5** 写 `REPORT.md`：解释每一段偏差的原因

## 实验设计（建议）

| 变量 | 取值 |
|---|---|
| batch_size | 1, 2, 4, 8, 16, 32, 64 |
| input_len | 128, 1024, 4096 |
| output_len | 64, 256, 512 |

**记录字段**：prefill 时间、decode 时间、TTFT（首 token 延迟）、总吞吐、峰值显存（`torch.cuda.max_memory_allocated()`）。

## 验收标准

- [ ] 一张 `throughput_vs_batch.png`，图上同时画实测曲线和理论带宽上限曲线
- [ ] 能解释"为什么 batch 增大到某个值后吞吐不再涨"（提示：受什么限制？）
- [ ] 能解释 prefill 和 decode 的瓶颈差异
- [ ] 原始 csv 已提交

## 常见陷阱

1. **测的是"离线吞吐"而不是"服务延迟"**。要测 P99，必须用在线压测（并发请求驱动），offline batch 不等于服务。
2. **没预热**。第一次推理包含 CUDA kernel 编译/显存分配，必须 warmup 3 次后丢弃。
3. **忘了锁频**。GPU 温度/功耗限制会造成测量漂移，固定 `nvidia-smi -lgc` 或多次取中位数。
4. **把 CUDA graph 和 eager 混着比较**。vLLM 默认开 CUDA graph，要单独说明。
