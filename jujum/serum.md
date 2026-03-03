# 📅 Актуальные источники по маппингу параметров VST (2025–2026)

Вот **самые свежие данные** по методам перевода hex/числовых ID параметров в понятные имена:

---

## 🔥 Ключевые обновления 2025–2026

### 1. **VST3 SDK 3.7.11** (Ноябрь 2024 – Актуально)
Добавлен интерфейс **`IRemapParamID`** для миграции параметров [[4]]:

```cpp
// Позволяет хосту маппить старые индексы VST2 на новые ParamIDs VST3
tresult PLUGIN_API getCompatibleParamID(
    const TUID pluginToReplaceUID,  // UID старого плагина
    Vst::ParamID oldParamID,         // Старый ID/индекс
    Vst::ParamID& newParamID         // Новый ID (выход)
);
```
**Зачем:** При обновлении плагина или переходе с VST2 → VST3 автоматизация не ломается.

### 2. **JUCE 8** (Q3 2025) [[20]]
Добавлена функция **"VST3 parameter migration"**:
- Автоматическая миграция параметров при обновлении плагинов
- Поддержка `ParameterID` с версионированием
- Улучшенная работа с `AudioProcessorParameterWithID`

### 3. **Serum Reverse Engineering** (Апрель 2025 – Январь 2026) [[15]]
Сообщество активно исследует формат пресетов Serum:
- **~287 параметров** экспортируется через Pedalboard (демо-версия)
- **~348 параметров** в полной версии (по данным реверс-инжиниринга)
- Созданы инструменты для unpack/pack:
  - [serum-preset-packager (Python)](https://github.com/KennethWussmann/serum-preset-packager)
  - [node-serum2-preset-packager (TypeScript)](https://github.com/CharlesBT/node-serum2-preset-packager)

---

## 📋 Текущий статус методов маппинга

| Метод | Статус 2026 | Источник |
|-------|-------------|----------|
| **`getParameterInfo()`** (VST3 SDK) | ✅ Работает, базовый метод | [[5]] |
| **`IRemapParamID`** (VST3 3.7.11+) | ✅ Новый стандарт для миграции | [[4]] |
| **JUCE `AudioParameterWithID`** | ✅ Рекомендуется для хостов | [[19]][[20]] |
| **Словарь маппинга (JSON)** | ✅ Универсальный fallback | [[15]] |
| **Автоматическое распознавание по имени** | ⚠️ Ненадёжно (зависит от плагина) | [[30]] |

---

## 🛠 Практический подход на 2026 год

### Шаг 1: Извлечь метаданные при загрузке плагина
```cpp
// JUCE + VST3
for (auto* param : plugin->getParameters()) {
    auto id = getVST3ParamID(param);  // Кастомная функция для извлечения ParamID
    auto name = param->getName(64);
    auto range = param->getNormalisableRange();
    
    paramMap[id] = {
        .name = name,
        .group = detectGroup(name),  // OSC/FILT/ENV/FX
        .scale = detectScale(name),   // linear/log
        .steps = param->getNumSteps(),
        .min = range.start,
        .max = range.end
    };
}
```

### Шаг 2: Использовать `IRemapParamID` для совместимости
```cpp
// В EditController вашего плагина
tresult PLUGIN_API getCompatibleParamID(
    const TUID oldUID, 
    ParamID oldID, 
    ParamID& newID) 
{
    if (isKnownLegacyPlugin(oldUID)) {
        auto it = legacyMapping.find(oldID);
        if (it != legacyMapping.end()) {
            newID = it->second;
            return kResultTrue;
        }
    }
    return kResultFalse;
}
```

### Шаг 3: Кэшировать маппинг локально (для хостов)
```json
{
  "plugin_uid": "Xfer Serum",
  "version": "1.334",
  "param_map": {
    "104": {"name": "filter_cutoff", "group": "filter", "scale": "log", "min": 20, "max": 20000},
    "105": {"name": "filter_res", "group": "filter", "scale": "linear", "min": 0, "max": 1},
    "200": {"name": "env_attack", "group": "envelope", "scale": "log", "min": 0.001, "max": 2}
  },
  "last_updated": "2026-03-03"
}
```

---

## ⚠️ Важные ограничения (2026)

1. **VST2 vs VST3**: VST2 использует индексы (0,1,2...), VST3 — уникальные 32-bit ParamIDs [[3]][[7]]. При маппинге нужно учитывать это различие.

2. **Динамические параметры**: Некоторые плагины (Kontakt, Vital) меняют список параметров при загрузке пресета. Кэш может устареть.

3. **Серум**: Официального API для получения списка параметров нет. Сообщество использует реверс-инжиниринг [[15]].

4. **Поток безопасности**: Изменение параметров только на GUI Thread, не на audio thread [[5]].

---

## 🎯 Итоговая рекомендация

```
Для надёжного маппинга ID → имя в 2026:

1. При загрузке плагина:
   - Извлечь все параметры через getParameterInfo() / JUCE getParameters()
   - Сохранить: ID, имя, диапазон, шкалу, шаг

2. Для совместимости:
   - Реализовать IRemapParamID (если вы разработчик плагина)
   - Использовать кэш маппинга (если вы разработчик хоста)

3. Для Serum/закрытых плагинов:
   - Использовать сообщество-маппинги (GitHub)
   - Или пробрасывать управление через 8 макросов

4. Для ИИ-запросов:
   - Сжимать до ~50 семантических параметров
   - Группировать по OSC/FILT/ENV/FX
   - Округлять значения до 2 знаков
```

> 💡 **Главное**: Не передавайте ИИ сырые 1400 параметров Serum. Передавайте **смысл**: `{"filter": {"cutoff": 0.65, "res": 0.4}}`, а не `{"param_104": 0.65, "param_105": 0.4}`.