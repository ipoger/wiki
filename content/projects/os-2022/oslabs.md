---
title: OS Labs：L0–L4 导读
description: 2022 OS 的五个内核实验：amgame、pmm、kmt、uproc、vfs。从裸机到多处理器、用户态和文件系统的实现路线。
date: 2026-11-10
---

# OS Labs：L0–L4 导读

> OS Labs 是“硬件视角”的实验：从裸机上的一个小游戏开始，逐步实现物理内存管理、内核线程、用户态进程，最后走到文件系统。它们贯穿整个学期，也是整门课最硬的部分。

官方题面在 jyywiki 上，这里只给导读、前置知识和排坑清单。做之前先读[前置知识](prerequisites.md)里的汇编、计算机组成和并发三节。

## 总览

| 实验 | 一句话 | 主要前置 | 关键机制 | Soft deadline |
| --- | --- | --- | --- | --- |
| [L0 amgame](https://jyywiki.cn/OS/2022/labs/L0.html) | 在 AbstractMachine 上写个小游戏 | C、IOE、裸机 | TRM / IOE | 2022-03-06 |
| [L1 pmm](https://jyywiki.cn/OS/2022/labs/L1.html) | 多处理器安全的 `kalloc/kfree` | 链表/伙伴算法、锁 | MPE、自旋锁 | 2022-04-05 |
| [L2 kmt](https://jyywiki.cn/OS/2022/labs/L2.html) | 内核线程、自旋锁、信号量 | 中断、上下文切换 | CTE、`on_irq` | 2022-05-08 |
| [L3 uproc](https://jyywiki.cn/OS/2022/labs/L3.html) | 用户态进程、系统调用、COW fork | 页表、异常、ABI | VME、`int 0x80` | 2022-06-26 |
| L4 vfs | 虚拟文件系统（题面缺失） | inode、路径解析 | VFS | — |

L1–L3 需要提交以学号命名的 PDF 实验报告，放在 `kernel/` 目录下，建议不超过 2 页 A4。报告写“值得说的事”：架构设计、精巧实现、印象深刻的 bug，不要贴代码。

## 实验路线

```text
L0 裸机 + I/O
  ↓
L1 物理内存分配
  ↓
L2 中断 + 上下文切换 + 线程/锁/信号量
  ↓
L3 页表 + 用户态 + 系统调用
  ↓
L4 文件系统（VFS）
```

每一层都建立在前一层上。L1 没做好，L2 会很难；L2 的同步没做对，L3 会在奇怪的地方崩。建议不要跳层，但可以在 L1 只实现一个“能用”的分配器，先把 L2 跑起来，再回头优化。

---

## L0 amgame：裸机小游戏

官方题面：[L0.html](https://jyywiki.cn/OS/2022/labs/L0.html)

**目标**：在 AbstractMachine 上写一个只用 TRM + IOE 的小游戏：有图形、能响应键盘、按 ESC 退出。

**前置知识**

- C 的 freestanding 环境：没有 `printf`、`malloc`，只有编译器提供的内建和 AM 的 API。
- `stdint.h`、`stdarg.h`、`stddef.h` 这些 freestanding 头文件。
- 轮询式主循环：等一帧、读键盘、更新状态、重绘。
- 屏幕分辨率和像素格式；`io_read` / `io_write`。

**实验要求（摘要）**

- 只用 TRM 和 IOE，不用中断、虚存、多处理器。
- 有肉眼可辨认的图形；键盘可交互；代码 + 静态数据 ≤ 1 MiB，堆 ≤ 1 MiB。
- 按 ESC 调用 `halt()`；除此之外不主动退出；Game Over 后按键重开。
- 在 32/64 位、不同分辨率、大/小端下都能编译运行；不要用浮点（编译选项有 `-mno-sse`）。

**关键思路**

```c
int width  = io_read(AM_GPU_CONFIG).width;
int height = io_read(AM_GPU_CONFIG).height;

while (1) {
  while (uptime() < next_frame) ;
  while ((key = readkey()) != AM_KEY_NONE) {
    if (key == AM_KEY_ESCAPE) halt();
    game_key(key);
  }
  game_update();
  io_write(AM_GPU_FBDRAW, 0, 0, fb, width, height, true);
  next_frame += 1000 / FPS;
}
```

`fb` 是一块 `width * height * 4` 的像素缓冲区，自己维护坐标和速度，每帧更新，然后整屏刷一次。

**容易踩的坑**

- **`ioe_init()` 之前调用 `io_read`/`io_write`**：会挂。先初始化，再读配置。
- **分辨率写死**：OJ 会改分辨率，必须从 `AM_GPU_CONFIG` 读。
- **用浮点**：`-mno-sse` 下浮点会链接失败或行为异常；用定点数。
- **指针强转成 `int`**：32/64 位不兼容，用 `intptr_t` / `uintptr_t`。
- **按 ESC 没 `halt()`，或平时乱 `halt()`**：都会判错。
- **Game Over 后不重开**：题面要求按键重新开始。
- **klib 没实现**：`printf`、`memcpy`、`memset` 等要么自己写，要么用参考实现；写的时候注意可移植性。

**做完能回答**

1. 裸机程序和 hosted 程序的 C 环境有什么不同？
2. 为什么游戏主循环和操作系统的“批处理循环”很像？
3. `io_read` / `io_write` 和系统调用有什么关系？

**常用命令**

```bash
make run ARCH=x86_64-qemu
make run ARCH=x86_64-qemu smp=2   # L0 不需要 SMP，但可以看启动
make submit
```

---

## L1 pmm：物理内存管理

官方题面：[L1.html](https://jyywiki.cn/OS/2022/labs/L1.html)

**目标**：在 `[heap.start, heap.end)` 上实现多处理器安全的 `kalloc(size)` / `kfree(ptr)`。

**前置知识**

- 空闲空间管理：空闲链表、位图、伙伴系统、slab。
- 对齐：返回地址必须是 `2^i` 的倍数，`i` 是满足 `2^i >= size` 的最小正整数。
- 并发：自旋锁、每 CPU 缓存、fast/slow path。
- `size_t`、指针算术、`uintptr_t`。

**规约要点**

- 分配不重叠，返回区间左端点；`kfree` 的调用者保证传入已分配区间的左端点。
- 分配不到返回 `NULL`；可以拒绝超过 16 MiB 的请求。
- 允许不同 CPU 并发 `kalloc`/`kfree`；一个 CPU 分配的内存可以在另一个 CPU 释放。
- 静态内存（代码 + 数据 + bss）不能超过 1 MiB；管理堆的数据结构要放在堆区。
- 性能不能比“一把大锁 + 遍历链表”的 baseline 差太多，否则 hard test 可能失败。

**关键思路**

先做对，再做快：

1. **单处理器 + 一把大锁**：空闲链表按大小/地址排序，首次适配或最佳适配。先让 `make test` 的单线程用例通过。
2. **加锁**：所有空闲链表操作放在自旋锁里；注意锁的初始化和中断安全。
3. **每 CPU 缓存**：每个 CPU 维护一小块页缓存，fast path 不走全局锁；不够时从全局池“偷”一批页面。
4. **slab/大小类**：把小对象按 16/32/64/… 字节分类，减少碎片和查找成本。

**容易踩的坑**

- **对齐算错**：`size=17` 要返回 32 字节对齐；`size=4096` 要页对齐。
- **区间重叠/越界**：合并空闲块时检查前后相邻，别把元数据写进已分配区。
- **并发释放**：两个 CPU 同时 `kfree` 相邻块，合并时要用锁保护。
- **在中断里分配**：L2 会在中断里调用 `pmm->alloc`，所以 L1 的实现要能关中断或保证不被中断打断。
- **元数据放在静态区**：超过 1 MiB 会被 OJ 拒绝；元数据要放在 `heap` 里。
- **`kfree(NULL)` / double free**：规约说是 UB，但最好加断言，早点发现。

**测试框架**

搭一个 `test/` 目录，用 `threads.h` 把 `kalloc/kfree` 链接成普通 Linux 程序，跑：

- 单线程 smoke test；
- 多线程并发分配/释放；
- 随机大小、随机顺序的压力测试；
- 用一个“记录每次分配/释放”的日志检查是否重叠。

这比每次 `make run` + QEMU 快得多。

**做完能回答**

1. 为什么 `kalloc` 的返回值要对齐到 `2^i`？
2. 一把大锁的分配器为什么 scalability 差？每 CPU 缓存如何解决？
3. 空闲链表和位图各适合什么场景？

**常用命令**

```bash
make run ARCH=x86_64-qemu smp=4
make test        # 如果你搭了本地测试
make submit
```

---

## L2 kmt：内核线程

官方题面：[L2.html](https://jyywiki.cn/OS/2022/labs/L2.html)

**目标**：在 L1 的基础上实现内核线程、自旋锁、信号量，并让多个处理器并行调度。

**前置知识**

- 中断/异常：`cte_init`、`os->trap`、`Context`、`ienabled`/`iset`。
- 上下文切换：保存 callee-saved 寄存器、`%rsp`、`%rip`。
- 调度：就绪队列、轮转、每 CPU 运行队列、负载均衡。
- 并发：自旋锁、信号量、等待队列、死锁。

**模块结构**

```c
MODULE(os) {
  void (*init)();
  void (*run)();
  Context *(*trap)(Event ev, Context *context);
  void (*on_irq)(int seq, int event, handler_t handler);
};

MODULE(kmt) {
  void (*init)();
  int  (*create)(task_t *task, const char *name, void (*entry)(void *arg), void *arg);
  void (*teardown)(task_t *task);
  void (*spin_init)(spinlock_t *lk, const char *name);
  void (*spin_lock)(spinlock_t *lk);
  void (*spin_unlock)(spinlock_t *lk);
  void (*sem_init)(sem_t *sem, const char *name, int value);
  void (*sem_wait)(sem_t *sem);
  void (*sem_signal)(sem_t *sem);
};
```

**关键机制**

- `os->trap(ev, ctx)`：所有中断/异常的唯一入口。保存当前线程的 `Context`，调用注册的 handler，返回下一个要恢复的 `Context`。
- `os->on_irq(seq, event, handler)`：按 `seq` 排序注册回调；`EVENT_NULL` 表示所有事件都调用。时钟中断里做调度，设备中断里做唤醒。
- `kmt->create`：分配内核栈，初始化 `Context`，把线程放到就绪队列；新线程不会立即运行。
- `kmt->spin_lock`：原子地拿锁，并且关中断；`spin_unlock` 在释放最后一个锁时恢复中断状态。
- `kmt->sem_wait`：`P` 操作；没有资源时把当前线程标记为 `BLOCKED`，`yield` 让出 CPU。`sem_signal`：`V` 操作，唤醒等待队列。
- 调度器：每个 CPU 从自己的就绪队列取线程；考虑负载均衡，避免一个 CPU 闲死、另一个排队。

**最容易崩的地方**

- **中断安全**：`kmt` 的所有函数都可能被多个 CPU 同时调用，也可能在中断里被调用。共享数据必须加锁。
- **在中断里 `sem_wait`**：中断没有线程上下文，不能睡眠；只能在中断里 `sem_signal`。
- **持锁 `yield`**：如果调度器切到另一个线程，而那个线程也要这把锁，就死锁。
- **`current` 是每 CPU 的**：不能用全局变量；每个 CPU 要知道自己当前运行谁。
- **栈溢出**：内核栈很小，别放大的局部数组；用 canary 或 guard page 检查。
- **`on_irq` 顺序**：`INT_MIN` 保存现场，`INT_MAX` 调度；顺序错了会恢复错误的上下文。
- **`create` 的 `task_t` 由调用者分配**：`teardown` 要释放栈和 `task_t` 相关资源，但不要释放调用者给的结构体本身，除非约定好。

**调试建议**

- 先单核 `smp=1` 跑通，再 `smp=2`、`smp=4`。
- 加 `assert` 检查 `sane_context`、锁的持有者、队列不变量。
- 用 QEMU 的 `-s -S` + gdb 看第一次时钟中断。
- 用 `printf` 时小心：中断里打印可能重入；用 `putch` 或加锁的 log。

**做完能回答**

1. 一次时钟中断后，`os->trap` 如何决定下一个运行的线程？
2. 自旋锁为什么必须关中断？`spin_unlock` 如何恢复中断状态？
3. 信号量的 `P` 操作在拿不到资源时，为什么要 `yield` 而不是自旋？

**常用命令**

```bash
make run ARCH=x86_64-qemu smp=4
MODULE=L2 make submit
```

---

## L3 uproc：用户态进程

官方题面：[L3.html](https://jyywiki.cn/OS/2022/labs/L3.html)

**目标**：在 L2 的基础上加页表、用户态、系统调用，实现 `fork`、`wait`、`exit`、`kill`、`mmap`、`getpid`、`sleep`、`uptime`、`kputc`。

**前置知识**

- 页表、MMU、TLB、page fault、COW。
- 用户态/内核态切换、trapframe、`int 0x80`。
- ELF 加载、位置无关代码、用户栈。
- 引用计数、地址空间复制、权限位。

**用户态 ABI**

- 系统调用号在 `%rax`。
- 参数在 `%rdi`、`%rsi`、`%rdx`、`%rcx`。
- `int $0x80` 触发系统调用。
- 返回值在 `%rax`。

注意这和 Linux x86-64 的 `syscall` 约定不同，别混。

**关键机制**

- `vme_init(pmm->alloc, pmm->free)`：初始化虚拟内存，提供页分配/回收。
- `uproc->init`：创建第一个用户进程，加载 `initcode.inc` 里的 `_init`，设置用户栈。
- `fork`：复制地址空间；必须实现 COW，否则多份 fork 会 OOM。页表项标只读，写时 page fault 再复制；页有引用计数。
- `wait`：等待直接子进程结束，取退出码；题面简化了僵尸进程语义，没有运行中的子进程就返回 -1。
- `exit`：结束当前进程，记录状态，唤醒父进程。
- `kill`：按 PID 结束进程。
- `mmap`：分配/删除映射；支持 `MAP_SHARED`、`MAP_PRIVATE`、`MAP_UNMAP`、`PROT_READ`、`PROT_WRITE`。
- 系统调用处理：从 trapframe 取参数，校验用户指针，调用对应函数，把返回值写回 `%rax`。

**最容易崩的地方**

- **用户指针没校验**：用户传一个内核地址进来，直接解引用就是灾难；用 `copyin`/`copyout` 或页表检查。
- **COW 引用计数**：连续 fork 时，页可能被多个进程共享；fork、exit、page fault 都要正确增减。
- **TLB 没刷新**：改页表后不 `sfence`/刷新 TLB，会读到旧映射。
- **系统调用全程关中断**：题面明确不允许；只在临界区关，长操作要允许中断。
- **内核栈和用户栈**：切换时别把两者搞混；trapframe 保存用户寄存器，内核栈保存内核调用帧。
- **`initcode.inc` 文件名**：OJ 会替换它，不要改文件名。
- **`mmap` 部分 unmap**：可能只删除一段映射的一部分，要拆分/合并 VMA。

**调试建议**

- 先让 `init` 跑起来，能 `kputc` 打印字符。
- 再加 `getpid`、`uptime`、`sleep`，确认系统调用往返正常。
- 然后做 `fork` + `wait` + `exit`，先不做 COW，确认逻辑；再加 COW。
- 最后做 `mmap` 和 `kill`。
- 用 gdb 看 page fault 的 `stval`/`scause`（RISC-V）或 `cr2`（x86），确认是缺页、写保护还是非法访问。

**做完能回答**

1. 用户态执行 `int 0x80` 后，CPU 如何找到内核入口？内核如何回到用户态？
2. COW fork 的引用计数在哪些路径上增减？
3. 为什么系统调用不能全程关中断？

**常用命令**

```bash
make run ARCH=x86_64-qemu smp=4
MODULE=L3 make submit
```

---

## L4 vfs：2022 没有公开题面

2022 课程主页上的 L4 链接指向 `http://localhost:5001/OS/2022/labs/L4`，官方题面没有发布；`jyywiki.cn/OS/2022/labs/L4.html` 也是 404。所以这里不能给出“官方要求”，只能给出**可替代的自学路径**。

从课程安排看，L4 的主题是 **vfs（虚拟文件系统）**，位置在第 15 讲“FAT 和 UNIX 文件系统”之后。合理推测它要求你在 L3 的进程/系统调用之上，实现一层 VFS：

- `inode` / `dentry` / `file` 对象；
- `mount` 和路径解析；
- `open` / `read` / `write` / `close` / `mkdir` / `unlink`；
- 把具体文件系统（如 FAT 或内存 FS）挂到 VFS 上。

### 自学路径

1. 读 xv6 的 `fs.c`、`file.c`、`sysfile.c`、`log.c`，理解 inode、目录项、文件描述符、路径解析。
2. 读 OSTEP 第 39 章（Files and Directories）和第 40 章（File System Implementation）。
3. 在自己的 L3 内核里加一个**内存文件系统**：
   - 用 `inode` 表示文件/目录；
   - 目录内容是 `{name, inode}` 数组；
   - 实现 `open`、`read`、`write`、`close`、`mkdir`、`unlink`；
   - 把 fd 表挂到进程结构上。
4. 再加一层 VFS 接口，把内存 FS 和 FAT 都注册成 `file_system_type`，练习 `mount` 和路径解析。
5. 用 `ls`、`cat`、`mkdir` 这类用户态程序测试。

### 做完能回答

1. VFS 如何让 `open("/mnt/a.txt")` 不关心底层是 FAT 还是 ext2？
2. inode 和 dentry 为什么要分开？
3. 路径解析中，`..` 和符号链接如何处理？

---

## 实验报告怎么写

L1–L3 的报告建议不超过 2 页，结构：

1. **设计**：数据结构、锁、关键流程（画一张图）。
2. **实现**：你做了什么取舍，为什么。
3. **Bug**：印象最深的一个 bug，怎么定位的，根因是什么。
4. **测量**（可选）：分配器的吞吐、线程切换开销、fork 的 COW 命中率。

不要贴大段代码。报告是给助教看“你有没有理解”，不是代码备份。

## 通用调试清单

- **先单核，再多核**：`smp=1` 通过再 `smp=2`/`smp=4`。
- **先关中断，再开中断**：确认单线程逻辑正确，再处理并发。
- **断言比 printf 好**：把不变量写成 `assert`，让错误尽早暴露。
- **QEMU + gdb**：`-s -S`，`target remote :1234`，看第一条指令、第一次中断。
- **QEMU monitor**：`info registers`、`info mem`、`info tlb`，看 CPU 状态。
- **不要相信“偶尔能跑”**：并发 bug 只会在压力下暴露；写测试，反复跑。
- **不要抄代码**：课程明确要求独立完成；抄来的代码在 hard test 下一定会露馅。

## 时间安排

| 阶段 | 实验 | 建议投入 |
| --- | --- | --- |
| 第 1–2 周 | L0 | 1–2 天，熟悉 AM 和 QEMU |
| 第 3–5 周 | L1 | 1 周，先正确再优化 |
| 第 6–8 周 | L2 | 2 周，中断和并发的门槛 |
| 第 9–12 周 | L3 | 2–3 周，页表和系统调用 |
| 第 13–15 周 | L4 / M5 | 1–2 周，文件系统 |

L2 和 L3 是分水岭。如果 L2 的同步没做对，L3 会出现“用户态程序随机崩”的现象，先回去补 L2。

---

上一篇：[Mini Labs](minilabs.md) · 下一篇：[阅读材料](reading.md) →
