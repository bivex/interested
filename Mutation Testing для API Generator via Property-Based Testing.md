# Mutation Testing для API Generator via Property-Based Testing

начинаем не с ручного написания пар "вход → ожидаемый выход", а с **генеративного тестирования и property-based подхода**, формулируем инварианты и свойства системы, которые должны держаться при любых входных данных, используем библиотеки для property-based testing (Hypothesis для Python, fast-check для TypeScript/JavaScript, QuickCheck для Haskell, ScalaCheck, jqwik для Java), определяем **генераторы валидных входных данных**: SQL DDL generator (создаёт случайные но синтаксически корректные CREATE TABLE statements с разными типами, constraints, foreign keys), Database schema generator (генерирует доменную модель Database со случайным набором таблиц, колонок, связей), Config generator (случайные но валидные конфигурации маппинга), строим **генераторы мутаций**: MutateSQLType (меняем VARCHAR на TEXT, INT на BIGINT), MutateNullability (добавляем/убираем NOT NULL), MutateConstraint (добавляем/убираем UNIQUE, CHECK), MutateForeignKey (меняем ON DELETE CASCADE на RESTRICT), MutateTableName (переименовываем таблицу), MutateColumnName (переименовываем колонку), каждая мутация — это трансформация входных данных, которая должна приводить к предсказуемому изменению выходного OpenAPI, формулируем **properties (инварианты)**, которые должны выполняться всегда:

**Property 1: Idempotence** — запуск генератора дважды на одном и том же SQL даёт побитово идентичный YAML (или семантически эквивалентный JSON после парсинга), проверяем: `generateOpenAPI(sql, config) == generateOpenAPI(sql, config)`, генерим случайные SQL-схемы и прогоняем дважды, сравниваем результаты через deep equality или canonical YAML diff.

**Property 2: Roundtrip Consistency** — если мы сгенерировали OpenAPI из SQL, а потом из этого OpenAPI можем восстановить логическую схему БД (partial roundtrip), то ключевые сущности (ресурсы, поля, типы) должны совпадать, проверяем: `extractSchema(generateOpenAPI(sql)) ≈ sql` (с учётом потерь информации, которые допустимы), генерим SQL-схемы, прогоняем через генератор, парсим OpenAPI обратно в доменную модель, сравниваем структуру таблиц и ресурсов.

**Property 3: Schema Coverage** — каждая таблица из SQL должна превратиться хотя бы в один OpenAPI path, каждая колонка должна появиться в schema как property (если не исключена конфигом), проверяем: `all_tables(sql) ⊆ paths(openapi)` и `all_columns(table) ⊆ schema_properties(resource)`, генерим схемы с N таблицами, проверяем что в OpenAPI появилось >= N paths (с учётом CRUD операций).

**Property 4: Type Mapping Correctness** — SQL-типы маппятся в JSON Schema types корректно и консистентно, проверяем таблицу соответствий: `VARCHAR/TEXT → string`, `INT/BIGINT → integer`, `BOOLEAN → boolean`, `TIMESTAMP → string format:date-time`, `DECIMAL → number`, генерим колонки всех возможных SQL-типов, проверяем что в сгенерированной OpenAPI-схеме для каждой колонки type и format корректны.

**Property 5: Constraint Preservation** — SQL constraints (NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY) отражаются в OpenAPI, проверяем: NOT NULL колонка → `required: true` в schema, UNIQUE → добавлен в description или x-unique, PRIMARY KEY → помечен как identifier/ID, FOREIGN KEY → reference через `$ref` или связь в links, генерим таблицы с разными constraints, проверяем наличие соответствующих маркеров в OpenAPI.

**Property 6: Relationship Mapping** — foreign keys превращаются в либо nested schemas, либо references, либо links в OpenAPI, проверяем: для каждой FK должен быть либо `$ref: '#/components/schemas/...'`, либо link object с `operationRef`, генерим схемы с 1-to-many, many-to-many связями, проверяем что в OpenAPI есть соответствующие ссылки.

**Property 7: Naming Convention Consistency** — если в конфиге задана naming convention (snake_case → camelCase, singular → plural для endpoints), она применяется ко всем таблицам/колонкам единообразно, проверяем: если `users` table и config = `{pluralize: true, camelCase: true}` → путь должен быть `/users` с camelCase полями в schema, генерим схемы и разные конфиги, проверяем что naming rules применены везде.

**Property 8: Validation Against OpenAPI Schema** — сгенерированный YAML всегда валидный OpenAPI 3.x документ, проверяем: парсим YAML, валидируем через официальный JSON Schema OpenAPI, не должно быть ошибок, генерим произвольные SQL-схемы, прогоняем через генератор, валидируем output через OpenAPI validator.

**Property 9: Mutation Impact Locality** — маленькая мутация в SQL (добавили одну колонку, изменили тип одной колонки) должна вызывать маленькое изменение в OpenAPI (изменился один schema property), проверяем diff между `generateOpenAPI(sql)` и `generateOpenAPI(mutate(sql))`, он должен быть локальным, генерим SQL-схему, делаем точечную мутацию, сравниваем YAML-diff, проверяем что изменилась только одна секция.

**Property 10: Error Handling Completeness** — невалидный SQL (циклические FK без CASCADE, таблица без PK) должен либо вызывать понятную ошибку, либо генерировать OpenAPI с предупреждением, но не падать с stacktrace, проверяем: генератор возвращает либо `Ok(spec)`, либо `Err(ValidationError)`, но не throws unhandled exception, генерим невалидные SQL-схемы (negative testing), ловим и проверяем ошибки.

строим **mutation-based testing workflow**:

1. **Generate base SQL schema** — используем property-based генератор для создания случайной но валидной SQL-схемы (N таблиц, M колонок, K foreign keys).

2. **Generate OpenAPI spec** — прогоняем SQL через наш генератор, получаем `baseline_openapi.yaml`.

3. **Apply mutation** — выбираем случайную мутацию из набора (mutate column type, add constraint, remove table, rename field) и применяем к SQL-схеме, получаем `mutated_sql`.

4. **Generate mutated OpenAPI spec** — прогоняем `mutated_sql` через генератор, получаем `mutated_openapi.yaml`.

5. **Assert expected diff** — для каждого типа мутации у нас есть ожидаемый паттерн изменений в OpenAPI, проверяем что diff между `baseline` и `mutated` соответствует ожиданиям, например:
   - Если мутация: `INT → BIGINT` на колонке `age`, то в diff должно быть: изменение `type: integer` осталось, но может измениться `format` или `maximum`.
   - Если мутация: добавили `NOT NULL` на колонке `email`, то в diff должно быть: `email` появился в `required` array.
   - Если мутация: удалили таблицу `orders`, то в diff должно быть: исчез path `/orders` и все связанные operations.

6. **Shrink on failure** — если property-based тест нашёл контрпример (мутация, для которой diff некорректен), библиотека автоматически упрощает (shrinking) входные данные до минимального воспроизводимого примера.

используем **snapshot testing** в сочетании с property-based: для каждого сгенерированного SQL делаем snapshot сгенерированного OpenAPI, при повторном прогоне сравниваем с snapshot, если изменилось — либо intentional change (обновляем snapshot), либо regression (фиксим баг), property-based тесты генерируют тысячи случайных входов и автоматически создают snapshot'ы для них.

строим **mutation operators** как отдельные трансформации:

```typescript
// Пример mutation operators (TypeScript псевдокод)

type SQLMutation = (schema: DatabaseSchema) => DatabaseSchema;

const mutateColumnType: SQLMutation = (schema) => {
  const table = randomChoice(schema.tables);
  const column = randomChoice(table.columns);
  const newType = randomChoice(['VARCHAR', 'TEXT', 'INT', 'BIGINT', 'BOOLEAN', 'TIMESTAMP']);
  return schema.updateColumn(table.name, column.name, { type: newType });
};

const addNotNullConstraint: SQLMutation = (schema) => {
  const table = randomChoice(schema.tables);
  const column = randomChoice(table.columns.filter(c => c.nullable));
  return schema.updateColumn(table.name, column.name, { nullable: false });
};

const addForeignKey: SQLMutation = (schema) => {
  const sourceTable = randomChoice(schema.tables);
  const targetTable = randomChoice(schema.tables.filter(t => t !== sourceTable && t.hasPrimaryKey));
  const fk = new ForeignKey(sourceTable, 'target_id', targetTable, targetTable.primaryKey);
  return schema.addForeignKey(fk);
};

const removeTable: SQLMutation = (schema) => {
  const table = randomChoice(schema.tables);
  return schema.removeTable(table.name);
};
```

для каждого mutation operator определяем **expected OpenAPI diff pattern**:

```typescript
type DiffPattern = (baseline: OpenAPISpec, mutated: OpenAPISpec) => boolean;

const expectTypeChange: DiffPattern = (baseline, mutated) => {
  // Ожидаем что изменился type у одного property в одном schema
  const diff = diffSpecs(baseline, mutated);
  return diff.changedSchemas.length === 1 && diff.changedSchemas[0].changedProperties.length === 1;
};

const expectNewRequiredField: DiffPattern = (baseline, mutated) => {
  // Ожидаем что в required array добавился один элемент
  const diff = diffSpecs(baseline, mutated);
  return diff.changedSchemas.some(s => s.requiredDiff.added.length === 1);
};

const expectRemovedPath: DiffPattern = (baseline, mutated) => {
  // Ожидаем что удалился один path и все его operations
  const diff = diffSpecs(baseline, mutated);
  return diff.removedPaths.length === 1;
};
```

пишем **property-based тесты с мутациями**:

```python
# Пример на Hypothesis (Python)

from hypothesis import given, strategies as st
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant
import openapi_generator as gen

# Генератор валидных SQL-схем
@st.composite
def sql_schema_strategy(draw):
    num_tables = draw(st.integers(min_value=1, max_value=10))
    tables = []
    for _ in range(num_tables):
        table_name = draw(st.text(alphabet=st.characters(whitelist_categories=('Ll',)), min_size=3, max_size=20))
        num_columns = draw(st.integers(min_value=1, max_value=15))
        columns = []
        for _ in range(num_columns):
            col_name = draw(st.text(alphabet=st.characters(whitelist_categories=('Ll',)), min_size=2, max_size=15))
            col_type = draw(st.sampled_from(['VARCHAR', 'INT', 'BIGINT', 'BOOLEAN', 'TIMESTAMP', 'TEXT', 'DECIMAL']))
            nullable = draw(st.booleans())
            columns.append(Column(col_name, col_type, nullable))
        tables.append(Table(table_name, columns))
    return DatabaseSchema(tables)

# Property: идемпотентность
@given(schema=sql_schema_strategy(), config=st.fixed_dictionaries({}))
def test_idempotence(schema, config):
    result1 = gen.generate_openapi(schema, config)
    result2 = gen.generate_openapi(schema, config)
    assert result1 == result2, "Generator is not idempotent"

# Property: все таблицы превращаются в paths
@given(schema=sql_schema_strategy())
def test_schema_coverage(schema):
    openapi = gen.generate_openapi(schema, {})
    paths = openapi['paths'].keys()
    for table in schema.tables:
        expected_path = f"/{table.name}"
        assert expected_path in paths, f"Table {table.name} not found in OpenAPI paths"

# Property: мутация типа колонки → изменение type в schema
@given(schema=sql_schema_strategy())
def test_mutation_column_type(schema):
    baseline = gen.generate_openapi(schema, {})
    
    # Применяем мутацию: меняем тип одной случайной колонки
    mutated_schema = mutate_column_type(schema)
    mutated = gen.generate_openapi(mutated_schema, {})
    
    # Проверяем что diff локальный и корректный
    diff = diff_openapi_specs(baseline, mutated)
    assert len(diff['changed_schemas']) == 1, "Mutation affected more than one schema"
    assert len(diff['changed_schemas'][0]['changed_properties']) == 1, "Mutation affected more than one property"

# Stateful testing: последовательность мутаций
class OpenAPIGeneratorStateMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.schema = generate_random_schema()
        self.openapi = gen.generate_openapi(self.schema, {})
    
    @rule()
    def add_column(self):
        table = random.choice(self.schema.tables)
        new_column = Column(f"col_{random_string()}", random_sql_type(), True)
        self.schema.add_column(table.name, new_column)
        self.openapi = gen.generate_openapi(self.schema, {})
    
    @rule()
    def remove_column(self):
        table = random.choice(self.schema.tables)
        if len(table.columns) > 1:
            col = random.choice(table.columns)
            self.schema.remove_column(table.name, col.name)
            self.openapi = gen.generate_openapi(self.schema, {})
    
    @rule()
    def change_column_type(self):
        table = random.choice(self.schema.tables)
        col = random.choice(table.columns)
        self.schema.update_column(table.name, col.name, {'type': random_sql_type()})
        self.openapi = gen.generate_openapi(self.schema, {})
    
    @invariant()
    def openapi_is_valid(self):
        # Каждый раз после мутации OpenAPI должен быть валиден
        assert validate_openapi(self.openapi), "Generated OpenAPI is invalid"
    
    @invariant()
    def schema_coverage_holds(self):
        # Каждая таблица должна иметь соответствующий path
        paths = self.openapi['paths'].keys()
        for table in self.schema.tables:
            assert f"/{table.name}" in paths

TestOpenAPIGenerator = OpenAPIGeneratorStateMachine.TestCase
```

используем **metamorphic testing**: определяем отношения между входами и выходами без знания точного результата:

- **Metamorphic Relation 1**: Если переименовать таблицу в SQL, то в OpenAPI должен измениться только path name, но структура operations и schemas остаётся той же.
- **Metamorphic Relation 2**: Если добавить колонку в таблицу, то в OpenAPI должен появиться один новый property в соответствующем schema, но остальные properties не меняются.
- **Metamorphic Relation 3**: Если удалить NOT NULL constraint, то колонка исчезает из `required` array, но остаётся в `properties`.

строим **regression test suite** на основе найденных багов: каждый раз когда property-based тест находит контрпример (shrunk minimal failing case), добавляем его как фиксированный unit-тест, со временем накапливаем коллекцию edge-cases.

используем **differential testing**: если есть несколько реализаций генератора (или старая версия и новая), прогоняем одни и те же сгенерированные SQL-схемы через обе версии, сравниваем результаты, различия должны быть только intentional (новые фичи, улучшения), а не regressions.

интегрируем **mutation testing в CI/CD**: на каждый PR прогоняем property-based тесты с N итерациями (например, 1000 случайных схем), если тест упал — shrinking находит минимальный пример, разработчик видит точный контрпример в логах, фиксит баг, добавляет этот случай в regression suite.

документируем **properties и mutation operators** в отдельном файле (например, `TESTING.md`): какие инварианты мы проверяем, какие мутации применяем, какие паттерны diff ожидаем, это становится живой документацией поведения генератора.

и на всех уровнях тестирования SQL to OpenAPI Generator поддерживаем: **автоматическую генерацию тестовых данных** вместо ручного написания примеров, **проверку инвариантов и properties** вместо конкретных входов-выходов, **мутационное тестирование** для проверки корректности маппинга, **shrinking** для нахождения минимальных воспроизводимых кейсов, **snapshot testing** для отслеживания неожиданных изменений, **metamorphic relations** для проверки логики без знания точного результата, чтобы покрытие тестами было глубоким, автоматизированным и находило edge-cases, которые человек не додумался бы написать вручную.

---

start not from manually writing "input → expected output" pairs but from **generative testing and property-based approaches**, define invariants and properties that must hold for all inputs, use property-based testing libraries (Hypothesis for Python, fast-check for TypeScript/JavaScript, QuickCheck for Haskell, ScalaCheck, jqwik for Java), define **generators for valid inputs**: SQL DDL generator (creates random but syntactically correct CREATE TABLE statements with various types, constraints, foreign keys), Database schema generator (generates domain model Database with random tables, columns, relationships), Config generator (random but valid mapping configs), build **mutation generators**: MutateSQLType (change VARCHAR to TEXT, INT to BIGINT), MutateNullability (add/remove NOT NULL), MutateConstraint (add/remove UNIQUE, CHECK), MutateForeignKey (change ON DELETE CASCADE to RESTRICT), MutateTableName (rename table), MutateColumnName (rename column), each mutation is a transformation of input data that should lead to predictable changes in output OpenAPI, formulate **properties (invariants)** that must always hold:

**Property 1: Idempotence** — running the generator twice on the same SQL gives bitwise identical YAML (or semantically equivalent JSON after parsing), check: `generateOpenAPI(sql, config) == generateOpenAPI(sql, config)`, generate random SQL schemas and run twice, compare results via deep equality or canonical YAML diff.

**Property 2: Roundtrip Consistency** — if we generate OpenAPI from SQL, then from this OpenAPI we can restore logical DB schema (partial roundtrip), key entities (resources, fields, types) should match, check: `extractSchema(generateOpenAPI(sql)) ≈ sql` (accounting for acceptable information loss), generate SQL schemas, run through generator, parse OpenAPI back into domain model, compare table/resource structure.

**Property 3: Schema Coverage** — every table from SQL must turn into at least one OpenAPI path, every column must appear in schema as property (unless excluded by config), check: `all_tables(sql) ⊆ paths(openapi)` and `all_columns(table) ⊆ schema_properties(resource)`, generate schemas with N tables, verify OpenAPI has >= N paths (accounting for CRUD operations).

**Property 4: Type Mapping Correctness** — SQL types map to JSON Schema types correctly and consistently, verify mapping table: `VARCHAR/TEXT → string`, `INT/BIGINT → integer`, `BOOLEAN → boolean`, `TIMESTAMP → string format:date-time`, `DECIMAL → number`, generate columns of all possible SQL types, verify generated OpenAPI schema has correct type and format for each column.

**Property 5: Constraint Preservation** — SQL constraints (NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY) are reflected in OpenAPI, check: NOT NULL column → `required: true` in schema, UNIQUE → added to description or x-unique, PRIMARY KEY → marked as identifier/ID, FOREIGN KEY → reference via `$ref` or link, generate tables with various constraints, verify corresponding markers in OpenAPI.

**Property 6: Relationship Mapping** — foreign keys turn into either nested schemas, references, or links in OpenAPI, check: for each FK there should be either `$ref: '#/components/schemas/...'` or link object with `operationRef`, generate schemas with 1-to-many, many-to-many relationships, verify OpenAPI has corresponding references.

**Property 7: Naming Convention Consistency** — if config specifies naming convention (snake_case → camelCase, singular → plural for endpoints), it's applied uniformly to all tables/columns, check: if `users` table and config = `{pluralize: true, camelCase: true}` → path should be `/users` with camelCase fields in schema, generate schemas and various configs, verify naming rules applied everywhere.

**Property 8: Validation Against OpenAPI Schema** — generated YAML is always valid OpenAPI 3.x document, check: parse YAML, validate via official JSON Schema OpenAPI, should have no errors, generate arbitrary SQL schemas, run through generator, validate output via OpenAPI validator.

**Property 9: Mutation Impact Locality** — small mutation in SQL (added one column, changed type of one column) should cause small change in OpenAPI (one schema property changed), check diff between `generateOpenAPI(sql)` and `generateOpenAPI(mutate(sql))`, it should be local, generate SQL schema, apply point mutation, compare YAML diff, verify only one section changed.

**Property 10: Error Handling Completeness** — invalid SQL (circular FKs without CASCADE, table without PK) should either cause clear error or generate OpenAPI with warning, but not crash with stacktrace, check: generator returns either `Ok(spec)` or `Err(ValidationError)`, but not throws unhandled exception, generate invalid SQL schemas (negative testing), catch and verify errors.

build **mutation-based testing workflow**:

1. **Generate base SQL schema** — use property-based generator to create random but valid SQL schema (N tables, M columns, K foreign keys).

2. **Generate OpenAPI spec** — run SQL through our generator, get `baseline_openapi.yaml`.

3. **Apply mutation** — choose random mutation from set (mutate column type, add constraint, remove table, rename field) and apply to SQL schema, get `mutated_sql`.

4. **Generate mutated OpenAPI spec** — run `mutated_sql` through generator, get `mutated_openapi.yaml`.

5. **Assert expected diff** — for each mutation type we have expected change pattern in OpenAPI, verify diff between `baseline` and `mutated` matches expectations, for example:
   - If mutation: `INT → BIGINT` on column `age`, then in diff should be: `type: integer` stays, but `format` or `maximum` might change.
   - If mutation: added `NOT NULL` on column `email`, then in diff should be: `email` appeared in `required` array.
   - If mutation: removed table `orders`, then in diff should be: path `/orders` disappeared with all related operations.

6. **Shrink on failure** — if property-based test finds counterexample (mutation where diff is incorrect), library automatically simplifies (shrinking) inputs to minimal reproducible example.

use **snapshot testing** combined with property-based: for each generated SQL make snapshot of generated OpenAPI, on rerun compare with snapshot, if changed — either intentional change (update snapshot) or regression (fix bug), property-based tests generate thousands of random inputs and automatically create snapshots for them.

build **mutation operators** as separate transformations, for each mutation operator define **expected OpenAPI diff pattern**, write **property-based tests with mutations**, use **metamorphic testing**: define relationships between inputs and outputs without knowing exact result:

- **Metamorphic Relation 1**: If rename table in SQL, then in OpenAPI only path name should change, but structure of operations and schemas stays same.
- **Metamorphic Relation 2**: If add column to table, then in OpenAPI one new property should appear in corresponding schema, but other properties don't change.
- **Metamorphic Relation 3**: If remove NOT NULL constraint, then column disappears from `required` array but stays in `properties`.

build **regression test suite** from found bugs: every time property-based test finds counterexample (shrunk minimal failing case), add it as fixed unit test, over time accumulate collection of edge cases.

use **differential testing**: if there are multiple generator implementations (or old version and new), run same generated SQL schemas through both versions, compare results, differences should be only intentional (new features, improvements), not regressions.

integrate **mutation testing into CI/CD**: on every PR run property-based tests with N iterations (e.g. 1000 random schemas), if test fails — shrinking finds minimal example, developer sees exact counterexample in logs, fixes bug, adds this case to regression suite.

document **properties and mutation operators** in separate file (e.g. `TESTING.md`): which invariants we check, which mutations we apply, which diff patterns we expect, this becomes living documentation of generator behavior.

and at all levels of testing SQL to OpenAPI Generator maintain: **automatic test data generation** instead of manual example writing, **verification of invariants and properties** instead of concrete input-output pairs, **mutation testing** to verify mapping correctness, **shrinking** to find minimal reproducible cases, **snapshot testing** to track unexpected changes, **metamorphic relations** to verify logic without knowing exact result, so test coverage is deep, automated and finds edge cases humans wouldn't think to write manually.
