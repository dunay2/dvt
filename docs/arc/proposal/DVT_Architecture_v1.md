# DVT+ Architecture (Strategy B → Meta A)

## Hosting Strategy (Initial Phase)

---

Layer Technology Hosting

---

Front-end React + TypeScript Vercel (Free Tier)

Backend API Node.js + TypeScript Render (Free Tier Web
(Dockerized) Service)

Database PostgreSQL Render Managed
Postgres (Free)

Event Store PostgreSQL (append-only table) Same Render Postgres

Git Storage GitHub GitHub

CI (dbt compile) GitHub Actions GitHub

Execution (Phase Oracle (test) / Snowflake External DB
B) (later)

Observability DB tables + target DB query Same Postgres + Target
history DB

---

---

## 1. High-Level Architecture

```mermaid
flowchart TB
  subgraph Frontend["Frontend (Hosted on Vercel)"]
    Canvas["Visual Canvas"]
    Panels["Inspector / Nodes / Runs"]
    EventBus["UI Event Bus"]
    Canvas --> EventBus
    Panels --> EventBus
  end

  subgraph Backend["Backend (Node.js on Render)"]
    API["REST API"]
    Command["Command Service"]
    Query["Query Service"]
    Planner["DeploymentPlanner (Strategy B)"]
    API --> Command
    API --> Query
    Command --> Planner
  end

  subgraph Storage["Render Postgres"]
    Events["Event Store (append-only)"]
    ReadModels["Read Models"]
    Metrics["Metrics Tables"]
  end

  subgraph Git["GitHub"]
    Repo["dbt Project + Artifacts"]
  end

  subgraph Targets["Execution Targets"]
    Oracle["Oracle (Scheduler/Jobs)"]
    Snowflake["Snowflake (Tasks/Procedures)"]
  end

  EventBus --> API
  Command --> Events
  Events --> ReadModels
  Query --> ReadModels
  Planner --> Repo
  Planner --> Oracle
  Planner --> Snowflake
  Oracle --> Metrics
  Snowflake --> Metrics
  Query --> Metrics
  API --> Frontend
```

---

## 2. Event-Sourced Core

```mermaid
flowchart LR
  UI["Frontend"] -->|User Events| API["Backend API"]
  API -->|Append| ES["Event Store"]
  ES -->|Project| RM["Read Models"]
  RM --> API
  API --> UI
```

Properties: - Append-only events - Replayable state - Undo/Redo
capability - Full audit trail

---

## 3. Author → Compile → Deploy Flow

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend
  participant GH as GitHub
  participant CI as GitHub Actions
  participant DB as Target DB

  U->>FE: Design graph
  FE->>BE: Save events
  BE->>GH: Export dbt project
  CI->>GH: dbt compile
  BE->>DB: Deploy Procedures/Tasks
  DB->>BE: Execution logs
  BE->>FE: Show status + metrics
```

---

## 4. Minimal Backend Responsibilities (MVP)

### Write Path

- POST /events
- POST /export/dbt
- POST /deploy

### Read Path

- GET /graph
- GET /runs
- GET /metrics

---

## 5. Evolution (Meta A -- Later)

```mermaid
flowchart LR
  PlannerA["ExecutionPlanner (Meta A)"] --> ExecPlan["ExecutionPlan"]
  ExecPlan --> Engine["Temporal / Conductor"]
  Engine --> Connectors["External Systems"]
```

---

## 6. Strategic Notes

- Frontend remains fully web-based.
- Backend is Dockerized and portable.
- All state is persisted in Postgres or GitHub.
- No local disk dependency.
- Architecture supports plugin growth.
- Strategy B delivers faster time-to-market.
- Meta A remains compatible via modular planner replacement.

---

End of document.
