---
title: repo-vital
description: 一条命令，给仓库做一次贡献友好度体检。
---

# repo-vital

**给仓库做一次“贡献友好度”体检，然后拿到一份按性价比排序的待办清单。**

一个陌生人打开你的项目，五分钟内就会决定要不要留下。repo-vital 只读工作区里的文件，告诉你这个人缺的是什么——license、CI、测试、issue 模板——以及哪个缺口最伤可信度。

不用配置文件，不联网，一条命令。除了 Python 3.9+，没有依赖。

## 它看起来是什么样

```console
$ repo-vital /path/to/tiny-log

repo-vital 0.1.0  contributor readiness report
/path/to/tiny-log

  !  README              README.md is only 155 B
  ✔  License             MIT (LICENSE)
  ✘  Tests               no test files found
  ✘  CI                  no CI configuration — nothing verifies contributions
  ✘  Contributing guide  no CONTRIBUTING guide — newcomers do not know how to start
  ✔  Recent activity     committed today
  ✔  Package manifest    pyproject.toml
  ✔  Description         pyproject.toml: Structured logs for scripts, in one function.
  ✘  Code of conduct     no code of conduct
  ✔  Gitignore           2 rules
  ✘  Issue templates     no issue template — reports arrive incomplete
  ✘  PR template         no pull request template

  Score 42/100   Needs work   (42.5/100 points)

  Next steps
  1. README  +15 pts
     Explain what it is, why it matters, and how to run it.
     currently: README.md is only 155 B
  2. Tests  +15 pts
     Tests are what let a stranger change code without fear.
  3. CI  +15 pts
     Run tests automatically on every pull request.
```

## 检查什么

| 维度 | 看什么 | 为什么重要 |
| --- | --- | --- |
| README | 是否存在、长度、是否有安装与用法 | 第一印象 |
| License | 是否有明确许可证 | 公司用户不敢用没有 license 的代码 |
| Tests | 是否有测试目录/测试文件 | 陌生人改代码的安全网 |
| CI | 是否有 GitHub Actions / Travis 等配置 | 说明改动会被验证 |
| 贡献指南 | `CONTRIBUTING.md` | 降低第一个 PR 的门槛 |
| 行为准则 | `CODE_OF_CONDUCT.md` | 社区信号 |
| Issue / PR 模板 | `.github/` 下的模板 | 让报告和 PR 更完整 |
| 活跃度 | 最近提交时间 | 项目是否还活着 |
| 包描述 | `pyproject.toml` / `package.json` 等 | 能否被搜到、被理解 |

评分不是目的，**排序后的待办清单**才是。每项检查都会给出“补上它能加多少分”和一句具体的行动建议。

## 安装

```bash
pip install repo-vital
```

或者直接从仓库运行：

```bash
git clone https://github.com/ipoger/repo-vital.git
cd repo-vital
python3 -m repo_vital .
```

## 用法

```bash
repo-vital                 # 体检当前目录
repo-vital path/to/repo    # 体检别的仓库
repo-vital --json          # 输出机器可读的 JSON
repo-vital --fail-under 80 # 分数低于 80 时以退出码 1 结束
```

当作 CI 门禁：

```yaml
- name: Check contributor readiness
  run: |
    pip install repo-vital
    repo-vital . --no-color --fail-under 80
```

## 几个设计决定

- **只读**。不修改仓库，不生成配置文件，不替你提交。体检工具不该有副作用。
- **不联网**。不查 GitHub API，不拉依赖。离线可用，也不会有速率限制。
- **可解释**。每个扣分项都告诉你“为什么”和“怎么补”，而不是只给一个分数。
- **零配置**。默认值就是合理值，想调再用参数。

源码和更多说明：[github.com/ipoger/repo-vital](https://github.com/ipoger/repo-vital)。
