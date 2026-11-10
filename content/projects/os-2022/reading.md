---
title: 阅读材料：OSTEP、xv6 与手册
description: 2022 OS 的 15 份官方阅读材料，按周映射到 OSTEP 章节、xv6、AbstractMachine 和必读手册，附最低阅读路径。
date: 2026-11-10
---

# 阅读材料：OSTEP、xv6 与手册

> jyy 的每份 slides 后面都有一页“本周阅读材料”。官方的 15 份 notes 不长，但指向的书和手册很多。这一页把它们按周排好，并给出“时间不够时读什么”。

课程的主教材是 [*Operating Systems: Three Easy Pieces*](https://pages.cs.wisc.edu/~remzi/OSTEP/)（OSTEP），免费在线。实现参考是 [xv6](https://pdos.csail.mit.edu/6.828/2022/xv6/book-riscv-rev3.pdf)。手册主要是 [System V ABI](https://gitlab.com/x86-psABIs/x86-64-ABI)、[Linux man-pages](https://www.kernel.org/doc/man-pages/) 和 [AbstractMachine 文档](https://jyywiki.cn/OS/AbstractMachine/index.html)。

## 15 份官方阅读材料

| 周 | 官方 note | 对应讲义 | OSTEP | 代码 / 手册 | 读到什么程度 |
| --- | --- | --- | --- | --- | --- |
| 1 | [note 1](https://jyywiki.cn/OS/2022/notes/1.html) | 1–2 | Preface、第 1–2 章 | `logisim.c`、`seven-seg.py`、`hanoi-nr.c`、`minimal.S` | 建立“程序 = 状态机”的直觉 |
| 2 | [note 2](https://jyywiki.cn/OS/2022/notes/2.html) | 3–4 | 第 25–27 章 | `thread.h`、`sum.c`、`peterson-barrier.c`、`model-checker.py` | 能画出并发程序的状态空间 |
| 3 | [note 3](https://jyywiki.cn/OS/2022/notes/3.html) | 5–6 | 第 28、30、31 章 | `thread-sync.h`、`pc-sem.c`、`pc-cv.c`、`philosopher.c` | 能手写自旋锁、信号量、条件变量 |
| 4 | [note 4](https://jyywiki.cn/OS/2022/notes/4.html) | 7–8 | 第 29、32、33 章 | `alipay.c`、`mem-ordering.c` | 能识别四类并发 bug |
| 5 | [note 5](https://jyywiki.cn/OS/2022/notes/5.html) | 9–10 | — | `thread-os.c`、AbstractMachine | 能逐行解释一次时钟中断 |
| 6 | [note 6](https://jyywiki.cn/OS/2022/notes/6.html) | 11–12 | 第 3–5、13–14 章 | `fork-demo.c`、`execve-demo.c`、`mmap-alloc.c`、`mmap-disk.py` | 理解进程、地址空间、mmap |
| 7 | [note 7](https://jyywiki.cn/OS/2022/notes/7.html) | 13–14 | 第 17 章、第 5 章 | `sh-xv6.c`、glibc/newlib | 能写一个只依赖系统调用的 shell |
| 8 | [note 8](https://jyywiki.cn/OS/2022/notes/8.html) | 15 | 第 15、18–23 章 | `cow-test.c`、`mmap-alloc.c`、`dfs-fork.c` | 理解 fork 的“平行宇宙”和 COW |
| 9 | [note 9](https://jyywiki.cn/OS/2022/notes/9.html) | 16–17 | — | System V ABI、`loader-static.c`、`dlbox.c`、`libc.S` | 能读懂 ELF 和重定位 |
| 10 | [note 10](https://jyywiki.cn/OS/2022/notes/10.html) | 18–19 | — | xv6 书、xv6 源码 | 能跟踪一次系统调用和上下文切换 |
| 11 | [note 11](https://jyywiki.cn/OS/2022/notes/11.html) | 20–21 | 第 7–10 章 | seL4 whitepaper（选读） | 理解调度指标和 OS 设计空间 |
| 12 | — | 22 | — | AbstractMachine、`thread-os.c` | 能画出最小内核的结构 |
| 13 | [note 12](https://jyywiki.cn/OS/2022/notes/12.html) | 23–24 | 第 35–37、44 章 | `/sys/block`、`/proc/interrupts` | 理解存储层次和 I/O 路径 |
| 14 | [note 13](https://jyywiki.cn/OS/2022/notes/13.html) | 25–26 | 第 39 章 | AbstractMachine IOE、`launcher.c` | 理解驱动和文件系统 API |
| 15 | [note 14](https://jyywiki.cn/OS/2022/notes/14.html) | 27–28 | 第 38–42 章 | `fatree.c`、FAT 手册、xv6 `log.c` | 理解 FAT、inode、日志 |
| 16 | [note 15](https://jyywiki.cn/OS/2022/notes/15.html) | 29–30 | 第 43、45、46 章；47–51 选读 | xv6 `fs.c`、`bio.c`、`file.c` | 理解真实文件系统的分层 |

## 三本书怎么用

### OSTEP：建立概念地图

OSTEP 把操作系统分成三条主线：虚拟化、并发、持久化，正好对应 jyy 的课程结构。它的每章都有“Crux”问题，读之前先看问题，读完试着回答。

- **虚拟化**：第 3–24 章。重点读第 4、5、13–15、18–23 章。
- **并发**：第 25–33 章。重点读第 26–28、30–32 章。
- **持久化**：第 35–46 章。重点读第 36、39–43 章。

不要从第一页读到最后一页。按周读，配合讲义和实验，效果最好。

### CSAPP：查漏补缺

*Computer Systems: A Programmer's Perspective* 不需要通读。遇到以下问题时查：

- 汇编、栈帧、调用约定：第 3 章。
- 链接、ELF、动态库：第 7 章。
- 异常、进程、系统调用：第 8–9 章。
- 虚拟内存、malloc：第 9 章。
- 并发：第 12 章。

### xv6：看真实实现

xv6 书很短，代码约一万行，是这门课最好的“真实系统”参考。

- 第 1 章：操作系统接口（系统调用）。
- 第 2 章：内核结构（进程、地址空间、trap）。
- 第 3 章：页表。
- 第 4 章：trap 和系统调用。
- 第 5 章：中断和设备驱动。
- 第 6 章：锁。
- 第 7 章：调度。
- 第 8 章：文件系统。
- 第 9 章：并发（锁、睡眠、唤醒）。
- 第 10 章：总结。

读的时候把代码打开，跟着一条系统调用（比如 `write`）从用户态走到磁盘，再走回来。

## 手册怎么查

| 手册 | 什么时候用 | 怎么查 |
| --- | --- | --- |
| `man 2 xxx` | 系统调用语义、返回值、错误码 | `man 2 fork`、`man 2 mmap` |
| `man 3 xxx` | libc 函数 | `man 3 malloc`、`man 3 pthread_create` |
| `man 5 proc` | `/proc` 文件格式 | M1 必读 |
| `man 7 xxx` | 概念、协议 | `man 7 signal`、`man 7 tcp` |
| System V ABI | 寄存器、栈对齐、ELF | 查“Calling Convention”和“Object Files” |
| AbstractMachine | AM API 的规约 | 先读 TRM/IOE，再读 CTE/VME/MPE |
| FAT 手册 | M5 的目录项、BPB、LFN | 从 M5 页面的 local copy 进 |

读手册的诀窍：先看 `SYNOPSIS` 和 `RETURN VALUE`，再看 `ERRORS`，最后才看 `DESCRIPTION`。很多问题在返回值里已经写清楚了。

## 时间不够时的最低阅读路径

如果只有几十个小时，优先读这些：

1. OSTEP 第 2、4、5 章：操作系统和进程的基本概念。
2. OSTEP 第 26–28 章：线程、锁、并发 bug。
3. OSTEP 第 31 章：信号量。
4. OSTEP 第 36、39、40 章：I/O 设备、文件、文件系统实现。
5. OSTEP 第 42 章：崩溃一致性。
6. xv6 第 1、2、4 章：接口、内核结构、trap。
7. xv6 第 8 章：文件系统。
8. AbstractMachine 的 TRM、IOE、CTE、VME 规约。
9. `man 5 proc`、`man 2 fork`、`man 2 mmap`、`man 2 execve`。

这些读完，做 L0–L3 和 M1–M5 就不会因为“不知道这个概念”而卡住。

## 延伸阅读

课程 notes 里提到的论文和书，按兴趣选读：

- Butler Lampson. *Hints for Computer System Design*. 1983. 系统设计的经典格言集。
- Baumann et al. *A fork() in the road*. HotOS 2019. 为什么 fork 是一个“历史包袱”。
- Cody Cutler et al. *The benefits and costs of writing a POSIX kernel in a high-level language*. OSDI 2018.
- Kevin Boos et al. *Theseus: An experiment in operating system structure and state management*. OSDI 2020.
- *The seL4 Microkernel: An Introduction*. 微内核的工程实践。
- *The complexity of sequential consistency*. SPDP 1992. 并发程序的状态空间为什么难。
- *The Linux Programming Interface*. 查 UNIX 系统编程的细节。
- *Linkers and Loaders*. 链接和加载的经典书。

## 读完之后

阅读不是为了“打卡”。每读完一章，试着回答三个问题：

1. 这一章解决什么问题？
2. 它的核心机制是什么，代价是什么？
3. 如果让我实现，最小的版本需要哪些数据结构？

能答出来，再去看下一章。答不出来，回到讲义对应的那一讲，看看 jyy 是怎么用代码演示的。

---

上一篇：[OS Labs](oslabs.md) · 回到：[课程总览](index.md)
