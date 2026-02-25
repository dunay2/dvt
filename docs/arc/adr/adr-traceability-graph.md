# DVT+ — ADR Traceability Graph (Mermaid)

Below is a Mermaid **flowchart** diagram that models ADR documents and code as sources of truth, an automation layer, and a knowledge graph for impact analysis.

```mermaid
graph TB
    subgraph "Source of Truth"
        ADR[ADR Documents<br/>docs/adr/*.md]
        Code[Source Code<br/>with Headers]
    end

    subgraph "Automation Layer"
        HV[Header Validator]
        MG[Manifest Generator]
        RC[Reverse Coverage]
        CI[CI/CD Pipeline]
    end

    subgraph "Knowledge Graph"
        Neo4j[(Neo4j Database)]
        Queries[Impact Analysis<br/>Dead ADR Detection<br/>Blast Radius]
    end

    ADR --> HV
    Code --> HV
    HV --> MG
    MG --> RC
    RC --> CI
    CI --> Neo4j
    Neo4j --> Queries

    style ADR fill:#f9f,stroke:#333
    style Code fill:#bbf,stroke:#333
    style Neo4j fill:#bfb,stroke:#333
```
