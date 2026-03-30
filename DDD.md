Software System Design & Implementation Prompt
Goal: Design and build software following domain-first, architecture-driven principles with strict separation of concerns, testability, and operational readiness.
---
1. Domain Understanding & Language
- Begin with the business domain before any technology decisions.
- Gather and document functional and non-functional requirements explicitly.
- Build a shared glossary (ubiquitous language) with stakeholders; use those terms consistently in code.
- Define system boundaries, bounded contexts, and interaction points between contexts.
2. Domain Modeling
- Model the domain before choosing frameworks or infrastructure.
- Define entities (identity-lifecycle), value objects (immutable, compared by value), and their responsibilities.
- Define aggregates with clear consistency boundaries; enforce invariants within the aggregate, not at the UI or service layer.
- Design domain events for side effects and cross-context communication.
- Define repository interfaces and domain service interfaces as abstractions owned by the domain layer.
- Keep domain logic pure: no direct references to databases, HTTP, file systems, or frameworks.
3. Architecture — Ports & Adapters (Hexagonal)
- Organize code into four strict layers: Domain → Application → Infrastructure → Presentation.
- Dependencies point inward only; inner layers never depend on outer layers.
- Ports = interfaces declared by the domain/application for what it needs (persistence, messaging, time, etc.).
- Adapters = infrastructure implementations of those ports (database repo, HTTP client, event publisher).
- UI/presentation depends on the application layer (use cases), never directly on domain internals.
- Infrastructure implements domain ports; it does not dictate domain shape.
4. Application Layer (Use Cases)
- Build the system around use cases, not CRUD or framework conventions.
- Each use case: one class/function, one reason to change (SRP).
- Use DTOs / simple data structures to transfer data across layer boundaries; never leak domain entities into transport or infrastructure.
- Separate reads and writes where it adds value (CQRS-lite): simple optimized projections for reads, strict domain models for writes.
5. SOLID Principles (Enforced)
| Principle | Rule |
|-----------|------|
| SRP | One module, one reason to change. |
| OCP | Extend via new implementations, not modifying stable code. |
| LSP | Subtypes must not break client expectations. |
| ISP | Split fat interfaces into small, focused ones. |
| DIP | High-level code depends on abstractions, never on concretions. |
6. Dependency Management
- Declare interfaces for all external dependencies.
- Inject dependencies via constructors or factories; never use service locators or hidden global singletons.
- Prefer composition over inheritance; use inheritance only for true polymorphic hierarchies.
- Keep inter-module dependencies one-directional and minimal.
7. Module & Code Design
- Design modules with minimal, understandable APIs.
- No god objects, no "Manager of everything" classes.
- Do not let implementation details leak through public interfaces.
- Decompose complex classes into smaller, focused ones.
- Use readable, meaningful names; avoid Utils, Helper, Manager without context.
- Document public contracts; improve naming/structure instead of relying on comments.
8. Configuration & Secrets
- Move all configuration (URLs, keys, flags, timeouts) out of code.
- Apply config via environment variables, config files, and secret stores.
- Never hardcode sensitive data in the repository.
9. Error Handling
- Distinguish business errors (expected, part of the contract) from technical failures (unexpected exceptions).
- Design error types and response codes as part of the API contract.
- Never swallow exceptions; always log and handle appropriately.
- Validate at system boundaries and inside the domain (defense in depth).
10. API & Contract Design
- Design API contracts to be stable and backward-compatible.
- Version external APIs and domain events.
- Describe message schemas and data formats explicitly.
- Use simple DTOs for cross-layer/cross-service transport.
11. Security (From Day One)
- Design for authentication, authorization, audit logging, and data privacy from the start.
- Minimize the attack surface; expose only what is necessary.
- Follow OWASP guidelines; never trust boundary input without validation.
12. Observability
- Log key events at system boundaries and critical domain points using structured logging.
- Add metrics and distributed tracing for production observability.
- Design the system so it can be monitored, alerted on, and debugged.
13. Resilience & Reliability
- Design for network errors, latency, and temporary unavailability.
- Apply retries with backoff, timeouts, and circuit breakers where appropriate.
- Ensure operations are idempotent under retries.
- Design graceful degradation and fallback scenarios.
- Minimize single points of failure.
14. Scalability & Evolution
- Start with a simple, scalable monolith; split into services only when there is a real, measured need.
- If using microservices: define bounded contexts and data ownership clearly; minimize synchronous inter-service dependencies; prefer async/event-driven communication.
- Avoid distributed transactions unless absolutely necessary.
- Use feature flags for safe, incremental rollouts.
- Plan database migration and schema evolution strategies with backward compatibility.
- Think about schema evolution for messages, events, and contracts up front.
15. Testing Strategy
- Write code that is easy to test: separate business logic from frameworks.
- Unit tests for domain logic (pure, fast, no IO).
- Integration tests at adapter/boundary level.
- Test doubles (stubs, mocks, fakes) for external dependencies.
- Automate key end-to-end scenarios (minimal, high-value).
- Keep the test suite fast and reliable; integrate into CI/CD.
16. Code Quality & Process
- Follow a consistent code style; automate linters and formatters.
- No premature optimization — make code clear and correct first; optimize only after profiling.
- Avoid magic and overly clever solutions; prefer simplicity and explicitness.
- Limit the technology/framework stack deliberately.
- Treat code review as mandatory; discuss architectural decisions and trade-offs.
- Record decisions in short ADRs (Architecture Decision Records).
- Mark and plan repayment of technical debt.
- Balance ideal cleanliness with pragmatism.
17. Folder & Module Structure
- Structure folders to mirror the architecture (layers, bounded contexts), not accidental history.
- Name packages/namespaces by role and layer, not by technology.
18. Operability & Deployment
- Automate build, tests, deployment, and migrations.
- Ensure components can be deployed, updated, and replaced independently.
- Design for onboarding: new developers should understand the architecture quickly.
- Keep documentation current.
---
