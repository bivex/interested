## EspoCRM Extension Development Principles

### 1. Start from Business and Domain

* Begin by understanding the **business domain EspoCRM is modeling** (CRM processes, sales, support, marketing, custom workflows).
* Clearly define **business goals** for the extension before touching code.
* Gather and document **functional and non-functional requirements** (performance, security, auditability).
* Build a **shared glossary** with business stakeholders and reflect it consistently in entity names, fields, services, and APIs.
* Explicitly define **system boundaries**: what belongs inside EspoCRM, what is external (ERP, billing, email, third-party APIs).

---

### 2. Design from the Domain, Not the Framework

* Design the solution from **use cases and domain rules**, not from EspoCRM hooks or controllers.
* Avoid letting EspoCRM’s framework structure dictate your business model.
* Define the **domain model first**: entities, value objects, rules, and invariants.
* Clearly distinguish:

  * **Entities** (Account, Deal, Subscription)
  * **Value Objects** (Money, DateRange, Status)
* Define **aggregates** and enforce consistency boundaries explicitly.
* Let the domain enforce its own rules — not UI logic or client-side validation.

---

### 3. Layered Architecture Inside EspoCRM

Respect clear layers even within EspoCRM’s module system:

* **Domain layer**

  * Business rules
  * Domain services
  * Domain events
  * No direct dependency on ORM, DB, HTTP, or EspoCRM internals

* **Application layer**

  * Use-case orchestration
  * Coordinates domain logic
  * Calls repositories and services
  * Exposed to controllers, API actions, hooks

* **Infrastructure layer**

  * EspoCRM ORM repositories
  * External API clients
  * Email, queues, filesystem
  * Implements domain interfaces

* **Presentation layer**

  * Controllers
  * API endpoints
  * UI metadata
  * Client-side logic

**Rule:** Inner layers must never depend on outer layers.

---

### 4. Separate Business Logic from EspoCRM Infrastructure

* Do not put business logic in:

  * Controllers
  * Hooks
  * Jobs
  * Entity listeners
* These should **delegate to application services**.
* Avoid direct dependencies from domain code to:

  * EspoCRM ORM
  * Database queries
  * HTTP requests
  * UI metadata

---

### 5. Repositories and Services

* Define **repository interfaces** in the domain or application layer.
* Let EspoCRM ORM repositories **implement those interfaces**.
* Do not leak ORM entities outside infrastructure.
* Use **DTOs** to move data between layers.
* Define **domain services** only when logic does not naturally belong to an entity.

---

### 6. Ports & Adapters (Hexagonal Architecture)

* Treat EspoCRM as an **adapter**, not the core.
* External systems (payment providers, telephony, analytics) must be accessed via **explicit interfaces**.
* Infrastructure implements those interfaces.
* Inject dependencies via:

  * Constructors
  * Factories
  * EspoCRM DI container
* Avoid:

  * Service locators
  * Hidden globals
  * Static helpers

---

### 7. SOLID Principles in EspoCRM Extensions

* **SRP**: One class, one responsibility (avoid “Manager” or “Service” that does everything).
* **OCP**: Extend behavior via new classes, not by modifying stable code.
* **LSP**: Custom implementations must not break expectations.
* **ISP**: Prefer small, focused interfaces.
* **DIP**: High-level logic depends on abstractions, not EspoCRM internals.

---

### 8. Configuration and Security

* Never hardcode:

  * API keys
  * URLs
  * Secrets
* Use:

  * EspoCRM config
  * Environment variables
* Design security from the beginning:

  * Authentication
  * Authorization (ACLs)
  * Auditing
  * Data privacy
* Expose only necessary data through APIs.

---

### 9. Errors, Validation, and Invariants

* Validate data:

  * At system boundaries (API, UI)
  * Inside the domain (invariants)
* Clearly distinguish:

  * Business errors
  * Technical failures
* Never swallow exceptions silently.
* Log errors with enough context.

---

### 10. Events, Async, and Integration

* Use **domain events** to react to important business changes.
* Avoid tightly coupled synchronous integrations when possible.
* Design operations to be **idempotent**.
* Handle retries, timeouts, and partial failures explicitly.
* Version APIs and event schemas.

---

### 11. Data, Migrations, and Evolution

* Plan database schema evolution carefully.
* Ensure backward compatibility during migrations.
* Use feature flags to roll out changes safely.
* Avoid breaking existing integrations.

---

### 12. Testing Strategy

* Write unit tests for:

  * Domain logic
  * Application services
* Use test doubles for:

  * External APIs
  * EspoCRM infrastructure
* Test integrations at adapter boundaries.
* Keep tests fast and deterministic.
* Automate tests in CI.

---

### 13. Code Structure and Naming

* Structure folders by **layer and role**, not by EspoCRM defaults alone.
* Use meaningful names aligned with the business domain.
* Avoid vague names like `Helper`, `Utils`, `Manager`.
* Keep classes small and focused.
* Do not let implementation details leak through public APIs.

---

### 14. Documentation and Collaboration

* Document:

  * Public APIs
  * Key business rules
  * Integration contracts
* Use ADRs to capture architectural decisions.
* Treat code review as mandatory.
* Make architecture understandable for new developers.

---

### 15. Pragmatism and Maintainability

* Start with a **simple, modular monolith** inside EspoCRM.
* Split into services only when justified.
* Avoid premature optimization.
* Prefer clarity over cleverness.
* Track technical debt explicitly and plan repayment.
* Continuously simplify the design where possible.

---

**Goal:**
Build EspoCRM extensions that are **clean, testable, secure, evolvable, and understandable**, with strict boundaries between domain logic and EspoCRM infrastructure — even while working inside a framework that does not enforce this by default.
