---
title: 前置知识：两周补到能开工
description: 给准备跟 2022 南大 OS 课的人：C、x86-64、裸机、工具链、并发、OS 概念的“最小可用”补课表。
date: 2026-11-10
---

# 前置知识：两周补到能开工

> jyy 在[课程概述](https://jyywiki.cn/OS/OS_Overview.html)里写得很直接：这门课假设你已经会 C（能写、能测、能调中等规模代码），并且熟悉至少一个指令集（应用指令和系统指令）。这两条是“严格”的，不是客套话。

这份补课材料不追求把计算机系统学完，只追求一件事：**打开 slides 和 lab 时，不会因为语言、汇编或工具链而卡住**。每节都有“最小必会”“快速补课”“自测”，最后有一个 14 天、每天 2 小时的安排。

## 0. 先做十道诊断

不用查资料，能用自己的话答出来就算过。

| # | 问题 | 答不上来读 |
| --- | --- | --- |
| 1 | `int *p = malloc(4 * sizeof(int)); p[10] = 0;` 为什么可能不崩溃？错在哪？ | [1. C 语言](#1-c-语言能写能测能调) |
| 2 | `struct { char c; int x; }` 为什么通常不是 5 字节？`packed` 改变了什么？ | [1. C 语言](#1-c-语言能写能测能调) |
| 3 | 写一个函数指针，指向“接受两个 `int`、返回 `int`”的函数。 | [1. C 语言](#1-c-语言能写能测能调) |
| 4 | `static` 在全局变量、局部变量、函数前分别是什么含义？ | [1. C 语言](#1-c-语言能写能测能调) |
| 5 | x86-64 下 `foo(a,b,c,d,e,f,g)` 的第七个参数在哪？返回值在哪？ | [2. x86-64](#2-x86-64看懂编译器在干什么) |
| 6 | `call` 和 `ret` 各让 `%rsp` 怎么变？函数入口处 `%rsp` 对 16 取模是多少？ | [2. x86-64](#2-x86-64看懂编译器在干什么) |
| 7 | 用户态执行 `syscall` 后，CPU 怎么找到内核入口？ | [3. 计算机组成](#3-计算机组成os-到底控制什么) |
| 8 | `fork()` 为什么返回两次？父子进程共享哪些东西？ | [6. OS 概念](#6-操作系统基础概念) |
| 9 | 两个线程各执行 100 万次 `sum++`，最后为什么可能小于 200 万？ | [5. 并发](#5-并发这门课的分水岭) |
| 10 | 页表、TLB、page fault 三者在一次内存访问里分别做什么？ | [3. 计算机组成](#3-计算机组成os-到底控制什么) |

能答出 7 道以上，可以直接从[讲义导读](lectures.md)开始；否则按下面的顺序补。不要跳汇编和并发，它们是 M2、L1、L2 的地基。

## 1. C 语言：能写、能测、能调

操作系统就是一个 C 程序。这门课不考 C 语法，但默认你能用 C 表达数据结构、管理内存、读手册、用调试器。jyy 的原话是“唯一要求就是会使用 C 语言编程，还有能读懂手册”。

### 1.1 最小必会清单

- [ ] 指针、数组、指针算术；知道数组名什么时候退化成指针。
- [ ] `struct` / `union` / `enum`，内存布局、padding、`offsetof`。
- [ ] 函数指针、回调、用结构体模拟“模块”和“虚函数表”。
- [ ] `static` / `extern` / 头文件保护；声明与定义的区别。
- [ ] 宏：`#`、`##`、`do { ... } while (0)`、X-macro。
- [ ] `malloc` / `free`，所有权、double free、use-after-free、内存泄漏。
- [ ] `stdarg.h`：`va_list`、`va_start`、`va_arg`、`va_end`。
- [ ] `setjmp` / `longjmp` 的语义和限制。
- [ ] 常见 undefined behavior（UB），以及为什么 UB 不能靠“在我机器上能跑”来判断。
- [ ] 编译和链接：`.c` → `.o` → 可执行文件 / 共享库。

### 1.2 四个必须能默写的片段

**（1）用函数指针做模块**

```c
struct file_ops {
  int (*open)(const char *path, int flags);
  ssize_t (*read)(int fd, void *buf, size_t n);
  ssize_t (*write)(int fd, const void *buf, size_t n);
  int (*close)(int fd);
};

static int my_open(const char *path, int flags) { /* ... */ return 0; }

struct file_ops ops = {
  .open = my_open,
  .read = NULL,
  .write = NULL,
  .close = NULL,
};
```

L1 的 `MODULE(pmm)`、L2 的 `MODULE(kmt)` 都是这个套路：结构体里放一组函数指针，调用者只依赖接口。

**（2）`container_of`**

```c
#define container_of(ptr, type, member) \
  ((type *)((char *)(ptr) - offsetof(type, member)))
```

Linux 内核的链表、xv6 的一些结构都用“把链表节点嵌进对象”的方式。指针指回外层对象，靠的就是偏移量。

**（3）可变参数**

```c
#include <stdarg.h>

int sum(int n, ...) {
  va_list ap;
  va_start(ap, n);
  int s = 0;
  for (int i = 0; i < n; i++) s += va_arg(ap, int);
  va_end(ap);
  return s;
}
```

L0 的 `klib` 里要实现 `printf`，绕不开这套机制。注意：`va_arg` 的类型必须和传入的实参类型兼容，否则是 UB。

**（4）`setjmp` / `longjmp`**

```c
#include <setjmp.h>
#include <stdio.h>

jmp_buf buf;

void f(void) {
  printf("before longjmp\n");
  longjmp(buf, 42);
  printf("never printed\n");
}

int main(void) {
  int r = setjmp(buf);
  if (r == 0) {
    f();
  } else {
    printf("back, r = %d\n", r);
  }
  return 0;
}
```

`setjmp` 保存当前的寄存器现场（包括栈指针和返回地址），`longjmp` 恢复它，于是 `setjmp` 看起来“返回了两次”。M2 的协程库就建立在这个机制上。

两个容易踩的限制：

- `setjmp` 所在的函数返回之后，再 `longjmp` 回去是 UB。
- 在 `setjmp` 和 `longjmp` 之间被修改、且不是 `volatile` 的局部变量，`longjmp` 之后的值是不确定的。

### 1.3 常见坑

| 坑 | 现象 | 正确做法 |
| --- | --- | --- |
| 越界写 | 有时不崩，有时改坏别的变量 | 所有下标检查边界；用 ASan 跑测试 |
| 返回局部数组 | 调用后内容随机 | 用 `malloc`，或由调用者传缓冲区 |
| `sizeof(ptr)` 当数组长度 | 64 位下永远是 8 | 数组长度用 `sizeof(a) / sizeof(a[0])`，或另传长度 |
| 字符串字面量可写 | `char *p = "abc"; p[0] = 'x';` 可能崩 | 用 `const char *`；要改写用 `char p[] = "abc"` |
| `malloc` 不检查 | 空指针解引用 | `if (!p) { ... }` |
| `free` 后继续用 | 偶发、难查 | 置空指针；ASan / valgrind |
| `memcpy` 重叠 | 结果错 | 用 `memmove` |
| 有符号溢出 | UB，优化后行为诡异 | 用无符号，或先检查 |
| 头文件里定义变量 | 多重定义 | 头文件只放 `extern` 声明，定义放 `.c` |
| 打印 `size_t` 用 `%d` | 64 位下截断 | 用 `%zu` |

### 1.4 练习

1. 写一个 `list.h`，提供 `list_init` / `list_add` / `list_del` / `list_for_each`，用 `container_of` 从节点取回外层结构。
2. 用 `stdarg` 实现 `myprintf`，至少支持 `%d`、`%s`、`%x`、`%p`、`%%`。
3. 写一个会越界写的程序，分别用 `-fsanitize=address` 和普通编译跑，观察差异。
4. 跑一遍 `man 3 malloc`，能说清 `malloc(0)`、`realloc(p, 0)` 的行为。

## 2. x86-64：看懂编译器在干什么

M2 要切换栈和寄存器，L2 要保存中断现场，L3 要做系统调用。你不需要会写大型汇编，但必须能看懂函数序言、调用约定和几条关键指令。

### 2.1 寄存器

| 寄存器 | 常见用途 | 调用时谁负责保存 |
| --- | --- | --- |
| `%rax` | 返回值、系统调用号 | caller |
| `%rdi` `%rsi` `%rdx` `%rcx` `%r8` `%r9` | 第 1–6 个参数 | caller |
| `%r10` `%r11` | 临时寄存器；`syscall` 会破坏 `%rcx`、`%r11` | caller |
| `%rbx` `%rbp` `%r12`–`%r15` | 被调用者保存的变量 | callee |
| `%rsp` | 栈指针 | callee 必须恢复 |
| `%rip` | 下一条指令地址 | 由 `call` / `ret` 维护 |
| `%rflags` | 条件码、中断标志 `IF` | 由硬件和内核维护 |

“caller-saved” 的意思是：函数调用后这些寄存器的值可能变，调用者如果还要用，得自己先存起来。“callee-saved” 的意思是：被调用函数如果用到了，必须在返回前恢复原值。

### 2.2 函数调用与栈

```c
long add(long a, long b) {
  return a + b;
}
```

编译后大致是：

```asm
add:
    lea (%rdi,%rsi), %rax   # rax = rdi + rsi
    ret
```

参数在 `%rdi`、`%rsi`，返回值在 `%rax`。没有栈帧，因为不需要。

带局部变量的函数通常有：

```asm
foo:
    push %rbp
    mov  %rsp, %rbp
    sub  $16, %rsp      # 局部变量
    ...
    leave               # mov %rbp, %rsp; pop %rbp
    ret
```

`call` 会把返回地址压栈，然后跳转；`ret` 弹出返回地址并跳回去。所以：

- 调用前，`%rsp` 必须 16 字节对齐（System V ABI 的要求）。
- `call` 压入 8 字节返回地址，因此函数入口处 `%rsp % 16 == 8`。
- 编译器会在序言里再调整，保证调用其他函数前又对齐到 16。

M2 里那个“神秘的 Segmentation Fault，崩在 `movaps`”就是栈没对齐。SSE 指令要求 16 字节对齐，`movaps` 不对齐会直接异常。

### 2.3 系统调用

Linux x86-64 的 `syscall` 约定：

- 系统调用号放 `%rax`。
- 参数依次放 `%rdi`、`%rsi`、`%rdx`、`%r10`、`%r8`、`%r9`。
- 返回值放 `%rax`。
- `syscall` 会破坏 `%rcx` 和 `%r11`。

```asm
# write(1, msg, 6)
mov $1, %rax        # SYS_write
mov $1, %rdi        # fd = stdout
lea msg(%rip), %rsi # buf
mov $6, %rdx        # count
syscall
```

注意：课程 L3 自定义的用户态 ABI 用的是 `int $0x80`，编号在 `%rax`，参数在 `%rdi`、`%rsi`、`%rdx`、`%rcx`，返回值在 `%rax`。这和 Linux 64 位 `syscall` 的寄存器约定**不一样**，读 L3 代码时不要混。

### 2.4 内联汇编与上下文切换

M2 参考代码里有一个切换栈并跳转的函数：

```c
static inline void stack_switch_call(void *sp, void *entry, uintptr_t arg) {
  asm volatile (
#if __x86_64__
    "movq %0, %%rsp; movq %2, %%rdi; jmp *%1"
      : : "b"((uintptr_t)sp), "d"(entry), "a"(arg) : "memory"
#else
    "movl %0, %%esp; movl %2, 4(%0); jmp *%1"
      : : "b"((uintptr_t)sp - 8), "d"(entry), "a"(arg) : "memory"
#endif
  );
}
```

几个要点：

- `asm volatile` 告诉编译器不要删掉或移动这段代码。
- `"memory"` clobber 告诉编译器内存可能被修改，不要缓存变量。
- 这段代码直接把 `%rsp` 换成新协程的栈，然后 `jmp` 到入口，不创建新的调用帧。
- 新栈的布局要满足 ABI：入口函数看到的栈对齐、返回地址等都要准备好。

### 2.5 练习

1. 写一个递归函数，`objdump -d` 看它的序言和 `sub $..., %rsp`，画出每一层栈帧。
2. 用汇编实现 `long add(long, long)`，在 C 里声明并调用。
3. 用 `gdb` 跑起来，`stepi` 单步，`info registers` 看寄存器，`x/8gx $rsp` 看栈。
4. 解释：为什么 `call` 之前要 16 字节对齐？函数入口为什么是“对 16 余 8”？

## 3. 计算机组成：OS 到底控制什么

操作系统不是魔法，它只是拿到了硬件提供的几张“底牌”：特权级、中断、页表、I/O。你不需要会设计 CPU，但要知道这些机制的存在。

### 3.1 启动链

一台机器上电后大致经历：

```text
CPU Reset → Firmware (BIOS/UEFI) → Bootloader → Kernel _start() → init 进程
```

- CPU 复位后从固定地址取第一条指令（x86 是 reset vector，RISC-V 是 mask ROM）。
- Firmware 初始化内存、枚举设备，找到可启动介质。
- Bootloader 把内核镜像读到内存，跳到内核入口。
- 内核初始化页表、中断、设备，最后加载第一个用户态程序。

L0 的 `amgame` 就是跳过前面所有步骤，直接跑在 AbstractMachine 提供的“裸机”环境里。

### 3.2 三种 I/O 和两种通知

| 方式 | 谁发起 | 典型场景 |
| --- | --- | --- |
| MMIO | CPU 读写某个物理地址 | 设备寄存器映射到内存地址空间 |
| Port I/O | x86 的 `in` / `out` 指令 | 老式设备、部分控制器 |
| DMA | 设备直接读写内存 | 磁盘、网卡批量传输 |

设备完成后通知 CPU 的方式：

- **轮询**：CPU 反复读状态寄存器。简单，但浪费。
- **中断**：设备拉高中断线，CPU 暂停当前执行，跳到中断处理程序。

操作系统要处理的中断至少有时钟（用于抢占）、键盘、磁盘、网络。时钟中断是“死循环不能卡死计算机”的硬件基础。

### 3.3 特权级与系统调用

CPU 至少有两种模式：

- **用户态**：不能执行特权指令，不能直接访问页表、设备寄存器。
- **内核态**：可以执行所有指令，访问所有物理内存。

用户态想读文件、创建进程，必须通过**系统调用**“陷入”内核：

```text
用户程序 → syscall / int 0x80 → 保存现场 → 内核处理 → 恢复现场 → 返回用户态
```

“保存现场”的那块数据结构，xv6 叫 `trapframe`，L2 叫 `Context`，L3 要在上面再加用户页表。

### 3.4 虚拟内存硬件

- **页表**：把虚拟地址翻译成物理地址。x86-64 通常是 4 级页表，4 KiB 页；RISC-V Sv39 是 3 级。
- **MMU**：做翻译的硬件。页表基址放在 `%cr3`（x86）或 `satp`（RISC-V）。
- **TLB**：页表项的缓存。切换页表要刷新或打标签，否则会读到旧的映射。
- **page fault**：页表项不存在、权限不对、页不在内存，都会触发异常，交给内核处理。

操作系统利用这套机制实现：

- 隔离：每个进程有自己的页表，看不到别人的内存。
- 按需分配：先不映射，访问时 page fault 再分配。
- COW：fork 时父子共享只读页，写时复制。
- `mmap`：把文件或设备映射进地址空间。

### 3.5 AbstractMachine 的五组 API

2022 课程的所有 OS Lab 都跑在 [AbstractMachine](https://jyywiki.cn/OS/AbstractMachine/index.html) 上。它把裸机能力收成五组 API，正好对应你要实现的东西：

| 组 | API | 作用 | 相关实验 |
| --- | --- | --- | --- |
| TRM | `putch`、`halt` | 最小运行环境：输出字符、停机 | L0 |
| IOE | `ioe_read`、`ioe_write` | 读写 I/O 寄存器（键盘、屏幕、磁盘） | L0、L2 |
| CTE | `ienabled`、`iset`、`yield`、`kcontext` | 中断、异常、上下文切换 | L2、L3 |
| VME | `protect`、`unprotect`、`map`、`ucontext` | 虚拟内存、用户态 | L3 |
| MPE | `cpu_count`、`cpu_current`、`atomic_xchg` | 多处理器、原子操作 | L1、L2 |

做 L0 之前，至少把 TRM 和 IOE 的文档扫一遍；做 L1 之前看 MPE；做 L2 之前看 CTE；做 L3 之前看 VME。

### 3.6 练习

1. 读 AbstractMachine 的简介和 TRM 规约，能说出 `putch` 和 `halt` 的形式语义。
2. 在 L0 的框架里 `make run`，然后用 QEMU 的 `-s -S` 和 gdb 连上去，看第一条指令。
3. 用 `strace` 跑一个 `cat`，找出它调用了哪些系统调用。
4. 解释：为什么“用户态死循环”不会让整台机器无响应？

## 4. Linux 工具链：手要快

这门课的实验量不小，工具熟练度直接决定你是“在调 OS”还是“在调环境”。

### 4.1 命令行最小集

| 命令 | 用途 | 本课中的例子 |
| --- | --- | --- |
| `man` / `tldr` | 查手册 | `man 2 fork`、`man 5 proc` |
| `grep -r` | 搜内容 | `grep -r "kalloc" src/` |
| `find` | 找文件 | `find . -name '*.c'` |
| `xargs` | 拼命令 | `find . -name '*.c' \| xargs grep foo` |
| `sed` / `awk` | 文本处理 | 从 `strace` 输出里提取时间 |
| `sort` / `uniq -c` | 统计 | 统计系统调用出现次数 |
| `head` / `tail` / `less` | 看大文件 | 看 qemu 日志 |
| `file` | 识别文件类型 | `file kernel-x86_64-qemu.elf` |
| `xxd` | 看二进制 | 看 FAT32 镜像、BMP 头 |
| `strace` | 看系统调用 | `strace -f -T ./a.out` |
| `lsof` | 看打开的文件 | `lsof -p PID` |
| `ps` / `top` | 看进程 | 找 qemu 进程 |
| `nm` / `readelf` / `objdump` | 看 ELF | 找符号、反汇编 |
| `gdb` | 调试 | 调 M2、L2、L3 |
| `make` | 构建 | `make run ARCH=x86_64-qemu smp=4` |
| `git` | 版本管理 | `git pull origin M1` |

### 4.2 编译与链接

```bash
gcc -E main.c -o main.i      # 预处理
gcc -S main.c -o main.s      # 生成汇编
gcc -c main.c -o main.o      # 生成目标文件
gcc main.o -o main           # 链接

gcc -fPIC -shared co.c -o libco.so   # 共享库
gcc -I.. -L.. -m64 main.c -o test -lco-64
LD_LIBRARY_PATH=.. ./test             # 运行时找共享库
```

常用检查命令：

```bash
readelf -h a.out      # ELF 头：入口地址、类型
readelf -S a.out      # 节表：.text、.data、.bss
readelf -l a.out      # 段表：加载到内存的布局
readelf -s a.out      # 符号表
objdump -d a.out      # 反汇编
objdump -r a.out      # 重定位
nm a.out              # 符号地址
```

M4 的 crepl 会反复走“写临时 `.c` → `gcc -shared` → `dlopen` → `dlsym`”这条链路，这些命令要熟。

### 4.3 Make

```make
CC      := gcc
CFLAGS  := -Wall -Wextra -g -m64
TARGET  := app
OBJS    := main.o util.o

$(TARGET): $(OBJS)
	$(CC) $^ -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

.PHONY: clean test
clean:
	rm -f $(OBJS) $(TARGET)

test: $(TARGET)
	./$(TARGET)
```

- `$@` 目标名，`$<` 第一个依赖，`$^` 所有依赖。
- `make -n` 只打印命令，不执行；`make -j8` 并行。
- 课程 Makefile 里有很多 `-D`、`-I`、`-mno-sse`，看不懂就 `make -n` 把命令展开。

### 4.4 gdb

| 命令 | 作用 |
| --- | --- |
| `file ./a.out` | 加载可执行文件 |
| `run` / `r` | 运行 |
| `break foo` / `b *0x400000` | 断点 |
| `next` / `n` | 下一行（不进入函数） |
| `step` / `s` | 下一行（进入函数） |
| `stepi` / `si` | 下一条指令 |
| `info registers` | 看寄存器 |
| `x/10i $rip` | 看当前指令附近 |
| `x/8gx $rsp` | 看栈 |
| `bt` | 调用栈 |
| `watch x` | 监视变量 |
| `layout src` / `layout asm` | TUI 布局 |
| `target remote :1234` | 连 QEMU 的 gdb stub |

QEMU 调试：

```bash
make run ARCH=x86_64-qemu QEMUOPTS="-s -S"
gdb build/kernel-x86_64-qemu.elf
(gdb) target remote :1234
(gdb) b _start
(gdb) c
```

### 4.5 git

每个 lab 是一个分支：

```bash
git pull origin M1     # 拉取 M1 框架
git status
git diff
git add -A
git commit -m "M1: ..."
```

不要在 `main` 上直接改实验代码；先确认当前分支，避免把上一个 lab 的修改带进来。

### 4.6 练习

1. 把一个多文件 C 项目写成 Makefile，支持 `make`、`make clean`、`make test`。
2. 编译一个共享库，用 `LD_LIBRARY_PATH` 让另一个程序加载它。
3. 用 `strace -T` 跑 `ls`，找出耗时最长的三个系统调用。
4. 用 gdb 的 `watch` 找一个“变量莫名其妙被改”的 bug。

## 5. 并发：这门课的分水岭

并发是 2022 课程最先讲、也最容易把人劝退的部分。好消息是：你不需要成为并发理论专家，只需要建立正确的直觉，并且**不写自己控制不了的代码**。

### 5.1 最小模型

一个线程拥有：

- 独立的 PC、寄存器、栈。
- 共享的代码、全局变量、堆、打开的文件描述符。

所以“线程 = 人，共享内存 = 物理世界”这个比喻很贴切：每个人有自己的大脑和手头工作，但都能看见并修改同一个世界。

### 5.2 三个必须理解的词

| 词 | 含义 | 反例 |
| --- | --- | --- |
| 原子性 | 一组操作要么全做，要么全不做 | `sum++` 实际是 load-add-store，可能交错 |
| 可见性 | 一个线程的写，另一个线程何时能看见 | 编译器把变量缓存在寄存器；CPU 乱序 |
| 顺序 | 不同内存操作的先后关系 | 没加 barrier 时，编译器和 CPU 都可能重排 |

`volatile` 只能阻止编译器把变量优化进寄存器，**不能**保证原子性，也**不能**阻止 CPU 重排。不要用它当锁。

### 5.3 自旋锁、互斥锁、信号量

自旋锁的最小实现：

```c
typedef struct {
  int locked;
} spinlock_t;

void spin_lock(spinlock_t *lk) {
  while (atomic_xchg(&lk->locked, 1)) {
    // 自旋
  }
}

void spin_unlock(spinlock_t *lk) {
  atomic_xchg(&lk->locked, 0);
}
```

在内核里，`spin_lock` 还要关中断：否则同一个 CPU 上，中断处理程序可能在你持有锁时运行，然后尝试拿同一把锁，直接死锁。

互斥锁在自旋锁之上加一个等待队列：拿不到锁就把当前线程标记为 `BLOCKED`，让出 CPU；释放时唤醒队首。信号量把 `locked` 从 0/1 扩展成计数器：

```text
P(sem): while (sem->count <= 0) wait; sem->count--;
V(sem): sem->count++; wake_one();
```

条件变量则是“在锁的保护下等待某个条件成立”，必须配 `while` 循环，防止虚假唤醒。

### 5.4 常见并发 bug

- **check-then-act**：先判断再操作，中间被别人插队。
- **lost wakeup**：唤醒发生在等待之前，线程永远睡下去。
- **deadlock**：互相持有对方需要的锁；按固定顺序加锁通常能避免。
- **持有锁时 `yield`**：可能把锁带进调度器，造成死锁。
- **数据竞争**：两个线程无同步地访问同一内存，至少一个是写。
- **伪共享**：两个 CPU 改同一缓存行的不同变量，性能骤降。

### 5.5 练习

1. 用 pthread 写两个线程各加 100 万次，先不加锁跑 20 次，记录最小值；再加锁跑。
2. 用信号量实现生产者–消费者，缓冲区大小为 5，跑 `smp=1` 和 `smp=4`。
3. 用 `-fsanitize=thread` 跑上面的程序，看 ThreadSanitizer 报什么。
4. 画 Peterson 算法的状态机，或者用课程里的 model checker 跑一遍。

## 6. 操作系统基础概念

这部分不需要提前学得很深，但至少要知道每个词指什么，否则第 1 讲就会迷路。

### 6.1 对象与 API

操作系统给应用提供的，主要就是一组对象和操作它们的 API：

| 对象 | API | 作用 |
| --- | --- | --- |
| 进程 | `fork`、`execve`、`wait`、`exit` | 创建、替换、回收执行流 |
| 线程 | `pthread_create`、`pthread_join` | 共享地址空间的执行流 |
| 地址空间 | `mmap`、`munmap`、`mprotect` | 映射内存、改权限 |
| 文件 | `open`、`read`、`write`、`close`、`lseek` | 持久字节序列 |
| 目录 | `mkdir`、`rmdir`、`opendir`、`readdir` | 文件的索引 |
| 管道 | `pipe`、`dup2` | 进程间字节流 |
| 设备 | `ioctl`、`mmap` | 设备控制、寄存器映射 |

“一切皆文件”不是哲学口号，而是说：很多对象都能用 `open/read/write/close` 这套统一的 API 来操作，代价是有些语义要靠 `ioctl` 补。

### 6.2 系统调用

用户态和内核态之间只有几条合法的门：

- `syscall`（x86-64 Linux）
- `int 0x80`（32 位，以及课程 L3 的自定义 ABI）
- 异常（page fault、除零、非法指令）
- 中断（时钟、设备）

系统调用不是普通函数调用：它要切换特权级、切换栈、保存现场，开销远大于函数调用。所以 libc 会做缓冲，`printf` 不是每打一个字符就调一次 `write`。

### 6.3 进程与地址空间

- **进程** = 拥有独立地址空间的线程 + 一堆内核对象（文件描述符、信号、页表）。
- **`fork()`**：复制当前进程的状态机。父子进程的返回值不同（父得子 PID，子得 0），地址空间用 COW 共享，文件描述符表被复制但指向同一个打开文件描述。
- **`execve()`**：用新程序替换当前地址空间，PID 不变，打开的文件描述符默认保留。
- **`wait()`**：回收子进程，取退出码；不回收会留下僵尸进程。

### 6.4 虚拟内存

一次内存访问的简化流程：

```text
虚拟地址 → 查 TLB → 命中则得到物理地址
                 → 未命中则查页表 → 命中则填 TLB
                 → 页表项无效/权限错 → page fault → 内核处理
```

内核处理 page fault 的常见策略：

- 页不在内存：从磁盘换入。
- 页未分配：分配零页，按需映射。
- 写只读页：如果是 COW，复制一份再改为可写。
- 非法访问：给进程发 `SIGSEGV`。

### 6.5 文件系统

- **inode**：文件的元数据（大小、权限、数据块位置），不包含文件名。
- **目录项（dentry）**：文件名到 inode 的映射。
- **文件描述符**：进程打开文件表里的下标，指向“打开文件描述”（含偏移量和权限）。
- **块设备**：按固定大小块读写的设备，文件系统建在它上面。
- **日志**：先把“要做的修改”写到日志区，再提交，崩溃后可以重放或回滚。

### 6.6 练习

1. 写一个迷你 shell：读一行，`fork` + `execvp`，父进程 `wait`。
2. 用 `strace` 跟踪这个 shell 执行 `ls`，找出 `fork`、`execve`、`wait4`。
3. 读 `/proc/self/maps`，找到代码段、堆、栈、动态库的地址范围。
4. 用 `read` / `write` 实现 `cp`，不要用 `fopen` / `fread`。

## 7. 14 天补课表

每天 2 小时，按顺序做。输出物比“看过”重要。

| 天 | 任务 | 输出 / 自检 |
| --- | --- | --- |
| 1 | C 指针、数组、结构体、函数指针 | 写出 `list.h`，能解释 `container_of` |
| 2 | 宏、`stdarg`、`setjmp/longjmp`、UB | 实现 `myprintf`；跑通 setjmp 例子 |
| 3 | x86-64 寄存器、调用约定、栈帧 | `objdump` 一个递归函数，画出栈 |
| 4 | 汇编练习、内联汇编、系统调用 | 用汇编写 `add`；用 `syscall` 打印一行 |
| 5 | Linux 命令行、grep/find/xargs/strace | 用一行命令统计 `strace` 里的 top 3 |
| 6 | gcc 编译链接、共享库、readelf/objdump | 编译并运行一个 `.so`，用 `LD_LIBRARY_PATH` 加载 |
| 7 | Make、git、gdb | 给多文件项目写 Makefile；用 gdb 抓一个越界 |
| 8 | 进程、fork/exec/wait、文件描述符 | 写迷你 shell；用 `strace` 验证 |
| 9 | 虚拟内存、mmap、page fault、COW | 读 `/proc/self/maps`；写一个 mmap 读写文件的程序 |
| 10 | 线程、原子性、锁、信号量 | 写生产者–消费者；跑 TSan |
| 11 | 死锁、条件变量、内存顺序 | 造一个死锁并用 gdb 看；用 condvar 重写队列 |
| 12 | AbstractMachine、TRM/IOE、QEMU | 跑通 L0 的 `make run`；用 gdb 连 QEMU |
| 13 | CTE/MPE/VME 概念、xv6 启动 | 读 xv6 第 1–2 章；说清 trap 流程 |
| 14 | 总复习 + 前置诊断 10 题 | 10 题能答 8 题；开始第 1 讲 |

如果只有一周，优先做第 1、2、3、4、6、7、8、10 天。第 5、9、11、12、13 天可以边做实验边补。

## 8. 什么时候算“补够了”

满足下面大部分，就可以开始：

- 能独立写出一个 200 行左右的 C 程序，并用 gdb 找到其中的越界/悬垂指针。
- 能看懂 `objdump -d` 的函数序言，说清参数、返回值和栈帧。
- 能用 `fork` / `execve` / `wait` / `pipe` 写一个支持管道的迷你 shell。
- 能解释自旋锁为什么需要原子指令，为什么内核里还要关中断。
- 能说清一次 page fault 从触发到返回用户态的流程。
- 遇到陌生 API，第一反应是 `man`，而不是搜索引擎。

不满足也没关系。jyy 的[生存指南](https://jyywiki.cn/OS/OS_Guide.html)说得很清楚：Don't Panic。这门课的唯一硬要求是“会使用 C 语言编程，还有能读懂手册”，其余都可以在做的过程中补。

## 9. 参考资源

- Brian W. Kernighan, Dennis M. Ritchie. *The C Programming Language*.
- Randal E. Bryant, David R. O'Hallaron. *Computer Systems: A Programmer's Perspective*.
- Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau. [*Operating Systems: Three Easy Pieces*](https://pages.cs.wisc.edu/~remzi/OSTEP/).
- [xv6: a simple, Unix-like teaching operating system](https://pdos.csail.mit.edu/6.828/2022/xv6/book-riscv-rev3.pdf).
- [AbstractMachine 文档](https://jyywiki.cn/OS/AbstractMachine/index.html).
- [System V ABI: AMD64 Architecture Processor Supplement](https://gitlab.com/x86-psABIs/x86-64-ABI).
- [The Linux man-pages project](https://www.kernel.org/doc/man-pages/).
- [The Art of Command Line](https://github.com/jlevy/the-art-of-command-line).

---

上一篇：[课程总览](index.md) · 下一篇：[32 讲导读](lectures.md) →
