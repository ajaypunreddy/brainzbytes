# Source Code and End-to-End State Structure

**Reviewed:** September 25, 2026  
**Status:** Canonical NextGen repository and state-boundary reference

ContextWeaver NextGen uses independently owned repositories rather than one
application monorepo. The boundary is deliberate: each runtime service owns one
deployable image, contract, tests, Helm package, and release lifecycle.
Infrastructure and GitOps remain declarative exceptions with no runtime image.

```architecture
title | Repository ownership to durable runtime state
subtitle | Each independently deployable service owns its release boundary; shared behavior crosses versioned contracts.
layer | 1 | Own the service boundary | cyan
card | Independent repository | Runtime code, tests, contracts, image, Helm chart, and operational documentation.
card | Versioned interfaces | HTTP, event, Registry, schema, and artifact contracts replace implementation imports.
layer | 2 | Build and promote | blue
card | CI pipeline | Validate contracts, test behavior, scan dependencies, sign artifacts, and publish immutable versions.
card | Registry and GitOps | Reference exact image, chart, Workflow, Agent Card, and MCP metadata versions.
layer | 3 | Execute through services | violet
card | Stateless runtime roles | Edge, orchestration, Agent, MCP, RAG, and workspace services scale independently.
card | Durable messaging | Commands and events carry references, integrity metadata, and correlation identifiers.
layer | 4 | Persist authoritative state | green
card | Transactional stores | Runs, tasks, leases, inbox, outbox, approvals, configuration, and Registry truth.
card | Artifact and evidence stores | Immutable inputs, outputs, citations, receipts, reports, and audit records.
note | Browsers, workers, Agents, MCPs, and caches can be replaced; accepted work remains in authoritative durable stores.
```

## 1. Repository model

The local NextGen workspace contains 32 independent Git repositories:

| Group | Repositories |
| --- | --- |
| Documentation and foundation | `contextweaver-nextgen-docs`, `contextweaver-nextgen-infrastructure`, `contextweaver-nextgen-gitops` |
| Experiences | `cw-user-web`, `cw-admin-web`, `cw-developer-portal` |
| Edge and identity | `cw-api-gateway`, `cw-authentication-gateway`, `cw-session-service`, `cw-identity-context` |
| Governance | `cw-entitlement-service`, `cw-policy-decision-service`, `cw-configuration-service`, `cw-audit-service` |
| Registry | `cw-registry-service` |
| Orchestration | `cw-intent-router`, `cw-workflow-compiler`, `cw-run-coordinator`, `cw-saga-hitl`, `cw-finalizer`, `cw-notification-service` |
| Artifacts | `cw-artifact-gateway`, `cw-report-store` |
| RAG and models | `cw-source-catalog`, `cw-rag-ingestion`, `cw-rag-retrieval`, `cw-context-citation`, `cw-context-memory`, `cw-model-gateway` |
| Workspaces | `cw-workspace-api`, `cw-workspace-controller`, `cw-workspace-session-gateway`, `cw-workspace-operations` |
| Migration | `cw-data-migration` |

Additional local implementation support includes:

- `cw-hello-world-worker`, which supplies the qualified local worker roles but
  is not currently one of the 32 independently initialized repositories;
- `repo-templates`, which holds shared repository scaffolding;
- `repository-catalog.json`, which defines repository group, kind, namespace,
  image, and delivery phase; and
- `plan.md`, which records chronological implementation and qualification
  evidence.

## 2. Repository invariant

Every runtime repository should contain the smallest complete independently
releasable unit:

```text
<repository>/
|-- src/ or app/             # Runtime implementation
|-- tests/                   # Unit, contract, component and negative tests
|-- contracts/               # Owned schemas or API/event examples
|-- helm/                    # Deployment package or values
|-- Dockerfile               # One runtime image
|-- pyproject.toml           # Python dependency and tooling boundary
|-- README.md                # Purpose, API, state and operational ownership
`-- pipeline definition      # Build, test, scan, sign and publish
```

The exact layout varies by technology, but the ownership rule does not:

- one repository owns one runtime image;
- cross-service behavior is expressed through versioned HTTP, event, Registry,
  or artifact contracts;
- consumers do not import another service's internal implementation;
- immutable releases are promoted rather than rebuilt per environment; and
- infrastructure and GitOps repositories contain declarative desired state,
  not application runtime code.

## 3. State ownership

| State | Authoritative owner |
| --- | --- |
| Service, Workflow, Agent, MCP and schema definitions | Registry |
| Scoped component configuration | Configuration Service |
| User identity and session | Authentication Gateway and Session Service |
| Normalized subject and tenant context | Identity Context |
| Entitlements and policy decisions | Entitlement and Policy Decision services |
| Service Run and Workflow Run lifecycle | Run Coordinator |
| Node attempts, waits, inbox/outbox and durable transitions | Run Coordinator |
| Human approval and Saga action state | Saga/HITL capability and Run Coordinator |
| Source ownership, authority and freshness | Source Catalog |
| Ingestion jobs and published index generations | RAG ingestion and retrieval services |
| Immutable content and evidence | Artifact Gateway / private object storage |
| Canonical final results and reports | Finalizer and Report Store |
| Notifications and delivery receipts | Notification Service |
| Workspace desired state and leases | Workspace API and controller |
| Security and business audit | Audit Service |
| Environment desired deployment state | GitOps repository |

No browser, Agent, MCP, worker, or in-memory process cache is an authoritative
store for accepted work.

## 4. End-to-end request path

```text
User Web
  |
  v
Authentication Gateway -> Session Service -> Identity Context
  |
  v
API Gateway
  |
  +--> Registry / Configuration / Entitlement / Policy
  |
  v
Intent Router
  |
  v
Workflow Compiler
  |
  v
Run Coordinator
  |
  +--> RabbitMQ command queues
  +--> Agent and MCP runtime roles
  +--> RAG Retrieval and Context/Citation
  +--> Artifact Gateway
  +--> Saga/HITL and Notification
  |
  v
Finalizer -> Report Store -> User Web
```

The local qualified slice runs this behavior with PostgreSQL state, RabbitMQ
quorum queues, MinIO artifacts, pgvector retrieval, and specialized Hello World
worker roles. The production contract preserves the same boundaries while
replacing local providers with approved managed or self-hosted equivalents.

## 5. Durable run structure

A Service Run is the user-visible aggregate. It contains one or more child
Workflow Runs, each pinned to an immutable Workflow revision.

```text
ServiceRun
|-- serviceId + immutable version
|-- identity, entitlement, policy and configuration snapshots
|-- WorkflowRun[]
|   |-- exact workflowId
|   |-- compiled graph snapshot
|   |-- NodeRun[]
|   |   |-- attempt history
|   |   |-- typed input and result references
|   |   |-- idempotency and operation identities
|   |   `-- authorization evidence
|   |-- waits, approvals, callbacks and timers
|   `-- workflow result
|-- citations and artifact references
|-- publication and verification receipts
|-- canonical result or terminal error
`-- correlated events, audit, metrics, logs and traces
```

The parent Service Run is complete only when its required child Workflow Runs
and finalization policy reach a terminal state.

## 6. Registry references

Service composition stores exact immutable references:

```json
{
  "serviceId": "service://hello-world-approval/1.5.0",
  "workflows": [
    {
      "key": "decision",
      "workflowId": "workflow://hello-world-decision/1.5.0"
    },
    {
      "key": "publication",
      "workflowId": "workflow://hello-world-publication/1.4.0"
    },
    {
      "key": "verification",
      "workflowId": "workflow://hello-world-verification/1.3.0"
    }
  ]
}
```

Readers must resolve `workflowId` exactly. They must not substitute the latest
revision sharing the same logical name.

Agent and MCP contracts follow the same rule: Registry owns immutable capability
versions, while Configuration Service owns optional scoped overlays. A
configuration-free component remains discoverable with `configurable: false`
and requires no invented configuration record.

## 7. Event and artifact boundaries

Events carry identifiers and immutable references, not raw credentials or large
documents.

Minimum event envelope:

```json
{
  "eventId": "evt_...",
  "eventType": "contextweaver.run.node.completed.v1",
  "occurredAt": "2026-09-25T00:00:00Z",
  "tenantId": "tenant-local",
  "serviceRunId": "sr_...",
  "workflowRunId": "wr_...",
  "nodeRunId": "nr_...",
  "traceparent": "00-...",
  "payloadRef": "artifact://..."
}
```

Large or sensitive content is written through the Artifact Gateway and is
referenced by immutable ID, digest, media type, schema, classification,
ownership, and retention metadata.

## 8. Delivery boundaries

The production delivery path is:

```text
Service repository
  -> tests and contract validation
  -> image build
  -> SBOM, scan, signature and provenance
  -> immutable image/chart release
  -> GitOps version update
  -> environment reconciliation
  -> smoke, security and operational qualification
```

Current repository and GitOps structures support this model, but approved
remotes, branch protection, signing, production environment values, and full
promotion automation remain production-readiness work.

## 9. Boundary rules

- No raw user or provider tokens in browser storage, prompts, events, artifacts,
  logs, or Agent/MCP payloads.
- No accepted work depends only on process memory.
- No definition is mutated after publication.
- No Service view infers composition from names when exact Registry references
  exist.
- No configuration-free component receives a fabricated setup requirement.
- No worker commits an external side effect without stable idempotency identity
  and durable receipt handling.
- No final result is published without required policy, approval, citation, and
  verification evidence.
