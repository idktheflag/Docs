---
title: pwnsmith
description: A GDB plugin made for solving pwn challenges.
author: zemi
---

## How to install

```bash
curl -sL https://raw.githubusercontent.com/imattas/pwnsmith/main/install.sh | sudo bash
```

This installs system dependencies (gdb, python3, binutils), Python packages (pwntools, pyelftools, capstone), clones the repo to `~/.pwnsmith`, installs the binary to `/bin/pwnsmith`, and configures `~/.gdbinit`.

## How to update

```bash
pwnsmith update
```

Checks the remote VERSION file on GitHub. If a newer version exists, downloads the updated binary from GitHub Releases and installs it to `/bin/pwnsmith`.

## How to launch

```bash
pwnsmith                     # bare GDB with PwnSmith loaded
pwnsmith ./binary             # debug a specific binary
pwnsmith -p 1234              # attach to a running process
pwnsmith ./binary core        # load a core dump
```

PwnSmith launches GDB in quiet mode with the plugin pre-loaded. All GDB arguments pass through. The prompt changes to `pwnsmith>`.

## Subcommands (shell)

These run from your terminal, not inside GDB.

| Command | Description |
|---------|-------------|
| `pwnsmith setup` | Add PwnSmith to `~/.gdbinit` so plain `gdb` loads it too |
| `pwnsmith unsetup` | Remove PwnSmith from `~/.gdbinit` |
| `pwnsmith update` | Check for and install the latest version |
| `pwnsmith version` | Print the installed version |
| `pwnsmith --help` | Show usage |

---

## Commands Reference

Everything below runs inside PwnSmith (at the `pwnsmith>` prompt).

### analyze

Auto-scans the loaded binary and reports security properties, dangerous imported functions, win/flag functions, ROP gadgets, interesting strings, and a suggested attack plan.

```
pwnsmith> analyze
pwnsmith> analyze quick       # just checksec + dangerous functions
pwnsmith> analyze vulns       # focus on vulnerable imports
pwnsmith> analyze gadgets     # quick ROP gadget summary
pwnsmith> analyze strings     # interesting strings in the binary
pwnsmith> analyze all         # everything with full detail
```

**What it checks:**

- **Security:** NX, PIE, RELRO, stack canary
- **Dangerous functions:** `gets`, `strcpy`, `sprintf`, `printf`, `system`, `malloc`/`free`, `read`, `memcpy` — rated CRITICAL, HIGH, MEDIUM, CHECK, or INFO
- **Win functions:** scans for functions named `win`, `flag`, `shell`, `backdoor`, `secret`, etc.
- **ROP gadgets:** quick scan of `.text` for `pop rdi; ret`, `pop rsi; ret`, `ret`, etc.
- **Strings:** `/bin/sh`, `flag`, `%n`, `%s`, `cat`, `system`, `password`
- **Attack summary:** suggests techniques (ret2win, ret2libc, format string, heap) with the command to try next

### payload

Generates exploit payloads and runs them against local or remote targets without leaving PwnSmith.

#### Generate payloads

```
pwnsmith> payload gen ret2win                   # auto-detect offset + win function
pwnsmith> payload gen ret2win 72                # with known offset
pwnsmith> payload gen ret2win 72 0x4011a6       # with known offset and target address
pwnsmith> payload gen rop 72                    # system("/bin/sh") ROP chain
pwnsmith> payload gen shellcode 64              # NOP sled + execve shellcode
pwnsmith> payload gen cyclic 200                # de Bruijn pattern for offset finding
pwnsmith> payload gen padding 64                # just A's
```

`ret2win` auto-detects the buffer size from disassembly (`sub $0xN, %rsp`), finds functions named `win`/`flag`/`shell`, and locates a `ret` gadget for stack alignment. Override any of these by passing arguments.

#### Run payloads

```
pwnsmith> payload run                           # run against local binary
pwnsmith> payload run pwn.ctf.com 9001          # run against remote target
```

Spawns a pwntools process/remote in the background, sends the payload, and prints the output. No need to exit GDB.

#### Remote targets

```
pwnsmith> payload remote pwn.ctf.com 9001       # set default remote
pwnsmith> payload run                            # now sends to remote by default
pwnsmith> payload remote                         # show current remote
```

#### Save and script

```
pwnsmith> payload show                           # display last generated payload
pwnsmith> payload save payload.bin               # save to file (use: run < payload.bin)
pwnsmith> payload script exploit.py              # generate pwntools exploit script
pwnsmith> payload script exploit.py ctf.com 9001 # script with remote target
pwnsmith> payload find offset                    # help determine overflow offset
```

Generated scripts support `python3 exploit.py` for local and `python3 exploit.py REMOTE` for remote.

### regs

Display all registers with change highlighting. Values that changed since the last stop are shown in red with the previous value.

```
pwnsmith> regs                # all registers
pwnsmith> regs general        # general-purpose only (rax, rbx, rcx, ...)
pwnsmith> regs special        # rip, eflags, segment registers
pwnsmith> regs rax            # single register
```

Pointer values are automatically dereferenced — if a register points to readable memory, the target value or string is shown.

**Aliases:** `rg`

### stack

Telescope the stack, showing hex values, pointer chains, strings, and frame annotations.

```
pwnsmith> stack               # 16 entries from $rsp
pwnsmith> stack 32            # 32 entries
pwnsmith> stack 16 $rbp       # start from $rbp
pwnsmith> stack -r            # reverse order
pwnsmith> stack frames        # show call frame boundaries
```

Each line shows:
- Offset from starting address
- Stack address and value
- `← $rsp` / `← $rbp` markers
- `← ret addr (frame N) [function_name]` for detected return addresses
- `← saved rbp (frame N)` for saved frame pointers
- Dereferenced pointer chains or string content
- Symbol names for code addresses

`stack frames` walks the saved RBP chain and displays each frame in a box with function name, return address, saved RBP, and local variable region size.

**Aliases:** `st`

### heap

Parse and display glibc malloc heap chunks.

```
pwnsmith> heap                # walk all chunks from heap base
pwnsmith> heap 0x555555559000 # walk from specific address
pwnsmith> heap -n 64          # show at most 64 chunks
pwnsmith> heap chunk 0x...    # detailed view of one chunk
pwnsmith> heap bins           # show fastbin chains
pwnsmith> heap tcache         # show tcache bins (glibc 2.26+)
pwnsmith> heap top            # show the top (wilderness) chunk
pwnsmith> heap check          # walk heap and report corruption
```

Each chunk shows:
- Address and status: `INUSE` (green), `FREE` (red), `MMAP` (magenta)
- Size with human-readable notation for large chunks
- Flag bits: P (prev_inuse), M (mmapped), N (non_main_arena)
- `fd`/`bk` pointers for free chunks
- Corruption warnings: size misalignment, invalid pointers, broken doubly-linked lists

`heap tcache` handles safe-linking deobfuscation (glibc 2.32+).

**Aliases:** `hp`

### bp

Enhanced breakpoint management with automation.

```
pwnsmith> bp main             # break at function
pwnsmith> bp 0x401234         # break at address
pwnsmith> bp *main+0x20       # break at offset
pwnsmith> bp main -c "stack 8" # break + run command on hit
pwnsmith> bp read@plt -t      # temporary (one-shot) breakpoint
pwnsmith> bp list             # list all breakpoints
pwnsmith> bp del 1            # delete breakpoint #1
pwnsmith> bp del all          # delete all
pwnsmith> bp enable 1         # enable breakpoint
pwnsmith> bp disable 1        # disable breakpoint
pwnsmith> bp auto 1 "regs"   # add automation to existing breakpoint
```

The `-c` flag runs a PwnSmith or GDB command every time the breakpoint is hit — useful for auto-displaying state at key points.

### rop

Find ROP gadgets and auto-generate chains.

```
pwnsmith> rop                 # find all known gadgets in .text
pwnsmith> rop pop rdi         # search for specific pattern
pwnsmith> rop --libc          # also search in libc
pwnsmith> rop --libc pop rdi  # specific gadget in libc
pwnsmith> rop --bytes 5fc3    # search for custom byte sequence
pwnsmith> rop --all           # show all instances (not just first)
pwnsmith> rop --section .plt  # search specific section
pwnsmith> rop chain system    # auto-build system("/bin/sh") chain
pwnsmith> rop chain execve    # auto-build execve("/bin/sh", 0, 0) chain
pwnsmith> rop chain mprotect  # auto-build mprotect() chain
pwnsmith> rop one_gadget      # find one_gadget addresses in libc
```

`rop chain` searches libc for the required gadgets (`pop rdi; ret`, etc.), locates `/bin/sh` and the target function, assembles the chain, and outputs both a visual layout and a copyable pwntools `flat()` snippet.

`rop one_gadget` requires the `one_gadget` Ruby gem (`gem install one_gadget`).

**Aliases:** `gadgets`

### fmtstr

Format string exploitation helpers.

```
pwnsmith> fmtstr offset 20              # generate probe with 20 %p specifiers
pwnsmith> fmtstr read 0x404040 6        # generate %s read payload (offset 6)
pwnsmith> fmtstr write 0x404040 0xdeadbeef 6   # generate %hhn write payload
pwnsmith> fmtstr write 0x404040 0xdead 6 --short  # use %hn writes
pwnsmith> fmtstr pwntools 0x404040 0x42 6   # generate pwntools fmtstr_payload()
```

**offset:** Generates a probe string (`AAAABBBB%1$p.%2$p.%3$p...`) to send as input. Look for `4242424241414141` in the output — the position number is your format string offset.

**write:** Calculates the byte-by-byte `%hhn` write sequence needed to write an arbitrary value to an arbitrary address. Shows the math for each byte.

**pwntools:** Outputs a ready-to-use `fmtstr_payload()` call.

**Aliases:** `fmt`

### ctx

Configure the auto-context display that shows registers + disassembly + stack on every program stop.

```
pwnsmith> ctx                 # show context now
pwnsmith> ctx off             # disable auto-context
pwnsmith> ctx on              # re-enable auto-context
pwnsmith> ctx regs off        # hide registers
pwnsmith> ctx stack off       # hide stack
pwnsmith> ctx code off        # hide disassembly
pwnsmith> ctx bt on           # show backtrace
pwnsmith> ctx depth 16        # set stack telescope depth
pwnsmith> ctx lines 10        # set disassembly line count
```

### pwn-connect

Manage pwntools connections for send/recv interaction alongside GDB debugging.

```
pwnsmith> pwn-connect remote 10.0.0.1 9001   # connect to remote target
pwnsmith> pwn-connect process ./vuln          # start local process
pwnsmith> pwn-connect attach                  # attach to GDB's current inferior
pwnsmith> pwn-connect status                  # show connection info
pwnsmith> pwn-connect close                   # close connection
```

### pwn-send / pwn-recv

Send and receive data through a `pwn-connect` connection.

```
pwnsmith> pwn-send hello                      # send raw string
pwnsmith> pwn-send -l "1"                     # send with newline
pwnsmith> pwn-send -x 4141414142424242        # send hex bytes
pwnsmith> pwn-send -p64 0x00007ffff7a52000    # send packed 64-bit value
pwnsmith> pwn-send -p32 0x08048000            # send packed 32-bit value
pwnsmith> pwn-send -f payload.bin             # send file contents

pwnsmith> pwn-recv                            # receive available data
pwnsmith> pwn-recv 64                         # receive up to 64 bytes
pwnsmith> pwn-recv -u ": "                    # receive until delimiter
pwnsmith> pwn-recv -l                         # receive one line
```

### pwn-leak

Parse a leaked address from hex bytes. Stores the result in GDB convenience variable `$leak`.

```
pwnsmith> pwn-leak 00a0f7ff7f000000           # parse hex as 64-bit address
pwnsmith> pwn-leak -r 6                       # receive 6 bytes and parse
pwnsmith> pwn-leak -r 6 --32                  # parse as 32-bit
```

After running, use `$leak` in GDB expressions: `print $leak`, `x/gx $leak`, etc.

### pwn-checksec

Display binary security properties (like `checksec`).

```
pwnsmith> pwn-checksec                        # check loaded binary
pwnsmith> pwn-checksec /path/to/other         # check specific binary
```

Shows NX, PIE, RELRO (none/partial/full), and stack canary status.

### pwn-libc

Display libc information for the running process.

```
pwnsmith> pwn-libc                            # show base, symbols, gadgets
pwnsmith> pwn-libc system                     # look up specific symbol
```

Shows: libc base address, common symbol offsets (`system`, `__free_hook`, `__malloc_hook`, `environ`), `/bin/sh` string address, and common gadget addresses.

### pwn-template

Generate a pwntools exploit script template.

```
pwnsmith> pwn-template                        # print to screen
pwnsmith> pwn-template -o exploit.py          # save to file
pwnsmith> pwn-template -r ctf.com 9001        # include remote setup
```

### pwn-script

Multi-step exploit scripting. Load a Python script that defines steps, then run them sequentially with shared state.

```
pwnsmith> pwn-script load exploit_steps.py    # load script
pwnsmith> pwn-script run                      # run all steps
pwnsmith> pwn-script step                     # run next step
pwnsmith> pwn-script step 2                   # run specific step
pwnsmith> pwn-script status                   # show progress + variables
pwnsmith> pwn-script reset                    # reset to step 0
pwnsmith> pwn-script set libc_base 0x7f...    # set a variable
pwnsmith> pwn-script clear                    # unload script
```

Script format:

```python
def setup(script):
    def leak(vars):
        # do leak logic, return new variables
        return {"libc_base": 0x7ffff7a00000}

    def exploit(vars):
        base = vars["libc_base"]
        # build and send payload

    script.add_step("leak libc", leak)
    script.add_step("send exploit", exploit)
```

**Aliases:** `pws`

### pwn-config

View and modify PwnSmith settings. Persists to `~/.pwnsmith.conf`.

```
pwnsmith> pwn-config                          # show all settings
pwnsmith> pwn-config set context.stack_depth 16
pwnsmith> pwn-config set heap.detect_corruption true
pwnsmith> pwn-config save                     # write to disk
pwnsmith> pwn-config reset                    # reset to defaults
pwnsmith> pwn-config reload                   # reload from disk
```

Available settings:

| Section | Key | Default | Description |
|---------|-----|---------|-------------|
| `context` | `enabled` | `true` | Auto-context on stop |
| `context` | `show_regs` | `true` | Show registers |
| `context` | `show_stack` | `true` | Show stack |
| `context` | `show_code` | `true` | Show disassembly |
| `context` | `show_backtrace` | `false` | Show backtrace |
| `context` | `stack_depth` | `8` | Stack entries to show |
| `context` | `code_lines` | `6` | Disassembly lines |
| `heap` | `max_chunks` | `32` | Max chunks to walk |
| `heap` | `detect_corruption` | `true` | Check for corruption |
| `heap` | `tcache_support` | `true` | Parse tcache bins |
| `stack` | `default_depth` | `16` | Default telescope depth |
| `stack` | `detect_ret_addrs` | `true` | Highlight return addrs |
| `cache` | `enabled` | `true` | Memory read caching |

### pwn-sections

Display binary sections with addresses and sizes.

```
pwnsmith> pwn-sections
```

### pwn-interactive

Drop into interactive pwntools mode with the connected target. Press Ctrl+C to return to PwnSmith.

```
pwnsmith> pwn-interactive
```

---

## Aliases

| Alias | Command |
|-------|---------|
| `aa` | `analyze` |
| `pl` | `payload` |
| `rg` | `regs` |
| `st` | `stack` |
| `hp` | `heap` |
| `gadgets` | `rop` |
| `fmt` | `fmtstr` |
| `pws` | `pwn-script` |

---

## Adding Custom Commands

Create a `.py` file in `pwnsmith/commands/`. It's auto-discovered on next load — no edits to `gdbinit.py` needed.

```python
import gdb
from pwnsmith.commands import register_command

@register_command("mycmd", "Short description", aliases=["mc"])
class MyCommand(gdb.Command):
    """Full help text shown by 'help mycmd'."""

    def __init__(self):
        super().__init__("mycmd", gdb.COMMAND_USER)

    def complete(self, text, word):
        return [c for c in ["sub1", "sub2"] if c.startswith(word)]

    def invoke(self, arg, from_tty):
        gdb.write(f"Args: {arg}\n")
```

The `@register_command` decorator takes:
- `name` — the GDB command name
- `description` — shown in the startup banner
- `aliases` — optional list of shorthand names

---

## Architecture

```
~/.pwnsmith/              ← install directory (git clone)
├── VERSION                ← single source of truth for version
├── install.sh             ← curl installer
├── dist/pwnsmith          ← compiled binary (PyInstaller)
├── pwnsmith.spec          ← build spec
├── setup.py               ← pip package metadata
├── pwnsmith/
│   ├── cli.py             ← binary entry point + update system
│   ├── gdbinit.py         ← GDB loader, auto-discovers commands
│   ├── __init__.py         ← reads VERSION
│   ├── commands/
│   │   ├── __init__.py    ← @register_command decorator + registry
│   │   ├── analyze.py     ← auto-analysis
│   │   ├── payload.py     ← payload gen + run
│   │   ├── regs.py        ← register display
│   │   ├── stack.py       ← stack telescope
│   │   ├── heap.py        ← heap visualization
│   │   ├── breakpoints.py ← enhanced breakpoints
│   │   ├── rop.py         ← ROP gadgets + chains
│   │   ├── fmtstr.py      ← format string helpers
│   │   ├── exploit.py     ← pwntools commands
│   │   └── script.py      ← multi-step scripting
│   ├── utils/
│   │   ├── memory.py      ← safe memory access + page cache
│   │   ├── printer.py     ← ANSI colors + formatting
│   │   ├── libc.py        ← libc symbols + gadgets
│   │   ├── parser.py      ← ELF parsing + checksec
│   │   ├── pwntools_helper.py ← connection manager
│   │   └── config.py      ← config file system
│   └── events/
│       └── stop_handler.py ← auto-context on stop
└── challenges/            ← practice CTF challenges
    ├── Makefile
    ├── 01-smashville/     ← ret2win (easy)
    ├── 02-leaky-pipes/    ← format string (medium)
    └── 03-heap-of-trouble/ ← heap UAF (hard)
```

### How it loads

1. `pwnsmith` binary extracts the bundled Python package to `~/.pwnsmith/lib/pwnsmith/`
2. Launches `gdb -q -x ~/.pwnsmith/lib/pwnsmith/gdbinit.py`
3. `gdbinit.py` uses `pkgutil.iter_modules` to discover all files in `commands/`
4. Each file's `@register_command` decorators populate a global registry
5. `register_all()` instantiates every command class + creates alias commands
6. Event hooks connect to GDB's stop/exit/new_objfile events
7. Memory cache is invalidated on each stop event

### How update works

1. `pwnsmith update` fetches `VERSION` from `raw.githubusercontent.com`
2. Compares against the bundled `VERSION`
3. If newer, downloads the binary from `github.com/imattas/pwnsmith/releases/download/v{version}/pwnsmith`
4. Installs to `/bin/pwnsmith` via `sudo cp`
5. Clears the cached lib so it re-syncs on next run
6. Falls back to `git pull` if no release binary exists
