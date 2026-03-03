
### Пример YAML-спецификации инструмента для LLM-агента

```yaml
# agent_tools/grep_ast_tool.yaml
tool:
  name: "grep_ast_search"
  description: >
    Поиск структурных элементов кода (классы, методы, аннотации) 
    с использованием AST. Возвращает код в контексте синтаксического дерева.
  input_schema:
    type: object
    properties:
      pattern:
        type: string
        description: "Регулярное выражение или текстовый паттерн для поиска"
        example: "def check_requirement|@GetMapping|@KafkaListener"
      paths:
        type: array
        items: { type: string }
        description: "Список путей к файлам или директориям для поиска"
        default: ["./"]
      languages:
        type: array
        items: { type: string, enum: [python, go, kotlin, ruby, elixir, php] }
        description: "Опциональная фильтрация по языкам"
      context_depth:
        type: integer
        minimum: 1
        maximum: 5
        default: 2
        description: "Глубина контекста AST (родительские/дочерние узлы)"
    required: ["pattern"]

  output_format:
    type: object
    properties:
      matches:
        type: array
        items:
          type: object
          properties:
            file: { type: string }
            node_type: { type: string, enum: [function, class, method, annotation, call] }
            code_snippet: { type: string }
            ast_context: { type: object }  # родительские узлы дерева
            line_range: { type: object, properties: { start: integer, end: integer } }
      search_metadata:
        type: object
        properties:
          files_scanned: integer
          parse_errors: array

  execution:
    command: "grep-ast"
    args:
      - "{pattern}"
      - "{paths}"
      - "--languages={languages}"
      - "--context={context_depth}"
      - "--output=json"  # критично для парсинга LLM
    timeout_seconds: 30
    max_results: 50

  agent_usage_guidelines:
    - "Используйте для точного поиска точек входа: хендлеры, контроллеры, Kafka producer/consumer"
    - "Паттерн может быть regex, но помните: поиск идёт по AST, а не по тексту"
    - "Если результат пустой — попробуйте упростить паттерн или расширить paths"
    - "Для итеративного исследования: сначала найдите класс, затем методы внутри"
```

### Как это интегрируется в агент (псевдокод)

```python
# Пример обёртки для tool calling
class GrepAstTool:
    def __call__(self, pattern: str, paths: List[str], **kwargs):
        result = subprocess.run(
            ["grep-ast", pattern, *paths, "--output=json", ...],
            capture_output=True, text=True
        )
        return json.loads(result.stdout)  # LLM получает структурированный AST-контекст
```

### Почему именно такой формат?

1. **Структурированный вход/выход** — LLM работает с JSON, а не с сырым текстом grep.
2. **AST-контекст** — в ответе передаётся не просто строка, а узел дерева с родителями (класс → метод → тело).
3. **Метаданные поиска** — агент понимает, сколько файлов просканировано и были ли ошибки парсинга.
4. **Guidelines для LLM** — подсказки в спецификации помогают модели формулировать более точные запросы.

---
