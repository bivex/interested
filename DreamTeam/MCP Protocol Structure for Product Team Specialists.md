# MCP Protocol Structure for Product Team Specialists

### 1. Tool Definition Framework for Team Roles

Each specialist role should expose their core functions as MCP tools with standardized schemas:

```json
{
  "name": "product_manager_prioritize",
  "description": "Prioritize product backlog items based on business value and technical complexity",
  "inputSchema": {
    "type": "object",
    "properties": {
      "backlog_items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {"type": "string"},
            "title": {"type": "string"},
            "business_value": {"type": "number", "minimum": 1, "maximum": 10},
            "technical_complexity": {"type": "number", "minimum": 1, "maximum": 10},
            "dependencies": {"type": "array", "items": {"type": "string"}}
          }
        }
      },
      "sprint_capacity": {"type": "number"}
    },
    "required": ["backlog_items", "sprint_capacity"]
  },
  "annotations": {
    "title": "Product Backlog Prioritization",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

### 2. Standardized Resource Schemas by Role

#### Product Manager/Owner Resources:
```json
{
  "uri": "product://requirements/{requirement_id}",
  "name": "Product Requirement",
  "mimeType": "application/json",
  "annotations": {
    "title": "User Story with Acceptance Criteria"
  }
}
```

#### UX/UI Designer Resources:
```json
{
  "uri": "design://wireframes/{component_id}",
  "name": "Design Specification",
  "mimeType": "application/json",
  "annotations": {
    "title": "Component Design Specs"
  }
}
```

#### Developer Resources:
```json
{
  "uri": "code://api/{endpoint_id}",
  "name": "API Documentation",
  "mimeType": "application/json",
  "annotations": {
    "title": "Technical Implementation Details"
  }
}
```

### 3. Inter-Role Communication Protocol Tools

#### Handoff Protocol Tool:
```json
{
  "name": "create_handoff",
  "description": "Create a formal handoff between team roles with all necessary context",
  "inputSchema": {
    "type": "object",
    "properties": {
      "from_role": {"type": "string", "enum": ["product_manager", "designer", "developer", "qa", "marketing"]},
      "to_role": {"type": "string", "enum": ["product_manager", "designer", "developer", "qa", "marketing"]},
      "artifact_type": {"type": "string", "enum": ["requirement", "design", "code", "test_case", "documentation"]},
      "artifact_id": {"type": "string"},
      "context": {"type": "object"},
      "acceptance_criteria": {"type": "array", "items": {"type": "string"}},
      "dependencies": {"type": "array", "items": {"type": "string"}},
      "deadline": {"type": "string", "format": "date-time"}
    },
    "required": ["from_role", "to_role", "artifact_type", "artifact_id"]
  },
  "annotations": {
    "title": "Role-to-Role Handoff",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

### 4. Status Update Protocol Tool:
```json
{
  "name": "update_status",
  "description": "Update task status with role-specific context and blockers",
  "inputSchema": {
    "type": "object",
    "properties": {
      "task_id": {"type": "string"},
      "status": {"type": "string", "enum": ["not_started", "in_progress", "blocked", "review", "done"]},
      "progress_percentage": {"type": "number", "minimum": 0, "maximum": 100},
      "blockers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "description": {"type": "string"},
            "blocking_role": {"type": "string"},
            "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
            "estimated_resolution": {"type": "string", "format": "date-time"}
          }
        }
      },
      "next_actions": {"type": "array", "items": {"type": "string"}},
      "requires_input_from": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["task_id", "status"]
  }
}
```

### 5. Decision Making Protocol Tool:
```json
{
  "name": "create_decision_request",
  "description": "Create a structured decision request using RACI matrix",
  "inputSchema": {
    "type": "object",
    "properties": {
      "decision_topic": {"type": "string"},
      "context": {"type": "string"},
      "options": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "option": {"type": "string"},
            "pros": {"type": "array", "items": {"type": "string"}},
            "cons": {"type": "array", "items": {"type": "string"}},
            "impact": {"type": "string", "enum": ["low", "medium", "high"]},
            "effort": {"type": "string", "enum": ["low", "medium", "high"]}
          }
        }
      },
      "raci": {
        "type": "object",
        "properties": {
          "responsible": {"type": "array", "items": {"type": "string"}},
          "accountable": {"type": "string"},
          "consulted": {"type": "array", "items": {"type": "string"}},
          "informed": {"type": "array", "items": {"type": "string"}}
        }
      },
      "deadline": {"type": "string", "format": "date-time"}
    },
    "required": ["decision_topic", "options", "raci"]
  }
}
```

### 6. Escalation Protocol Tool:
```json
{
  "name": "escalate_issue",
  "description": "Escalate issues with predefined escalation paths",
  "inputSchema": {
    "type": "object",
    "properties": {
      "issue_type": {"type": "string", "enum": ["technical", "business", "resource", "timeline", "scope"]},
      "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
      "description": {"type": "string"},
      "affected_tasks": {"type": "array", "items": {"type": "string"}},
      "attempted_solutions": {"type": "array", "items": {"type": "string"}},
      "current_impact": {"type": "string"},
      "escalation_path": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "level": {"type": "number"},
            "role": {"type": "string"},
            "sla_hours": {"type": "number"}
          }
        }
      }
    },
    "required": ["issue_type", "severity", "description"]
  }
}
```

### 7. Knowledge Sharing Protocol Tool:
```json
{
  "name": "share_knowledge",
  "description": "Share knowledge artifacts between team members",
  "inputSchema": {
    "type": "object",
    "properties": {
      "knowledge_type": {"type": "string", "enum": ["lesson_learned", "best_practice", "technical_doc", "process_improvement"]},
      "content": {"type": "string"},
      "relevant_roles": {"type": "array", "items": {"type": "string"}},
      "tags": {"type": "array", "items": {"type": "string"}},
      "visibility": {"type": "string", "enum": ["team", "department", "company"]},
      "attachments": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "filename": {"type": "string"},
            "type": {"type": "string"},
            "uri": {"type": "string"}
          }
        }
      }
    },
    "required": ["knowledge_type", "content", "relevant_roles"]
  }
}
```

### 8. Resource Access Protocol:
```json
{
  "name": "request_resource_access",
  "description": "Request access to role-specific resources and tools",
  "inputSchema": {
    "type": "object",
    "properties": {
      "resource_type": {"type": "string", "enum": ["document", "tool", "environment", "dataset"]},
      "resource_id": {"type": "string"},
      "access_level": {"type": "string", "enum": ["read", "write", "admin"]},
      "justification": {"type": "string"},
      "duration": {"type": "string"},
      "approver_role": {"type": "string"}
    },
    "required": ["resource_type", "resource_id", "access_level", "justification"]
  }
}
```

### 9. Implementation Example:

```javascript
// Product Manager MCP Server Implementation
const productManagerServer = new Server({
  name: "product-manager-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    resources: {}
  }
});

// Register all protocol tools
productManagerServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // All the tools defined above
      productManagerPrioritizeTool,
      createHandoffTool,
      updateStatusTool,
      createDecisionRequestTool,
      escalateIssueTool,
      shareKnowledgeTool,
      requestResourceAccessTool
    ]
  };
});

// Handle tool execution with proper error handling
productManagerServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await executeToolLogic(request.params.name, request.params.arguments);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Error executing ${request.params.name}: ${error.message}`
      }]
    };
  }
});
```

This MCP-compatible protocol structure provides:

1. Standardized tool interfaces for each specialist role
2. Structured communication between different roles
3. Proper error handling and resource management
4. Scalable architecture that can accommodate new roles and tools
5. Type safety through JSON Schema validation
6. Clear separation of concerns between different specialist functions

# Рабочий день продуктовой команды через MCP Tools

## 🌅 09:00 - Начало дня: Daily Standup

### Product Manager запускает Daily Standup:
```json
{
  "tool": "schedule_daily_standup",
  "params": {
    "participants": ["product_manager", "tech_lead", "ux_designer", "qa_lead", "backend_dev", "frontend_dev"],
    "duration_minutes": 15,
    "agenda": ["yesterday_progress", "today_plans", "blockers"]
  }
}
```

### Каждый участник обновляет свой статус:
```json
{
  "tool": "update_status",
  "params": {
    "task_id": "FEAT-123",
    "status": "in_progress",
    "progress_percentage": 60,
    "blockers": [{
      "description": "Ожидаю финальные макеты от дизайнера",
      "blocking_role": "ux_designer",
      "severity": "medium",
      "estimated_resolution": "2025-07-10T14:00:00Z"
    }],
    "next_actions": ["Завершить API интеграцию", "Написать unit тесты"],
    "requires_input_from": ["ux_designer"]
  }
}
```

---

## 🎨 09:30 - UX Designer работает над макетами

### Дизайнер создает новый ресурс:
```json
{
  "tool": "create_design_resource",
  "params": {
    "resource_type": "wireframe",
    "component_name": "UserProfileCard",
    "figma_link": "https://figma.com/file/abc123",
    "specifications": {
      "breakpoints": ["mobile", "tablet", "desktop"],
      "states": ["default", "loading", "error"],
      "interactions": ["hover", "click", "focus"]
    },
    "ready_for_handoff": true
  }
}
```

### Передача макетов разработчику:
```json
{
  "tool": "create_handoff",
  "params": {
    "from_role": "ux_designer",
    "to_role": "frontend_dev",
    "artifact_type": "design",
    "artifact_id": "UserProfileCard_v2",
    "context": {
      "component_type": "React component",
      "styling_system": "styled-components",
      "accessibility_requirements": "WCAG 2.1 AA"
    },
    "acceptance_criteria": [
      "Responsive design для всех breakpoints",
      "Анимации соответствуют дизайн-системе",
      "Поддержка keyboard navigation"
    ],
    "dependencies": ["IconLibrary_v1.2", "ThemeProvider"],
    "deadline": "2025-07-11T17:00:00Z"
  }
}
```

---

## 💻 10:00 - Backend Developer кодит

### Разработчик обновляет прогресс:
```json
{
  "tool": "update_development_progress",
  "params": {
    "task_id": "API-456",
    "code_coverage": 85,
    "completed_endpoints": ["/api/users", "/api/users/:id"],
    "pending_endpoints": ["/api/users/avatar"],
    "test_status": "passing",
    "technical_debt": [{
      "description": "Рефакторинг валидации входных данных",
      "priority": "medium",
      "estimated_hours": 4
    }]
  }
}
```

### Создание технической документации:
```json
{
  "tool": "create_technical_docs",
  "params": {
    "doc_type": "api_specification",
    "title": "User Management API v2",
    "endpoints": [{
      "method": "GET",
      "path": "/api/users/:id",
      "description": "Получение данных пользователя",
      "parameters": [{"name": "id", "type": "string", "required": true}],
      "responses": {
        "200": "User object",
        "404": "User not found"
      }
    }],
    "target_audience": ["frontend_dev", "qa_engineer", "product_manager"]
  }
}
```

---

## 🧪 11:30 - QA Engineer тестирует

### Создание тест-кейсов:
```json
{
  "tool": "create_test_cases",
  "params": {
    "feature_id": "user_profile_update",
    "test_type": "integration",
    "test_cases": [{
      "id": "TC-001",
      "title": "Успешное обновление профиля пользователя",
      "preconditions": ["Пользователь авторизован", "Профиль существует"],
      "steps": [
        "Открыть страницу профиля",
        "Изменить имя пользователя",
        "Нажать 'Сохранить'"
      ],
      "expected_result": "Профиль обновлен, показано уведомление об успехе",
      "priority": "high"
    }],
    "coverage_areas": ["ui", "api", "database"]
  }
}
```

### Обнаружение бага:
```json
{
  "tool": "report_bug",
  "params": {
    "title": "Аватар не обновляется после загрузки",
    "severity": "medium",
    "steps_to_reproduce": [
      "Авторизоваться в системе",
      "Перейти в настройки профиля",
      "Загрузить новый аватар",
      "Сохранить изменения"
    ],
    "expected_behavior": "Аватар должен обновиться",
    "actual_behavior": "Аватар остается прежним",
    "environment": "Chrome 126, Windows 11",
    "assigned_to": "frontend_dev",
    "attachments": ["screenshot_bug.png", "console_errors.log"]
  }
}
```

---

## 📊 14:00 - Product Manager анализирует метрики

### Запрос аналитики:
```json
{
  "tool": "fetch_product_analytics",
  "params": {
    "date_range": {
      "start": "2025-07-03",
      "end": "2025-07-10"
    },
    "metrics": ["daily_active_users", "conversion_rate", "feature_adoption"],
    "segments": ["new_users", "returning_users"],
    "filters": {
      "country": ["RO", "US", "DE"],
      "device_type": ["mobile", "desktop"]
    }
  }
}
```

### Принятие решения о фиче:
```json
{
  "tool": "create_decision_request",
  "params": {
    "decision_topic": "Стоит ли добавить dark mode в следующем спринте?",
    "context": "Получили 127 запросов от пользователей, конкуренты уже имеют эту функцию",
    "options": [{
      "option": "Добавить dark mode в спринт 15",
      "pros": ["Улучшение UX", "Конкурентное преимущество", "Высокий user demand"],
      "cons": ["Дополнительные 2 недели разработки", "Нужно тестировать все компоненты"],
      "impact": "medium",
      "effort": "high"
    }, {
      "option": "Отложить на спринт 16",
      "pros": ["Больше времени на качественную реализацию", "Приоритет критическим багам"],
      "cons": ["Пользователи продолжат просить", "Конкуренты получат преимущество"],
      "impact": "low",
      "effort": "low"
    }],
    "raci": {
      "responsible": ["product_manager"],
      "accountable": "cpo",
      "consulted": ["ux_designer", "tech_lead"],
      "informed": ["marketing_manager", "customer_success"]
    },
    "deadline": "2025-07-11T16:00:00Z"
  }
}
```

---

## 🔄 15:30 - Блокер и эскалация

### Tech Lead обнаруживает проблему:
```json
{
  "tool": "escalate_issue",
  "params": {
    "issue_type": "technical",
    "severity": "high",
    "description": "API сторонней системы возвращает ошибки 500, интеграция не работает",
    "affected_tasks": ["FEAT-789", "FEAT-790"],
    "attempted_solutions": [
      "Проверили документацию API",
      "Связались с техподдержкой поставщика",
      "Попробовали alternative endpoints"
    ],
    "current_impact": "Блокирует релиз основной функции профиля пользователя",
    "escalation_path": [{
      "level": 1,
      "role": "tech_lead",
      "sla_hours": 2
    }, {
      "level": 2,
      "role": "engineering_manager",
      "sla_hours": 4
    }]
  }
}
```

### Product Manager ищет обходной путь:
```json
{
  "tool": "create_risk_mitigation",
  "params": {
    "risk_description": "Блокировка интеграции с внешней системой",
    "impact_level": "high",
    "probability": "confirmed",
    "mitigation_strategies": [{
      "strategy": "Временная заглушка с мок-данными",
      "estimated_effort": "4 hours",
      "success_probability": "high",
      "responsible_role": "backend_dev"
    }, {
      "strategy": "Переключение на альтернативного поставщика",
      "estimated_effort": "3 days",
      "success_probability": "medium",
      "responsible_role": "tech_lead"
    }],
    "deadline": "2025-07-11T09:00:00Z"
  }
}
```

---

## 🚀 16:30 - Подготовка к релизу

### QA завершает тестирование:
```json
{
  "tool": "complete_test_cycle",
  "params": {
    "release_version": "v2.1.0",
    "test_results": {
      "total_tests": 156,
      "passed": 152,
      "failed": 2,
      "skipped": 2,
      "coverage_percentage": 94
    },
    "critical_bugs": [],
    "minor_bugs": [{
      "id": "BUG-101",
      "description": "Tooltip исчезает слишком быстро",
      "impact": "low",
      "fix_required": false
    }],
    "release_recommendation": "approved",
    "post_release_monitoring": ["user_registration_flow", "payment_processing"]
  }
}
```

### DevOps подготавливает деплой:
```json
{
  "tool": "prepare_deployment",
  "params": {
    "environment": "production",
    "version": "v2.1.0",
    "deployment_strategy": "blue_green",
    "rollback_plan": "automatic_if_error_rate_exceeds_5%",
    "monitoring_alerts": ["response_time", "error_rate", "resource_usage"],
    "stakeholder_notifications": ["product_manager", "customer_success", "marketing"]
  }
}
```

---

## 📝 17:30 - Конец дня: Ретроспектива и планирование

### Обновление sprint progress:
```json
{
  "tool": "update_sprint_progress",
  "params": {
    "sprint_id": "sprint-15",
    "day": 8,
    "completed_story_points": 34,
    "remaining_story_points": 21,
    "velocity_trend": "on_track",
    "risks": [{
      "description": "Интеграция с внешним API",
      "impact": "medium",
      "mitigation": "Заглушка готова"
    }],
    "team_mood": "positive",
    "blockers_resolved": 2,
    "new_blockers": 0
  }
}
```

### Планирование следующего дня:
```json
{
  "tool": "plan_next_day",
  "params": {
    "date": "2025-07-11",
    "priorities": [
      "Деплой v2.1.0 в production",
      "Мониторинг метрик после релиза",
      "Планирование следующего спринта"
    ],
    "scheduled_meetings": [{
      "time": "10:00",
      "title": "Release Review",
      "participants": ["product_manager", "tech_lead", "qa_lead"]
    }],
    "individual_tasks": {
      "product_manager": ["Анализ метрик релиза", "Подготовка к sprint planning"],
      "tech_lead": ["Code review новых PR", "Архитектурная документация"],
      "ux_designer": ["Исследование пользователей", "Дизайн для sprint 16"]
    }
  }
}
```

---

## 📊 18:00 - Автоматические отчеты

### Система генерирует дневной отчет:
```json
{
  "tool": "generate_daily_report",
  "params": {
    "date": "2025-07-10",
    "metrics": {
      "completed_tasks": 8,
      "blocked_tasks": 1,
      "code_commits": 23,
      "bugs_found": 3,
      "bugs_fixed": 5,
      "team_collaboration_score": 8.5
    },
    "achievements": [
      "Завершена интеграция пользовательского профиля",
      "Исправлены все критические баги",
      "Готов к релизу v2.1.0"
    ],
    "tomorrow_focus": [
      "Production deployment",
      "Post-release monitoring",
      "Sprint 16 planning"
    ],
    "distribution": ["team_leads", "stakeholders", "cpo"]
  }
}
```

This working day shows how the MCP protocol can structure interaction between specialists, ensuring transparency, traceability, and effective communication through standardized tools.
