---
title: 32 讲讲义导读
description: 把 jyy 2022 OS 的 32 份 slides 按 17 次课重新编排：每讲回答什么、关键概念、配套代码和自测问题。
date: 2026-11-10
---

# 32 讲讲义导读

> 官方 slides 很密，一页可能就是一节课的推导或一段代码。不要按“页”读，按“这一讲在回答什么问题”读。

下面把 32 份 slides 按 17 次课组织。每讲给出一句话主旨、关键概念、值得停下来跑的代码，以及三个自测问题。官方讲义链接都在标题旁，阅读材料对应 jyy 的 15 份 notes。

## 怎么读

1. **先看这一讲的问题。** slides 的 `Overview` 页通常会写“本次课回答的问题”和“主要内容”，那是地图。
2. **遇到代码就停下来。** 课程大量使用 `logisim.c`、`thread-os.c`、`sh-xv6.c`、`minimal.S` 这类几十行的示例。把它们下载下来，编译、改一行、再观察。
3. **每讲结束后写三句话。** 它给应用什么幻觉？维持幻觉的代价是什么？幻觉破了会怎样？这三问对进程、虚拟内存、文件系统都适用。
4. **不要追求一次看懂。** 第 19 讲上下文切换、第 29 讲 xv6 文件系统，第一遍能建立流程感就够了，做完 L2/L3 再回来看会清楚很多。

## 17 讲总表

| 讲 | 主题 | 核心问题 | 阅读材料 |
| --- | --- | --- | --- |
| 1 | 概述；操作系统上的程序 | 操作系统是什么？程序是什么？ | [note 1](https://jyywiki.cn/OS/2022/notes/1.html) |
| 2 | 多处理器编程；理解并发执行 | 多线程程序的状态机是什么？ | [note 2](https://jyywiki.cn/OS/2022/notes/2.html) |
| 3 | 互斥；同步 | 如何让多个线程安全共享资源？ | [note 3](https://jyywiki.cn/OS/2022/notes/3.html) |
| 4 | 真实并发；并发 Bug | 工业界怎么用并发？出错怎么办？ | [note 4](https://jyywiki.cn/OS/2022/notes/4.html) |
| 5 | 状态机模型及其应用 | 操作系统如何接管硬件？ | [note 5](https://jyywiki.cn/OS/2022/notes/5.html) |
| 6 | 进程；地址空间 | 进程和地址空间如何创建、修改？ | [note 6](https://jyywiki.cn/OS/2022/notes/6.html) |
| 7 | 系统调用、Shell、libc | 软件栈如何一层层搭起来？ | [note 7](https://jyywiki.cn/OS/2022/notes/7.html) |
| 8 | A `fork()` in the road | fork 还能怎么用？有什么坑？ | [note 8](https://jyywiki.cn/OS/2022/notes/8.html) |
| 9 | 可执行文件；加载 | ELF 里有什么？加载器做了什么？ | [note 9](https://jyywiki.cn/OS/2022/notes/9.html) |
| 10 | xv6；上下文切换 | 死循环为什么不会卡死机器？ | [note 10](https://jyywiki.cn/OS/2022/notes/10.html) |
| 11 | 调度；操作系统设计 | 下一个运行谁？OS 该提供什么？ | [note 11](https://jyywiki.cn/OS/2022/notes/11.html) |
| 12 | 极限速通 OS 实验 | 最小可工作的内核需要什么？ | — |
| 13 | 存储设备；I/O 设备 | 1 bit 如何持久？CPU 如何连世界？ | [note 12](https://jyywiki.cn/OS/2022/notes/12.html) |
| 14 | 设备驱动；文件系统 API | 设备如何变成文件？ | [note 13](https://jyywiki.cn/OS/2022/notes/13.html) |
| 15 | FAT/UNIX 文件系统；可靠性 | 数据结构如何放到磁盘上？ | [note 14](https://jyywiki.cn/OS/2022/notes/14.html) |
| 16 | xv6 文件系统；现代存储 | 真实文件系统如何组织？ | [note 15](https://jyywiki.cn/OS/2022/notes/15.html) |
| 17 | Android；课程总结 | 手机 OS 多了什么？全课如何串起来？ | — |

---

## 第 1 讲：操作系统概述；操作系统上的程序

官方讲义：[1.slides](https://jyywiki.cn/OS/2022/slides/1.slides.html) · [2.slides](https://jyywiki.cn/OS/2022/slides/2.slides.html)

**回答的问题**：为什么要学操作系统？操作系统到底是什么？怎么学？以及最根本的——什么是“程序”？

**关键概念**

- 应用视角：操作系统 = 一组对象（进程、地址空间、文件、设备）+ 操作它们的 API（系统调用）。
- 硬件视角：操作系统就是一个拥有全部硬件权限的 C 程序，启动后变成“中断处理程序”。
- 程序 = 状态机：寄存器 + 内存是状态，指令是迁移。编译器把源代码状态机翻译成二进制状态机。
- `main` 不是入口。真正的入口是 `_start`，它准备好参数和环境，再调用 `main`。

**值得停下来看**

- `logisim.c`：用 C 宏模拟数字电路，状态就是寄存器。
- `seven-seg.py`：一个最小模板引擎，展示“生成代码”的思路。
- `hanoi-nr.c`：非递归汉诺塔，展示函数调用和栈的形式语义。
- `minimal.S`：不依赖 libc，直接用系统调用打印字符的最小程序。

**自测**

1. 用“对象 + API”描述你手机上的一个 App 如何使用操作系统。
2. 为什么说“操作系统 99.99% 的时候是普通 C 程序”？剩下的 0.01% 是什么？
3. 从 `main` 到 `write` 系统调用，中间经过哪些层？

---

## 第 2 讲：多处理器编程；理解并发程序执行

官方讲义：[3.slides](https://jyywiki.cn/OS/2022/slides/3.slides.html) · [4.slides](https://jyywiki.cn/OS/2022/slides/4.slides.html)

**回答的问题**：多个执行流共享内存时，程序的状态机变成什么样？如何理解那些“看起来不可能”的交错？

**关键概念**

- 并发程序 = 多个状态机 + 共享内存。每个线程有自己的 PC、寄存器和栈。
- `thread.h` 用 wrapper 把 `void (*)(void *)` 统一成线程入口，这是一个很实用的 C 技巧。
- 竞态：`sum++` 不是原子操作，而是 load–add–store，两个线程可能同时读到旧值。
- 顺序一致性是最强的内存模型；真实 CPU 和编译器会重排，所以需要原子操作和屏障。
- 模型检查器（model checker）把“每一行原子执行”当作假设，穷举状态空间，能自动找出违反断言的执行。

**值得停下来看**

- `sum.c`：两个线程各加 100 万次，观察结果小于 200 万。
- `peterson-barrier.c`：不用原子指令实现互斥，理解“flag + turn”的直觉。
- `model-checker.py`：用 Python generator 实现的状态空间搜索，配合 `dekker.py`、`futex.py`。

**自测**

1. 线程之间哪些资源共享，哪些独享？
2. 画出两个线程各执行一次 `sum++` 的所有可能交错。
3. 为什么模型检查器会状态爆炸？它适合什么规模的问题？

---

## 第 3 讲：并发控制：互斥；同步

官方讲义：[5.slides](https://jyywiki.cn/OS/2022/slides/5.slides.html) · [6.slides](https://jyywiki.cn/OS/2022/slides/6.slides.html)

**回答的问题**：如何用硬件提供的原子指令实现锁？如何让线程按某种顺序协作？

**关键概念**

- 自旋锁：`atomic_xchg(&lk->locked, 1)` 不断尝试，直到拿到锁。临界区要短，否则浪费 CPU。
- 互斥锁：拿不到锁就把线程挂到等待队列，标记为 `BLOCKED`，让出 CPU；释放时唤醒。
- 信号量：计数器 + 等待队列。`P` 减少，`V` 增加；初值 1 可当互斥锁，初值 0 可做生产者–消费者。
- 条件变量：在持有锁时等待条件；`wait` 会释放锁并睡眠，被唤醒后重新加锁。必须用 `while` 检查条件。
- 内核里的自旋锁还要关中断，否则中断处理程序可能在同一个 CPU 上尝试拿同一把锁。

**值得停下来看**

- `thread-sync.h`：互斥锁、条件变量、信号量的封装。
- `pc-sem.c`：用信号量实现生产者–消费者。
- `pc-cv.c`、`philosopher.c`：经典的错误实现，观察它们如何死锁或丢唤醒。
- `sum-scalability.c`：临界区大小对扩展性的影响。

**自测**

1. 为什么 `volatile` 不能替代锁？
2. 自旋锁和互斥锁分别适合什么场景？
3. 条件变量为什么必须在 `while` 里等待，而不是 `if`？

---

## 第 4 讲：真实世界的并发；并发 Bug 和应对

官方讲义：[7.slides](https://jyywiki.cn/OS/2022/slides/7.slides.html) · [8.slides](https://jyywiki.cn/OS/2022/slides/8.slides.html)

**回答的问题**：工业界的并发长什么样？写出 bug 之后，如何系统性地定位，而不是靠运气？

**关键概念**

- 高性能计算：MPI、OpenMP、SIMD，计算密集、核数多、通信是瓶颈。
- 数据中心：线程池、队列、MapReduce、事件循环；吞吐和尾延迟比单次延迟更重要。
-  Web/移动端：async/await、goroutine、回调；I/O 密集，避免阻塞。
- 并发 bug 的类型：数据竞争、原子性违反、顺序违反、死锁、饥饿。
- 调试理论：fault（代码缺陷）→ error（运行时状态不对）→ failure（最终崩溃/输出错误）。测试要让 fault 更容易变成 error，断言要让 error 更早变成 failure。

**值得停下来看**

- `alipay.c`、`mem-ordering.c`：银行转账和内存顺序的反例。
- `model-checker.py` 的 `futex.py`：把操作系统的等待队列也建模进去。
- 课程里的 ThreadSanitizer / helgrind 演示。

**自测**

1. 计算密集型和 I/O 密集型程序，并发策略有什么不同？
2. 死锁的四个必要条件是什么？如何破坏其中一个？
3. 为什么“加一条 printf 就好了”是并发 bug 的典型症状？

---

## 第 5 讲：操作系统的状态机模型；状态机模型的应用

官方讲义：[9.slides](https://jyywiki.cn/OS/2022/slides/9.slides.html) · [10.slides](https://jyywiki.cn/OS/2022/slides/10.slides.html)

**回答的问题**：操作系统如何从硬件手里接管计算机？状态机模型还能用来理解什么？

**关键概念**

- 启动链：CPU Reset → Firmware → Bootloader → Kernel `_start()` → 第一个进程。
- 内核启动后，把自己注册成中断/异常处理程序，从此在后台管理整个系统。
- `thread-os.c` 是一个最小的分时操作系统：时钟中断到来，保存现场，轮转调度，恢复现场。
- 状态机模型可以描述数字电路、C 程序、并发程序、操作系统，甚至物理世界；模型检查是它的工程应用。

**值得停下来看**

- `thread-os.c`：L2 的“母版”，务必逐行读懂。
- AbstractMachine 的启动代码和链接脚本。
- `logisim.c`、`seven-seg.py` 与 NEMU 的关系。

**自测**

1. 从上电到第一个用户进程，列出主要阶段。
2. `thread-os.c` 的一次时钟中断，保存了哪些寄存器？恢复时做了什么？
3. 为什么“操作系统也是状态机”这个视角有用？

---

## 第 6 讲：操作系统上的进程；进程的地址空间

官方讲义：[11.slides](https://jyywiki.cn/OS/2022/slides/11.slides.html) · [12.slides](https://jyywiki.cn/OS/2022/slides/12.slides.html)

**回答的问题**：操作系统启动后如何创建第一个进程？进程的地址空间如何创建、修改？

**关键概念**

- `init` 进程通过 `fork`、`execve`、`wait` 创造出整个进程树。
- 进程 = 拥有独立地址空间的线程 + 内核对象（fd、信号、页表）。
- 地址空间布局：代码段、数据段、堆、栈、共享库、`vvar`/`vdso` 等。
- `mmap` 是地址空间的“万能接口”：分配内存、映射文件、映射设备、共享内存。
- 虚拟内存带来隔离、按需分配、COW；代价是地址翻译，TLB 负责加速。

**值得停下来看**

- `fork-demo.c`、`fork-printf.c`：fork 复制状态机，连 stdio 缓冲区都复制。
- `execve-demo.c`：`argv` 和 `envp` 如何传到新程序。
- `minimal.S`、静态/动态链接 Hello World 的地址空间。
- `mmap-alloc.c`、`mmap-disk.py`、`dosbox-hack.c`。

**自测**

1. fork 之后，父子进程哪些资源共享，哪些复制？
2. `mmap` 分配的页，什么时候真正获得物理内存？
3. 读 `/proc/self/maps`，指出你程序里代码、堆、栈、libc 的位置。

---

## 第 7 讲：系统调用和 UNIX Shell；C 标准库的实现

官方讲义：[13.slides](https://jyywiki.cn/OS/2022/slides/13.slides.html) · [14.slides](https://jyywiki.cn/OS/2022/slides/14.slides.html)

**回答的问题**：人类用户不直接调系统调用，那“我们”到底怎么用操作系统？从系统调用到 shell 再到 libc，软件栈如何搭起来？

**关键概念**

- Shell 是一门“把命令翻译成系统调用”的编程语言：`fork` + `execve` + `wait`，`pipe` + `dup2` 实现管道和重定向。
- `PATH` 决定命令去哪里找；`$?` 是上一个命令的退出码；`0` 成功，非 0 失败。
- libc 是系统调用的 wrapper + 缓冲区 + 内存分配器 + 字符串/数学函数。
- `printf` 有缓冲区：输出到终端是行缓冲，重定向到文件是全缓冲，所以 `fork` 后可能看到重复输出。
- `errno`、TLS、`__libc_start_main`、静态链接 vs 动态链接。

**值得停下来看**

- `sh-xv6.c`：只依赖系统调用的最小 shell。
- `linux-minimal.zip`：一个只有 init 的最小系统。
- `printf` 的缓冲区实验：`./a.out` 和 `./a.out | wc -l` 输出行数可能不同。

**自测**

1. 用 `fork`、`execve`、`wait`、`pipe`、`dup2` 描述 `ls | wc -l` 的执行过程。
2. 为什么 `printf` 的输出在重定向时会“延迟”？
3. `malloc` 最终如何向操作系统要内存？

---

## 第 8 讲：A `fork()` in the road

官方讲义：[15.slides](https://jyywiki.cn/OS/2022/slides/15.slides.html)

**回答的问题**：fork 除了创建进程，还能怎么用？它有哪些设计缺陷和坑？

**关键概念**

- fork 复制的是“状态机”，包括寄存器、内存、文件描述符表；父子从同一条指令继续执行，靠返回值区分。
- fork 可以当“并行原语”用：`dfs-fork.c` 用 fork 做深度优先搜索，父子进程通过管道同步。
- fork 与线程不兼容：多线程程序 fork 后，子进程只有调用 fork 的那个线程，其他线程持有的锁可能永远不释放。
- `fork` + `exec` 的组合效率不高；现代系统有 `posix_spawn`、`vfork`、`clone` 等替代。
- COW 让 fork 看起来“瞬间完成”，但写时复制有代价。

**值得停下来看**

- `dfs-fork.c`：用进程做并行 DFS，父子通过 pipe 传结果。
- `cow-test.c`：直接观察 COW 是否发生。
- fork 在 shell、数据库、语言运行时里的不同用法。

**自测**

1. fork 之后，父子进程的文件偏移量共享吗？为什么？
2. 多线程程序 fork 有什么风险？如何规避？
3. 为什么 `fork` + `exec` 不直接合并成一个系统调用？

---

## 第 9 讲：可执行文件；可执行文件的加载

官方讲义：[16.slides](https://jyywiki.cn/OS/2022/slides/16.slides.html) · [17.slides](https://jyywiki.cn/OS/2022/slides/17.slides.html)

**回答的问题**：ELF 里到底存了什么？操作系统如何把“描述状态机初始状态的数据结构”加载成进程？动态链接又做了什么？

**关键概念**

- 可执行文件 = 描述状态机初始状态的数据结构；“指针”在文件里是偏移量。
- ELF 头、节（section）、段（segment）、符号表、重定位表。
- 加载器：解析 ELF、映射段、设置栈和 `argv`/`envp`、跳转到入口。
- 静态链接在编译时把库代码复制进可执行文件；动态链接在加载/运行时解析符号。
- PLT/GOT、重定位、PIE/ASLR、动态链接器 `ld-linux.so`。

**值得停下来看**

- `readelf -h -S -l -s` 看一个真实 ELF。
- `loader-static.c`：用户态静态 ELF 加载器。
- `dlbox.c` 全家桶：`gcc`、`readdl`、`objdump`、`interp` 的最小实现。
- `popcount.c`、`unwind.c`：优化等级和栈回溯。

**自测**

1. section 和 segment 有什么区别？
2. `.bss` 为什么不占文件空间？
3. 动态链接器在 `main` 之前做了什么？

---

## 第 10 讲：xv6 代码导读；实现上下文切换

官方讲义：[18.slides](https://jyywiki.cn/OS/2022/slides/18.slides.html) · [19.slides](https://jyywiki.cn/OS/2022/slides/19.slides.html)

**回答的问题**：一个真实的 UNIX 内核如何组织？中断到来时，CPU 和内核到底做了什么？为什么死循环不能卡死计算机？

**关键概念**

- xv6 是 UNIX v6 的现代克隆，约一万行，结构清晰：`proc`、`trap`、`syscall`、`vm`、`fs`。
- 系统调用路径：用户态 `ecall` → trampoline → 保存 trapframe → `usertrap` → `syscall` → 返回。
- 上下文切换：保存 callee-saved 寄存器、`%rsp`、`%rip`，切换到另一个 `Context`，恢复。
- 时钟中断让内核重新获得控制权；调度器选择下一个进程；`swtch` 完成栈和寄存器切换。
- 死循环不可怕，因为硬件定时器会强制把控制权交回内核。

**值得停下来看**

- `thread-os.c` 与 xv6 的 `swtch.S` 对比。
- xv6 的 `trap.c`、`proc.c`、`syscall.c`。
- 用 gdb 单步一次时钟中断。

**自测**

1. 一次时钟中断从硬件到调度器，经过哪些函数？
2. `Context` 里为什么只保存一部分寄存器？
3. 为什么用户态死循环不会让整台机器无响应？

---

## 第 11 讲：处理器调度；操作系统设计

官方讲义：[20.slides](https://jyywiki.cn/OS/2022/slides/20.slides.html) · [21.slides](https://jyywiki.cn/OS/2022/slides/21.slides.html)

**回答的问题**：下一个该运行谁？操作系统到底应该提供哪些对象和 API？

**关键概念**

- 调度指标：周转时间、响应时间、吞吐、公平性、尾延迟。
- 算法：Round-Robin、优先级、MLFQ、CFS、Lottery；没有万能最优。
- 真实调度器要处理多核、负载均衡、CPU 亲和性、实时任务。
- 操作系统设计空间：宏内核、微内核、外核、unikernel；机制与策略分离。
- API 是承诺：一旦暴露给应用，就很难改。

**值得停下来看**

- OSTEP 第 7–10 章的调度模拟器。
- xv6 的 `scheduler()` 和 `yield()`。
- seL4 的 API 设计（微内核把机制做到极小）。

**自测**

1. MLFQ 的基本规则是什么？它如何防止饥饿？
2. 微内核和宏内核各自的优缺点？
3. 为什么这门课不花很多时间讲调度算法？

---

## 第 12 讲：极限速通操作系统实验

官方讲义：[22.slides](https://jyywiki.cn/OS/2022/slides/22.slides.html)

**回答的问题**：一个最小可工作的操作系统到底需要什么？如何从 AbstractMachine 走到自己的内核？

**关键概念**

- AbstractMachine 提供 TRM、IOE、CTE、VME、MPE 五组 API。
- 最小内核：`os->init()` 初始化 pmm/kmt，`cte_init(os->trap)` 注册中断入口，`mpe_init(os->run)` 启动多核。
- L1 做内存分配，L2 做线程和同步，L3 做用户态和系统调用。
- 调试手段：`printf`、`assert`、gdb + QEMU、QEMU monitor log。

**值得停下来看**

- `thread-os.c`、`trivial-os.c`。
- L1/L2 框架的 `framework/main.c`、`kernel.h`。
- `make -nB` 展开的编译/链接/镜像生成命令。

**自测**

1. 从 `main` 到 `os->run`，框架代码做了什么？
2. 为什么 `os->init` 里不用担心数据竞争？
3. 内核镜像里的 bootblock 和 ELF 各起什么作用？

---

## 第 13 讲：存储设备原理；输入输出设备

官方讲义：[23.slides](https://jyywiki.cn/OS/2022/slides/23.slides.html) · [24.slides](https://jyywiki.cn/OS/2022/slides/24.slides.html)

**回答的问题**：状态机的状态如何持久保存？CPU 如何与显示器、磁盘、网卡这些“外部世界”打交道？

**关键概念**

- 1 bit 的存储：SRAM、DRAM、NAND Flash、磁盘、光盘；易失 vs 非易失。
- 存储层次：寄存器 → cache → 内存 → SSD/HDD → 网络；延迟差几个数量级。
- I/O 接口：MMIO、port I/O、DMA；中断控制器、总线。
- GPU 和异构计算：CPU 发命令，GPU 并行执行；显存和 PCIe 是瓶颈。

**值得停下来看**

- `dd` 测顺序/随机读写；`fio` 看 IOPS。
- QEMU 的设备模拟和 `info mtree`。
- `/sys/block`、`/proc/interrupts`。

**自测**

1. DRAM 和 NAND Flash 的读写特性有什么不同？
2. DMA 为什么能减少 CPU 开销？
3. 为什么随机写比顺序写慢很多？

---

## 第 14 讲：设备驱动程序；文件系统 API

官方讲义：[25.slides](https://jyywiki.cn/OS/2022/slides/25.slides.html) · [26.slides](https://jyywiki.cn/OS/2022/slides/26.slides.html)

**回答的问题**：操作系统如何把五花八门的设备抽象成统一接口？为什么文件系统 API 长成 `open/read/write/close` 这样？

**关键概念**

- 驱动 = 把设备寄存器操作封装成 `read/write/ioctl` 的代码；处理中断、DMA、并发。
- Linux 设备模型：字符设备、块设备、网络设备；`file_operations`、`ioctl`。
- 文件系统 API：文件、目录、文件描述符、偏移量、权限、硬链接/软链接。
- “一切皆文件”的代价：有些设备语义无法完美映射成字节流，需要 `ioctl` 逃生舱。
- 多个进程共享设备时，需要内核提供原子性和隔离。

**值得停下来看**

- AbstractMachine IOE 的设备规约。
- L2 框架里的 `dev` 模块、`tty`、`fb`、`sda` 驱动。
- `launcher.c`：Linux 的虚拟字符设备。

**自测**

1. 字符设备和块设备有什么区别？
2. `open` 返回的 fd 里存了什么？
3. 为什么 `write` 不保证数据已经落盘？

---

## 第 15 讲：FAT 和 UNIX 文件系统；持久数据的可靠性

官方讲义：[27.slides](https://jyywiki.cn/OS/2022/slides/27.slides.html) · [28.slides](https://jyywiki.cn/OS/2022/slides/28.slides.html)

**回答的问题**：目录和文件如何放在块设备上？断电时如何保证数据不丢、不坏？

**关键概念**

- 文件系统 = `bread`/`bwrite` 之上的数据结构；核心操作是分配/回收块、维护目录、读写文件。
- FAT：用链表把簇串起来；目录项里存文件名、起始簇、大小；实现简单，但大文件随机访问慢。
- UNIX/ext2：inode 存元数据和索引指针（直接、间接、双重间接）；目录只是“名字 → inode”的表。
- 空闲空间管理：位图、空闲链表、伙伴系统。
- 可靠性：RAID 0/1/4/5/6 解决介质失效；日志（write-ahead log）、fsck、COW 解决崩溃一致性。

**值得停下来看**

- `fatree.c`：打印 FAT 目录树。
- M5 的 FAT32 镜像：`xxd` 看 BPB、FAT 表、目录项、BMP 头。
- xv6 的 `log.c` 和 `fs.c`。

**自测**

1. FAT 和 inode 两种布局，大文件随机读写谁更快？
2. 快速格式化删掉了什么？为什么还能恢复？
3. 日志为什么能保证崩溃一致性？写日志的顺序是什么？

---

## 第 16 讲：xv6 文件系统实现；现代存储系统

官方讲义：[29.slides](https://jyywiki.cn/OS/2022/slides/29.slides.html) · [30.slides](https://jyywiki.cn/OS/2022/slides/30.slides.html)

**回答的问题**：一个真实文件系统如何组织 buffer cache、日志、inode 和目录？现代应用为什么还需要数据库和 KV 存储？

**关键概念**

- xv6 文件系统分层：`bio`（buffer cache）→ `log`（事务）→ `fs`（inode/目录/文件）→ `file`（fd）。
- buffer cache：缓存磁盘块，减少 I/O；LRU 替换；并发访问要加锁。
- 日志：`begin_op`、`log_write`、`commit`；崩溃后重放已提交事务。
- 现代存储：关系数据库（B+ 树、WAL、MVCC）、KV 存储（LSM 树、SSTable）、对象存储、分布式文件系统。
- 文件系统的局限：元数据操作昂贵、小文件多时 inode 成为瓶颈、跨机共享困难。

**值得停下来看**

- xv6 的 `bio.c`、`log.c`、`fs.c`、`file.c`。
- `jyywiki.cn` 的 Online Judge 如何用文件系统存提交。
- LSM 树 vs B+ 树的读写放大。

**自测**

1. buffer cache 和 CPU cache 有什么区别？
2. xv6 如何保证一次 `rename` 的原子性？
3. 为什么很多数据库不直接把数据存在文件系统里，而是自己管理磁盘？

---

## 第 17 讲：Android 系统；课程总结

官方讲义：[31.slides](https://jyywiki.cn/OS/2022/slides/31.slides.html) · [32.slides](https://jyywiki.cn/OS/2022/slides/32.slides.html)

**回答的问题**：一个真正“实用”的操作系统还需要什么？从逻辑门到操作系统，这门课如何串成一条线？

**关键概念**

- Android 栈：Linux 内核 → HAL → native 库 → ART → Java/Kotlin framework → App。
- Binder IPC、应用沙箱、权限模型、生命周期管理。
- Android 不是“Linux 发行版”：它有自己的 init、HAL、运行时和应用模型。
- 全课回顾：数字电路是状态机，程序是状态机，操作系统是状态机的管理者；抽象和接口是应对复杂性的核心。

**值得停下来看**

- Android 的启动流程和 `init.rc`。
- Binder 的一次事务传输。
- 课程总结里“从逻辑门到计算机系统”的层级图。

**自测**

1. Android 的 Binder 和 UNIX pipe 有什么区别？
2. 应用沙箱依赖哪些内核机制？
3. 用一句话解释“操作系统是什么”，并要求自己不再补充。

---

## 每讲三问

如果时间不够，至少对每一讲回答这三个问题：

1. 这一讲给应用程序提供了什么**幻觉**？
2. 维持这个幻觉需要什么**机制**，代价是什么？
3. 幻觉被打破时，**错误**如何暴露给上层？

这三问在进程、虚拟内存、文件系统、设备驱动上反复出现。能答出来，说明你抓到了这一讲的结构，而不是记住了几张 slides。

---

上一篇：[前置知识](prerequisites.md) · 下一篇：[Mini Labs](minilabs.md) →
