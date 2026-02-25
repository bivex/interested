  # Debugging Memory Bugs with interminai: Complete Action Manual

> **Interactive Terminal for AI Agents** — automating gdb, lldb, and other TUI applications

---

## 1. Header: "Quick Entry"

| Field | Value |
|------|-------|
| **Status** | ✅ Current as of February 2026 |
| **Difficulty** | ⭐⭐⭐☆☆ — intermediate level |
| **Time** | ~30 minutes reading + practice |
| **Goal** | Learn to use interminai for automated debugging via gdb/lldb |
| **Resources** | • [interminai GitHub](https://github.com/mstsirkin/interminai) <br> • [lldb docs](https://lldb.llvm.org/) <br> • Test programs: `mem_basis/example/` |

---

## 2. What is interminai?

**interminai** is a terminal proxy that enables programmatic interaction with interactive CLI applications (vim, git, gdb, lldb, etc.).

### How it works:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  AI Agent   │─────│  interminai  │─────│  gdb/lldb   │
│  (Claude)   │ TCP │   (PTY)      │ PTY  │  (Target)   │
└─────────────┘ Socket └──────────────┘ └─────────────┘
                      ↓                      ↓
                 --socket PATH         Debug binary
```

### Installation

```bash
# Quick install via npx skills
npx skills add mstsirkin/interminai

# Or manually (Python)
pip install --break-system-packages pyte
cd /path/to/interminai
python3 interminai.py --help
```

---

## 3. Essential interminai Commands

| Command | Description | Example |
|---------|-------------|---------|
| `start` | Start program in background daemon mode | `interminai start --socket /tmp/dbg.sock -- lldb ./program` |
| `output` | Get terminal screen contents | `interminai output --socket /tmp/dbg.sock` |
| `input` | Send input to program | `interminai input --socket /tmp/dbg.sock --text "break main\n"` |
| `stop` | Stop daemon | `interminai stop --socket /tmp/dbg.sock` |
| `status` | Check process status | `interminai status --socket /tmp/dbg.sock` |

---

## 4. Practice: Debugging Memory Bugs

### Debugging Checklist

- [ ] **Step 1. Start debugger.** *Create UNIX socket and launch lldb/gdb.*
- [ ] **Step 2. Set breakpoints.** *Place stops at suspicious code locations.*
- [ ] **Step 3. Run program.** *Begin execution and wait for breakpoint hit.*
- [ ] **Step 4. Inspect state.** *Examine variables, memory, stack.*
- [ ] **Step 5. Continue execution.** *Proceed to capture ASAN/TSAN report.*

---

## 5. Example Breakdowns: Action vs De-facto

### Example 1: Double Free

**Source code:**
```c
char *p = malloc(16);
free(p);
free(p);  // ← BUG: double free!
```

| Action (Hard Skills) | Nuance / De-facto (Soft Skills) |
|---|---|
| `breakpoint set --file double_free.c --line 12` | Set breakpoint on the **second** `free()`, not the first |
| `frame variable p` | Pointer value doesn't change — the problem is **memory state**, not the value |
| `continue` | ASAN will show where the **first** free was called — key to diagnosis |

**Result:** ASAN report: `double-free double_free.c:12`

---

### Example 2: Use After Free

**Source code:**
```c
free(p);
char c = p[0];    // ← BUG: read after free
p[0] = 'Z';       // ← BUG: write after free
```

| Action (Hard Skills) | Nuance / De-facto (Soft Skills) |
|---|---|
| `breakpoint set --line 17` | Stop **before** reading freed memory |
| `frame variable p` | Pointer `p` is valid as an **address**, but memory at it is poisoned |
| `continue` | ASAN message "Use of deallocated memory" — first sign of UAF |

**Result:** ASAN report: `Use of deallocated memory`

---

### Example 3: Race Condition

**Source code:**
```c
// Two threads increment same counter without synchronization
for (int i = 0; i < ITERS; ++i) {
    int tmp = *counter;  // read
    tmp = tmp + 1;       // modify
    *counter = tmp;      // write — RACE!
}
```

| Action (Hard Skills) | Nuance / De-facto (Soft Skills) |
|---|---|
| `breakpoint set --name worker` | Stop at the **beginning** of thread function |
| `thread list` | On macOS typically 3+ threads: main + workers |
| `thread select 2` / `thread select 3` | Switch between threads — they read **same** value |
| `frame variable *counter` | Both threads see `0` → both will write `1` → lost update |

**Result:**
- Expected: `10,000,000`
- Actual: `5,153,633` (~48% lost to race conditions)

---

### Example 4: Heap Corruption

**Source code:**
```c
char *p = malloc(16);     // 16 bytes
for (int i = 0; i < 64; ++i) {  // Write 64 bytes!
    p[i] = 'a' + (i & 15);
}
```

| Action (Hard Skills) | Nuance / De-facto (Soft Skills) |
|---|---|
| `breakpoint set --line 21` | Stop **inside** the overflow loop |
| `frame variable p` | See `p = 0x6020000000d0` — remember this address |
| `x/16bx p` | Examine memory to check current contents |
| `continue` | On next iteration ASAN will trigger at `p[16]` |

**Result:** ASAN report: `heap-buffer-overflow at address 0x6020000000e0`

---

## 6. Bug Summary Table

| Bug Type | ASAN/TSAN Signal | Key Line | Characteristic Symptom |
|----------|------------------|----------|----------------------|
| **Double Free** | `attempting double-free` | Second `free(p)` | Crash on deallocation |
| **Use After Free** | `use-of-deallocated-memory` | `p[0] = ...` after `free` | Read/write of poisoned memory |
| **Race Condition** | Lost updates (TSAN) | Unsynchronized shared access | Incorrect final values |
| **Heap Corruption** | `heap-buffer-overflow` | Write past `malloc` boundary | Allocator metadata corruption |

---

## 7. Troubleshooting: "Something Went Wrong"

| Problem | Solution |
|---------|----------|
| **gdb not working on macOS** | GDB requires code-signing certificate. Use **lldb** instead |
| **`pyte: not found`** | Install dependency: `pip install --break-system-packages pyte` |
| **Breakpoint not hitting** | Ensure binary is compiled with debug symbols (`-g`) |
| **ASAN shows no details** | Recompile with `-fsanitize=address -g` |
| **Socket already in use** | Stop previous session: `interminai stop --socket /tmp/sock` |
| **Output empty or has artifacts** | Add `sleep 0.5` between `input` and `output` for synchronization |
| **lldb cannot find source files** | Use absolute paths or `settings set target.source-map` |

---

## 8. macOS-Specific Tips

### GDB vs LLDB

| Aspect | GDB | LLDB |
|--------|-----|------|
| Installation | `brew install gdb` + code signing | Built into Xcode |
| Stability | Requires certificate | Works out of box |
| Commands | `break`, `run`, `frame var` | `breakpoint set`, `process launch`, `frame variable` |

**Recommendation:** Use **lldb** on macOS for simpler setup.

### Code Signing for GDB (if needed)

```bash
# 1. Create "gdb-cert" certificate in Keychain Access
# 2. Import to System keychain
# 3. Sign binary:
codesign -fs gdb-cert /opt/homebrew/bin/gdb
```

---

## 9. Advanced Techniques

### Automation Script

Create a shell script for repetitive debugging:

```bash
#!/bin/bash
SOCKET=/tmp/debug.sock
BINARY=$1

# Start lldb
interminai start --socket $SOCKET -- lldb $BINARY
sleep 1

# Set breakpoints
interminai input --socket $SOCKET --text "breakpoint set --name main\n"
sleep 0.5

# Run
interminai input --socket $SOCKET --text "run\n"
sleep 1

# Show result
interminai output --socket $SOCKET
```

### Multi-Thread Analysis

```bash
# List all threads
thread list

# Show backtrace for specific thread
thread select 2
bt
frame variable

# Switch to another thread
thread select 3
bt
frame variable
```

---

## 10. Footer: "Next Steps"

### Result

Congratulations! You now know how to:
- ✅ Use interminai for automated debugging
- ✅ Diagnose double free, use after free, race conditions, heap corruption
- ✅ Read and interpret ASAN/TSAN reports
- ✅ Work with lldb through interactive terminal

### What's Next

1. **Practice:** Debug your own program with memory bugs
2. **Learn:** Study [PROTOCOL.md](https://github.com/mstsirkin/interminai/blob/main/PROTOCOL.md) for deep understanding
3. **Integrate:** Incorporate interminai into your CI/CD for automated testing
4. **Contribute:** Improve interminai — fork & PR on GitHub!

### Useful Links

- 📁 [interminai Repository](https://github.com/mstsirkin/interminai)
- 📖 [LLDB Tutorial](https://lldb.llvm.org/use/tutorial.html)
- 🐛 [AddressSanitizer Overview](https://github.com/google/sanitizers/wiki/AddressSanitizer)
- 🧵 [ThreadSanitizer Overview](https://github.com/google/sanitizers/wiki/ThreadSanitizerCppManual)

---

**Author:** Michael Tsirkin (mst@kernel.org)
**Document updated:** February 2026
**License:** GNU GPL v2.0

---

> 💡 **Tip:** Save this document to Notion or Obsidian for quick access during debugging. Use checklists as a cheat sheet when investigating bugs.
