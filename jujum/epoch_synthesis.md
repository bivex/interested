# 🎼 Исторические эпохи: Инструменты для синтеза

Таблица инструментов по векам, которые можно **реалистично синтезировать** (FM, Physical Modeling, Wavetable), а не только сэмплировать.

| Год/Век | Эпоха | Инструменты (синтезируемые) | Кол-во | Лучший метод синтеза | Примечание |
|---------|-------|----------------------------|--------|---------------------|------------|
| **3000–500 до н.э.** | Древний мир | Лира, Арфа, Аулос, Сиринкс, Барабаны | ~8 | Physical Modeling + Noise | Духовые: шум + фильтр; Струны: плетёные модели |
| **500–1400** | Средневековье | Ребек, Псалтериум, Органетум, Шалмей, Ротта | ~12 | FM + Subtractive | Шалмей: 2 osc + distortion; Орган: additive |
| **1400–1600** | Ренессанс | Виола да гамба, Лютня, Клавикорд, Ренессанс-флейта, Крумгорн | ~15 | Physical Modeling + Wavetable | Лютня: pluck + body resonance; Клавикорд: FM vibrato |
| **1600–1750** | Барокко | Клавесин, Виолончель, Гобой, Тромпет, Тимпани, Теорба | ~20 | FM + Physical Modeling | Клавесин: FM pluck; Гобой: dual osc + formant filter |
| **1750–1820** | Классицизм | Фортепиано (раннее), Кларнет, Валторна, Фагот, Литавры | ~18 | Physical Modeling + Wavetable | Фортепиано: multi-samp + modeled hammer; Духовые: formant synthesis |
| **1820–1900** | Романтизм | Современное фортепиано, Туба, Английский рожок, Арфа-концерт, Челеста | ~22 | Physical Modeling + Granular | Челеста: FM bell; Арфа: pluck + long release + reverb |
| **1900–1950** | Ранний модерн | Терменвокс, Онд Мартено, Электроорган, Prepared Piano, Бандонеон | ~15 | FM + Subtractive + Wavetable | Терменвокс: sine + pitch LFO; Бандонеон: reed model + bellows noise |
| **1950–1980** | Электронная эра | Moog, ARP, DX7, Drum Machine, Tape Loops, Synthesizer Strings | ~30+ | **Все методы** | Это родная территория синтеза — 100% совместимость |
| **1980–2000** | Цифровая эра | FM-синты, Wavetable, Samplers, ROMplers, Grooveboxes | ~40+ | Wavetable + FM + Sampling | Serum, FM8, Waldorf — прямые наследники |
| **2000–2026** | Современность | Виртуальные аналоговые, AI-синтез, Physical Modeling 2.0, Neural DSP | ~50+ | Neural + Physical Modeling + AI | SWAM, AAS, Audio Modeling — максимальная аутентичность |

---

## 🎯 Детализация по ключевым эпохам

### 🏛 Древний мир / Средневековье (до 1400)
| Инструмент | Метод синтеза | Ключевые параметры |
|------------|--------------|-------------------|
| **Лира / Арфа** | Physical Modeling (струна) | String material, pluck position, body resonance |
| **Аулос / Сиринкс** | Subtractive + Noise | Dual osc (reed), breath noise, formant filter |
| **Органетум** | Additive / FM | Harmonic series, pipe length, wind pressure |
| **Ребек** | FM + Resonator | Bow noise, string detune, body filter |

> ⚠️ **Сложность**: Высокая. Акустические нюансы трудно синтезировать. Лучше использовать **гибрид**: синтез атаки + сэмпл тела.

---

### 🎻 Барокко / Классицизм (1600–1820)
| Инструмент | Метод синтеза | Ключевые параметры |
|------------|--------------|-------------------|
| **Клавесин** | FM Pluck | Quick decay, harmonic richness, key click noise |
| **Виолончель** | Physical Modeling | Bow speed/pressure, string material, body resonance |
| **Гобой / Фагот** | Formant Synthesis | Dual reed osc, formant filters, breath envelope |
| **Фортепиано (раннее)** | Wavetable + Modeling | Hammer hardness, string length, soundboard resonance |
| **Валторна** | FM + Filter | Lip vibration model, bell resonance, hand mute effect |

> ✅ **Реалистичность**: Средняя/Высокая. Physical Modeling (AAS, SWAM) даёт отличные результаты.

---

### 🎹 Романтизм / Ранний модерн (1820–1950)
| Инструмент | Метод синтеза | Ключевые параметры |
|------------|--------------|-------------------|
| **Фортепиано (совр.)** | Multi-samp + Modeling | Velocity layers, pedal resonance, string sympathetic |
| **Челеста** | FM Bell | 4-operator bell algorithm, soft attack, long release |
| **Терменвокс** | Sine + Pitch LFO | Antenna distance → pitch/volume, vibrato depth |
| **Бандонеон** | Reed Modeling + Noise | Bellows envelope, reed chorus, key click |
| **Электроорган** | Subtractive / Tonewheel | Drawbar harmonics, key click, rotary speaker sim |

> ✅ **Реалистичность**: Высокая. Многие инструменты уже имеют отличные виртуальные версии.

---

### 🎛 Электронная эра и далее (1950–2026)
| Инструмент | Метод синтеза | Ключевые параметры |
|------------|--------------|-------------------|
| **Moog / ARP** | Subtractive Analog Model | VCO drift, filter resonance, envelope amount |
| **DX7** | FM (6-operator) | Algorithm, envelope rates, feedback, detune |
| **Drum Machine** | Sample + Synth Hybrid | Pitch envelope, noise decay, tuning, layering |
| **Wavetable Synth** | Wavetable Scanning | Position modulation, morphing, unison, FX |
| **Neural / AI Synth** | ML-generated timbres | Latent space navigation, style transfer, expression |

> ✅ **Реалистичность**: 100%. Это "родная" территория синтеза.

---

## 📊 Сводная статистика

```
Всего синтезируемых исторических инструментов: ~200+

По методам:
• Physical Modeling: 85 инструментов (струнные, духовые, ударные)
• FM Synthesis: 60 инструментов (металлические, колокола, клавишные)
• Subtractive: 45 инструментов (органы, ранние электронные)
• Wavetable: 40 инструментов (гибридные, атмосферные)
• Additive/Granular: 25 инструментов (экзотические, текстурные)

По эпохам (кол-во синтезируемых):
• Древний мир:      ~8
• Средневековье:    ~12
• Ренессанс:        ~15
• Барокко:          ~20
• Классицизм:       ~18
• Романтизм:        ~22
• Ранний модерн:    ~15
• Электронная эра:  ~30+
• Цифровая эра:     ~40+
• Современность:    ~50+
```

---

## 🛠 Практическая матрица: "Эпоха → VST → Метод"

```json
{
  "Edo_Period_Japan": {
    "instruments": ["koto", "shamisen", "shakuhachi", "taiko"],
    "recommended_vst": ["Dexed", "AAS String Studio", "Vital"],
    "synthesis_method": "FM + Physical Modeling + Noise",
    "difficulty": "medium"
  },
  "Baroque_Europe": {
    "instruments": ["harpsichord", "recorder", "viol", "lute"],
    "recommended_vst": ["FM8", "Chromaphone", "SWAM"],
    "synthesis_method": "FM Pluck + Formant + Physical Modeling",
    "difficulty": "medium-high"
  },
  "Romantic_Orchestra": {
    "instruments": ["piano", "cello", "oboe", "harp", "celesta"],
    "recommended_vst": ["Keyscape", "SWAM", "Omnisphere"],
    "synthesis_method": "Multi-samp + Physical Modeling + FM",
    "difficulty": "low-medium"
  },
  "Electronic_1980s": {
    "instruments": ["DX7", "Juno", "TR-808", "Fairlight"],
    "recommended_vst": ["Dexed", "Arturia V Collection", "Serum"],
    "synthesis_method": "Native (FM/Subtractive/Wavetable)",
    "difficulty": "low"
  }
}
```

---

## ⚡ Чек-лист: Можно ли синтезировать инструмент?

```
[✓] Есть ли периодический источник звука? (струна, столб воздуха, мембрана)
[✓] Можно ли описать тембр гармониками или формантами?
[✓] Есть ли повторяющаяся атака/затухание (ADSR-подобная)?
[✓] Не требует ли инструмент сложной физической нелинейности?

Если 3+ "Да" → Синтез возможен с хорошим результатом.
Если 1–2 "Да" → Гибрид: синтез + сэмплы.
Если 0 "Да" → Только сэмплы / запись живого инструмента.
```

---

## 💡 Итоговая рекомендация

```
Для исторической аутентичности через синтез:

1. Барокко и позже: Physical Modeling + FM дают 80–95% реализма
2. Средневековье и древность: Гибрид (синтез атаки + сэмпл тела)
3. Электронная эра: 100% синтез, родная территория
4. Для продакшна: Используйте готовые виртуальные инструменты 
   (Arturia, SWAM, AAS) + докручивайте параметры

Оптимальный стек для "исторического синтеза":
• JUCE Host + VST3 SDK (для контроля параметров)
• AAS / SWAM / Dexed (для тембров)
• SFZ / Kontakt (для финальной сборки библиотеки)
• Valhalla / Soundtoys (для атмосферы эпохи)
```

> 🎯 **Главное**: Синтез исторических инструментов — это не про 100% копирование, а про **передачу характера**. Иногда 3 правильно настроенных параметра (Attack, Filter, Reverb) дают больше "духа эпохи", чем 1400 сырых сэмплов.