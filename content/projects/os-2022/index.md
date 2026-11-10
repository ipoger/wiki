---
title: 南京大学 2022 操作系统：设计与实现
description: 蒋炎岩 2022 春季 OS 课的 32 讲讲义与 10 个实验索引，外加一份两周补齐的前置知识。
date: 2026-11-10
---

# 南京大学 2022 操作系统：设计与实现

> 这是蒋炎岩老师 2022 春季《操作系统：设计与实现》的**学习索引与前置补课**，不是讲义的复制。讲义、实验和阅读材料的版权归原作者，原课程以 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 发布；这里只做导航、摘要和补充。

jyy 的课有一个很高的隐形门槛：默认你会 C、看得懂汇编、熟悉 Linux 命令行、写过并发程序。直接点开 slides 很容易卡在“这行代码为什么能跑”，而不是操作系统本身。

所以这份材料分三层：

1. **先补前置**：[两周补课表](prerequisites.md)，把 C、x86-64、裸机、工具链、并发、OS 概念补到“能开工”。
2. **再跟讲义**：[32 讲导读](lectures.md)，按“状态机 / 虚拟化 / 持久化”三条主线重新编排。
3. **最后做实验**：[Mini Labs](minilabs.md)（应用视角）和 [OS Labs](oslabs.md)（硬件视角），每个实验都列了前置知识、关键 API 和常见坑。

## 先做三道诊断

不用查资料，试着用两三句话回答：

1. `int *p = malloc(4 * sizeof(int)); p[10] = 0;` 为什么可能不崩溃？这段代码错在哪？
2. x86-64 下调用 `foo(a, b, c, d, e, f, g)`，第七个参数放在哪里？返回值放在哪里？
3. `fork()` 之后，父子进程哪些东西共享、哪些不共享？`execve()` 又改变了什么？

如果三题都不能稳定答出来，先读[前置知识](prerequisites.md)，再回来。能答出来但心里发虚，也可以只扫一遍每节的“自测”。

## 课程结构

| 部分 | 内容 | 占比 |
| --- | --- | --- |
| 原理课 | 17 次课、32 份讲义：并发、虚拟化、持久化 | 期末考试 40% + 期中 10% |
| Mini Labs | M1–M5，应用程序视角，用 OS API 做“黑科技” | 编程实验 25% |
| OS Labs | L0–L4，硬件视角，从裸机实现一个多处理器内核 | 系统实验 25% |

2022 年的硬截止日期是 **7 月 3 日 23:59:59**；毕业班 6 月 26 日截止，且只计 M1–M5、L0–L2。每学期具体日期会变，做实验前以当年课程主页为准。

## 17 讲路线

官方讲义是 32 份 slides，按 17 次课组织。下表把“讲什么、看哪份、配哪个实验”放在一起。

| 讲 | 主题 | 讲义 | 实验 | 这一讲在回答什么 |
| --- | --- | --- | --- | --- |
| 1 | 操作系统概述；操作系统上的程序 | [1](https://jyywiki.cn/OS/2022/slides/1.slides.html) · [2](https://jyywiki.cn/OS/2022/slides/2.slides.html) | [M1](https://jyywiki.cn/OS/2022/labs/M1.html) · [L0](https://jyywiki.cn/OS/2022/labs/L0.html) | 操作系统是什么？程序为什么是状态机？ |
| 2 | 多处理器编程；理解并发程序执行 | [3](https://jyywiki.cn/OS/2022/slides/3.slides.html) · [4](https://jyywiki.cn/OS/2022/slides/4.slides.html) | [M2](https://jyywiki.cn/OS/2022/labs/M2.html) | 多个执行流共享内存时，程序到底是什么？ |
| 3 | 并发控制：互斥；同步 | [5](https://jyywiki.cn/OS/2022/slides/5.slides.html) · [6](https://jyywiki.cn/OS/2022/slides/6.slides.html) | [L1](https://jyywiki.cn/OS/2022/labs/L1.html) | 如何让多个线程安全地共享资源？ |
| 4 | 真实世界的并发；并发 Bug 与应对 | [7](https://jyywiki.cn/OS/2022/slides/7.slides.html) · [8](https://jyywiki.cn/OS/2022/slides/8.slides.html) | — | 工业界的并发长什么样？写出 bug 怎么办？ |
| 5 | 操作系统的状态机模型；状态机的应用 | [9](https://jyywiki.cn/OS/2022/slides/9.slides.html) · [10](https://jyywiki.cn/OS/2022/slides/10.slides.html) | — | 操作系统如何从硬件手里接管计算机？ |
| 6 | 操作系统上的进程；进程的地址空间 | [11](https://jyywiki.cn/OS/2022/slides/11.slides.html) · [12](https://jyywiki.cn/OS/2022/slides/12.slides.html) | [M3](https://jyywiki.cn/OS/2022/labs/M3.html) · [L2](https://jyywiki.cn/OS/2022/labs/L2.html) | 进程和地址空间是怎么被创建、修改的？ |
| 7 | 系统调用和 UNIX Shell；C 标准库的实现 | [13](https://jyywiki.cn/OS/2022/slides/13.slides.html) · [14](https://jyywiki.cn/OS/2022/slides/14.slides.html) | — | 从系统调用到 shell 再到 libc，软件栈怎么搭起来？ |
| 8 | A `fork()` in the road | [15](https://jyywiki.cn/OS/2022/slides/15.slides.html) | — | fork 的“平行宇宙”还能怎么用？ |
| 9 | 可执行文件；可执行文件的加载 | [16](https://jyywiki.cn/OS/2022/slides/16.slides.html) · [17](https://jyywiki.cn/OS/2022/slides/17.slides.html) | [M4](https://jyywiki.cn/OS/2022/labs/M4.html) | ELF 里到底存了什么？加载器做了什么？ |
| 10 | xv6 代码导读；实现上下文切换 | [18](https://jyywiki.cn/OS/2022/slides/18.slides.html) · [19](https://jyywiki.cn/OS/2022/slides/19.slides.html) | [L3](https://jyywiki.cn/OS/2022/labs/L3.html) | 死循环为什么不能卡死计算机？ |
| 11 | 处理器调度；操作系统设计 | [20](https://jyywiki.cn/OS/2022/slides/20.slides.html) · [21](https://jyywiki.cn/OS/2022/slides/21.slides.html) | — | 下一个该运行谁？OS 该提供哪些对象？ |
| 12 | 极限速通操作系统实验 | [22](https://jyywiki.cn/OS/2022/slides/22.slides.html) | — | 一个最小可工作的内核到底需要什么？ |
| 13 | 存储设备原理；输入输出设备 | [23](https://jyywiki.cn/OS/2022/slides/23.slides.html) · [24](https://jyywiki.cn/OS/2022/slides/24.slides.html) | — | 1 bit 如何持久保存？CPU 如何和世界打交道？ |
| 14 | 设备驱动程序；文件系统 API | [25](https://jyywiki.cn/OS/2022/slides/25.slides.html) · [26](https://jyywiki.cn/OS/2022/slides/26.slides.html) | — | 设备如何抽象成文件？文件系统 API 为什么长这样？ |
| 15 | FAT 和 UNIX 文件系统；持久数据的可靠性 | [27](https://jyywiki.cn/OS/2022/slides/27.slides.html) · [28](https://jyywiki.cn/OS/2022/slides/28.slides.html) | [M5](https://jyywiki.cn/OS/2022/labs/M5.html) · [L4（题面缺失）](oslabs.md#l4-vfs2022-没有公开题面) | 目录和文件如何放在磁盘上？断电了怎么办？ |
| 16 | xv6 文件系统实现；现代存储系统 | [29](https://jyywiki.cn/OS/2022/slides/29.slides.html) · [30](https://jyywiki.cn/OS/2022/slides/30.slides.html) | — | 一个真实文件系统如何组织缓存、日志和 inode？ |
| 17 | Android 系统；课程总结 | [31](https://jyywiki.cn/OS/2022/slides/31.slides.html) · [32](https://jyywiki.cn/OS/2022/slides/32.slides.html) | — | 手机操作系统多了什么？整门课如何串起来？ |

> L4（vfs）在原 2022 主页上的链接指向 `localhost:5001`，官方题面没有公开。实验地图里保留了它，并给出可替代的自学路径，见 [OS Labs](oslabs.md#l4-vfs2022-没有公开题面)。

## 三条主线

与其按 32 份 slides 平均用力，不如抓住三条线。jyy 的每一讲几乎都在给这三条线添一块砖。

### 1. 状态机：整门课的世界观

- 程序 = 状态机：寄存器、内存、PC 决定当前状态，指令决定迁移。
- 并发程序 = 多个执行流 + 共享内存的状态机。
- 操作系统 = 状态机的管理者：保存一个、恢复另一个，于是有了进程、线程和上下文切换。
- 文件系统、fork、ELF、动态链接，都可以还原成“如何描述和复制状态机”。

对应讲义：2、4、9、10、15、18、19、32。

### 2. 虚拟化：CPU 和内存的幻觉

- CPU 虚拟化：中断 + 上下文切换 + 调度，让每个线程以为自己独占 CPU。
- 内存虚拟化：页表 + MMU + page fault，让每个进程以为自己独占地址空间。
- 进程 = 拥有独立地址空间的线程；这是 L2 到 L3 的关键一跃。

对应讲义：11、12、18–22，以及 L1–L3。

### 3. 持久化：数据结构放到磁盘上

- 设备：MMIO / DMA / 中断，把硬件封装成 `read/write`。
- 文件系统：`bread/bwrite` 之上的数据结构，FAT 用链表，UNIX 用索引。
- 可靠性：RAID 解决介质失效，日志/CoW 解决断电时的崩溃一致性。

对应讲义：23–30，以及 M5、L4。

## 实验地图

| 实验 | 一句话 | 主要前置 | 难度 | 详细导读 |
| --- | --- | --- | --- | --- |
| M1 pstree | 读 `/proc`，打印进程树 | C、目录 API、递归 | ★★ | [M1](minilabs.md#m1-pstree打印进程树) |
| M2 libco | 用 `setjmp/longjmp` 实现用户态协程 | 汇编、ABI、栈 | ★★★★ | [M2](minilabs.md#m2-libco协程库) |
| M3 sperf | `fork/execve/pipe` + 解析 `strace` | 进程、管道、`PATH` | ★★★ | [M3](minilabs.md#m3-sperf系统调用-profiler) |
| M4 crepl | 把一行 C 编译成 `.so` 再 `dlopen` | 编译、链接、动态加载 | ★★★ | [M4](minilabs.md#m4-creplc-repl) |
| M5 frecov | 从快速格式化的 FAT32 镜像里恢复 BMP | FAT、`mmap`、二进制解析 | ★★★★ | [M5](minilabs.md#m5-frecov文件恢复) |
| L0 amgame | 在 AbstractMachine 上写个小游戏 | C、IOE、裸机 | ★★ | [L0](oslabs.md#l0-amgame裸机小游戏) |
| L1 pmm | 多处理器安全的 `kalloc/kfree` | 链表/伙伴算法、锁 | ★★★ | [L1](oslabs.md#l1-pmm物理内存管理) |
| L2 kmt | 内核线程、自旋锁、信号量 | 中断、上下文切换 | ★★★★ | [L2](oslabs.md#l2-kmt内核线程) |
| L3 uproc | 用户态进程、系统调用、COW fork | 页表、异常、ABI | ★★★★★ | [L3](oslabs.md#l3-uproc用户态进程) |
| L4 vfs | 虚拟文件系统（题面缺失） | inode、路径解析 | ★★★★★ | [L4](oslabs.md#l4-vfs2022-没有公开题面) |

建议顺序：**L0 → M1 → M2 → L1 → M3 → L2 → M4 → L3 → M5**。M 和 L 交替做，刚好一边用 API、一边实现 API。

## 怎么用这份材料

1. **第 0 周**：做[前置诊断](prerequisites.md#0-先做十道诊断)，按 14 天表补课。不要跳过汇编和并发，它们是 M2、L1、L2 的地基。
2. **每讲之前**：读[讲义导读](lectures.md)里对应的一节，知道这一讲要回答什么问题，再看 slides。
3. **每讲之后**：合上 slides，用三句话回答“它给应用什么幻觉、维持幻觉的代价是什么、幻觉破了会怎样”。写不出来就回去看代码示例。
4. **做实验之前**：读对应的 [Mini Lab](minilabs.md) / [OS Lab](oslabs.md) 导读，把“前置知识”和“常见坑”过一遍，再 `git pull origin Mx`。
5. **卡住时**：先 `strace` / `gdb` / `printf`，再查手册，最后才搜代码。课程明确要求独立完成，参考别人的实现会让实验失去意义。

## 官方资源

- [2022 课程主页](https://jyywiki.cn/OS/2022/)
- [课程概述](https://jyywiki.cn/OS/OS_Overview.html)（前导知识的官方说法）
- [生存指南](https://jyywiki.cn/OS/OS_Guide.html)（C 语言和调试自测）
- [教科书与参考资料](https://jyywiki.cn/OS/OS_References.html)
- [AbstractMachine 文档](https://jyywiki.cn/OS/AbstractMachine/index.html)
- [xv6: a simple, Unix-like teaching operating system](https://pdos.csail.mit.edu/6.828/2022/xv6/book-riscv-rev3.pdf)
- [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/)
- [B 站课程回看](https://space.bilibili.com/202224425/channel/collectiondetail?sid=192498)

## 说明

- 本站不镜像 slides 和 lab 题面，只链接原站；所有摘要、导读和前置知识为原创整理。
- 课程年份是 2022，但部分链接（如 AbstractMachine）会指向 jyy 的通用页面，内容仍然适用。
- 发现链接失效或事实错误，欢迎在 [GitHub Issues](https://github.com/ipoger/wiki/issues) 指出。

---

下一篇：[前置知识：两周补到能开工](prerequisites.md) →
