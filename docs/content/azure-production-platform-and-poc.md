# Azure Production Platform Architecture and End-to-End Proof of Concept

**Specification date:** September 21, 2026  
**Reviewed:** September 25, 2026  
**Status:** Canonical Azure production target with an operational local proof of concept

## 1. Purpose

This document defines the complete architecture required to deploy
ContextWeaver as a production-ready service on Microsoft Azure with:

- Microsoft Entra ID authentication for users, administrators, APIs, and
  workloads;
- continuous entitlement and policy enforcement from Service request through
  every Agent, MCP, RAG, model, artifact, approval, and disclosure action;
- dynamic admission, scanning, approval, Helm deployment, discovery, and
  retirement of Agents and MCP servers;
- governed, durable, scalable RAG ingestion and retrieval;
- REST and conversational prompt-to-result experiences over one execution
  plane;
- durable orchestration supporting serial, parallel, conditional, retry,
  timer, external-event, HITL, fallback, and compensation nodes;
- credential non-possession inside Agent workloads;
- cross-pod recovery, immutable evidence, citations, final reports, metrics,
  logs, traces, SLOs, and operational controls; and
- a small end-to-end **Hello World Approval Service** proving the architecture.

This specification brings together the existing focused security, RAG,
resilience, authorization, and capability-lifecycle documents. Where this
document is less restrictive than a focused specification, the focused
specification wins.

## 2. Production outcome

An entitled user signs in with Entra ID, selects an approved Service, enters a
prompt through chat or REST, and receives a durable run identifier. The
platform resolves and authorizes an immutable Workflow graph, executes its
parallel and serial Agent nodes, pauses for a human decision, resumes safely,
invokes only authorized MCP tools, retrieves only authorized RAG content, and
returns one schema-valid final result with citations and audit evidence.

An authorized platform operator can submit a new Agent or MCP release. The
platform validates its specification, scans and evaluates its package and
image, obtains approval, deploys it by immutable digest through the Capability
Operator and an approved Helm chart, discovers its signed capabilities, and
promotes it through candidate and canary states without granting it ambient
credentials or cluster authority.

## 3. Non-negotiable invariants

1. **Authentication is not execution authorization.** Entra login establishes
   identity. Whole-graph preflight and runtime reauthorization grant bounded
   authority.
2. **Clients submit intent, not infrastructure.** Browsers and API clients
   cannot select arbitrary endpoints, credentials, MCP tools, or unapproved
   graphs.
3. **The plan is immutable.** A run pins definitions, schemas, versions,
   capability envelopes, policies, decisions, data scopes, budgets, and
   endpoint selections by digest.
4. **Agents never possess user or provider credentials.** Trusted gateways and
   MCP policy-enforcement points perform just-in-time token exchange.
5. **Accepted work is durable.** PostgreSQL state, RabbitMQ quorum queues,
   inbox/outbox, leases, checkpoints, receipts, and idempotency survive pod,
   node, and process failure.
6. **Every boundary is typed.** Prompt understanding, plans, tasks, Agent
   outputs, MCP calls, RAG results, approvals, artifacts, citations, events,
   errors, and final reports use strict versioned schemas.
7. **Only the Capability Operator deploys runtime capabilities.** Users,
   generated code, CI jobs, Agents, and workspaces cannot directly create
   production Agent or MCP workloads.
8. **RAG publication is generation based.** New indexes are built in shadow,
   validated, then atomically promoted; active generations are never mutated
   in place.
9. **HITL is a durable state, not a blocked thread.** A pause commits state,
   releases compute, expires authority, and requires fresh authorization when
   resumed.
10. **Final output is evidence backed.** The canonical result contains source,
    citation, decision, receipt, lineage, completeness, and degradation
    metadata.

## 4. Azure reference topology

```architecture
title|Private Azure production topology
subtitle|A private-by-default deployment with independently governed experience, control, execution, data, and integration boundaries.
layer|01|Users and enterprise channels|cyan
card|Internet and enterprise network|Browsers, approved APIs, administrators, operators, and enterprise callers.
card|Azure Front Door Premium + WAF|Global TLS edge, bot and rate controls, health routing, and private origin protection.
layer|02|Private ingress and trust boundary|blue
wide|Application Gateway or private ingress|No direct public AKS endpoint. Private DNS, controlled egress, workload identity, and policy-enforced routing.
layer|03|Private AKS application plane|violet
card|Experience|User Web, Admin Web, and durable event projection.
card|Edge|API Gateway, Authentication Gateway, Session, and Identity Context.
card|Governance|Entitlement, Policy Decision, Audit, Configuration, and credential exchange.
card|Registry|Service, Workflow, Agent, MCP, schema, and release compatibility.
card|Orchestration|Intent Router, Workflow Compiler, Run Coordinator, Saga/HITL, Notification, and Finalizer.
card|Governed RAG|Source Catalog, ingestion, retrieval, context, citation, memory, and Model Gateway.
card|Capability system|Admission evidence, discovery, operator reconciliation, health, and promotion.
card|Agent runtimes|Dynamically admitted, isolated, versioned, and independently scaled.
card|MCP runtimes|Credential-isolated integration and side-effect boundaries.
layer|04|Private state and platform services|green
card|PostgreSQL + pgvector|Runs, Registry, configuration, audit metadata, ingestion state, retrieval indexes, and RLS.
card|Azure Blob Storage|Immutable artifacts, source snapshots, context packs, reports, evidence, retention, and legal hold.
card|RabbitMQ quorum queues|Durable commands, events, publisher confirms, retries, and dead-letter handling.
card|Azure Managed Redis / Valkey|Sessions, rate limits, bounded cache, and coordination; never execution truth.
layer|05|Governed external capabilities|amber
card|Model providers|Azure OpenAI or approved external providers reached only through Model Gateway.
card|Enterprise systems|Approved MCP gateways use workload identity and just-in-time delegated authority.
note|Azure AI Search is introduced only when measured scale, latency, recall, or filtering requirements exceed the PostgreSQL full-text and pgvector tier.
```

### 4.1 Azure resource inventory

| Area | Required Azure service | Production configuration |
| --- | --- | --- |
| Identity | Microsoft Entra ID | Single- or multi-tenant app model chosen explicitly; Conditional Access and MFA for privileged roles |
| Edge | Azure Front Door Premium and WAF | TLS, bot/rate controls, private origin, health probes, no direct AKS public endpoint |
| Network | Hub/spoke VNet, Private DNS, Private Link, Azure Firewall | Private AKS API, controlled egress, DNS logging, no unrestricted public service endpoints |
| Compute | AKS | Availability zones, system/user node pools, autoscaler, workload identity, Azure Policy, Pod Security, PDBs, topology spread |
| Registry | Azure Container Registry Premium | Private endpoint, content trust/signatures, retention, quarantine, immutable promoted digests |
| Secrets | Azure Key Vault Premium | RBAC, private endpoint, purge protection, soft delete, rotation, workload identity access |
| Relational/vector data | Azure Database for PostgreSQL Flexible Server HA | Private endpoint, zone redundancy, backups/PITR, TLS, pgvector, RLS, connection pooling |
| Artifacts | Azure Storage with Blob | ZRS/GZRS as required, private endpoint, versioning, immutability where required, lifecycle and legal hold |
| Search scale-out | PostgreSQL full text + pgvector initially; Azure AI Search optionally | Introduce dedicated search only after measured capacity, latency, recall, or filtering limits |
| Messaging | RabbitMQ quorum queues on AKS or approved durable broker | Persistent messages, publisher confirms, DLQ, topology operator, zone spread, encrypted storage |
| Cache | Azure Managed Redis or approved Valkey deployment | Private endpoint, TLS, HA; cache never becomes execution source of truth |
| Models | Azure OpenAI or external model providers | Access only through Model Gateway, content minimization, regional policy, quotas, circuit breakers |
| Observability | Azure Monitor, Log Analytics, Managed Prometheus, Managed Grafana, Application Insights | OpenTelemetry correlation, SLOs, alerts, privacy-safe telemetry |
| Security | Defender for Cloud, Defender for Containers, Azure Policy | Admission policies, image and runtime findings, compliance export |
| Delivery | Azure DevOps or GitHub Actions plus Argo CD | Federated identities, environment approvals, signed images/charts, GitOps promotion |

### 4.2 Availability and recovery target

The initial production topology uses one Azure region with availability zones
and a tested secondary-region recovery plan. A regulated or high-availability
deployment should use active/passive regional recovery first; active/active
requires explicit conflict, event-ordering, workflow-affinity, and data
residency design.

Minimum targets for the first production tier:

| Concern | Target |
| --- | --- |
| Edge/API availability | 99.9% or higher |
| Accepted-run durability | No acknowledged request lost after durable commit |
| Recovery point | PostgreSQL and artifact objectives defined per data class; audit is append-only |
| Recovery time | Measured restore and regional failover objective |
| Orchestrator recovery | Another replica resumes expired leases without duplicate committed effects |
| Deployment recovery | GitOps reconstructs cluster desired state from signed definitions |

## 5. Microsoft Entra ID architecture

### 5.1 App registrations and identities

Create separate Entra applications or exposed API resources for:

| Registration | Purpose |
| --- | --- |
| `contextweaver-user-web-bff` | Confidential web/BFF authorization-code flow with PKCE; browser receives only the opaque session cookie |
| `contextweaver-admin-web-bff` | Separate privileged web/BFF, Conditional Access, admin scopes, and opaque session |
| `contextweaver-api` | API audience, delegated scopes, application roles, optional client-credential access |
| `contextweaver-cli-sdk` | Public client or device-code flow only if enterprise policy permits |
| automation clients | Confidential applications using certificate/federated credentials, never long-lived shared secrets |

AKS workloads use **Microsoft Entra Workload ID** with one narrowly scoped
managed identity per trust boundary. A shared cluster identity is prohibited.

### 5.2 User sign-in flow

```architecture
title|Microsoft Entra sign-in and session establishment
subtitle|The browser receives an opaque session cookie; raw access and refresh tokens remain inside trusted server-side boundaries.
layer|01|Begin protected sign-in|cyan
card|Browser|Requests login from the Authentication Gateway/BFF.
card|Authentication Gateway/BFF|Creates state, nonce, PKCE verifier, and authorization request.
layer|02|Microsoft Entra authorization|blue
wide|Entra authorize endpoint|Applies tenant policy, Conditional Access, MFA, consent, and authorization-code issuance.
layer|03|Trusted token redemption|violet
card|BFF callback|Validates state and authorization-code binding.
card|Entra token endpoint|Redeems the code with the PKCE verifier; tokens remain server-side.
layer|04|Normalized identity and session|green
card|Identity Context|Stores a validated claims reference, roles, groups, tenant, purpose, and policy epochs.
card|Session Service|Creates an opaque server-side session and returns a Secure, HttpOnly, SameSite cookie.
layer|05|Authorized application access|amber
wide|API Gateway|Receives the session cookie and CSRF token, then performs route and runtime authorization.
note|Agent and MCP workloads never receive the user's Entra access token, refresh token, client secret, or browser session cookie.
```

The gateway validates issuer, audience, tenant, signature, nonce, state,
authorization-code binding, token time bounds, and allowed authentication
strength. Raw access and refresh tokens are never returned to application
JavaScript or Agent workloads.

### 5.3 Normalized identity context

The normalized identity record contains:

- tenant and immutable principal object identifiers;
- display-safe user attributes;
- groups and application roles, with Microsoft Graph overage resolution when
  token group claims are incomplete;
- authentication method and strength;
- device and Conditional Access context where available;
- service assignments, relationships, purpose, consent, and data-scope
  references;
- identity, entitlement, relationship, policy, and revocation epochs; and
- privacy-safe correlation identifiers.

Group membership is an authorization input, not the complete policy. Service,
workflow, capability, resource, data-classification, purpose, and side-effect
decisions are evaluated separately.

### 5.4 Application and workload authorization

- User-delegated operations use On-Behalf-Of only inside trusted gateways when
  the downstream Azure service requires user delegation.
- Platform service-to-service calls use workload identity and audience-bound
  tokens.
- External connectors use Credential Broker references and the minimum
  short-lived credential required for one approved operation.
- The Agent namespace receives only opaque references and short-lived
  capability authorization; it receives no user token, provider key, client
  secret, certificate private key, database password, or Key Vault mount.

## 6. Platform service architecture

### 6.1 Experience and edge

| Component | Responsibility |
| --- | --- |
| User Web | Service discovery, chat, attachments, progress, clarification, HITL, cancellation, citations, artifacts, history |
| Admin Web | Definition publication, entitlement assignment, capability admission, rollout, health, evidence, audit |
| API Gateway | Versioned REST API, session/API authentication, idempotency, request validation, quotas, correlation |
| Authentication Gateway | Entra protocol handling, claims validation, session establishment and logout |
| SSE Event Projection | Durable ordered run events with resume cursor; no orchestration state in the browser |

### 6.2 Governance and control plane

| Component | Responsibility |
| --- | --- |
| Identity Context | Canonical identity, roles, groups, relationships, purpose, consent, epochs |
| Entitlement Service | Service and Workflow assignment and eligibility |
| Policy Decision Service | RBAC, ABAC, ReBAC, data, risk, side-effect, cost, region, approval decisions |
| Credential Broker | Reference-only just-in-time token/secret resolution inside trusted boundary |
| Audit Service | Append-only privacy-safe decisions, changes, receipts, access, and administrative actions |
| Registry Service | Logical Service, Workflow, Agent, MCP, schema, release, endpoint, and health registries |
| Capability Admission | Specification and evidence validation |
| Capability Operator | Sole reconciler for approved Agent/MCP releases |

### 6.3 Execution plane

| Component | Responsibility |
| --- | --- |
| Intent Router | Typed prompt understanding and policy-filtered Service/Workflow candidates |
| Workflow Compiler | DAG, schemas, bindings, budgets, fallback, compensation, capability closure |
| Run Coordinator | Durable run state, ready-set calculation, dispatch, leases, retries, timers, recovery |
| Saga/HITL Service | Durable approvals, external waits, deadlines, escalation, compensation journal |
| Runtime Contract Gateway | Validates and projects every Agent/MCP/RAG/model artifact crossing a boundary |
| Finalizer | Builds and signs the canonical final result and channel-specific renderings |
| Notification Service | Sends approved notification references without becoming the source of truth |

### 6.4 Data and AI plane

| Component | Responsibility |
| --- | --- |
| Artifact Gateway | Immutable encrypted objects, metadata, lineage, retention, legal hold |
| Source Catalog | Source ownership, authority, ACL revision, freshness, classification, residency |
| RAG Ingestion | Durable extraction, chunking, embedding, generation building and publication |
| RAG Retrieval | Tenant/ACL/purpose/classification-filtered lexical/vector retrieval |
| Context Citation | Citation verification, source revision and passage binding |
| Context Memory | Governed working, session, semantic, and approved long-term memory references |
| Model Gateway | Provider routing, model policy, minimization, quota, safety, telemetry, retries |

## 7. Dynamic Agent and MCP deployment

### 7.1 Submission and promotion

```architecture
title|Dynamic Agent and MCP promotion pipeline
subtitle|Untrusted submissions become usable capabilities only after evidence, approval, isolated deployment, and measured rollout gates pass.
layer|01|Submit immutable intent|cyan
wide|AgentSpec or MCPSpec|Owner, package, image, chart, contracts, runtime profile, and requested capability references.
layer|02|Validate and inspect|blue
card|Schema and ownership|Required metadata, contracts, maintainers, support, lifecycle, and policy scope.
card|Supply-chain evidence|Signature, provenance, SBOM, license, malware, secret, and CVE inspection.
card|Behavioral qualification|Contract, sandbox, prompt-injection, quality, safety, and resilience tests.
layer|03|Governed release decision|violet
card|Policy evaluation|Classification, residency, side effects, credentials, network, and runtime risk.
card|Human approval|Risk-tiered review with decision evidence and separation of duty.
card|CapabilityRelease|Signed immutable bundle of approved artifacts and evidence.
layer|04|Operator reconciliation|green
card|Isolated runtime|Namespace, identity, NetworkPolicy, quota, queues, probes, and Helm release.
card|Runtime attestation|Image digest, policy, health, schemas, tools, metrics, and dashboards.
layer|05|Progressive activation|amber
wide|Candidate to canary to active alias|Synthetic and live evaluation gates promotion; failure drains or rolls back without changing immutable evidence.
```

### 7.2 Required custom resources

At minimum:

- `CapabilityRelease`: immutable approved evidence and artifact digests;
- `AgentRuntime`: desired Agent deployment, schemas, identity, resources,
  network and rollout;
- `MCPRuntime`: desired MCP deployment, tool contracts, connector boundary,
  identity and rollout;
- `WorkflowDefinition`: versioned DAG and bindings;
- `ServiceDefinition`: end-user product contract and eligible workflows;
- `RAGSource`: governed source and indexing policy; and
- `Workspace`: optional user development environment, isolated from
  production deployment authority.

### 7.3 Runtime namespace baseline

Each Agent/MCP runtime receives:

- dedicated namespace or policy-approved isolation group;
- Pod Security restricted profile, non-root, read-only root filesystem,
  dropped capabilities, seccomp, no host access;
- default-deny ingress and egress NetworkPolicies;
- dedicated Kubernetes service account and workload identity only when needed;
- no automatic service-account token for Agent pods;
- ResourceQuota, LimitRange, HPA/KEDA, PDB and topology spread;
- broker virtual host/queue permissions scoped to its capability;
- approved ConfigMaps and opaque secret references, never raw credentials in
  the Agent;
- liveness, readiness, startup, graceful drain, and disruption behavior;
- OpenTelemetry, metrics, logs, dashboard and alert metadata; and
- owner, support, SLO, lifecycle, release and evidence labels.

### 7.4 Discovery

After deployment, a trusted discovery controller reads signed Agent Cards or
MCP descriptors and registers:

- capability and operation identifiers;
- strict input/output/error/stream schemas;
- side effects, idempotency, compensation and approval requirements;
- data classifications, purposes, scopes and regions;
- endpoint reference, workload identity, trust and release digest;
- metrics, dashboards, alerts, runbook and support owner; and
- health, capacity, canary and evaluation state.

Discovery does not automatically make a capability usable. The active registry
alias changes only after policy and rollout gates pass.

## 8. Governed RAG ingestion and retrieval

### 8.1 Ingestion path

```architecture
title|Governed RAG ingestion and publication
subtitle|A changed source is never exposed directly. Every generation is built in shadow, evaluated, and promoted atomically.
layer|01|Authorize and snapshot|cyan
card|Source registration|Ownership, ACL, purpose, classification, residency, authority, and revision.
card|Immutable snapshot|Approved source revision is captured in private Blob Storage by reference.
layer|02|Commit durable work|blue
card|PostgreSQL transaction|Ingestion job, deterministic stages, generation identity, and outbox record.
card|RabbitMQ dispatch|Persistent command delivery with confirms, retry, and dead-letter handling.
layer|03|Inspect and transform|violet
card|Safety validation|Malware, type, secrets, DLP, prompt-injection, poisoning, licensing, and consent gates.
card|Extraction and chunking|Versioned extractor plus deterministic, policy-aware chunk boundaries.
card|Model Gateway|Minimized embedding requests routed only to approved providers and regions.
layer|04|Build the shadow generation|green
card|Vector index|Dimension-pinned pgvector writes with tenant and policy metadata.
card|Lexical index|PostgreSQL full-text vectors and filterable document/chunk records.
card|Deletion ledger|Tombstones, quarantine, revocation, legal hold, and stale-source exclusions.
layer|05|Evaluate before exposure|blue
wide|Publication gates|Completeness, ACL enforcement, retrieval quality, citation integrity, deletion behavior, and rollback readability.
layer|06|Publish atomically|amber
card|Active alias promotion|New queries move to the validated generation in one atomic operation.
card|Rollback and evidence|Previous generation is retained within policy and an immutable audit receipt is recorded.
```

All stages are idempotent and checkpointed. Workers acknowledge queue messages
only after durable stage state and the next outbox event commit.

### 8.2 Storage

- Blob Storage holds immutable source snapshots, extracted content, large
  artifacts, context packs, and final renderings.
- PostgreSQL holds source governance, jobs, stages, generations, aliases,
  documents, chunks, vectors, lexical state, deletion ledger, citations, run
  state, and metadata.
- pgvector plus PostgreSQL full-text search is the initial production tier.
- Azure AI Search is optional behind the same provider-neutral retrieval
  contract when measured scale requires it.

### 8.3 Retrieval enforcement

Retrieval is constrained before ranking by:

- tenant and principal;
- source and group ACL revision;
- Service, Workflow, run, node and purpose;
- classification, consent, relationship and residency;
- active generation and source freshness;
- allowed namespaces and mandatory source rules; and
- deletion, quarantine, revocation and legal-hold state.

Every returned passage includes a citation reference, source revision,
generation, chunk hash, policy decision and retrieval score. Unverified model
attribution cannot become a citation.

## 9. Prompt-to-result contract

REST and chat are clients of the same APIs and execution plane.

### 9.1 Core API

```text
GET    /v1/services
GET    /v1/services/{serviceId}
POST   /v1/requests
GET    /v1/runs/{runId}
GET    /v1/runs/{runId}/events
POST   /v1/runs/{runId}/clarifications
GET    /v1/runs/{runId}/approvals
POST   /v1/runs/{runId}/approvals/{approvalId}
POST   /v1/runs/{runId}/cancel
GET    /v1/runs/{runId}/result
GET    /v1/runs/{runId}/artifacts
GET    /v1/runs/{runId}/citations
```

`POST /v1/requests` requires an idempotency key and returns:

```json
{
  "runId": "run-01...",
  "status": "accepted",
  "statusUrl": "/v1/runs/run-01...",
  "eventsUrl": "/v1/runs/run-01.../events",
  "resultUrl": "/v1/runs/run-01.../result"
}
```

The normal response is `202 Accepted`. The durable request, run, identity
reference, selected Service, and initial outbox event must commit before the
response is sent.

### 9.2 Durable SSE

The event endpoint uses Server-Sent Events with:

- monotonically ordered event sequence per run;
- `id` suitable for `Last-Event-ID` resume;
- typed event name and schema version;
- run/node state, progress, safe message and artifact references;
- clarification, approval, warning, degradation, citation and completion
  events; and
- no secrets, raw credentials, unrestricted prompts, or sensitive payloads.

WebSocket may be added for bidirectional collaboration, but it does not replace
the durable event log.

### 9.3 Run state model

```text
accepted -> understanding -> compiling -> authorizing -> queued
queued -> running
running -> waiting_clarification | waiting_approval | waiting_external
waiting_* -> queued -> running
running -> finalizing -> succeeded | partially_succeeded
any non-terminal -> cancelling -> cancelled
any non-terminal -> failed
```

Every transition is validated, persisted, version checked, and emitted through
the transactional outbox.

## 10. Durable workflow runtime

### 10.1 Node types

The compiler supports:

- `agent`: invoke an approved Agent capability;
- `mcp`: invoke an exact approved MCP tool;
- `rag`: execute a governed retrieval plan;
- `model`: call a model through Model Gateway;
- `parallel`: release independent children concurrently;
- `join`: wait for declared required artifacts;
- `condition`: evaluate a typed deterministic expression;
- `transform`: bounded allowlisted schema transformation;
- `timer`: durable deadline or delay;
- `external_event`: correlation-bound callback;
- `hitl`: durable approval or information request;
- `subworkflow`: pinned child workflow;
- `compensation`: declared reversal or reconciliation action; and
- `finalize`: build the canonical result.

### 10.2 Scheduling and recovery

The Run Coordinator:

1. persists the run and immutable plan;
2. calculates the ready set from committed artifacts and node states;
3. commits task rows and outbox messages atomically;
4. lets competing workers acquire bounded leases;
5. validates current authorization immediately before dispatch;
6. records task attempts, checkpoints, receipts and output artifact hashes;
7. opens joins only after required validated artifacts commit;
8. expires leases after failure so another replica can recover;
9. deduplicates by run, node, attempt, operation and idempotency key; and
10. finalizes only after declared terminal and evidence requirements are met.

The coordinator never relies on a synchronous coordinator-to-Agent or
Agent-to-MCP call chain for accepted work. Every executable node is committed
as a task plus outbox event, published with broker confirmation, consumed from
a RabbitMQ quorum queue, protected by a PostgreSQL lease, and acknowledged only
after its result, checkpoint, receipt, and next events commit. Agents request
MCP effects by typed intent; the trusted MCP Gateway performs the independently
authorized provider call. Browser disconnects, pod restarts, deployments, and
HITL waits therefore do not own or interrupt execution state.

See [Durable Asynchronous Execution Architecture](durable-asynchronous-execution.md)
for the complete command, event, lease, checkpoint, retry, reconciliation, and
SSE model.

## 11. Hello World Approval Service PoC

### 11.1 Demonstrated behavior

The PoC accepts:

```text
"Prepare a hello-world release recommendation for Contoso. Use the approved
knowledge source, run risk and readiness checks in parallel, ask me to approve
the release, then publish a final recommendation."
```

It demonstrates:

1. Entra authentication and Service entitlement;
2. request-time workflow authorization;
3. RAG retrieval from a small approved source;
4. two parallel Agent branches;
5. a serial synthesis step;
6. a durable HITL approval;
7. one MCP action after approval;
8. final result, citations, receipts, graph state, and audit evidence; and
9. restart/resume from another coordinator or worker pod.

### 11.2 Graph

```architecture
title|Hello World governed release workflow
subtitle|Every transition is a durable committed dependency, not an in-memory function call.
layer|01|Accept and persist|cyan
card|Client response|Return `202 Accepted`, `runId`, and a replayable event URL.
card|Durable admission|Commit Service Run, exact Workflow plan, first task, and outbox record.
layer|02|Understand and ground|blue
card|Understand request|Normalize intent, scope, constraints, and required result contract.
card|Retrieve approved guidance|Policy-filtered RAG returns governed evidence and citations.
layer|03|Parallel assessment|violet
card|Risk Agent|Evaluates release hazards, controls, and residual risk.
card|Readiness Agent|Evaluates operational readiness, evidence, and launch conditions.
layer|04|Join and decide|green
card|Synthesis Agent|Waits for both committed branch artifacts and builds one recommendation.
card|Human approval gate|Persists assignment, action hash, decision, reason, expiry, and separation-of-duty evidence.
layer|05|Protected outcome|amber
card|Approved: Publisher MCP|Executes one idempotent publication action and stores the provider receipt.
card|Rejected: Finalizer|Produces a typed rejected result without executing the protected side effect.
layer|06|Verify and finalize|blue
wide|Final result|Returns the typed recommendation, citations, decisions, receipts, Workflow outcomes, audit evidence, metrics, logs, and trace references.
```

Every arrow between workflow nodes represents a committed dependency and a new
durable task dispatch. It is not an in-memory function call. Parallel branches
use separate queue messages and leases; the join opens only after both output
artifacts commit; HITL persists without holding a worker; the Publisher MCP
uses an idempotency key and provider receipt; and the final result is emitted
through the durable event log.

### 11.3 Minimal Service definition

```yaml
apiVersion: platform.contextweaver.io/v1
kind: ServiceDefinition
metadata:
  id: service://hello-world-approval
  version: 1.0.0
spec:
  displayName: Hello World Approval
  workflowRef: workflow://hello-world-approval/1.0.0
  inputSchemaRef: schema://hello-world/request/1.0.0
  outputSchemaRef: schema://hello-world/result/1.0.0
  requiredEntitlement: service.hello-world.execute
  allowedPurposes: [proof-of-concept]
  channels: [rest, chat]
```

### 11.4 Minimal Workflow definition

```yaml
apiVersion: platform.contextweaver.io/v1
kind: WorkflowDefinition
metadata:
  id: workflow://hello-world-approval
  version: 1.0.0
spec:
  inputSchemaRef: schema://hello-world/request/1.0.0
  outputSchemaRef: schema://hello-world/result/1.0.0
  nodes:
    - id: understand
      type: model
      capability: capability://prompt-understanding
    - id: retrieve
      type: rag
      dependsOn: [understand]
      sourcePolicyRef: rag-policy://hello-world-approved
    - id: risk
      type: agent
      dependsOn: [retrieve]
      capability: capability://hello-world.risk
    - id: readiness
      type: agent
      dependsOn: [retrieve]
      capability: capability://hello-world.readiness
    - id: synthesize
      type: agent
      dependsOn: [risk, readiness]
      capability: capability://hello-world.synthesize
    - id: approve
      type: hitl
      dependsOn: [synthesize]
      approvalPolicyRef: approval://hello-world-owner
      timeout: PT24H
      onReject: finalize-rejected
    - id: publish
      type: mcp
      dependsOn: [approve]
      capability: mcp://hello-world-publisher/publish_message
      sideEffect: reversible
      idempotency: required
    - id: finalize
      type: finalize
      dependsOn: [publish]
    - id: finalize-rejected
      type: finalize
      dependsOn: [approve]
  budgets:
    maximumDuration: PT25H
    maximumModelTokens: 20000
    maximumCostUsd: 5
```

### 11.5 PoC capability set

| Capability | Deployment | Behavior |
| --- | --- | --- |
| Prompt Understanding | Model Gateway profile | Produces typed intent and normalized organization |
| Hello World RAG | RAG services | Returns approved greeting/release guidance and citations |
| Risk Agent | `cw-agents-poc-risk` | Produces `riskLevel`, findings and evidence references |
| Readiness Agent | `cw-agents-poc-readiness` | Produces checklist, readiness score and evidence references |
| Synthesis Agent | `cw-agents-poc-synthesis` | Joins both parallel artifacts into an approval proposal |
| Approval Gate | Saga/HITL service | Persists approval request, deadline, approver and decision |
| Publisher MCP | `cw-mcps-poc-publisher` | Idempotently records/publishes the approved hello-world message |
| Finalizer | platform service | Produces the canonical result, HTML view and audit summary |

### 11.6 Agent graph API projection

`GET /v1/runs/{runId}` returns a safe graph projection:

```json
{
  "runId": "run-01...",
  "workflow": "workflow://hello-world-approval/1.0.0",
  "status": "waiting_approval",
  "nodes": [
    {"id": "understand", "state": "succeeded"},
    {"id": "retrieve", "state": "succeeded"},
    {"id": "risk", "state": "succeeded", "lane": "parallel-a"},
    {"id": "readiness", "state": "succeeded", "lane": "parallel-b"},
    {"id": "synthesize", "state": "succeeded"},
    {"id": "approve", "state": "waiting_approval"},
    {"id": "publish", "state": "blocked"},
    {"id": "finalize", "state": "blocked"}
  ],
  "approval": {
    "approvalId": "approval-01...",
    "status": "pending",
    "expiresAt": "2026-09-22T13:00:00Z"
  }
}
```

The chat workspace renders this projection as a live DAG. It highlights active
parallel branches, completed serial dependencies, the HITL gate, retries,
waiting states, and finalization. It never exposes internal credentials,
private prompts, raw policy documents, or unrestricted tool arguments.

### 11.7 PoC user experience

1. User signs in with Entra ID.
2. User selects **Hello World Approval**.
3. User submits the prompt through chat or `POST /v1/requests`.
4. UI receives `202 Accepted`, opens the SSE stream, and displays the graph.
5. Retrieval completes and both Agent branches run concurrently.
6. Synthesis completes and the run enters `waiting_approval`.
7. Authorized approver reviews evidence and chooses approve or reject.
8. On approve, runtime authorization is refreshed and Publisher MCP executes.
9. Finalizer returns status, recommendation, publication receipt, citations,
   timeline, node outcomes, policy decisions, and audit reference.
10. The completed run remains queryable after browser disconnect or pod
    restart.

## 12. Security controls

### 12.1 Network and workload

- private AKS and private PaaS endpoints;
- default-deny NetworkPolicy and explicit egress destinations;
- service mesh mTLS or equivalent workload identity verification;
- restricted Pod Security, read-only roots and minimum writable paths;
- no Agent access to Key Vault, Kubernetes API, metadata endpoints, or
  unrestricted internet;
- trusted MCP/Model gateways as the only credential-resolution boundary;
- signed images, charts, specifications and evidence bundles by digest; and
- admission rejection for mutable tags, privilege, host mounts, unknown
  fields, missing owner/SLO/runbook, or unapproved identities.

### 12.2 Data

- encryption in transit and at rest;
- tenant RLS and explicit application tenant context;
- field classification and minimum-necessary projection;
- object versioning, retention, deletion ledger and legal hold;
- no sensitive payloads in queue metadata, logs, traces, metrics, events, DLQ,
  registry records or capability descriptors;
- citation and provenance binding for generated answers; and
- backup restore, key rotation, revocation and deletion tests.

### 12.3 Supply chain

- protected branches and CODEOWNERS;
- federated CI/CD identities;
- reproducible builds where feasible;
- SBOM, provenance, signing, malware, secret, license, SAST, dependency and
  image scans;
- admission policy against approved registries and digest allowlists; and
- environment approval and separation of duties for production.

## 13. Observability and operations

Every request carries a privacy-safe correlation chain:

```text
request -> run -> plan -> node -> attempt -> tool/retrieval/model call
        -> artifact -> citation -> approval -> receipt -> final result
```

Required telemetry includes:

- request, authorization, compilation and queue latency;
- ready-set, task, retry, lease-expiry, checkpoint and recovery metrics;
- Agent/MCP/model/RAG success, timeout, schema failure and circuit state;
- RAG ingestion backlog, stage age, generation freshness and retrieval quality;
- approval age, expiry and escalation;
- cost, token, tool, storage and tenant quota;
- deployment admission, rollout, canary, drift and evaluation state; and
- finalization completeness, citation verification and disclosure decisions.

Dashboards and alerts are generated from capability and service metadata.
Operational commands never bypass policy, authorization, audit, or immutable
desired state.

## 14. Delivery phases

### Phase 0 - decisions and foundations

- Confirm tenant model, regions, RTO/RPO, data classes and compliance scope.
- Confirm RabbitMQ deployment choice and PostgreSQL/search capacity tier.
- Create subscriptions/resource groups, naming, tags, budgets and ownership.
- Establish private DNS, connectivity, self-hosted deployment agents and
  break-glass operations.

### Phase 1 - Azure platform

- Provision private AKS, ACR, Key Vault, PostgreSQL, Blob, cache, monitoring,
  network and identities through Terraform.
- Bootstrap policies, namespaces, service mesh, secrets integration,
  observability and Argo CD.
- Prove backup restore, zone loss, node drain and GitOps reconstruction.

### Phase 2 - Entra and governance

- Implement Authentication Gateway, Session Service and Identity Context.
- Configure SPA/API applications, scopes, roles, group overage and logout.
- Implement Entitlement, PDP, Audit and Credential Broker.
- Prove request-time preflight, runtime reauthorization and revocation.

### Phase 3 - registry and dynamic capabilities

- Implement immutable registries and Schema Registry.
- Implement CapabilityRelease admission and Capability Operator.
- Add signed discovery, candidate/canary/active lifecycle and rollback.
- Deploy and promote the PoC Agents and Publisher MCP dynamically.

### Phase 4 - RAG and artifacts

- Deploy Source Catalog, Artifact Gateway, ingestion workers, retrieval,
  citation and Model Gateway.
- Complete extraction, chunking, embedding, generation publication, deletion
  and freshness workers.
- Ingest the PoC knowledge source and verify tenant/ACL isolation.

### Phase 5 - orchestration and APIs

- Implement Workflow Compiler, Run Coordinator, Saga/HITL and Finalizer.
- Implement REST contracts, idempotency, durable SSE, cancellation,
  clarification, approvals, results, artifacts and citations.
- Add live graph projection to the chat workspace.

### Phase 6 - PoC qualification

- Execute approve and reject paths.
- Kill coordinator, worker, Agent and MCP pods during runs.
- Test duplicate delivery, stale approval, revocation, timeout and retry.
- Verify no duplicate publication, no lost accepted run, and exact resume.
- Capture security, performance, resilience and audit evidence.

### Phase 7 - production readiness

- Load, soak, chaos and regional recovery tests.
- Threat model and penetration testing.
- Accessibility, privacy, records, support and incident readiness.
- SLO/error-budget approval, on-call ownership and controlled production
  promotion.

## 15. Acceptance criteria

The platform is production ready only when:

1. Entra login, logout, revocation, Conditional Access and group overage work.
2. Unauthorized Services, workflows, nodes, MCP tools, RAG sources and
   disclosures fail closed.
3. The same request through REST and chat creates equivalent authorized plans
   and final results.
4. Agent and MCP releases cannot deploy without signed evidence and approval.
5. Capability discovery cannot bypass candidate/canary promotion.
6. RAG ingestion survives restart, publishes atomically and enforces tenant,
   ACL, purpose, classification, freshness and deletion.
7. Parallel nodes run concurrently; the serial join waits for both validated
   artifacts.
8. HITL releases compute, survives restart, expires safely and reauthorizes on
   resume.
9. Pod failure transfers work to another replica without a duplicate committed
   side effect.
10. The final result contains verified citations, receipts, node outcomes,
    decision references and an immutable audit reference.
11. Agents contain no user/provider credentials and cannot reach secret stores
    or arbitrary destinations.
12. Backup restore, GitOps reconstruction, alerting, runbooks, SLOs and
    incident ownership are tested.

## 16. Current implementation truth

Available today:

- independent repositories, service images, Helm patterns, Terraform
  foundations and GitOps structure;
- local PostgreSQL/pgvector, RabbitMQ, MinIO, Valkey, Prometheus, Loki, Tempo,
  Alloy and Grafana;
- local authentication, sessions, roles, ownership and approval controls;
- Registry-driven executable Services, exact immutable Workflow associations,
  Built-in/Custom origin, Agent/MCP contracts and configuration discovery;
- source ownership, freshness, durable ingestion, immutable generations,
  extraction, chunking, governed lexical/vector retrieval and citations;
- Workflow Compiler, durable Run Coordinator, specialized workers, inbox/outbox,
  retries, timers, event waits, callbacks, Saga/HITL, notification, publication,
  verification and finalization;
- real Services Studio, concurrent Service Runs, Run History, Approval Inbox,
  Components, RAG and Workspace experiences; and
- local restart, rejection, duplicate-delivery and observability qualification.

Still required:

- Entra authorization-code/PKCE integration and normalized Graph group
  resolution;
- persistent entitlement, policy, audit and credential-broker services;
- managed Azure PostgreSQL and full private production infrastructure;
- production extraction, embedding, reranking, deletion and scale providers;
- production capability-token reauthorization and credential exchange;
- Capability Operator, evidence pipeline and dynamic Agent/MCP runtimes;
- generic arbitrary Agent/MCP dispatch beyond the qualified local roles;
- signed immutable CI/CD and GitOps promotion;
- platform-wide security, resilience, performance and recovery qualification.

This document is therefore the authoritative implementation target, not a
claim that the complete Azure platform already exists.

## 17. Related normative specifications

- [Continuous Entitlement and Runtime Authorization](continuous-entitlement-enforcement.md)
- [Dynamic Agent and MCP Admission, Deployment, and Discovery](dynamic-agent-mcp-lifecycle.md)
- [RAG Storage and Search Infrastructure Readiness](rag-storage-search-readiness.md)
- [Governed RAG Ingestion](governed-rag-ingestion.md)
- [Durable Microservice Resilience](durable-microservice-resilience.md)
- [Credential Non-Possession](credential-non-possession.md)
- [Agent Sandbox Security](agent-sandbox-security.md)
- [Cloud-Neutral Infrastructure and Delivery Design](cloud-neutral-infrastructure.md)
- [Reusable Enterprise Agentic AI Platform Conceptual Design](conceptual-design.md)
- [Implementation and Deployment Readiness](implementation-readiness.md)
