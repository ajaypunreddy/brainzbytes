# Source Code and End-to-End State Structure

This document defines the recommended code boundaries for the configurable agentic product platform. Agent, MCP, orchestration, policy, registry, RAG, and reporting capabilities are independently deployable microservices.

## 1. Repository model

Use three primary repositories so application builds, cloud foundation changes, and runtime promotion have independent ownership and blast radius:

```text
agentic-platform-source/          # Product code, contracts, SDKs, charts, tests
agentic-platform-infrastructure/  # Terraform/OpenTofu cloud and Kubernetes foundation
agentic-platform-gitops/          # Deployed versions and environment desired state
```

Large organizations may split individual services into repositories without changing the internal service contract described below.

## 2. Product source repository

```text
agentic-platform-source/
|-- apps/
|   |-- user-web/                       # Prompt, run status, HITL, reports
|   |-- admin-web/                      # Tenant, policy, catalog, config, operations
|   `-- developer-portal/               # Agent/MCP onboarding and contract testing
|
|-- services/
|   |-- edge/
|   |   |-- api-gateway/                # API facade, quotas, request validation
|   |   |-- identity-context/           # OIDC claims -> normalized subject context
|   |   `-- session-service/            # Opaque session metadata; no raw token cache
|   |
|   |-- orchestration/
|   |   |-- prompt-intent-service/      # Prompt -> typed intent and entities
|   |   |-- service-router/             # Intent -> entitled Service version
|   |   |-- workflow-compiler/          # Definition -> validated immutable DAG
|   |   |-- authorization-planner/      # Complete graph -> authorization manifest
|   |   |-- run-coordinator/            # Owns run lifecycle and scheduling
|   |   |-- task-dispatcher/             # Durable Agent/A2A task publication
|   |   |-- binding-engine/              # Artifact projections -> typed inputs
|   |   |-- saga-coordinator/            # Forward actions, commit, compensation
|   |   |-- checkpoint-service/          # Durable graph and retry checkpoints
|   |   |-- hitl-service/                # Approval queues, timeout, escalation
|   |   |-- finalizer/                   # Canonical result and disclosure gate
|   |   |-- report-renderer/             # JSON -> HTML/PDF/dashboard/export
|   |   `-- notification-service/        # Scoped completion/approval notifications
|   |
|   |-- governance/
|   |   |-- service-catalog/             # Versioned Service definitions
|   |   |-- workflow-catalog/            # Versioned Workflow definitions
|   |   |-- capability-registry/         # Agent Cards and MCP manifests
|   |   |-- schema-registry/             # Input/output/event compatibility
|   |   |-- configuration-service/       # Org/group/user overlays and snapshots
|   |   |-- entitlement-service/         # User/group -> Service grants
|   |   |-- policy-decision-service/     # PDP and policy-as-code bundles
|   |   |-- consent-purpose-service/     # Purpose, consent, legal basis
|   |   |-- classification-service/      # Data labels and handling obligations
|   |   |-- audit-service/               # Tamper-evident security/business audit
|   |   `-- retention-service/           # Retention, legal hold, deletion workflow
|   |
|   |-- artifacts/
|   |   |-- artifact-metadata-service/   # Immutable refs, hashes, schemas, lineage
|   |   |-- artifact-content-gateway/    # Scoped object-store read/write
|   |   `-- report-store-service/        # Canonical results and rendered reports
|   |
|   |-- rag/
|   |   |-- source-catalog/               # Ownership, authority, ACL revisions, freshness
|   |   |-- ingestion-orchestrator/       # Admit, extract, chunk, embed, shadow, publish
|   |   |-- index-publisher/              # Validate generations and atomically move aliases
|   |   |-- retrieval-service/            # ACL-filtered hierarchical retrieval
|   |   |-- reranking-service/            # Relevance/authority ranking
|   |   |-- context-pack-service/         # Bounded context with provenance
|   |   |-- citation-service/             # Citation validation and manifests
|   |   |-- context-memory-service/       # Governed working/session/semantic/long-term memory
|   |   `-- model-gateway/                # Approved model routing and budgets
|   |
|   |-- agents/
|   |   |-- agent-template/               # Golden A2A microservice template
|   |   |-- research-agent/
|   |   |-- analysis-agent/
|   |   |-- validation-agent/
|   |   `-- domain-<name>-agent/          # One deployable directory per Agent
|   |
|   `-- mcps/
|       |-- mcp-template/                 # Golden MCP microservice template
|       |-- document-mcp/
|       |-- database-mcp/
|       |-- messaging-mcp/
|       |-- external-api-mcp/
|       `-- domain-<name>-mcp/            # One deployable directory per plugin
|
|-- packages/
|   |-- contracts/
|   |   |-- run-context/                  # Base and child context schemas
|   |   |-- identity/                     # Subject, tenant, purpose, consent
|   |   |-- service/                      # Service definitions and results
|   |   |-- workflow/                     # DAG, binding, checkpoint, result
|   |   |-- a2a/                          # Agent Card, task, artifact envelopes
|   |   |-- mcp/                          # Tool, receipt, side-effect metadata
|   |   |-- transaction/                  # Saga, action, compensation, approval
|   |   |-- rag/                          # ContextPack and CitationManifest
|   |   |-- memory/                       # Memory operation, provenance, retention, deletion
|   |   |-- artifact/                     # Immutable reference and lineage
|   |   |-- authorization/                # Decision, obligation, manifest
|   |   |-- events/                       # Versioned event envelopes
|   |   `-- errors/                       # Stable machine-readable error model
|   |
|   |-- sdks/
|   |   |-- service-sdk/                  # Health, config, identity, telemetry
|   |   |-- agent-sdk/                    # A2A server/client and child context
|   |   |-- mcp-sdk/                      # MCP server, receipts, compensation
|   |   |-- policy-sdk/                   # PEP client and obligation enforcement
|   |   |-- artifact-sdk/                 # Scoped immutable artifact access
|   |   |-- event-sdk/                    # RabbitMQ contract, confirms, manual ack
|   |   |-- transaction-sdk/              # Idempotency and Saga action helpers
|   |   `-- telemetry-sdk/                # Privacy-safe logs, metrics, traces
|   |
|   `-- domain/
|       |-- identifiers/                  # Strong run/task/action/artifact IDs
|       |-- validation/                   # JSON Schema and compatibility helpers
|       |-- security/                     # Classification and redaction primitives
|       `-- testing/                      # Contract fixtures and service harness
|
|-- definitions/
|   |-- services/                         # Declarative Service versions
|   |-- workflows/                        # Declarative Workflow DAG versions
|   |-- agents/                           # Signed Agent Card source
|   |-- mcps/                             # Signed MCP capability manifest source
|   |-- schemas/                          # Published JSON Schemas
|   |-- policies/                         # Baseline and industry policy packs
|   |-- reports/                          # Canonical report and renderer templates
|   |-- rag-sources/                      # Source definitions and ingestion policy
|   `-- compatibility/                    # Supported version matrices
|
|-- charts/
|   |-- library/                          # Shared secure/scalable Helm primitives
|   |-- platform/                         # Control/governance/data API charts
|   |-- agents/                           # One chart per Agent or shared template
|   `-- mcps/                             # One chart per MCP or shared template
|
|-- deploy/
|   |-- local/                            # Kind/k3d and dependency profiles
|   |-- compose/                          # Developer-only supporting services
|   `-- smoke/                            # Post-deployment probes
|
|-- tests/
|   |-- unit/
|   |-- contract/                         # Producer/consumer schema compatibility
|   |-- component/                        # Service plus real local dependencies
|   |-- integration/                      # A2A, MCP, event, data, identity paths
|   |-- end-to-end/                       # Prompt through canonical report
|   |-- security/                         # AuthZ, isolation, DLP, abuse cases
|   |-- transaction/                      # Retry, crash, abandon, compensation
|   |-- resilience/                       # Dependency failure and recovery
|   |-- performance/                      # Latency, concurrency, queue saturation
|   `-- conformance/                      # Agent/MCP onboarding requirements
|
|-- tools/
|   |-- contract-cli/
|   |-- workflow-linter/
|   |-- capability-publisher/
|   |-- policy-test/
|   |-- test-data-generator/
|   `-- migration-cli/
|
|-- pipelines/
|   |-- templates/
|   |-- service-ci.yml
|   |-- contract-publish.yml
|   |-- image-chart-release.yml
|   `-- gitops-promotion.yml
|
|-- docs/
|   |-- architecture/
|   |-- adr/
|   |-- api/
|   |-- runbooks/
|   `-- threat-models/
|-- CODEOWNERS
|-- SECURITY.md
|-- CONTRIBUTING.md
`-- README.md
```

## 3. Standard shape of every microservice

Every orchestration, Agent, MCP, RAG, or governance service follows the same deployable shape:

```text
<service-name>/
|-- src/
|   |-- api/                    # Transport adapters only
|   |-- application/            # Use cases and ports
|   |-- domain/                 # Business rules; no infrastructure dependency
|   |-- infrastructure/         # Database, event bus, object, external adapters
|   |-- security/               # PEP, scope minimization, obligations
|   |-- telemetry/              # Approved trace/log attributes
|   |-- observability.*         # Local implementation of pinned metrics contract
|   `-- main.*                  # Composition root
|-- contracts/
|   |-- input.schema.json
|   |-- output.schema.json
|   |-- error.schema.json
|   `-- events/
|-- migrations/                 # Only when the service owns a schema
|-- tests/
|   |-- unit/
|   |-- contract/
|   |-- component/
|   `-- security/
|-- chart/
|   |-- Chart.yaml
|   |-- values.yaml
|   |-- values.schema.json
|   `-- templates/
|       |-- servicemonitor.yaml
|       `-- prometheusrule.yaml
|-- Dockerfile
|-- service.manifest.yaml       # Identity, operations, scopes, effects, health
|                               # Declares observability contract/version
|-- openapi.yaml                # When the service exposes HTTP APIs
|-- Makefile
`-- README.md
```

An Agent additionally contains an `agent-card.yaml`; an MCP contains an `mcp-manifest.yaml` with tool contracts, side-effect classes, idempotency requirements, and compensation operations.

Every Agent and MCP pins the
[`Agent and MCP Observability Standard`](OBSERVABILITY-STANDARD.md) version in
its local observability module and manifest/chart values. The service owns its
implementation, metrics listener, ServiceMonitor, and PrometheusRule. There are
no cross-service source imports or required bundled runtime package; production
services may instead depend on a separately versioned and published SDK.

## 4. Infrastructure repository

```text
agentic-platform-infrastructure/
|-- terraform/
|   |-- modules/
|   |   |-- contracts/
|   |   |-- network/
|   |   |-- identity/
|   |   |-- kms/
|   |   |-- kubernetes/
|   |   |-- node-pools/
|   |   |-- data-foundation/
|   |   |-- observability/
|   |   |-- backup/
|   |   `-- dr/
|   |-- providers/
|   |   |-- azure/
|   |   |-- aws/
|   |   `-- gcp/
|   `-- stacks/
|       |-- bootstrap/
|       |-- network/
|       |-- identity/
|       |-- data/
|       |-- cluster/
|       |-- platform-foundation/
|       |-- observability/
|       `-- dr/
|-- environments/
|   |-- dev/<cloud>/<region>/
|   |-- integration/<cloud>/<region>/
|   |-- stage/<cloud>/<region>/
|   `-- prod/<cloud>/<region>/
|-- policy/
|   |-- terraform/
|   `-- cloud/
|-- tests/
|   |-- contract/
|   |-- policy/
|   |-- failover/
|   `-- restore/
|-- pipelines/
|-- CODEOWNERS
`-- README.md
```

Terraform creates the foundation and autoscaling policy. HPA/KEDA and the cloud node autoscaler perform runtime scaling.

## 5. GitOps repository

```text
agentic-platform-gitops/
|-- bootstrap/
|-- clusters/
|   |-- dev/<cloud>/<region>/
|   |-- integration/<cloud>/<region>/
|   |-- stage/<cloud>/<region>/
|   `-- prod/<cloud>/<region>/
|-- applications/
|   |-- platform/
|   |-- governance/
|   |-- rag/
|   |-- agents/
|   `-- mcps/
|-- applicationsets/
|-- values/
|   |-- common/
|   |-- cloud/
|   |-- environment/
|   |-- region/
|   `-- tenant-tier/
|-- policies/
|-- rollouts/
|-- promotions/
|-- platform-contracts/          # Signed non-secret Terraform outputs
|-- tests/
|-- pipelines/
|-- CODEOWNERS
`-- README.md
```

This repository contains immutable versions, digests, non-secret values, Vault references, rollout policy, and environment composition. It contains no passwords, tokens, private keys, or private record data.

## 6. End-to-end Run Context

The API creates one immutable base context. The Orchestrator derives a smaller child context for each Workflow, Agent, MCP, RAG, and Finalizer call.

```json
{
  "identity": {
    "tenantId": "tenant-id",
    "organizationId": "organization-id",
    "groupIds": ["authorized-group-id"],
    "subjectId": "pseudonymous-subject-id",
    "sessionId": "opaque-session-id",
    "assurance": "mfa",
    "purpose": "declared-purpose",
    "consentRef": "consent://version",
    "policyProfileRefs": ["policy://baseline/v1", "policy://industry/v3"]
  },
  "execution": {
    "runId": "run-id",
    "serviceId": "service-id",
    "workflowId": "workflow-id",
    "taskId": "task-id",
    "parentTaskId": "parent-task-id",
    "traceId": "trace-id",
    "causationId": "event-id",
    "deadline": "RFC3339 timestamp",
    "budgetRef": "budget://snapshot"
  },
  "snapshots": {
    "serviceVersion": "content-hash",
    "workflowVersion": "content-hash",
    "registryRef": "registry://snapshot",
    "configurationRef": "config://snapshot",
    "authorizationManifestRef": "authz://manifest",
    "ragScopeRef": "rag-scope://snapshot"
  },
  "security": {
    "dataClassifications": ["confidential"],
    "allowedPurposes": ["declared-purpose"],
    "allowedDestinations": ["approved-system"],
    "decisionRef": "authz-decision://id",
    "obligations": ["redact-field-x", "region-us"]
  },
  "transaction": {
    "sagaId": "saga-id",
    "actionId": "action-id",
    "idempotencyKey": "opaque-key",
    "journalRef": "journal://position"
  },
  "artifacts": {
    "inputRefs": ["artifact://hash"],
    "contextPackRefs": ["context://hash"],
    "expectedOutputSchema": "schema://id/version"
  }
}
```

The context contains references, not raw credentials or unrestricted payloads. Short-lived credentials travel through protected transport metadata or workload identity, never durable events, logs, checkpoints, or artifacts.

## 7. State ownership

| State | Authoritative owner | Examples | Propagation rule |
| --- | --- | --- | --- |
| Human session | Identity/session service plus IdP | Opaque session ID, assurance, expiry | Reference only; never forward the original bearer token |
| Service entitlement | Entitlement and policy services | Allowed Service IDs and conditions | Re-evaluate during preflight and at use time |
| Configuration | Configuration service | Org/group/user overlays | Pin immutable effective snapshot per run |
| Capability metadata | Capability/schema registries | Agent Cards, MCP tools, contracts | Pin exact approved versions per run |
| Workflow execution | PostgreSQL run/checkpoint schemas | Node status, retries, bindings, deadlines | Orchestrator owns; tasks receive minimized views |
| Transaction state | PostgreSQL Saga journal | Intent, action, receipt, compensation | Orchestrator owns; MCP returns receipts only |
| In-flight work | RabbitMQ quorum queues | Commands, events, acknowledgements | IDs and immutable object references; bounded retention; not authoritative workflow state |
| Ephemeral coordination | Valkey/Redis | Rate counters, dedupe, bounded cache | TTL required; never source of truth |
| Inputs and outputs | Object storage through artifact gateway | Agent/MCP payloads, reports, evidence | Immutable, hashed, classified, tenant-scoped |
| RAG source catalog | PostgreSQL | Ownership, authority, source/ACL revisions, lifecycle, active generation | Reference-only metadata; stale/revoked/deleted sources blocked |
| RAG projections | Object/vector/search stores | Artifacts, chunks, embeddings, lexical entries, index generations | Shadow build; atomic alias publication; disposable and rebuildable |
| RAG context | Object/vector stores | ContextPack, chunks, citations | ACL and freshness filter in query; immutable context reference |
| Governed memory | PostgreSQL plus object/vector references | Working, session, semantic, approved long-term memory metadata | Provenance, retention, classification, purpose, policy decision, approval for long-term writes |
| Secrets | Vault/KMS | Dynamic DB/API credentials | Workload identity retrieval; never in context |
| Telemetry | OTel backends | IDs, status, duration, classification | No prompts, PHI, secrets, tokens, or artifact bodies |
| Audit | Audit service and immutable archive | Decisions, access, approvals, disclosure | Append-only, integrity protected, retained by policy |

## 8. Scope-reduction rules

1. The user receives Service entitlements, not blanket access to every nested capability.
2. The compiler expands the complete graph and produces an authorization manifest before execution.
3. Every child call receives the intersection of user, tenant, Service, Workflow, operation, purpose, and data policy.
4. A child service receives only required fields and artifact references.
5. Every A2A, MCP, RAG, model, data, and artifact operation is reauthorized at time of use.
6. On-behalf-of credentials are short-lived and audience-bound to one service and permitted action.
7. Agents and MCPs cannot query arbitrary run state; access is through typed, authorized APIs.
8. Context and artifact schemas are versioned and compatibility-tested.
9. Final disclosure is independently authorized and may be more restrictive than execution.
10. Active runs pin service versions; upgrades overlap compatible versions and drain old instances without interrupting work.
11. Downgrade is allowed only when stored data, contracts, and index generations remain backward-readable.
10. All state changes produce correlation, causation, policy-decision, and audit references.

## 9. Persistence and consistency

- Use PostgreSQL transactions for local control-state invariants.
- Use transactional outbox/inbox patterns between PostgreSQL and RabbitMQ; do not assume XA transactions.
- Use persistent messages, publisher confirms, manual consumer acknowledgements after the PostgreSQL commit, bounded retry/DLX/DLQ, and idempotent consumers for at-least-once delivery.
- Preserve ordering only per queue/routing/aggregate key where required; never claim global ordering.
- Use idempotency keys for every command and compensation.
- Store large payloads in object storage before publishing their immutable reference.
- Treat events as facts; do not mutate historical event payloads.
- Pin configuration, policy, schemas, models, workflows, and capability versions for reproducibility.
- Use optimistic concurrency for workflow/checkpoint updates.
- Encrypt every store and transport; use tenant-aware keys when required.
- Apply retention and deletion to metadata, artifacts, vectors, backups, caches, and derived reports.

## 10. Development order

1. Contracts, identifiers, error model, Run Context, and service template.
2. Identity context, entitlement, policy PEP/PDP, audit, and artifact gateway.
3. Registries, configuration snapshots, schema compatibility, and capability onboarding.
4. Orchestrator, compiler, scheduler, binding, checkpoints, events, and Saga.
5. Agent SDK/template and two reference Agent services.
6. MCP SDK/template and two reference MCP services, including compensation.
7. Hierarchical RAG ingestion/retrieval and model gateway.
8. Finalizer, canonical reports, DLP, disclosure checks, and renderers.
9. User/admin/developer experiences and HITL.
10. Terraform foundations, Helm charts, GitOps, observability, resilience, performance, DR, and conformance automation.

Do not begin by implementing many domain Agents or MCPs. First establish the contracts, security boundaries, state ownership, onboarding conformance, and operational golden paths that every future microservice must inherit.

## 11. Runnable reference microservice

See [`examples/gmail-agent-mcp`](../examples/gmail-agent-mcp/README.md) for three completely independent microservice projects: one Confirmation Agent consuming separate Gmail and Calendar MCPs. Each owns its dependency manifest, package namespace, versioned JSON Schemas, sample payloads, tests, Dockerfile, Helm chart, and plugin configuration where applicable; their only coupling is versioned wire contracts.
