# 🎚 От пресета к сэмплам: Полное руководство по записи для продакшна

**Задача:** Превратить ваш синтезированный пресет (например, "Edo Koto") в библиотеку сэмплов, готовую к использованию в продакшене.

---

## 🔄 Полный Workflow (5 этапов)

```
Пресет в Serum → Запись (Bounce) → Редактирование → Маппинг → Экспорт в инструмент
```

---

## 🎙 Этап 1: Подготовка к записи

### Настройки DAW перед рендером
| Параметр | Значение | Почему |
|----------|----------|--------|
| **Sample Rate** | 48 kHz или 96 kHz | Стандарт продакшна / запас для питч-шифта |
| **Bit Depth** | 24-bit или 32-bit float | Динамический диапазон, нет клиппинга |
| **Buffer Size** | 1024+ samples | Стабильность записи без глюков |
| **Plugin Latency** | Компенсировать | Чтобы сэмплы были в сетке |

### Чек-лист перед записью
- [ ] Отключить **LFO/Envelopes**, привязанные к случайности (Random)
- [ ] Зафиксировать **Reverb/Delay** в "печатном" виде (или записать dry + wet отдельно)
- [ ] Убедиться, что **Velocity** не меняет тембр радикально (если не планируете многослойность)
- [ ] Сбросить **Mod Wheel/Pitch Bend** в нейтраль
- [ ] Отключить **CPU-heavy эффекты**, если будете добавлять их позже на шине

---

## 🎹 Этап 2: Стратегия записи (Multi-Sampling)

Не записывайте каждую ноту! Используйте **интервальную запись + питч-шифтинг**.

### Схема записи для струнных (Koto/Shamisen)
```
Записать ноты: C1, C#2, E2, G2, B2, C3, E3, G3, B3, C4, E4, G4, C5, E5, C6
(каждые 3-4 полутона)

↓

Питч-шифтинг в сэмплере: ±2-3 полутона максимум
(больше = артефакты)
```

### Схема для духовых (Shakuhachi)
```
Записать каждую ноту хроматически в рабочем диапазоне:
C4, C#4, D4... C6 (25 нот)

↓

Духовые плохо переносят питч-шифтинг из-за формант
```

### Velocity Layers (если нужно)
```
Для каждого записанного pitch:
- Записать на velocity 30 (тихо, мягкая атака)
- Записать на velocity 70 (средне)
- Записать на velocity 120 (громко, яркая атака)

↓

В сэмплере: crossfade между слоями по velocity
```

### Практический пример: Запись Koto в Reaper
```python
# Reaper Python-скрипт для автоматизации записи (концепт)
import reaper

notes_to_record = [36, 40, 44, 48, 52, 55, 60, 64, 67, 72]  # MIDI ноты (C1, E1, G1...)
track = reaper.GetTrack(0, 0)
plugin_id = 0  # Индекс VST на треке

for midi_note in notes_to_record:
    # 1. Создать MIDI-ивент для ноты
    reaper.MIDI_InsertNote(track, True, False, 0, 480, midi_note, 100, False)
    
    # 2. Записать/рендерить трек в аудио
    # (использовать RenderStems или записать на другой трек)
    
    # 3. Переименовать файл: Koto_C3_Vel100.wav
    # 4. Удалить MIDI-ивент, перейти к следующей ноте
```

---

## ✂️ Этап 3: Редактирование сэмплов

### Базовая обработка (обязательно для каждого сэмпла)
| Действие | Инструмент | Цель |
|----------|-----------|------|
| **Trim** | Любое DAW | Убрать тишину до атаки |
| **Normalize** | -6 dB peak | Единый уровень громкости |
| **Fade In/Out** | 5–20 ms | Убрать clicks на краях |
| **DC Offset Removal** | iZotope RX / DAW | Убрать постоянную составляющую |
| **Loop Points** (для сустейна) | Kontakt / SFZ Editor | Бесконечный сустейн |

### Поиск точек лупа (для длинных нот)
```
1. Найти участок с устойчивым спектром (после атаки, до затухания)
2. Поставить Loop Start / Loop End в zero-crossing points
3. Включить Crossfade лупа (10–50 ms) для бесшовности
4. Проверить на слух: нет ли "пульсации" или артефактов
```

### Пакетная обработка (Batch Processing)
Используйте **SoX**, **FFmpeg** или **ReaBatch** для автоматизации:

```bash
# Пример: SoX - нормализация + fade для всех файлов в папке
for f in *.wav; do
  sox "$f" "processed/$f" norm -6 fade q 0.005 0 0.02
done
```

---

## 🗺 Этап 4: Маппинг в сэмплер

### Форматы инструментов
| Формат | Плюсы | Минусы |
|--------|-------|--------|
| **Kontakt (.nki)** | Индустриальный стандарт, мощный скриптинг | Платный, проприетарный |
| **SFZ** | Бесплатный, текстовый, открытый | Меньше фич, зависит от плеера |
| **Decent Sampler** | Бесплатный, простой, растущий | Меньше возможностей, чем Kontakt |
| **Logic EXS24 / Ableton Simpler** | Нативный для DAW | Не кросс-платформенный |

### Пример SFZ-файла для Koto
```sfz
// Koto_Edo.sfz
<global> sample=./samples/
<control> set_cc101=64  // Sustain pedal

// Группа для низких нот (C1-C3)
<group> lokey=C1 hikey=B2 root=36 pitch_keycenter=36
<region> sample=Koto_C1_vel100.wav lovel=0 hivel=127 ampeg_attack=0.01 ampeg_release=0.5

// Группа для средних нот (C3-C5)
<group> lokey=C3 hikey=B4 root=48 pitch_keycenter=48
<region> sample=Koto_C3_vel100.wav lovel=0 hivel=127 ampeg_attack=0.01 ampeg_release=0.5

// Группа для высоких нот (C5+)
<group> lokey=C5 hikey=C8 root=72 pitch_keycenter=72
<region> sample=Koto_C5_vel100.wav lovel=0 hivel=127 ampeg_attack=0.01 ampeg_release=0.3

// Velocity layers (пример для одной ноты)
<group> lokey=C3 hikey=C3
<region> sample=Koto_C3_vel30.wav lovel=0 hivel=40
<region> sample=Koto_C3_vel70.wav lovel=41 hivel=90
<region> sample=Koto_C3_vel120.wav lovel=91 hivel=127
```

### Маппинг в Kontakt (KSP-скрипт для аутентичности)
```ksp
// Добавить случайный детюн для "живости"
on note
  %detune := random(-5, 5)  // ±5 центов
  set_engine_par($ENGINE_PAR_DETUNE, %detune, $EVENT_PAR_CHANNEL, $EVENT_PAR_ID)
end on

// Добавить глиссандо при высоком velocity
on note
  if ($EVENT_VELOCITY > 100)
    fade_in($EVENT_ID, 5000)  // 5ms fade для резкой атаки
    set_event_par($EVENT_ID, $EVENT_PAR_PITCH, random(-12, 12))  // Случайный бенд
  end if
end on
```

---

## 🎚 Этап 5: Экспорт и организация

### Структура папок для продакшна
```
Koto_Edo_Library/
├── Samples/
│   ├── C1/
│   │   ├── Koto_C1_vel30.wav
│   │   ├── Koto_C1_vel70.wav
│   │   └── Koto_C1_vel120.wav
│   ├── C#2/
│   └── ...
├── Instruments/
│   ├── Koto_Edo.nki (Kontakt)
│   ├── Koto_Edo.sfz (SFZ)
│   └── Koto_Edo.decentpreset (Decent Sampler)
├── Documentation/
│   ├── README.md (диапазон, velocity layers, CC-маппинг)
│   └── Changelog.txt
└── Demos/
    ├── Koto_Edo_Demo.wav
    └── MIDI_Grooves/
```

### Метаданные для удобства
Добавьте в файлы или документацию:
```markdown
## Koto_Edo v1.0
- Диапазон: C1–C6
- Velocity layers: 3 (soft/med/hard)
- Round robins: 2 (если записывали дубли)
- CC-маппинг:
  • CC#1 (Mod Wheel): Vibrato depth
  • CC#11 (Expression): Громкость
  • CC#74 (Brightness): Filter cutoff
- Sample rate: 48 kHz / 24-bit
- Лицензия: Royalty-free для музыки
```

---

## ⚡ Продвинутые техники для аутентичности

### 1. Round Robin (чередование сэмплов)
Запишите **2–4 дубля** одной ноты и чередуйте их при воспроизведении:
```sfz
<region> sample=Koto_C3_take1.wav seq_position=1
<region> sample=Koto_C3_take2.wav seq_position=2
<region> sample=Koto_C3_take3.wav seq_position=3
```
*Убирает "machine gun effect" при быстрых повторах.*

### 2. Humanization через случайные параметры
```ksp
// Kontakt KSP: случайный сдвиг времени атаки
on note
  %random_offset := random(0, 20)  // 0–20 ms
  set_event_par_arr($EVENT_ID, $EVENT_PAR_ALLOW_GROUP, 1, %random_offset)
end on
```

### 3. Release Samples (звук затухания)
Запишите отдельно **release tails** (звук, когда отпускаете клавишу):
```sfz
// Trigger release sample при note-off
<region> sample=Koto_C3_release.wav trigger=release lokey=C3 hikey=C3
```

### 4. Articulation Switching
Добавьте переключение между техниками (щипок, глушение, глиссандо):
```ksp
// Keyswitch на C0 = обычный щипок, C#0 = глиссандо
if ($NOTE = 0)  // C0
  %articulation := 0  // normal
elseif ($NOTE = 1)  // C#0
  %articulation := 1  // glissando
end if
```

---

## 🛠 Инструменты для каждого этапа

| Этап | Бесплатные | Платные (профи) |
|------|-----------|-----------------|
| **Запись** | Reaper, Audacity | Pro Tools, Logic Pro |
| **Редактирование** | Audacity, Ocenaudio | iZotope RX, Sound Forge |
| **Пакетная обработка** | SoX, FFmpeg, ReaBatch | Batch Processor, Sample Manager |
| **Сэмплер** | Decent Sampler, SFZ (Plogue) | Kontakt, HALion, UVI Workstation |
| **Маппинг** | SFZ Editor, Decent Sampler UI | Kontakt Instrument Builder, Endless Series Falcon |

---

## 📦 Чек-лист перед релизом библиотеки

- [ ] Все сэмплы нормализованы и без клиппинга
- [ ] Fade in/out на всех сэмплах (нет clicks)
- [ ] Loop points проверены на бесшовность
- [ ] Pitch mapping работает без артефактов (±3 полутона максимум)
- [ ] Velocity layers crossfaded плавно
- [ ] Round robins включены (если записывали дубли)
- [ ] CC-маппинг документирован
- [ ] Инструмент протестирован в целевой DAW
- [ ] Лицензия и метаданные приложены

---

## 💡 Итоговая рекомендация

```
Для продакшн-качества:

1. Записывайте каждые 3–4 полутона (не каждую ноту)
2. Используйте 2–3 velocity слоя для экспрессии
3. Добавьте Round Robin (2 дубля) для реалистичности
4. Обрабатывайте пакеты скриптами (SoX/FFmpeg)
5. Собирайте в SFZ (бесплатно) или Kontakt (профи)
6. Документируйте CC-маппинг и диапазон

Результат: библиотека из ~50–100 сэмплов, 
которая заменяет 1400-параметровый пресет 
и работает в любой DAW без нагрузки на CPU.
```

> 🎯 **Бонус**: Если делаете для себя — начните с **Decent Sampler** (бесплатно, просто, кросс-платформенно). Если для продажи — **Kontakt** остаётся индустриальным стандартом.