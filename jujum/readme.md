# 🗜 Сжатие Параметров VST для ИИ (Case: Serum 1400+ params)

**Проблема:** 1400 параметров = 90% шума (UI, MIDI-слоты, внутренние флаги). ИИ потеряет фокус, потратит токены на мусор.  
**Задача:** Сократить до ~50–100 **семантически значимых** параметров.  
**Принцип:** Передавать не *ID*, а *смысл*.

---

## 📉 Стратегия Уплотнения (5 Шагов)

### 1. Фильтрация (Whitelisting)
Отбросьте всё, что не влияет на звук напрямую.
| Исключить | Оставить |
|-----------|----------|
| `UI_Theme`, `Window_Pos` | `OSC_Wave`, `FLT_Cutoff` |
| `MIDI_Learn_Slot_1–128` | `ENV_Attack`, `LFO_Rate` |
| `Preset_Name_Internal` | `FX_Reverb_Mix` |
| `Unused_Reserved` | `Macro_1–8` |

### 2. Семантический Маппинг
Замените технические ID на понятные имена.
- ❌ `param_1045_val_0.543`
- ✅ `filter_cutoff: 0.54`

### 3. Группировка по Иерархии
Вложите параметры в логические блоки (JSON).
```json
{
  "oscillators": { ... },
  "filter": { ... },
  "envelopes": { ... }
}
```

### 4. Квантование Значений
Не нужна точность до 7 знака после запятой для ИИ.
- ❌ `0.5432198`
- ✅ `0.54` или `"Mid"`

### 5. Дельта-Кодирование (Для Автоматизации)
Передавайте только **изменения**, а не полный дамп.
- ❌ `Send all 1400 params every frame`
- ✅ `Send only changed params: [{id: 104, val: 0.6}]`

---

## 📦 Пример: До и После

### ❌ До (Raw Dump — 1400 строк)
```text
param_0=0.00
param_1=1.00
...
param_104=0.54321
...
param_1399=0.00
```
*ИИ не понимает, что такое `param_104`.*

### ✅ После (Compressed JSON — ~50 строк)
```json
{
  "synth": "Serum",
  "preset": "Edo_Koto",
  "sound_shaping": {
    "osc_a": { "wave": "saw", "detune": 0.15, "semitone": 0 },
    "osc_b": { "wave": "noise", "mix": 0.3 },
    "filter": { "type": "LP", "cutoff": 0.65, "resonance": 0.4 },
    "env_1": { "attack": 0.01, "decay": 0.4, "sustain": 0.2, "release": 0.6 }
  },
  "fx": { "reverb": 0.35, "delay": 0.1 },
  "scale": ["C", "Db", "F", "G", "Bb"]
}
```
*ИИ видит структуру, может редактировать `cutoff`, не зная ID.*

---

## 🛠 Техническая Реализация (C++ / Python)

### 1. Создать Словарь Маппинга
Храните соответствие `ID ↔ Имя` локально, не передавайте ИИ сырые ID.
```cpp
std::map<int, std::string> paramMap = {
    {104, "filter_cutoff"},
    {105, "filter_res"},
    {200, "osc_a_wave"}
};
```

### 2. Экспорт Только Активных
При отправке запроса ИИ фильтруйте параметры программно.
```python
# Python pseudocode
relevant_params = [p for p in all_params if p.group in ['OSC', 'FLT', 'ENV']]
payload = {p.name: round(p.value, 2) for p in relevant_params}
```

### 3. Использование Макросов (Лучший Вариант)
Serum имеет 8 макросов. Привяжите ключевые параметры к ним.
- **ИИ управляет 8 макросами** вместо 1400 параметров.
- Вы заранее настраиваете: `Macro 1 = Cutoff + Res`, `Macro 2 = Attack + Decay`.
- **Сжатие:** 1400 → 8 параметров.

---

## ⚡ Чек-лист Перед Отправкой ИИ

- [ ] **Удалены ли UI параметры?** (Темы, позиции окон)
- [ ] **Заменены ли ID на имена?** (`param_104` → `cutoff`)
- [ ] **Сгруппированы ли данные?** (OSC, FLT, FX)
- [ ] **Округлены ли значения?** (2 знака после запятой)
- [ ] **Использованы ли макросы?** (Если возможно)
- [ ] **Отправлены только изменения?** (Для realtime)

---

## 💡 Итог
**Не скармливайте ИИ сырой дамп VST.**  
1. **Отфильтруйте** мусор (оставьте ~50 звуковых параметров).  
2. **Переименуйте** ID в человеческие имена.  
3. **Сгруппируйте** в JSON.  
4. **Идеал:** Пробросьте управление через **8 Макросов**.

> **Правило:** ИИ должен управлять **звуком**, а не **интерфейсом**.vst

Отлично! Я нашёл полезную информацию. Вот **как переводить hex/числовые ID параметров в понятные имена**:

## 📚 Основные Методы

### 1. **Использование `getParameterInfo()` (VST3 SDK)**
В VST3 каждый параметр имеет метаданные, которые можно получить программно [[78]][[84]]:

```cpp
// Для каждого параметра получаем информацию
ParameterInfo info;
controller->getParameterInfo(paramIndex, info);

// info содержит:
// - id: уникальный 32-bit идентификатор (ParamID)
// - title: читаемое имя ("Cutoff", "Resonance")
// - units: единицы измерения ("Hz", "dB", "")
// - minVal, maxVal: диапазон значений
```

Параметр ID — это уникальный идентификатор внутри плагина, который хост использует для автоматизации [[2]].

### 2. **Создание Словаря Маппинга (Dictionary Mapping)**
Если нужно текст/значения менять через автоматизацию, создайте словарь, сопоставляющий целочисленные значения со строками [[50]]:

```json
{
  "param_map": {
    "0": "osc_a_wave",
    "1": "osc_a_detune", 
    "104": "filter_cutoff",
    "105": "filter_resonance",
    "200": "env_attack",
    "201": "env_decay"
  }
}
```

### 3. **Параметр Function Name (VST3.7+)**
VST3.7+ позволяет получить параметр с конкретным смыслом (functionName) для данной единицы измерения [[51]]:

```cpp
// Хост может автоматически маппить параметры на UI контролы
// Например: wet-dry mix knob, Randomize button
IParameterFunctionName::getParameterInfo(functionName, unit, paramID)
```

### 4. **Интеллектуальное Автоматическое Маппирование**
Существуют системы, которые распознают, организуют и маппят параметры плагинов мгновенно [[49]]:

- Распознавание по имени параметра
- Группировка по категориям (OSC, FILT, ENV, FX)
- Автоматическое присвоение читаемых имен

## 🛠 Практическая Реализация

### Шаг 1: Извлечь Все Параметры
```python
# Псевдокод для извлечения параметров
def extract_plugin_params(plugin):
    param_dict = {}
    for i in range(plugin.getParameterCount()):
        info = plugin.getParameterInfo(i)
        param_dict[info.id] = {
            'name': info.title,
            'units': info.units,
            'min': info.minVal,
            'max': info.maxVal,
            'index': i
        }
    return param_dict
```

### Шаг 2: Создать Mapping Table
Parameter mapping table позволяет автоматически маппить параметры во время экспорта/импорта [[72]][[75]]:

```json
{
  "Serum": {
    "104": {"name": "filter_cutoff", "group": "filter", "scale": "log"},
    "105": {"name": "filter_res", "group": "filter", "scale": "linear"},
    "200": {"name": "env_attack", "group": "envelope", "scale": "log"}
  }
}
```

### Шаг 3: Использовать JUCE AudioParameterWithID
В JUCE используйте `AudioProcessorParameterWithID`, который правильно сообщает ID параметров DAW [[21]][[28]]:

```cpp
parameters.add(std::make_unique<AudioParameterFloat>(
    "filter_cutoff",        // parameterID (читаемое!)
    "Filter Cutoff",        // parameterName
    NormalisableRange<float>(20.0f, 20000.0f, 0.001f, 0.5f),
    1000.0f,
    [](float value) { return String(value) + " Hz"; }
));
```

## 📋 Готовые Решения

### Для Serum
1. **Официальная документация Serum** содержит список параметров
2. **Xfer Records форум** — пользователи делятся параметрами
3. **GitHub репозитории** — некоторые содержат парсеры Serum presets (.fxp файлы)

### Универсальный Подход
```cpp
// Создать кэш параметров при загрузке плагина
class ParameterCache {
    std::map<ParamID, String> idToName;
    std::map<String, ParamID> nameToId;
    
    void buildCache(AudioPluginInstance* plugin) {
        for (auto* param : plugin->getParameters()) {
            ParamID id = getParamID(param); // VST3 specific
            String name = param->getName(64);
            idToName[id] = name;
            nameToId[name] = id;
        }
    }
};
```

## ⚡ Ключевые Выводы

| Метод | Когда Использовать |
|-------|-------------------|
| **getParameterInfo()** | При разработке хоста (C++) |
| **Словарь маппинга** | Для быстрой конвертации ID→Name |
| **JUCE ParameterWithID** | При разработке плагинов на JUCE |
| **Автоматическое распознавание** | Для универсальных решений |

> 💡 **Важно**: VST3 параметры идентифицируются по **ParamID** (32-bit unique identifier), а не по индексу [[84]]. Хост использует этот ID для маппинга автоматизации [[3]].

Нужна помощь с созданием конкретного маппинга для Serum или другого плагина?


  📋 Полное резюме VST3 getParameterInfo() API                                                              
                                                                                                          
  1. Структура ParameterInfo (из VST3 SDK):                                                                 
                                                                                                            
  struct ParameterInfo {                                                                                    
      ParamID id;                  // уникальный ID параметра (int32)                                       
      String128 title;             // название ("Cutoff", "Resonance")                                      
      String128 shortTitle;        // короткое ("Cut", "Res")
      String128 units;             // единицы ("Hz", "dB", "%", "ms")
      int32 stepCount;             // 0=continuous, 1=toggle, >1=discrete
      ParamValue defaultNormalizedValue; // дефолт [0,1]
      UnitID unitId;               // ID группы параметров
      int32 flags;                 // флаги поведения
  };

  2. Паттерн чтения параметров (JUCE way):

  // Шаг 1: Получить количество параметров
  int32 count = editController->getParameterCount();

  // Шаг 2: Итерироваться по индексам и получать инфу
  for (int32 i = 0; i < count; ++i) {
      Vst::ParameterInfo info{};
      editController->getParameterInfo(i, info);

      // Используем метаданные:
      // - info.id → уникальный ID
      // - info.title → "Filter Cutoff"
      // - info.units → "Hz"
      // - info.flags → проверить на kIsHidden, kCanAutomate
  }

  3. Ключевые флаги для фильтрации:

  ┌──────────────┬─────────┬──────────────────────────┐
  │     Флаг     │   Бит   │         Описание         │
  ├──────────────┼─────────┼──────────────────────────┤
  │ kCanAutomate │ 1 << 0  │ Можно автоматизировать   │
  ├──────────────┼─────────┼──────────────────────────┤
  │ kIsReadOnly  │ 1 << 1  │ Только чтение            │
  ├──────────────┼─────────┼──────────────────────────┤
  │ kIsHidden    │ 1 << 4  │ Скрыт из UI - отсеиваем! │
  ├──────────────┼─────────┼──────────────────────────┤
  │ kIsBypass    │ 1 << 16 │ Bypass - отсеиваем!      │
  └──────────────┴─────────┴──────────────────────────┘

  4. Пример кода для Whitelist фильтрации:

  // Из JUCE: initialiseParameterList() строка 3124-3130
  for (int i = 0; i < editController->getParameterCount(); ++i) {
      Vst::ParameterInfo info{};
      editController->getParameterInfo(i, info);

      // Пропускаем bypass и скрытые параметры
      if (info.flags & Vst::ParameterInfo::kIsBypass)
          continue;
      if (info.flags & Vst::ParameterInfo::kIsHidden)
          continue;

      // Теперь info содержит:
      // - info.id = 104
      // - info.title = "Filter Cutoff"
      // - info.units = "Hz"
      // - info.stepCount = 0 (continuous)
  }
