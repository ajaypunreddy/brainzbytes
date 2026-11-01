# ContextWeaver NextGen Implementation and Deployment Readiness

**Reviewed:** October 26, 2026  
**Conclusion:** The local NextGen vertical slice is operational and demonstrates
Registry-driven Services, exact immutable Workflow associations, governed RAG,
durable execution, human approvals, external waits, evidence, and observability.
The complete production Azure control plane, centralized policy stack, dynamic
capability operator, and production qualification remain incomplete.

## 1. Current readiness

| Area | Status | Verified implementation truth |
| --- | --- | --- |
| Public documentation | Operational | Role-based documentation, generated technical references, NextGen diagrams, and a NextGen-only sitemap are served locally |
| Repository model | Structured locally | 32 independent Git repositories exist locally; infrastructure and GitOps are declarative repositories, and no origin remotes are configured yet |
| Container structure | Structured locally | 33 Dockerfiles cover the independent repositories plus the local Hello World worker image |
| Local runtime foundation | Operational | PostgreSQL/pgvector, RabbitMQ, Valkey, MinIO, Prometheus, Loki, Tempo, Alloy, and Grafana run through the local Compose environment |
| Registry | Operational local foundation | PostgreSQL persistence, immutable versions, drafts, exact dependencies, lifecycle state, release compatibility, Built-in/Custom origin metadata, and validation tests are implemented |
| Services Studio | Operational local experience | Catalog, Build, and Portfolio use executable Registry Services as the authority and preserve exact immutable Workflow references and node counts |
| Four-Studio application model | Implemented application foundation | The main application presents MCP Studio, Agent Studio, Workflow Studio, and Service Studio as connected authoring experiences with one shared lifecycle; complete NextGen immutable publication and generic runtime dispatch remain production targets |
| MCP Studio | Implemented foundation | Existing Visual Designer, plugin assets, engine registration, service categories, dependency declarations, and trusted cross-engine tool proxy are presented as one governed capability-authoring surface |
| Agent Studio | Implemented foundation | Existing Agent/RAG chat, MCP engine selection, model/provider selection, and conversation history provide the interactive design and test foundation; independent immutable Agent publication and generic Agent runtime dispatch remain incomplete |
| Workflow Studio | Operational application foundation | Definitions, persisted runs, templates, visual composition, manual/webhook/scheduled triggers, approvals, conditions, parallel work, delays, and notifications are implemented |
| Service Studio | Implemented catalog and composition foundation | The application reuses the service-engine catalog and Workflow definitions to show reusable capability providers and composition inputs; complete business Service contract authoring remains a NextGen target |
| Configuration discovery | Operational local foundation | Active MCP and Agent contracts are synchronized from Registry; configurable components support scoped overlays, while configuration-free Agents appear as **No setup** |
| Authentication | Operational local provider | Local identities, server-side sessions, CSRF protection, roles, user filtering, and approval assignment work; Entra OIDC and Graph group resolution remain |
| Governed RAG | Operational local foundation | Source ownership/freshness, durable ingestion records, generations, pgvector and lexical retrieval, ACL/purpose/classification filters, and citations are implemented locally |
| Durable Service execution | Operational local PoC | PostgreSQL state, RabbitMQ commands, Workflow compilation, Service/Workflow runs, nodes, inbox/outbox, retries, HITL, timers, event waits, callbacks, publication, verification, and finalization work end to end |
| Recovery | Qualified for the local slice | Coordinator restart during a durable approval wait resumes successfully; duplicate delivery, rejected branches, and finalizer replay have been exercised |
| Run operations | Operational local experience | Concurrent Service runs, My Runs, Approval Inbox, compact Run History, replayable events, waits, attempts, typed results, citations, receipts, metrics, logs, and traces are available |
| Agents and MCPs | Registry and discovery foundation operational | An immutable example Agent and MCP are registered and discovered with skills/tools, contracts, requirements, health, metrics, and dashboards; generic arbitrary runtime dispatch remains |
| Credential non-possession | Partially implemented | Definitions and local boundaries use references rather than raw provider secrets; centralized credential exchange and workload capability tokens remain |
| Dynamic Agent/MCP operator | Production target | Signed release bundles, admission evidence, operator-owned reconciliation, isolated runtime namespaces, canary promotion, and automatic retirement are not implemented |
| Azure production platform | Architecture and partial infrastructure | Canonical private Azure topology and Terraform foundations exist; managed data services, Entra integration, private production deployment, and recovery qualification remain |
| CI/CD and GitOps | Scaffold | Pipeline and GitOps structures exist, but example values, immutable promotion, signed provenance, and production environment integration remain incomplete |
| Production qualification | Incomplete | Platform-wide security, tenant isolation, performance, resilience, backup/restore, disaster recovery, and browser qualification remain |

## 2. What works locally today

The current local environment supports a complete governed demonstration:

1. A signed-in user moves through the connected Studio model or selects an executable published Service.
2. The Service resolves its exact immutable Workflow versions from Registry.
3. The Workflow Compiler validates the graph and capability references.
4. The Run Coordinator accepts and persists the Service Run and child Workflow
   Runs before asynchronous work begins.
5. RabbitMQ dispatches typed node commands to replaceable worker roles.
6. Governed retrieval supplies policy-filtered evidence and citations.
7. Parallel Agent-style risk and readiness work feeds synthesis.
8. HITL, timers, notifications, event waits, and callback-correlated external
   interactions suspend and resume durably.
9. Publication and verification produce typed results and receipts.
10. Run History, metrics, logs, traces, audit evidence, and replayable events
    remain available for investigation.

The seeded Registry currently demonstrates:

- `hello-world-approval@1.5.0`, displayed as **Hello World Governed AI and RAG Service**;
- `governed-announcement@1.3.0`, displayed as **Governed Announcement and Callback Service**;
- exact Decision, Publication, and Verification Workflow revisions;
- `example-release-advisor-agent@1.2.0`, a configuration-free Agent with the
  `assess-release` skill; and
- `example-operations-mcp@1.0.0`, a configurable MCP exposing
  `diagnose-service`.

## 3. What remains before production

The local slice is evidence of architecture and behavior, not a production
readiness claim. The following remain mandatory:

- Microsoft Entra authorization-code flow with PKCE, normalized tenant and
  group resolution, secure logout, and production session controls;
- persistent entitlement, policy-decision, consent/purpose, audit, and
  credential-broker services;
- short-lived audience-, plan-, run-, node-, operation-, resource-, and
  purpose-bound capability tokens;
- private managed Azure PostgreSQL, object storage, messaging, secrets,
  networking, ingress, DNS, backup, restore, and disaster recovery;
- signed builds, SBOM/provenance verification, immutable image/chart promotion,
  admission policy, and GitOps reconciliation;
- dynamic Agent/MCP admission, scanning, approval, isolated deployment,
  canarying, drift control, and retirement;
- generic Agent/MCP execution workers beyond the qualified local roles;
- complete extraction, malware scanning, document-format, embedding-provider,
  reranking, citation, deletion, and large-scale RAG qualification;
- platform-wide negative authorization, tenant isolation, secret-exposure,
  duplicate-delivery, failover, load, soak, accessibility, and browser tests;
  and
- production SLO ownership, alert routing, runbooks, incident response, and
  operational approval.

## 4. Delivery priorities

### Priority 1: production identity and authority

- Entra OIDC and normalized Identity Context;
- persistent entitlements and policy decisions;
- runtime reauthorization and revocation epochs;
- credential exchange and capability tokens; and
- authoritative audit evidence.

### Priority 2: immutable delivery and private Azure

- configure approved repository remotes and branch protections;
- replace example pipeline and GitOps values;
- sign images, charts, definitions, and evidence;
- deploy the private Azure foundation and managed state services; and
- qualify backup, restore, rollback, and regional recovery.

### Priority 3: dynamic capability operations

- Agent/MCP submission contracts and evidence pipeline;
- admission policy and human approval;
- Capability Operator reconciliation;
- isolated namespaces, workload identity, network policy, quotas, and probes;
- canary evaluation, promotion, drain, rollback, and retirement; and
- generic typed runtime dispatch.

### Priority 4: scale and product qualification

- cursor-based operational APIs and high-cardinality estate tests;
- RAG capacity and quality evaluation;
- security, resilience, performance, accessibility, and browser suites;
- production dashboards, SLOs, alerts, and runbooks; and
- controlled Azure production readiness review.

## 5. Production completion gate

ContextWeaver is production-ready only when:

- every runtime image and chart is immutable, signed, scanned, and admitted;
- every Service Run is bound to current identity, entitlement, policy,
  configuration, model, retrieval, Agent, MCP, and definition snapshots;
- no Agent receives raw user or provider credentials;
- accepted work survives pod, node, deployment, broker, and database failures
  without silent loss or duplicate committed side effects;
- every protected action is reauthorized immediately before execution;
- every result has typed outputs, citations, decisions, receipts, and
  correlated operational evidence;
- tenant isolation, revocation, backup/restore, rollback, and disaster recovery
  are proven through automated tests; and
- architecture truth, implementation truth, and known gaps remain explicit in
  the product and documentation.
