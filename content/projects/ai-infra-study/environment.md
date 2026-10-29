---
title: 本地环境自检清单
description: CUDA、PyTorch、编译工具，以及一条命令的自检脚本。
---

# 本地环境自检清单

> 在学习第 1 周就要做完。每次换机器/重装都跑一遍。

---

## 1. 检查显卡与驱动

```powershell
nvidia-smi
```

期望输出包含：
- 驱动版本（Driver Version）
- CUDA Version（注意：这是驱动**支持**的最高 CUDA 版本，不是你安装的版本）
- 显存大小（Memory Total）

**记录你机器的实际规格**：

```
显卡型号：            （例如 RTX 4090）
显存：                GB
驱动版本：
驱动支持的 CUDA 最高版本：
```

把这里填完，再回去跑 [`code/week1_roofline.py`](/downloads/ai-infra-study/code/week1_roofline.py) 和 [`code/week1_memory_budget.py`](/downloads/ai-infra-study/code/week1_memory_budget.py)，
把 DEVICES 表里你那张卡的规格改成实测值——**用真实规格算出来的数字才有意义**。

---

## 2. 检查 Python 与 PyTorch

```powershell
python --version
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

- `torch.cuda.is_available()` 必须是 `True`
- 若为 `False`：大概率装了 CPU 版 torch。重装：
  ```powershell
  pip uninstall -y torch torchvision
  pip install torch --index-url https://download.pytorch.org/whl/cu121
  ```
  （cu121 / cu124 等请按你的驱动版本选择，驱动太旧就升级驱动）

---

## 3. 检查 conda / mamba（建议用独立环境）

```powershell
conda --version
```

**强烈建议用独立环境**，不要污染系统 Python：

```powershell
conda create -n aiinfra python=3.10 -y
conda activate aiinfra
```

---

## 4. 检查编译工具（后续学 CUDA / Triton 需要）

```powershell
nvcc --version      # CUDA Toolkit；没有也能跑 PyTorch，但写 kernel 需要
cl                  # MSVC 编译器（Windows 上编译 CUDA 需要 Visual Studio Build Tools）
```

**Triton 在 Windows 上支持有限**，如果你要认真学 kernel：
- 方案 A：用 WSL2（**推荐**，本路线的大多数课程和仓库都只测过 Linux）
- 方案 B：租云 GPU（A100/L40S 单卡按小时计费，跑实验很便宜）

---

## 5. 一条命令的自检脚本

把下面存成 `check_env.py`，在目标环境里运行：

```python
import sys, platform
print("Python   :", sys.version.split()[0], "|", platform.platform())
try:
    import torch
    print("PyTorch  :", torch.__version__)
    print("CUDA可用 :", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("CUDA版本 :", torch.version.cuda)
        print("设备     :", torch.cuda.get_device_name(0))
        p = torch.cuda.get_device_properties(0)
        print(f"显存     : {p.total_memory / 1024**3:.1f} GiB")
        print(f"SMs      : {p.multi_processor_count}")
        # 简单算力探测：矩阵乘
        a = torch.randn(4096, 4096, device="cuda", dtype=torch.bfloat16)
        b = torch.randn(4096, 4096, device="cuda", dtype=torch.bfloat16)
        for _ in range(3): a @ b           # warmup
        torch.cuda.synchronize()
        import time; t = time.perf_counter()
        for _ in range(20): a @ b
        torch.cuda.synchronize()
        dt = (time.perf_counter() - t) / 20
        print(f"实测(bf16): {2 * 4096**3 / dt / 1e12:.1f} TFLOPS")
except ImportError:
    print("PyTorch  : 未安装")
```

**验收**：实测 TFLOPS 达到规格值的 **70% 以上**，说明环境正常。
明显偏低常见原因：驱动旧、功耗墙、笔记本散热降频。

---

## 6. 常见问题

| 症状 | 可能原因 | 处理 |
|---|---|---|
| `torch.cuda.is_available()` = False | 装了 CPU 版 torch / 驱动太旧 | 重装 cu 版本 torch / 升级驱动 |
| `CUDA out of memory` 但 nvidia-smi 显示空闲 | 其他进程占用 / 显存碎片 | `nvidia-smi` 查进程，或 `torch.cuda.empty_cache()` |
| 训练比预期慢很多 | 数据加载瓶颈 / 没用 AMP | 先排除 DataLoader，再用 `torch.autocast` |
| 笔记本上速度不稳定 | 功耗管理 / 热降频 | 插电、开性能模式、`nvidia-smi -lgc` 锁频 |
| WSL2 里识别不到 GPU | 驱动/WSL 版本问题 | 升级 NVIDIA 驱动（Windows 侧安装即可，不要在 WSL 里装驱动） |
