# Настройка Полномочий RBAC в Kanboard MCP Server

## Введение

Данная документация описывает процесс настройки системы контроля доступа на основе ролей (Role-Based Access Control - RBAC) в Kanboard MCP Server для команды Dream Team. Настройка основана на RACI матрице ответственности и включает все ключевые роли продуктовой команды.

## 🎯 Цели Документации

| 🎯 **Цель** | 📝 **Описание** | ✅ **Результат** |
|:-----------:|:---------------:|:---------------:|
| **🏗️ Иерархическая система** | Настроить уровни доступа по ролям | Четкая структура полномочий |
| **📊 RACI интеграция** | Реализовать принципы матрицы ответственности | Автоматизированное распределение задач |
| **🔒 Безопасность** | Обеспечить контролируемость процессов | Аудит всех действий |
| **⚡ Оптимизация** | Эффективное распределение задач | Повышение продуктивности команды |

## ✅ Предварительные Требования

| 🔧 **Компонент** | 📋 **Требование** | ⚠️ **Статус** |
|:----------------:|:-----------------:|:-------------:|
| **🖥️ Kanboard MCP Server** | Установленный и настроенный сервер | Обязательно |
| **🔑 Админ доступ** | Доступ к административной панели | Обязательно |
| **👥 Структура ролей** | Определенная структура Dream Team | Обязательно |
| **📊 RACI матрица** | Согласованная матрица ответственности | Обязательно |

## Структура Ролей в Dream Team

| 🎯 **Уровень** | 👤 **Роль** | 📋 **Обязанности** | 🔑 **Полномочия** |
|:-------------:|:-----------:|:-----------------:|:-----------------:|
| **👑 Executive Leadership** | **CPO (Chief Product Officer)** | Высший уровень ответственности за продукт | Полный доступ ко всем проектам |
| | **Product Manager** | Управление продуктом и дорожной картой | Управление проектами и задачами |
| | **Product Owner** | Владение продуктом и приоритизацией | Принятие решений по продукту |
| **⚙️ Core Product Team** | **UX/UI Designer** | Дизайн пользовательского интерфейса | Доступ к дизайн-задачам |
| | **Developer/Engineer** | Разработка программного обеспечения | Доступ к разработке и коду |
| | **QA Specialist** | Контроль качества и тестирование | Доступ к тестированию |
| | **Business Analyst** | Бизнес-анализ и требования | Анализ требований |
| | **Project Manager** | Управление проектами | Координация проектов |
| **🚀 Specialized Roles** | **Product Marketing Manager** | Маркетинг продукта | Маркетинговые инициативы |
| | **Data Analyst** | Анализ данных | Работа с аналитикой |
| | **Growth Manager** | Рост и развитие продукта | Инициативы роста |
| | **Customer Success Manager** | Успех клиентов | Клиентоориентированные задачи |
| **💼 Consultative Roles** | **Legal Counsel** | Юридическая экспертиза | Юридические консультации |
| | **External Consultants** | Внешние консультанты | Специализированные консультации |

### 🎯 Интеллектуальная Матрица MCP Tools по Ролям

| **👤 Роль** | **📊 Управление Задачами** | **💬 Коммуникация** | **📁 Файлы** | **📈 Аналитика & Мониторинг** | **🏷️ Организация** | **⚙️ Специализированные** |
|:------------|:---------------------------|:--------------------|:-------------|:------------------------------|:------------------|:-----------------------|
| **👑 CPO** | `create_task`, `update_task` | - | - | `get_projects`, `get_project_activity`, `get_my_dashboard`, `get_all_tasks` | - | **Принятие решений** |
| **📊 Product Manager** | `create_project`, `create_task`, `update_task`, `set_task_due_date` | - | - | `get_projects`, `get_overdue_tasks`, `get_project_activity` | `move_task_position` | **Стратегическое планирование** |
| **🎯 Product Owner** | `create_task`, `update_task` | - | - | `get_overdue_tasks`, `get_my_overdue_tasks` | `move_task_position`, `set_task_tags`, `get_task_tags` | **Приоритизация backlog** |
| **🎨 UX/UI Designer** | `update_task` | `create_comment`, `get_task_comments` | `create_task_file`, `get_all_task_files` | - | `set_task_tags` | **Дизайн-артефакты** |
| **💻 Developer** | `create_task`, `update_task` | `create_comment` | `create_task_file`, `get_all_task_files` | - | `move_task_position`, `set_task_tags` | **Техническая разработка** |
| **🧪 QA Specialist** | `create_task`, `update_task` | `create_comment`, `get_task_comments` | `create_task_file` | `get_overdue_tasks` | `set_task_tags` | **Тестирование & QA** |
| **📈 Business Analyst** | `create_task`, `update_task` | `create_comment`, `get_task_comments` | `create_task_file` | - | - | `save_task_metadata`, `get_task_metadata` |
| **📋 Project Manager** | `create_task`, `update_task` | - | - | `get_projects`, `get_all_tasks`, `get_overdue_tasks`, `get_project_activity` | `move_task_position` | **Координация команд** |
| **📢 Product Marketing Manager** | `create_task`, `update_task` | `create_comment`, `get_task_comments` | - | `get_project_activity` | `set_task_tags` | **Маркетинговые кампании** |
| **📊 Data Analyst** | - | `create_comment` | `create_task_file` | `get_project_activity`, `get_all_tasks` | - | `save_task_metadata`, `get_task_metadata` |
| **📈 Growth Manager** | `create_task`, `update_task` | `create_comment` | - | `get_project_activity`, `get_overdue_tasks` | `set_task_tags` | **Инициативы роста** |
| **🤝 Customer Success Manager** | `create_task`, `update_task` | `create_comment`, `get_task_comments` | - | `get_project_activity` | `set_task_tags` | **Клиентский опыт** |
| **⚖️ Legal Counsel** | - | `create_comment`, `get_task_comments` | - | `get_project_activity` | - | `save_task_metadata`, `get_task_metadata` |
| **🔗 External Consultants** | - | `create_comment`, `get_task_comments` | - | `get_project_activity`, `get_projects` | - | `get_task_metadata` |

#### 📊 Легенда Категорий:
- **📊 Управление Задачами**: Создание, обновление, перемещение задач
- **💬 Коммуникация**: Комментарии, обсуждения, обратная связь
- **📁 Файлы**: Загрузка и управление файлами/документами
- **📈 Аналитика & Мониторинг**: Просмотр прогресса, отчеты, метрики
- **🏷️ Организация**: Теги, категории, структурирование
- **⚙️ Специализированные**: Ролевые инструменты (метаданные, сроки и т.д.)

#### 🎯 RACI Контекст Использования:
- **R (Responsible)**: Активное использование для выполнения задач
- **A (Accountable)**: Мониторинг и принятие решений
- **C (Consulted)**: Консультации и экспертиза
- **I (Informed)**: Просмотр и мониторинг прогресса

## 🛠️ Настройка RBAC в Kanboard MCP

### 📋 Сводная Таблица MCP Tools

| **Шаг** | **Описание** | **🔧 MCP Tools** |
|:--------:|:-------------:|:------------------|
| **Шаг 1** | Создание Групп Пользователей | `create_group` |
| **Шаг 2** | Назначение Пользователей в Группы | `create_user`, `add_group_member` |
| **Шаг 3** | Создание Основных Проектов | `create_project` |
| **Шаг 4** | Назначение Полномочий по Проектам | `add_project_group`, `add_project_user` |
| **Шаг 5** | Настройка RACI-Матрицы в Задачах | `create_category` |
| **Шаг 6** | Настройка Тегов для RACI Ролей | `create_tag` |
| **Шаг 7** | Создание Автоматических Действий | `create_action` |
| **Шаг 8** | Настройка Метаданных для RACI | `save_task_metadata` |
| **Мониторинг** | Аудит и Проверки | `get_all_groups`, `get_group_members`, `get_project_users`, `get_assignable_users`, `get_project_activity`, `get_my_activity_stream` |
| **Устранение неисправностей** | Диагностика проблем | `get_member_groups`, `get_project_user_role` |

### 📂 Шаг 1: Создание Групп Пользователей

**🔧 MCP Tools:** `create_group`

```bash
# Создание основных групп согласно ролевой структуре
"Create a group named 'Executive Leadership' with external ID 'exec_leadership'"
"Create a group named 'Core Product Team' with external ID 'core_team'"
"Create a group named 'Specialized Roles' with external ID 'specialized'"
"Create a group named 'Consultative Roles' with external ID 'consultative'"
"Create a group named 'External Stakeholders' with external ID 'external'"
```

### 👥 Шаг 2: Назначение Пользователей в Группы

**🔧 MCP Tools:** `create_user`, `add_group_member`

#### 👑 Исполнительные Роли (Executive Leadership)
```bash
"Create user 'cpo' with password 'secure123' and email 'cpo@company.com'"
"Create user 'product_manager' with password 'secure123' and email 'pm@company.com'"
"Create user 'product_owner' with password 'secure123' and email 'po@company.com'"

# Добавление в группу Executive Leadership
"Add user 'cpo' to group 'exec_leadership'"
"Add user 'product_manager' to group 'exec_leadership'"
"Add user 'product_owner' to group 'exec_leadership'"
```

#### ⚙️ Операционные Роли (Core Product Team)
```bash
"Create user 'ux_designer' with password 'secure123' and email 'ux@company.com'"
"Create user 'developer' with password 'secure123' and email 'dev@company.com'"
"Create user 'qa_specialist' with password 'secure123' and email 'qa@company.com'"
"Create user 'business_analyst' with password 'secure123' and email 'ba@company.com'"
"Create user 'project_manager' with password 'secure123' and email 'pjm@company.com'"

# Добавление в группу Core Product Team
"Add user 'ux_designer' to group 'core_team'"
"Add user 'developer' to group 'core_team'"
"Add user 'qa_specialist' to group 'core_team'"
"Add user 'business_analyst' to group 'core_team'"
"Add user 'project_manager' to group 'core_team'"
```

#### 🚀 Специализированные Роли (Specialized Roles)
```bash
"Create user 'pmm_manager' with password 'secure123' and email 'pmm@company.com'"
"Create user 'data_analyst' with password 'secure123' and email 'data@company.com'"
"Create user 'growth_manager' with password 'secure123' and email 'growth@company.com'"
"Create user 'customer_success' with password 'secure123' and email 'cs@company.com'"

# Добавление в группу Specialized Roles
"Add user 'pmm_manager' to group 'specialized'"
"Add user 'data_analyst' to group 'specialized'"
"Add user 'growth_manager' to group 'specialized'"
"Add user 'customer_success' to group 'specialized'"
```

#### 💼 Консультативные Роли (Consultative Roles)
```bash
"Create user 'legal_counsel' with password 'secure123' and email 'legal@company.com'"

# Добавление в группу Consultative Roles
"Add user 'legal_counsel' to group 'consultative'"
```

### 📋 Шаг 3: Настройка Проектов и Полномочий

#### 📁 Создание Основных Проектов

**🔧 MCP Tools:** `create_project`

```bash
"Create a project called 'Product Development Lifecycle' with description 'Complete product development process with RACI matrix implementation'"
"Create a project called 'Product Strategy & Roadmap' with description 'Strategic planning and roadmap management'"
"Create a project called 'Quality Assurance & Testing' with description 'Quality control and testing processes'"
"Create a project called 'Customer Experience' with description 'Customer-focused initiatives and improvements'"
```

### 🔐 Шаг 4: Назначение Полномочий по Проектам

**🔧 MCP Tools:** `add_project_group`, `add_project_user`

#### 👑 Полномочия Исполнительного Руководства (Executive Leadership)
```bash
# Полный доступ ко всем проектам
"Add group 'exec_leadership' to project 'Product Development Lifecycle' with role 'project-manager'"
"Add group 'exec_leadership' to project 'Product Strategy & Roadmap' with role 'project-manager'"
"Add group 'exec_leadership' to project 'Quality Assurance & Testing' with role 'project-manager'"
"Add group 'exec_leadership' to project 'Customer Experience' with role 'project-manager'"
```

#### ⚙️ Полномочия Операционной Команды (Core Product Team)
```bash
# Полный доступ к основным проектам разработки
"Add group 'core_team' to project 'Product Development Lifecycle' with role 'project-member'"
"Add group 'core_team' to project 'Quality Assurance & Testing' with role 'project-member'"

# Ограниченный доступ к стратегическим проектам
"Add group 'core_team' to project 'Product Strategy & Roadmap' with role 'project-viewer'"
"Add group 'core_team' to project 'Customer Experience' with role 'project-viewer'"
```

#### 🚀 Полномочия Специализированных Ролей
```bash
# Product Marketing Manager - доступ к маркетинговым аспектам
"Add user 'pmm_manager' to project 'Product Strategy & Roadmap' with role 'project-member'"
"Add user 'pmm_manager' to project 'Customer Experience' with role 'project-member'"

# Data Analyst - доступ к аналитике и данным
"Add user 'data_analyst' to project 'Product Strategy & Roadmap' with role 'project-member'"
"Add user 'data_analyst' to project 'Quality Assurance & Testing' with role 'project-member'"

# Growth Manager - доступ к инициативам роста
"Add user 'growth_manager' to project 'Customer Experience' with role 'project-member'"
"Add user 'growth_manager' to project 'Product Strategy & Roadmap' with role 'project-member'"

# Customer Success Manager - доступ к клиентскому опыту
"Add user 'customer_success' to project 'Customer Experience' with role 'project-manager'"
```

#### 💼 Полномочия Консультативных Ролей
```bash
# Legal Counsel - только просмотр и комментарии
"Add user 'legal_counsel' to project 'Product Development Lifecycle' with role 'project-viewer'"
"Add user 'legal_counsel' to project 'Product Strategy & Roadmap' with role 'project-viewer'"
```

### 📊 Шаг 5: Настройка RACI-Матрицы в Задачах

#### 🏷️ Создание Категорий Задач по RACI Принципам

**🔧 MCP Tools:** `create_category`

```bash
# Категории для Responsible задач
"Create a 'R-Responsible Tasks' category in project 'Product Development Lifecycle' with color 'green'"
"Create a 'R-Responsible Tasks' category in project 'Product Strategy & Roadmap' with color 'green'"

# Категории для Accountable задач
"Create a 'A-Accountable Tasks' category in project 'Product Development Lifecycle' with color 'red'"
"Create a 'A-Accountable Tasks' category in project 'Product Strategy & Roadmap' with color 'red'"

# Категории для Consulted задач
"Create a 'C-Consulted Tasks' category in project 'Product Development Lifecycle' with color 'blue'"
"Create a 'C-Consulted Tasks' category in project 'Quality Assurance & Testing' with color 'blue'"

# Категории для Informed задач
"Create a 'I-Informed Tasks' category in project 'Product Development Lifecycle' with color 'yellow'"
"Create a 'I-Informed Tasks' category in project 'Customer Experience' with color 'yellow'"
```

### 🏷️ Шаг 6: Настройка Тегов для RACI Ролей

**🔧 MCP Tools:** `create_tag`

```bash
# Теги для каждой RACI роли
"Create tag 'R-Responsible' for project 'Product Development Lifecycle' with color 1"
"Create tag 'A-Accountable' for project 'Product Development Lifecycle' with color 2"
"Create tag 'C-Consulted' for project 'Product Development Lifecycle' with color 3"
"Create tag 'I-Informed' for project 'Product Development Lifecycle' with color 4"

# Повтор для других проектов
"Create tag 'R-Responsible' for project 'Product Strategy & Roadmap' with color 1"
"Create tag 'A-Accountable' for project 'Product Strategy & Roadmap' with color 2"
"Create tag 'C-Consulted' for project 'Product Strategy & Roadmap' with color 3"
"Create tag 'I-Informed' for project 'Product Strategy & Roadmap' with color 4"
```

### 🤖 Шаг 7: Создание Автоматических Действий для Контроля Доступа

#### ✅ Действия для Responsible Задач

**🔧 MCP Tools:** `create_action`

```bash
# Автоматическое уведомление ответственных лиц
"Create an action for project 'Product Development Lifecycle', event 'task.create', action 'TaskAssignSpecificUser', with params 'user_id:responsible_user_id'"

# Автоматическая установка дедлайнов для ответственных задач
"Create an action for project 'Product Development Lifecycle', event 'task.move.column', action 'TaskUpdateDueDate', with params 'column_id:responsible_column_id, due_date:tomorrow'"
```

#### 📋 Действия для Accountable Задач
```bash
# Уведомление accountable лиц о новых задачах
"Create an action for project 'Product Development Lifecycle', event 'task.create', action 'TaskNotifier', with params 'user_id:accountable_user_id, event:create'"

# Автоматическая эскалация просроченных accountable задач
"Create an action for project 'Product Development Lifecycle', event 'task.overdue', action 'TaskNotifier', with params 'user_id:executive_user_id, event:overdue'"
```

### 📝 Шаг 8: Настройка Метаданных для Отслеживания RACI

**🔧 MCP Tools:** `save_task_metadata`

```bash
# Пример метаданных для задачи
"Save metadata 'raci_responsible:developer, raci_accountable:product_manager, raci_consulted:ux_designer,qa_specialist, raci_informed:product_owner,cpo' for task 1"

# Метаданные для стратегической задачи
"Save metadata 'raci_responsible:product_manager, raci_accountable:cpo, raci_consulted:growth_manager,data_analyst, raci_informed:executive_team' for task 2"
```

## 📈 Мониторинг и Аудит Полномочий

### 🔍 Регулярные Проверки

**🔧 MCP Tools:** `get_all_groups`, `get_group_members`, `get_project_users`, `get_assignable_users`, `get_project_activity`, `get_my_activity_stream`

```bash
# Проверка пользователей в группах
"Get all groups"
"Get group members for group 'exec_leadership'"

# Проверка полномочий по проектам
"Get project users for project 'Product Development Lifecycle'"
"Get assignable users for project 'Product Strategy & Roadmap'"

# Мониторинг активности
"Get project activity for project 'Product Development Lifecycle'"
"Get my activity stream"
```

### Аудит Логов

**🔧 MCP Tools:** `get_project_activity`, `get_all_tasks`

```bash
# Получение истории изменений
"Show me activity for project 'Product Development Lifecycle'"
"Get all tasks for user 'product_manager'"
```

## Обновление и Поддержка RBAC

### Процедура Добавления Нового Пользователя
1. Определить роль в команде согласно RACI матрице
2. Создать пользователя в системе
3. Добавить в соответствующую группу
4. Назначить полномочия по проектам
5. Настроить уведомления и метаданные

### Процедура Изменения Полномочий
1. Оценить влияние изменения на процессы
2. Обновить групповые принадлежности
3. Изменить роли в проектах
4. Обновить RACI метаданные для задач
5. Протестировать новые полномочия

### Процедура Удаления Пользователя
1. Переназначить активные задачи
2. Удалить из групп и проектов
3. Обновить RACI метаданные
4. Провести аудит связанных процессов

## Устранение Неисправностей

### Распространенные Проблемы

#### Пользователь не видит проект

**🔧 MCP Tools:** `get_member_groups`, `get_project_user_role`

```bash
# Проверить принадлежность к группам
"Get member groups for user '[username]'"

# Проверить полномочия в проекте
"Get project user role for user '[user_id]' in project '[project_name]'"
```

#### Задачи не назначаются автоматически
```bash
# Проверить настройки автоматических действий
"Get actions for project '[project_name]'"

# Проверить корректность параметров действий
"Get compatible action events for action 'TaskAssignSpecificUser'"
```

#### RACI метаданные не сохраняются
```bash
# Проверить формат метаданных
"Get task metadata for task [task_id]"

# Проверить права на изменение метаданных
"Get project user role for user '[user_id]' in project '[project_name]'"
```

## Заключение

Настройка RBAC в Kanboard MCP Server обеспечивает:
- Четкое разделение полномочий согласно ролям Dream Team
- Автоматизацию процессов на основе RACI матрицы
- Повышенную безопасность и контролируемость
- Эффективное распределение ответственности

Регулярный аудит и обновление системы полномочий гарантирует соответствие текущим потребностям команды и требованиям безопасности.

## Ссылки и Дополнительные Ресурсы

- [Kanboard MCP Server Documentation](https://github.com/bivex/kanboard-mcp)
- [RACI Matrix Implementation Guide](./RACI%20Matrix.md)
- [Dream Team Professional List](./%D0%A1%D0%BF%D0%B8%D1%81%D0%BE%D0%BA%20%D0%BF%D1%80%D0%BE%D1%84%D0%B5%D1%81%D1%81%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D0%BE%D0%B2,%20%D0%BA%D0%BE%D1%82%D0%BE%D1%80%D1%8B%D0%B5%20%D1%81%D0%B4%D0%B5%D0%BB%D0%B0%D1%8E%D1%82%20%D0%BF%D1%80%D0%BE%D0%B4%D1%83%D0%BA%D1%82%20%D1%8D%D0%BA%D0%BE%D0%BD%D1%84%D0%B5%D1%82%D0%BA%D0%BE%D0%B9.md)
- [Kanboard-MCP+RACI Setup](./Kanboard-MCP+RACI.md)
