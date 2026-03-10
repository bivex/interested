Сейчас посмотрю документацию interminai и GT, чтобы расписать точный мануал.Буду основываться на логе из разговора. Вот полный пошаговый мануал:

---

## Gas Town + interminai — пошаговый мануал

---

### Шаг 0 — Проверить interminai

```zsh
# interminai — это alias, не бинарь, поэтому нужен интерактивный zsh
zsh -i -c 'command -v interminai'

# Если не нашёл — найти вручную
grep -R "interminai" ~/.zshrc ~/.zprofile ~/.*rc 2>/dev/null
```

После этого все GT команды запускать через:
```zsh
zsh -i -c 'gt ...'
```

---

### Шаг 1 — Создать HQ

```zsh
mkdir -p ~/gt
zsh -i -c 'cd ~/gt && gt init'
```

HQ — это центральная папка, которая управляет всеми rig'ами и crew.

---

### Шаг 2 — Добавить rig

**Если есть remote (GitHub):**
```zsh
zsh -i -c 'cd ~/gt && gt rig add https://github.com/user/myproject'
```

**Если локальный repo (через adopt — нужен GT контекст внутри папки):**
```zsh
zsh -i -c 'cd ~/gt && gt rig add --adopt /path/to/local/repo'
```

Проверить что rig добавился:
```zsh
zsh -i -c 'cd ~/gt && gt rig list'
```

---

### Шаг 3 — Установить tmux (если не стоит)

```zsh
tmux -V  # проверить

# Если нет:
brew install tmux
```

Без tmux `gt start` не поднимет агентов.

---

### Шаг 4 — Запустить GT агентов

```zsh
zsh -i -c 'cd ~/gt && gt start --all'
```

Должны подняться:
- Mayor
- Deacon
- witness (для каждого rig)
- refinery (для каждого rig)

Проверить статус:
```zsh
zsh -i -c 'cd ~/gt && gt status'
```

---

### Шаг 5 — Создать crew workspace

```zsh
zsh -i -c 'cd ~/gt && gt crew add myname --rig myproject'
```

Это создаёт рабочую копию:
```
~/gt/myproject/crew/myname/
```

Проверить:
```zsh
zsh -i -c 'cd ~/gt && gt crew list --rig myproject'
```

---

### Шаг 6 — Создать bead (task)

```zsh
cd ~/gt/myproject/crew/myname

# Создать task
bd create "Название задачи"

# Посмотреть созданный bead (запомнить ID вида ls-bw3)
gt show ls-bw3
```

---

### Шаг 7 — Sling bead на crew

```zsh
# Dry-run (проверить target без реального назначения)
gt sling ls-bw3 --dry-run

# Реальный sling
gt sling ls-bw3 myproject/crew/myname "Описание что делать"
```

Статус bead станет `HOOKED`.

---

### Шаг 8 — Attach к crew session

```zsh
cd ~/gt
gt crew at myname --rig myproject
```

Это открывает tmux-сессию с активным crew workspace.

---

### Шаг 9 — Установить текущий issue

```zsh
# Из shell в crew workspace (не из agent UI)
cd ~/gt/myproject/crew/myname
gt issue set ls-bw3
```

---

### Итоговая структура папок

```
~/gt/                              ← HQ
~/gt/myproject/                    ← rig
~/gt/myproject/crew/myname/        ← crew workspace
```

---

### Быстрые команды для ежедневной работы

```zsh
# Переподключиться к сессии
cd ~/gt && gt crew at myname --rig myproject

# Посмотреть задачи
cd ~/gt/myproject/crew/myname && gt show ls-bw3

# Статус всего
cd ~/gt && gt status
```
