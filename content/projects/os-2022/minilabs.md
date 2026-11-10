---
title: Mini Labs：M1–M5 导读
description: 2022 OS 的五个应用程序视角实验：pstree、libco、sperf、crepl、frecov。每个实验的目标、前置、关键 API 和常见坑。
date: 2026-11-10
---

# Mini Labs：M1–M5 导读

> Mini Labs 是“应用程序视角”的实验：不写内核，只用操作系统提供的 API 做五件有点“黑科技”的事。它们贯穿整个学期，从进程、并发一直走到文件系统，目的是让你真正理解“操作系统是一组对象 + API”。

五个实验的官方题面都在 jyywiki 上，这里不复制题面，只给导读、前置知识和排坑清单。做之前先读[前置知识](prerequisites.md)，尤其是 C、Linux 工具链和并发。

## 总览

| 实验 | 一句话 | 主要前置 | 关键 API | Soft deadline |
| --- | --- | --- | --- | --- |
| [M1 pstree](https://jyywiki.cn/OS/2022/labs/M1.html) | 读 `/proc`，打印进程树 | C、目录 API、递归 | `opendir` / `readdir` / `fopen` | 2022-03-06 |
| [M2 libco](https://jyywiki.cn/OS/2022/labs/M2.html) | 用 `setjmp/longjmp` 实现协程 | 汇编、ABI、栈 | `setjmp` / `longjmp` / 内联汇编 | 2022-03-20 |
| [M3 sperf](https://jyywiki.cn/OS/2022/labs/M3.html) | `fork/execve/pipe` + 解析 `strace` | 进程、管道、`PATH` | `fork` / `execve` / `pipe` / `dup2` | 2022-04-17 |
| [M4 crepl](https://jyywiki.cn/OS/2022/labs/M4.html) | 把一行 C 编译成 `.so` 再加载 | 编译、链接、动态加载 | `mkstemp` / `dlopen` / `dlsym` | 2022-05-08 |
| [M5 frecov](https://jyywiki.cn/OS/2022/labs/M5.html) | 从格式化过的 FAT32 镜像恢复 BMP | FAT、`mmap`、二进制解析 | `mmap` / `popen` / `sha1sum` | 2022-06-12 |

每个实验都先用 `git pull origin Mx` 拉框架代码。不要直接在 `main` 上改，确认当前分支。

---

## M1 pstree：打印进程树

官方题面：[M1.html](https://jyywiki.cn/OS/2022/labs/M1.html)

**目标**：实现 `pstree [-p] [-n] [-V]`，读取系统中的进程，按父子关系打印成树。

**前置知识**

- C 的 `DIR *`、`struct dirent`、`readdir`、`closedir`。
- `/proc` 是 procfs：每个进程一个以 PID 命名的目录。
- `/proc/[pid]/stat` 或 `/proc/[pid]/status` 的字段格式。
- 递归/迭代建树，命令行参数解析。

**关键思路**

1. 遍历 `/proc`，只取名字全是数字的目录，得到 PID 列表。
2. 对每个 PID 读 `/proc/[pid]/stat` 或 `status`，拿到 `comm` 和 `ppid`。
3. 建一个 `pid -> node` 的表，再按 `ppid` 挂到父节点下；`ppid == 0` 的是根。
4. `-n` 时对每个节点的直接孩子按 PID 排序；`-p` 时在名字后打印 PID。
5. 递归打印，用缩进或 `├─`/`└─` 连接线都可以；题面允许任意树形。

**容易踩的坑**

- **进程会消失**：读完目录后进程可能已经退出，`open` 返回 `ENOENT`，要跳过而不是崩溃。
- **PID 会复用**：扫描过程中一个 PID 可能被新进程复用，读到不一致的信息是正常的，尽量容忍。
- **`comm` 里有空格和括号**：`/proc/[pid]/stat` 的第二个字段用括号包起来，里面可能有空格，找最后一个 `)` 再切。
- **`-V` 的输出流**：题面专门提示 `pstree -V > /dev/null` 仍能看到输出，说明系统 `pstree` 把版本信息写到了 `stderr`。你的 `-V` 也应写到 `stderr`，不要写到 `stdout`。
- **32/64 位**：OJ 会同时测 32-bit 和 64-bit，PID 用 `pid_t`，不要假设 `long` 和指针同宽。
- **返回值**：`main` 返回非 0 会被判 Runtime Error。

**做完能回答**

1. 为什么 `ps`、`top`、`pstree` 都能从 `/proc` 拿到进程信息？
2. 如果进程在扫描过程中退出，你的程序会怎样？
3. 为什么“一切皆文件”能让 `pstree` 只用普通文件 API 就实现？

**自测命令**

```bash
strace -e openat ./pstree-64 | head
./pstree-64 -p -n | head
./pstree-64 -V > /dev/null
```

---

## M2 libco：协程库

官方题面：[M2.html](https://jyywiki.cn/OS/2022/labs/M2.html)

**目标**：在用户态实现 `co_start` / `co_yield` / `co_wait`，用一个进程模拟多个共享内存的执行流。

**前置知识**

- x86-64 调用约定：参数寄存器、callee-saved 寄存器、栈对齐。
- `setjmp` / `longjmp` 保存和恢复寄存器现场。
- 共享库的编译和加载：`-fPIC -shared`、`LD_LIBRARY_PATH`。
- 栈的布局：栈从高地址向低地址生长，栈顶是 `%rsp`。

**核心机制**

每个协程需要三样东西：

```c
struct co {
  char *name;
  void (*func)(void *);
  void *arg;
  enum { CO_NEW, CO_RUNNING, CO_WAITING, CO_DEAD } status;
  struct co *waiter;
  jmp_buf context;        // 保存寄存器现场
  uint8_t stack[64 * 1024]; // 独立栈
};
```

- `co_start`：分配 `struct co`，初始化栈顶，把状态设为 `CO_NEW`，不立即运行。
- `co_yield`：`setjmp(current->context)` 保存现场；第一次返回 0 时选下一个可运行协程，恢复它的现场；从 `longjmp` 返回时直接继续。
- 新协程第一次被选中时，不能 `longjmp`（还没 `setjmp` 过），要用 `stack_switch_call` 切到它的栈并跳到入口。
- `co_wait`：如果目标已经 `CO_DEAD`，直接回收；否则把自己记为 waiter，`yield` 直到目标结束。

**最容易崩的地方**

- **栈对齐**：x86-64 要求调用前 16 字节对齐。新栈的初始 `%rsp` 没算对，会在 libc 的 `movaps` 上崩，而且位置看起来很随机。
- **32/64 位差异**：x86-64 第一个参数在 `%rdi`，i386 在栈上；`stack_switch_call` 里已经给了两套代码，要理解而不是照抄。
- **`setjmp` 的返回值**：`setjmp` 第一次返回 0，`longjmp` 回来时返回非 0；不要把两种情况写反。
- **`co_wait` 的两种路径**：目标已死 / 目标还活着。后者要阻塞自己，不能忙等。
- **内存泄漏**：OJ 会反复创建–等待–销毁，`struct co` 和栈都要在 `co_wait` 返回前释放。
- **多余输出**：提交的代码不要打印调试信息，否则可能 WA。用 `#ifdef LOCAL_MACHINE` 包住。

**调试建议**

```bash
make test
LD_LIBRARY_PATH=.. gdb ./libco-test-64
(gdb) b co_yield
(gdb) info registers rsp rbp rip
```

先把 `setjmp`/`longjmp` 的小例子调通，再写协程。不要一上来就写完整调度器。

**做完能回答**

1. 协程切换到底保存了哪些寄存器？为什么只保存 callee-saved 就够了？
2. 新协程第一次运行和第二次运行，恢复现场的方式有什么不同？
3. 为什么 `co_wait` 必须在返回前释放 `struct co`？不释放会怎样？

---

## M3 sperf：系统调用 profiler

官方题面：[M3.html](https://jyywiki.cn/OS/2022/labs/M3.html)

**目标**：实现 `sperf COMMAND [ARG]...`，启动 `strace` 跟踪命令，统计每个系统调用的耗时，定期输出 top 5。

**前置知识**

- `fork`、`execve`、`waitpid`。
- `pipe`、`dup2`、文件描述符。
- `PATH` 环境变量的含义；`execve` 不会自动搜索 `PATH`。
- `strace -T` 的输出格式；`read` 的缓冲和 `fflush`。

**关键思路**

1. 解析 `COMMAND` 和参数。
2. 在 `PATH` 里找到 `strace` 的绝对路径；自己实现 `execvp` 的搜索逻辑。
3. `pipe()` 创建管道；`fork()`。
4. 子进程：把管道写端 `dup2` 到 `stderr`（strace 默认写 stderr），然后 `execve(strace, argv, envp)`。
5. 父进程：读管道，按行解析 `name(...) = ret <time>`，把时间累加到 `map[name]`。
6. 每秒输出一次 top 5，格式 `name (XX%)`，每次输出后跟 80 个 `\0`，并 `fflush(stdout)`。
7. 子进程退出后，父进程也退出。

**容易踩的坑**

- **必须用 `execve`**：题面禁用 `execl`/`execvp` 等包装，且 `strace` 不一定在 `/usr/bin`，必须自己搜 `PATH`。
- **环境变量**：给 `execve` 传 `envp` 时要把当前环境传进去，否则 `strace` 找不到子命令。
- **strace 写 stderr**：被跟踪程序也可能写 stderr，会混进 trace。可以用 `-o` 或重定向处理，但注意题面要求。
- **输出格式**：只输出系统调用名和 `(XX%)`，不要额外字母数字；用 `printf("(%d%%)", ratio)`。
- **分隔符**：每轮输出后打印 80 个数值为 0 的字符，不是字符 `'0'`。
- **缓冲**：stdout 重定向后是全缓冲，必须 `fflush`。
- **不要混合输出**：父进程的统计和被跟踪程序的输出不能混在一起。

**调试建议**

```bash
strace -T ls
./sperf-64 ls
./sperf-64 find / | head -c 500 | xxd
```

**做完能回答**

1. 为什么 `execve("strace", ...)` 可能失败，而 `execvp("strace", ...)` 可以？
2. `dup2` 为什么比 `close` + `dup` 更适合这里？
3. `strace -T` 的时间是系统调用在内核里花的时间，还是墙上时间？

---

## M4 crepl：C REPL

官方题面：[M4.html](https://jyywiki.cn/OS/2022/labs/M4.html)

**目标**：逐行读 C 代码；以 `int` 开头的是函数，编译并加载到当前进程；否则当作表达式，求值并打印。

**前置知识**

- `gcc -shared -fPIC` 生成共享库。
- `dlopen` / `dlsym` / `dlerror` / `dlclose`。
- `mkstemp`、`/tmp`、文件权限。
- C 表达式和函数声明的简单区分。

**关键思路**

1. 读一行，去掉换行。
2. 如果以 `int` 开头：把这一行写到临时 `.c` 文件，`gcc -shared -fPIC -o /tmp/xxx.so /tmp/xxx.c`。
3. 否则：生成一个 wrapper：

```c
int __expr_wrapper_3(void) {
  return (1 + 2 || (fib(3) * fib(4)));
}
```

4. `dlopen` 加载 `.so`，`dlsym` 找 `__expr_wrapper_N` 或函数名，调用。
5. 函数可以调用之前定义过的函数：把之前生成的 `.so` 一起链接，或者让符号在进程里可见。
6. 输出 `OK.` 或 `= 结果.` 都可以，题面只要求主进程求出表达式的值。

**容易踩的坑**

- **当前目录不可写**：可能在 `/` 下运行，临时文件放 `/tmp`，用 `mkstemp` 生成唯一名字。
- **函数名冲突**：重复定义同名函数是 UB，题面不测；但 wrapper 名要带递增编号。
- **表达式求值位置**：必须在主进程打印，不能把表达式拼成程序让子进程打印。
- **禁用 `system` / `popen`**：编译会直接失败；`exec` 家族是允许的。
- **错误处理**：非法表达式不能让程序崩溃，给错误提示即可。
- **全局状态**：题面假设函数只访问局部变量，不调用 libc；不要依赖全局符号。

**调试建议**

```bash
./crepl-64
int gcd(int a, int b) { return b ? gcd(b, a % b) : a; }
gcd(256, 144) * gcd(56, 84)
```

**做完能回答**

1. `dlopen` 和 `execve` 都能“加载程序”，它们有什么区别？
2. 为什么表达式要包一层 wrapper 才能编译成函数？
3. 动态链接器如何找到 `gcd` 的地址？

---

## M5 frecov：文件恢复

官方题面：[M5.html](https://jyywiki.cn/OS/2022/labs/M5.html)

**目标**：给定一个被快速格式化过的 FAT32 镜像，尽可能恢复其中的 BMP 图片，输出每张图的 SHA-1 和文件名。

**前置知识**

- FAT32 的 BPB（BIOS Parameter Block）：每扇区字节数、每簇扇区数、保留扇区数、FAT 大小、根目录簇号。
- FAT 表、目录项（32 字节）、长文件名（LFN）。
- BMP 文件头：`BM` 魔数、像素数据偏移、宽高、位深。
- `mmap` 把镜像映射进内存；按簇扫描。
- `popen("sha1sum ...")` 或 `fork/exec` + pipe 计算校验和。

**关键思路**

1. `mmap` 镜像，解析 BPB，算出簇大小、数据区起始扇区、FAT 起始位置。
2. 扫描所有簇，分类：
   - 目录文件：包含大量目录项，里面有 `.bmp` 文件名；
   - BMP 头：以 `BM` 开头；
   - BMP 数据：像素字节；
   - 未使用。
3. 从目录项里恢复文件名、起始簇、文件大小。目录项可能跨簇，简单起见可以放弃跨簇的项，但不能崩。
4. 根据起始簇找到 BMP 头，按文件大小读取后续簇。最简单假设：文件在磁盘上连续存放。
5. 把恢复出的字节写到临时文件，调用 `sha1sum` 得到 40 位十六进制，输出 `hash  filename`。
6. 快速格式化清空了 FAT 表，但数据区几乎没动；目录项和文件内容常常还能在数据区里找到。

**容易踩的坑**

- **FAT 被清空**：不能靠 FAT 链表找下一簇，只能靠目录项里的起始簇 + 文件大小 + 连续假设。
- **LFN 校验**：长文件名由多个目录项组成，最后一个是 8.3 短名；名字可能带 Unicode。
- **目录项跨簇**：一个 32 字节项可能跨两个簇，简单实现可以跳过。
- **误判**：把像素数据当目录项解析会崩；所有指针和长度都要检查。
- **输出格式**：40 位 SHA-1 + 空格 + 文件名，一行一个；不要输出调试信息到同一行。
- **文件名编码**：输出必须是合法 UTF-8，否则 OJ 会 `Invalid Output`。
- **时间限制**：128 MiB 镜像 30 秒，恢复出一张就 `printf` + `fflush`，超时也能拿部分分。

**调试建议**

```bash
file fs.img
xxd -l 512 fs.img          # 看 BPB
xxd -s 0x4000 -l 128 fs.img # 看 FAT 表
mkdir /tmp/mnt && sudo mount -o loop fs.img /tmp/mnt
sha1sum /tmp/mnt/DCIM/*.bmp
```

先拿一个**没格式化**的镜像练手：解析 BPB、遍历目录、读出文件、算 SHA-1。确认解析正确后，再处理格式化后的镜像。

**做完能回答**

1. 快速格式化到底删了什么？为什么数据还能恢复？
2. FAT32 的目录项里有哪些字段可以用来恢复文件？
3. 为什么“文件大概率连续存放”这个假设在 SD 卡/相机里经常成立？

---

## 建议节奏

| 周 | 做什么 | 对应讲义 |
| --- | --- | --- |
| 1–2 | M1，熟悉 `/proc` 和 C 文件 API | 第 1、6 讲 |
| 3–4 | M2，补汇编、ABI、栈 | 第 2、3 讲 |
| 5–6 | M3，补进程、管道、`PATH` | 第 6、7 讲 |
| 7–8 | M4，补 ELF、动态链接 | 第 9 讲 |
| 9–10 | M5，补 FAT、`mmap`、二进制解析 | 第 15 讲 |

M2 和 M5 最容易超时，提前动手。M1、M3、M4 的代码量不大，但 API 细节多，建议先写最小可运行版本，再补边界情况。

---

上一篇：[32 讲导读](lectures.md) · 下一篇：[OS Labs](oslabs.md) →
