# ContextWeaver NextGen Parity and Deployment Readiness

**Assessment date:** September 21, 2026  
**Conclusion:** Architecture and deployable scaffolding are established; functional
ContextWeaver parity is not implemented.

## 1. Current readiness

| Area | Status | Evidence |
| --- | --- | --- |
| Interactive documentation | Ready | Non-root NGINX image builds and serves `/health` and the documentation site |
| Canonical Azure production blueprint | Documented, implementation pending | Entra ID, private Azure topology, dynamic capability deployment, RAG, REST/chat execution, durability, and a parallel/serial/HITL PoC are consolidated in `azure-production-platform-and-poc.md` |
| Repository policy | Ready | 32 runtime/docs repositories declare exactly one image; infrastructure and GitOps are the two approved declarative exceptions |
| Container structure | Structurally ready | All 32 runtime/docs repositories have an image definition; source catalog, RAG ingestion, and governed context-memory images build locally |
| Helm structure | Structurally ready | The repository Helm structure is present; the governed context-memory chart lints successfully |
| Azure Terraform syntax | Structurally ready | The `azure-private` Terraform environment validates |
| Backend functionality | Mostly scaffold | Registry, authentication, workspace, AI configuration, Source Catalog/freshness, versioned RAG ingestion, and governed context-memory boundaries have specialized behavior; most remaining services still use scaffold behavior |
| Registry functionality | Development foundation | PostgreSQL persistence, strict version/owner/schema validation, lifecycle status, unit tests, and restart-persistence smoke tests are implemented; publisher trust and compatibility gates remain |
| React user application | Development experience operational | React 19, TypeScript, Vite, React Router, TanStack Query, Recharts, and Lucide provide a branded BrainzBytes/ContextWeaver shell with routed login, overview, workspace, observability, and platform views, subtle boundary accents, signed-in workspace ownership, and simultaneous responsive JupyterLab and VS Code panes; research and admin workflows remain |
| Automated tests | Started | Registry validation unit tests and a PostgreSQL restart-persistence smoke test exist; platform-wide contract, integration, security, resilience, and browser tests remain |
| Repository persistence | Not ready | The local NextGen repositories have no commits or configured remotes |
| CI/CD | Placeholder/unsafe | Pipelines contain incomplete templates, mutable `latest` tags, and environment placeholders |
| GitOps | Placeholder | ApplicationSet contains example repository URLs, example registry names, and `test` image tags |
| Azure infrastructure | Partial | AKS, ACR, Key Vault, Blob, identities, network, and logging are represented |
| AWS/GCP infrastructure | Not implemented | No deployable AWS or GCP environment exists |
| Common OSS platform | Local foundation | Digest-pinned PostgreSQL, RabbitMQ, Valkey, S3-compatible storage, Prometheus, Loki, Alloy, and Grafana run locally; OpenBao, Istio, KEDA, Argo CD bootstrap, OTel Collector, and Tempo remain |
| Authentication | Local provider operational | Scrypt-backed local identity, opaque PostgreSQL sessions, HttpOnly cookies, roles, and CSRF-protected workspace actions work; Entra/generic OIDC, group mapping, whole-graph entitlement preflight, runtime reauthorization, capability-token exchange, and policy enforcement remain |
| AI provider configuration | Local control plane operational | Administrator-managed chat, embedding, reranker, and retrieval profiles, secret references, revision history, reachability tests, logical aliases, runtime resolution, restart persistence, and topology status are implemented; actual model/search execution adapters remain |
| Durable workflow execution | Not implemented | No PostgreSQL state, RabbitMQ tasks, compiler, checkpoints, approvals, Saga journal, or finalization |
| Cross-pod work recovery | Partially specified | Two-replica charts and selected hardened rollouts exist; universal inbox/outbox, leases, checkpoints, receipts, broker redelivery, and restart tests remain |
| Credential non-possession | Partially implemented | Reference-only Source Catalog/RAG boundaries exist; canonical Agent/MCP schemas, admission policy, token exchange, and credential broker remain |
| RAG and memory | Local scalable foundation | `cw-source-catalog` persists ownership and freshness; `cw-rag-ingestion` now persists idempotent jobs, stages, generations, aliases, inbox/outbox, and deletion state in PostgreSQL; extraction, chunking, Model Gateway embedding workers, citations, and distributed deletion remain |
| RAG storage/search infrastructure | Functional locally, incomplete in cloud | Local infrastructure now uses pgvector, versioned RAG schemas, HNSW indexes, private MinIO bucket bootstrap, atomic generation publication, and governed lexical/vector retrieval; managed Azure PostgreSQL, optional distributed search, connection pooling, partition automation, and scale qualification remain |
| Agents/MCPs | Not implemented | No domain Agent or MCP repositories, runtime contracts, tool execution, receipts, compensation, or evaluation |
| Dynamic Agent/MCP operator | Not implemented | Admission is documented, but signed release bundles, operator-owned Helm reconciliation, runtime namespaces, drift control, automatic schema/tool discovery, and dashboard/alert generation are not implemented |
| Jupyter/VS Code | Unified local experience operational | Authenticated users start isolated JupyterLab and VS Code containers, preserve the mounted browser surfaces and in-tool state across React route navigation, use both simultaneously in side-by-side or stacked panes, and stop both on explicit logout while retaining persistent volumes; production Kubernetes reconciliation, session gateway, quotas, and culling remain |
| Legacy data migration | Not implemented | Migration repository does not export, transform, reconcile, or import legacy data |

## 2. What can be deployed today

### Safe to deploy

- `contextweaver-nextgen-docs`

### Deployable only as technical scaffolding

- The 26 backend images
- The three static web images
- The current Helm charts
- The partial Azure Terraform environment

Deploying these demonstrates image construction, health endpoints, chart
rendering, and basic service registration experiments. It does not provide a
working ContextWeaver product.

### Do not expose to users

The current NextGen runtime must not be promoted to a shared or production
environment because:

- Entra authentication is not implemented
- production authorization and tenant isolation are not implemented
- production Azure data stores and messaging are not deployed
- service readiness does not verify dependencies
- registry state is volatile
- APIs accept arbitrary objects and echo them
- network policies and ingress are incomplete
- images use mutable tags in current pipeline/GitOps examples
- there are no automated security or functional tests

## 3. Recommended first parity milestone

Do not target every legacy feature at once. Build one complete, secure vertical
slice called **Parity Milestone 1: Governed Document Research**.

### User outcome

An entitled user can:

1. Sign in with Entra ID.
2. See their normalized organization, groups, roles, and allowed Services.
3. Upload a PDF or text document.
4. Register the document as a scoped RAG source.
5. Trigger ingestion and observe durable status.
6. Ask a question against the authorized source.
7. Run one versioned Workflow using one read-only Agent and one read-only MCP
   or retrieval capability.
8. Receive streamed progress and a final answer with citations.
9. View the completed run and audit summary.

An administrator can:

1. Publish one Service definition.
2. Publish one Workflow definition.
3. Register and approve one Agent Card.
4. Register and approve one MCP manifest.
5. Assign the Service to a user/group.
6. Inspect service health, run status, queue state, and audit records.

### Required repositories for Milestone 1

Implement these first:

```text
contextweaver-nextgen-infrastructure
contextweaver-nextgen-gitops

cw-user-web
cw-admin-web
cw-api-gateway
cw-authentication-gateway
cw-session-service
cw-identity-context
cw-entitlement-service
cw-policy-decision-service
cw-audit-service
cw-registry-service
cw-artifact-gateway
cw-source-catalog
cw-rag-ingestion
cw-rag-retrieval
cw-context-citation
cw-context-memory
cw-model-gateway
cw-workflow-compiler
cw-run-coordinator
cw-finalizer

one read-only Agent repository
one read-only MCP repository
```

`cw-saga-hitl`, notifications, workspaces, advanced plugin generation, and
multi-cloud parity can follow after this read-only vertical slice is stable.

## 4. Work required before Milestone 1 deployment

### A. Persist and govern the repositories

- Create approved remote repositories.
- Make the initial signed commits.
- Add CODEOWNERS, branch protection, required reviews, and secret scanning.
- Configure independent workload-federated pipeline identities.
- Replace example repository and registry URLs.
- Remove mutable `latest` and `test` deployment tags; promote immutable digests.

### B. Finish the Azure development foundation

- Make AKS and data services private according to the target architecture.
- Add managed PostgreSQL and migrations.
- Add provider object-storage contract and scoped identities.
- Bootstrap Argo CD.
- Add namespace labels, ResourceQuota, LimitRange, and default-deny policies.
- Deploy Istio, cert-manager, external-dns, secret projection, and admission policy.
- Deploy RabbitMQ, Valkey, OpenBao/approved secrets broker, KEDA, and OTel.
- Deploy Prometheus, Grafana, Loki, Tempo, dashboards, and alerts.
- Add DNS, Gateway, TLS, ingress, backup, and restore configuration.
- Publish the signed non-secret platform contract.

### C. Implement authentication and authorization

- Entra OIDC authorization-code flow with PKCE, state, nonce, issuer, audience,
  key-rotation, and logout handling.
- Server-side sessions with secure cookies, expiration, and revocation.
- Provider-neutral identity normalization.
- Group-overage and group-resolution handling.
- Internal users, groups, roles, tenants, and entitlements.
- Policy evaluation for Service, source, artifact, Agent, MCP, and model access.
- Whole-graph preflight over every reachable required, optional, fallback,
  compensation, Agent, MCP, tool, model, RAG, artifact, and disclosure
  dependency before run creation.
- Immutable authorized execution plans with entitlement, relationship, policy,
  credential, and revocation epochs.
- Runtime reauthorization before every protected action, retry, resume,
  fallback, compensation, credential exchange, and disclosure.
- Short-lived audience-, plan-, run-, node-, tool-, operation-, resource-, and
  purpose-bound capability tokens validated independently by MCP ingress.
- Minimized child identity context; never forward raw user tokens.

### D. Implement durable platform state

- PostgreSQL schemas and migrations for identities, sessions, entitlements,
  definitions, registry, runs, tasks, checkpoints, inbox, outbox, artifacts,
  ingestion, citations, and audit.
- Transactional outbox publisher.
- Inbox deduplication for every consumer.
- RabbitMQ exchanges, queues, retry topology, DLQs, publisher confirms, and
  manual acknowledgements.
- Dependency-aware readiness probes.
- Idempotency and replay tests.

### E. Implement definitions and registry

- JSON Schemas for Service, Workflow, Agent Card, MCP manifest, events,
  artifacts, context packs, and errors.
- Signed immutable definition publication.
- Persistent registry storage.
- Signature, owner, version, schema compatibility, health, drain, region, and
  trust validation.
- Immutable registry snapshots for active runs.

### F. Implement RAG and artifacts

- Scoped upload and object references.
- Source catalog with tenant, organization, group, user, purpose,
  classification, retention, and consent metadata.
- Extraction, malware scanning, classification, chunking, and embedding.
- Model Gateway with the Azure OpenAI adapter.
- Retrieval with ACL and policy filters.
- Context pack with provenance and bounded token budget.
- Citation validation against immutable source versions.
- Ingestion and retrieval quality tests.

### G. Implement the workflow vertical slice

- Import or define one legacy-equivalent Workflow.
- Compile it to an immutable DAG.
- Authorize its complete reachable graph.
- Persist run and task state.
- Dispatch tasks through RabbitMQ.
- Invoke one Agent and one MCP/retrieval capability.
- Checkpoint and recover after pod or broker interruption.
- Finalize the output and stream progress to the React application.

### H. Build real React experiences

- Port approved user experience components from the legacy React application.
- Implement Entra login/logout and session state.
- Add source upload, ingestion progress, chat/research, run status, citations,
  and history.
- Add admin definition, entitlement, capability, health, and audit views.
- Use generated typed clients from published OpenAPI/contracts.
- Add browser, accessibility, authentication, and end-to-end tests.

### I. Add quality and security gates

- Unit, contract, component, integration, end-to-end, security, resilience, and
  performance tests.
- SBOM, vulnerability scan, provenance, signature, and admission verification.
- Sensitive-data tests for logs, traces, metrics, events, and DLQs.
- Tenant isolation and authorization-negative tests.
- Dependency failure, duplicate delivery, restart, replay, and restore tests.
- Pod, node, coordinator, worker, scheduler, broker, and database failover tests
  proving that accepted work is neither lost nor applied twice.
- Credential non-possession tests proving that Agent workloads cannot obtain
  raw secrets through mounts, messages, metadata, APIs, telemetry, or
  cross-tenant references.
- SLOs and production-readiness review.

## 5. Parity milestones after the first slice

### Milestone 2 - Workflow and administration parity

- Workflow CRUD and versioning
- Conditions, fan-out/fan-in, retries, timeouts, schedules, and webhooks
- Durable HITL approvals
- Saga receipts and compensation
- Service and Workflow catalogs
- Configuration hierarchy
- Notification service
- Broader audit and operational dashboards

### Milestone 3 - MCP and plugin parity

- MCP developer SDK and template
- Existing connector contract conversion
- Credential broker
- Tool discovery and invocation
- Idempotency, side-effect classification, receipts, and compensation
- Plugin generation and validation
- Review-to-Enforce evaluation lifecycle

### Milestone 4 - Jupyter and VS Code parity

- Workspace profiles and entitlement
- Workspace controller and custom resource
- JupyterHub with durable state
- Per-user code-server
- PVC lifecycle, snapshots, idle culling, quotas, and WebSocket ingress
- Agent/MCP developer profiles
- Brokered admin operations

### Milestone 5 - Broader RAG and data parity

- Organization/group/user knowledge scopes
- Sharing, revocation, retention, and invalidation
- Connector-driven ingestion
- Reranking and retrieval evaluation
- Additional document formats and OCR
- Legacy source/index migration and reconciliation

### Milestone 6 - Cloud portability

- AWS infrastructure and adapters
- GCP infrastructure and adapters
- Common platform-contract tests across AKS, EKS, and GKE
- Managed-service compatibility and restore tests

## 6. Milestone 1 completion gate

Milestone 1 is deployable only when:

- all required repositories have reviewed commits and configured remotes
- no runtime deployment uses a mutable image tag
- Azure development infrastructure and GitOps are reproducible
- Entra login, sessions, entitlement, and policy tests pass
- PostgreSQL, RabbitMQ, object storage, Valkey, secrets, and telemetry are
  integrated and recoverable
- one document can be uploaded, ingested, retrieved, and cited
- one Service and Workflow can run through one Agent and one MCP/retrieval
  capability
- progress survives process and pod restarts
- tenant and authorization-negative tests pass
- logs, traces, metrics, messages, and DLQs contain no protected bodies,
  credentials, or raw tokens
- the full scenario passes automated end-to-end and rollback tests

Until these gates pass, describe the system as a **validated architecture and
deployable scaffold**, not as a deployable NextGen ContextWeaver product.
