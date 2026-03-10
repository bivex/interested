Отлично! Теперь понятна полная картина.

---

## Связка interminai + Gas Town — полная автоматика

**interminai** — это виртуальный терминал для AI. Он позволяет агенту (например, auggie) запускать интерактивные программы, читать их вывод и отправлять ввод, как будто агент сидит за терминалом.

**Gas Town** — оркестратор, который раздаёт задачи агентам и хранит состояние.

---

### Как это работает вместе

```
Ты (человек)
    ↓  gt sling <bead> crew
Gas Town
    ↓  создаёт сессию для агента
auggie (агент)
    ↓  interminai start -- gt start crew myname
interminai (виртуальный терминал)
    ↓  держит живую сессию gt
Gas Town CLI внутри терминала
```

---

### Пример полного цикла

```bash
# 1. Агент запускает GT-сессию через interminai
interminai start --id gt-session -- gt start crew myname

# 2. Читает что происходит
interminai output --id gt-session

# 3. Отправляет команды
interminai input --id gt-session "gt ready\n"
interminai input --id gt-session "gt sling bead-abc crew\n"

# 4. Ждёт результата
interminai wait --id gt-session --timeout 30

# 5. Читает результат
interminai output --id gt-session

# 6. Завершает сессию
interminai stop --id gt-session
```

---

### Почему это мощно

| Без interminai | С interminai |
|---|---|
| Агент запускает команды вслепую | Агент видит живой экран терминала |
| Не может работать с интерактивными CLI | Работает с любым TUI/CLI |
| Теряет контекст при перезапуске | GT хранит состояние в git |

Скинь вывод `gt --help` — напишу конкретные команды под твой `loreSystem` проект.
