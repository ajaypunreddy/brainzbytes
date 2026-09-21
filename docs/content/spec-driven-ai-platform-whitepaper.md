# A Spec-Driven Platform for AI Services, Governance, and Operations

**BrainzBytes · ContextWeaver Reference Architecture**  
**Publication edition:** September 18, 2026  
**Design:** Cloud-neutral, contract-first, zero-trust, dynamically composable

> How an enterprise can safely define, admit, discover, compose, operate, and
> continuously govern Services, Workflows, Agents, MCP servers, models, and
> hierarchical retrieval across any infrastructure.

For the concrete Microsoft Azure deployment topology, Microsoft Entra ID
flows, dynamic Agent/MCP operator model, prompt-to-result API, and executable
parallel/serial/HITL reference service, see
[Azure Production Platform Architecture and End-to-End Proof of Concept](azure-production-platform-and-poc.md).

## Contents

1. [Executive summary](#executive-summary)
2. [Platform architecture](#platform-architecture)
3. [Specification and contract system](#specification-and-contract-system)
4. [Dynamic capability admission](#dynamic-capability-admission)
5. [Registry-driven discovery and composition](#registry-driven-discovery-and-composition)
6. [Durable transactions and rollback](#durable-transactions-and-rollback)
7. [Hierarchical RAG](#hierarchical-rag)
8. [Metrics and KPIs](#metrics-and-kpis)
9. [Grafana dashboard schemas](#grafana-dashboard-schemas)
10. [Alert catalog](#alert-catalog)
11. [Delivery model](#delivery-model)
12. [Conclusion](#conclusion)

---

## Executive summary

Traditional platform engineering governs images, networks, identities, and
deployment manifests. AI systems introduce a second, more fluid control
problem:

- prompts select tools at runtime;
- Agents delegate work and revise plans;
- MCP servers introduce new actions and side effects;
- retrieval changes the evidence supplied to a model;
- model routing changes cost, quality, and risk;
- generated workflows cross service and transaction boundaries.

ContextWeaver addresses this through a common control plane in which every
capability is represented by a signed, immutable, versioned, and
machine-validatable specification.

The specification becomes the shared language for:

- admission;
- discovery;
- authorization;
- composition;
- execution;
- observability;
- evaluation;
- audit;
- compensation and rollback.

Cloud-specific infrastructure remains behind adapters. Contracts, workflow
semantics, policy, and evidence remain portable.

### Four-part thesis

1. Define executable specifications for every Service, Workflow, Agent, and MCP
   capability.
2. Admit dynamically supplied capabilities only after validation, scanning,
   policy, evaluation, and approval gates pass.
3. Use a live registry to resolve capabilities into durable workflows with
   idempotency and compensation.
4. Federate RAG across user, group, organization, and capability scopes under
   prompt-aware policy.

### Core principles

#### Specifications are executable

Schema, identity, policy, telemetry, failure, and compensation declarations are
enforced rather than documented aspirationally.

#### Discovery is constrained

The registry returns only compatible, authorized, healthy, non-deprecated
capabilities for the current identity, purpose, environment, and region.

#### AI is observable

Quality, safety, cost, evidence, and policy outcomes are measured alongside
conventional reliability signals.

#### Retrieval is authorization

RAG scope is calculated from identity, purpose, workflow, source authority, and
prompt—not from similarity alone.

---

## Platform architecture

The same control-plane contracts operate on AKS, EKS, GKE, private Kubernetes,
or a local container runtime. Infrastructure and managed-service adapters may
change, but platform semantics do not.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Experience and Administration                                           │
│ User Portal │ Admin Console │ AI Configuration │ JupyterLab │ VS Code   │
├─────────────────────────────────────────────────────────────────────────┤
│ Governance Control Plane                                                │
│ Identity Context │ Entitlements │ Policy │ Admission │ Audit            │
├─────────────────────────────────────────────────────────────────────────┤
│ Registry and Composition                                                │
│ Service Registry │ Schema Catalog │ Alias Resolver │ Workflow Compiler   │
├─────────────────────────────────────────────────────────────────────────┤
│ Agents and MCP                                                          │
│ Agent Runtime │ MCP Gateway │ Tool Broker │ Sandbox │ Evaluation         │
├─────────────────────────────────────────────────────────────────────────┤
│ Workflow Runtime                                                        │
│ Coordinator │ Workers │ Inbox/Outbox │ Checkpoints │ Saga Journal        │
├─────────────────────────────────────────────────────────────────────────┤
│ RAG, Memory, and Model Plane                                             │
│ Source Catalog │ Versioned Ingestion │ Retrieval │ Memory │ Model Gateway │
├─────────────────────────────────────────────────────────────────────────┤
│ Observability and Evidence                                              │
│ Metrics │ Logs │ Traces │ Evaluations │ Cost │ Audit Export             │
├─────────────────────────────────────────────────────────────────────────┤
│ Cloud Infrastructure                                                    │
│ Kubernetes │ PostgreSQL │ Event Bus │ Object Store │ Secret Manager      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1. Experience and Administration

Provides a unified surface for users, developers, operators, risk owners, and
administrators.

Primary components:

- user portal;
- administrator console;
- AI provider configuration;
- Service, Workflow, Agent, and MCP publication;
- JupyterLab and VS Code workspaces;
- topology, metrics, logs, traces, and evidence views.

**Boundary:** browser users receive governed application actions, never direct
cluster-admin or cloud-admin credentials.

### 2. Governance Control Plane

Normalizes identity, evaluates policy, records decisions, and controls
publication and execution.

Primary components:

- identity context;
- entitlement service;
- policy decision service;
- admission controller;
- approval service;
- audit service;
- trust and signature verification.

**Boundary:** every protected action requires identity, tenant, purpose, policy
version, and correlation ID.

### 3. Registry and Composition

Discovers exact compatible versions and compiles immutable execution plans from
dynamically available capabilities.

Primary components:

- Service, Workflow, Agent, and MCP registry;
- schema catalog;
- model and provider alias resolver;
- workflow compiler;
- compatibility evaluator;
- lifecycle and deprecation manager.

**Boundary:** no discovery result bypasses policy, compatibility, lifecycle,
health, region, residency, or trust constraints.

### 4. Agents and MCP

Hosts reasoning and tool execution behind constrained identities, declared
schemas, resource limits, and continuously evaluated behavior.

Primary components:

- Agent runtime;
- MCP gateway;
- tool broker;
- execution sandbox;
- evaluation harness;
- human-approval gateway.

**Boundary:** Agents never receive unrestricted credentials. MCP calls are
identity-bound, schema-validated, policy-mediated, rate-limited, and audited.

The stronger invariant is credential non-possession: Agents receive workload
identity and opaque identity, delegation, policy, and credential references,
never user tokens, provider keys, cloud keys, database credentials, connector
secrets, or model-provider credentials. Trusted gateways perform just-in-time
token exchange and retain the resulting credential inside the trusted
workload. The complete profile is defined in
[Credential Non-Possession and Delegated Authority](credential-non-possession.md).

### 5. Workflow Runtime

Executes durable plans with idempotency, retries, approvals, receipts, and
compensating actions.

Primary components:

- durable coordinator;
- task workers;
- command/event bus;
- inbox/outbox processing;
- checkpoints;
- Saga journal;
- finalizer.

**Boundary:** queues carry commands and events. PostgreSQL remains authoritative
for durable run state.

Every accepted task follows the platform's
[durable microservice resilience contract](durable-microservice-resilience.md).
If a worker fails, its message remains unacknowledged or its renewable task
lease expires. Another replica loads the immutable plan, checkpoint, inbox
record, and side-effect receipts, then resumes or safely replays the task.
Acknowledgement occurs only after the corresponding durable state transition.

### 6. RAG, Memory, and Model Plane

Builds authorized context from hierarchical sources, preserves explicitly
governed continuity, and routes requests through logical model aliases.

Primary components:

- source catalog;
- freshness ledger;
- event and periodic reconciliation;
- ingestion admission and extraction;
- shadow index generations and atomic publication;
- federated retrieval planner;
- embedding gateway;
- reranker;
- context and citation service;
- context and memory service;
- model gateway;
- provider adapters.

**Boundary:** similarity never overrides authorization, source authority,
classification, residency, retention, or required evidence.

#### Freshness and authoritative storage

Documents remain in storage owned by the applicable user, group, or
organization. Connectors receive delegated read-only identity and register
storage and credential references rather than copying credentials or accepting
raw bodies through the control API.

Every source has an observed revision, source hash, ACL snapshot, owner,
authority class, classification, retention, residency, indexed revision, and
active index generation. Event-driven updates reduce latency; periodic
reconciliation detects lost or out-of-order events.

Known-stale data is never returned. A query is eligible only when the source is
current and authorized and its active index generation represents the required
source revision. Policy-sensitive queries fail closed or use an approved
authoritative direct lookup while a new generation is being built.

Index updates use shadow generations. Counts, hashes, ACL filters, lineage,
quality, poisoning controls, index-schema compatibility, and rollback
readability must pass before the logical alias moves atomically to the new
generation.

#### Scope and precedence

Precedence is evaluated by dimension, not by one universal hierarchy:

- explicit deny and missing purpose authorization always exclude a source;
- regulatory and mandatory organization policy cannot be removed;
- the designated owner or system of record remains authoritative for its facts;
- user preferences may override group or organization defaults when no
  mandatory obligation conflicts;
- the most restrictive classification, retention, residency, and disclosure
  requirement applies;
- ranking preferences operate only on already-authorized candidates.

#### Seamless service versioning

Active runs and ingestion jobs pin immutable service, contract, policy, source,
index, extractor, chunker, embedding, and reranker versions. New versions start
beside old versions, receive synthetic/shadow/canary traffic, and are promoted
through logical aliases only after compatibility and health gates pass.

Production deployments use at least two replicas, readiness and startup probes,
graceful draining, PodDisruptionBudgets, and rolling updates with
`maxUnavailable: 0`. Database changes follow expand-migrate-contract. Downgrade
is permitted only when the previous service can read current stored/index
schemas and the rollback generation remains available; otherwise the platform
must forward-fix.

#### Governed memory classes

ContextWeaver treats memory as a policy-controlled capability rather than a
general-purpose database attached directly to an Agent:

| Memory class | Purpose | Authority |
| --- | --- | --- |
| Working | Bounded scratch state for one execution | Workflow checkpoints |
| Session | Conversation continuity | PostgreSQL session records |
| Semantic | Searchable approved facts and relationships | Vector/search provider |
| Long-term | Approved durable organizational knowledge | Source catalog and object storage |

Memory operations carry tenant, subject, purpose, classification, policy
decision, retention, provenance, and correlation context. The service stores
immutable content references and metadata; it rejects raw prompts, credentials,
tokens, secrets, and unclassified inline content. Long-term writes require an
explicit approval.

RAG and memory remain separate responsibilities: RAG retrieves authorized
knowledge for a request, while memory preserves authorized continuity across
steps or sessions. Memory cannot create new authority, bypass source governance,
or silently convert model output into organizational truth.

### 7. Observability and Evidence

Correlates infrastructure, model, retrieval, policy, workflow, and business
signals.

Primary components:

- metrics;
- structured logs;
- distributed traces;
- evaluation results;
- cost and token accounting;
- immutable audit export;
- operational dashboards and alerts.

**Boundary:** telemetry excludes secrets and unapproved private content while
retaining safe provenance handles.

### 8. Cloud Infrastructure

Provides replaceable implementations for compute, persistence, networking,
identity, secrets, search, and recovery.

Examples:

| Capability | Azure | AWS | GCP | Local/private |
| --- | --- | --- | --- | --- |
| Kubernetes | AKS | EKS | GKE | Kubernetes, k3s, Docker |
| Secrets | Key Vault | Secrets Manager | Secret Manager | OpenBao, Kubernetes Secrets |
| Object storage | Blob Storage | S3 | Cloud Storage | S3-compatible storage |
| Search/vector | Azure AI Search | OpenSearch | Vertex/Elastic adapters | pgvector, Qdrant, OpenSearch |
| Models | Azure OpenAI | Bedrock | Vertex AI | vLLM, Ollama, OpenAI-compatible |
| Durable database | PostgreSQL | PostgreSQL | PostgreSQL | PostgreSQL |

**Boundary:** cloud services implement the platform contract. They do not
redefine policy, workflow, or transaction semantics.

---

## Continuous entitlement enforcement

A successful login establishes identity, not ambient authority. ContextWeaver
uses two mandatory authorization boundaries:

1. request-time whole-graph preflight evaluates the selected Service and the
   complete transitive Workflow, Agent, MCP, tool, model, RAG, artifact,
   fallback, compensation, and disclosure graph before protected dispatch; and
2. runtime per-action authorization evaluates the exact selected operation,
   arguments, resource, purpose, classification, destination, risk, approval,
   expiry, and revocation state immediately before execution.

The compiler freezes an Authorized Immutable Execution Plan containing the
Authorization Manifest, allowed capability envelopes, decision references,
policy and entitlement epochs, field projections, token constraints, expiry,
and pre-authorized fallback sets. It contains no bearer tokens.

Run Coordinator obtains a fresh decision before every protected node, retry,
resume, fallback, compensation, credential exchange, and disclosure. An allow
decision produces a short-lived capability token bound to the tenant,
principal, workload, workflow, run, node, audience, MCP, tool, operation,
resource, purpose, plan hash, nonce, and expiry. MCP ingress validates this
token independently and fails closed.

The complete normative contract is
[Continuous Entitlement and Runtime Authorization](continuous-entitlement-enforcement.md).

---

## Specification and contract system

Every artifact shares a common envelope:

- stable identity and kind;
- semantic version;
- owner and support route;
- immutable package or image digest;
- strict input, output, and error schemas;
- dependencies and compatibility constraints;
- workload identity requirements;
- authorization and policy points;
- data classification and residency declarations;
- telemetry and dashboard references;
- SLOs and evaluation thresholds;
- lifecycle state;
- rollback or compensation behavior;
- signature, provenance, SBOM, and scan evidence.

### MCP specification

An MCP contract defines transport, tools, strict schemas, identity propagation,
side-effect class, idempotency, authorization, rate limits, telemetry, and
compensation.

```yaml
apiVersion: specs.contextweaver.io/v1
kind: MCPSpec
metadata:
  name: payments
  version: 2.3.0
  owner: finance-platform
spec:
  transport: streamable-http
  image: registry/payments@sha256:...

  identity:
    required: true
    acceptedWorkloadAudiences:
      - contextweaver

  tools:
    - name: create_refund
      description: Create an idempotent refund request
      risk: financial

      authorization:
        action: payment.refund
        purposeRequired: true

      idempotency:
        required: true
        keyField: requestId

      inputSchema:
        $schema: https://json-schema.org/draft/2020-12/schema
        type: object
        additionalProperties: false
        required:
          - requestId
          - paymentId
          - amount
        properties:
          requestId:
            type: string
            format: uuid
          paymentId:
            type: string
          amount:
            type: number
            minimum: 0.01

      outputSchema:
        type: object
        additionalProperties: false
        required:
          - refundId
          - status
          - receipt

      errorSchema:
        $ref: schemas/platform-error.v1

      compensation:
        tool: cancel_refund

      telemetry:
        metrics:
          - calls
          - failures
          - latency
          - policy_denials
          - idempotency_hits
          - compensation_results
        audit: required
```

#### MCP invariants

- Every argument is validated before tool execution.
- Undeclared arguments are rejected.
- Output is validated before it crosses the MCP boundary.
- Human and workload identity are supplied by the platform, not accepted from
  model-generated arguments.
- Side-effecting tools require an idempotency declaration.
- Financial, destructive, privileged, or externally visible actions require
  explicit policy.
- A compensation tool must be declared when safe reversal exists.
- “No compensation available” must be explicit and may trigger approval.

### Agent specification

An Agent contract constrains goals, models, tools, delegation, memory,
iterations, budgets, evaluation, escalation, and prohibited behavior.

```yaml
apiVersion: specs.contextweaver.io/v1
kind: AgentSpec
metadata:
  name: incident-triage
  version: 1.4.0
  owner: sre-platform
spec:
  goal: Produce an evidence-backed incident triage draft
  modelAlias: fast-reasoning

  inputSchema:
    type: object
    additionalProperties: false
    required:
      - incidentId
      - severity

  outputSchema:
    type: object
    additionalProperties: false
    required:
      - summary
      - hypotheses
      - evidence
      - nextActions

  tools:
    allow:
      - mcp-sre.query-logs@^3
      - mcp-sre.read-runbook@^2
    denyRisk:
      - destructive
      - financial

  rag:
    requiredScopes:
      - workflow
      - service
      - organization
    allowPersonalBoost: false

  autonomy:
    maxSteps: 12
    maxToolCalls: 20
    maxDurationSeconds: 180
    approvalBefore:
      - incident_ack
      - mitigation

  evaluation:
    suite: incident-triage.v5
    minimumScore: 0.86
    maximumUnsafeRate: 0
```

#### Agent invariants

- The Agent operates within an explicit goal and bounded plan.
- Tool access is allowlisted.
- Delegation is limited to declared Agent dependencies.
- Models are referenced through stable aliases.
- Memory and RAG scopes are declared.
- Iteration, tool-call, token, time, and cost budgets are enforced.
- Evaluation thresholds are deployment gates.
- Human escalation is a valid terminal outcome.

### Service specification

A Service contract describes versioned APIs, ownership, schemas, SLOs,
dependencies, data handling, policy points, telemetry, and lifecycle.

```yaml
apiVersion: specs.contextweaver.io/v1
kind: ServiceSpec
metadata:
  name: artifact-gateway
  version: 2.1.0
  owner: data-platform
spec:
  endpoint: http://artifact-gateway:8080

  schemas:
    input:
      $ref: schemas/artifact-create.v2
    output:
      $ref: schemas/artifact-record.v2
    error:
      $ref: schemas/platform-error.v1

  data:
    classifications:
      - internal
      - confidential
    residencyAware: true

  policy:
    actions:
      - artifact.create
      - artifact.read

  slo:
    availability: 99.9
    latencyP95Ms: 750

  telemetry:
    dashboard: capability-operations.v2
    alerts:
      - error-budget-burn
      - latency-p95
```

### Workflow specification

A Workflow contract declares typed steps, bindings, conditions, deadlines,
retries, approvals, transaction boundaries, compensation order, evidence
requirements, and finalization rules.

```yaml
apiVersion: specs.contextweaver.io/v1
kind: WorkflowSpec
metadata:
  name: governed-research
  version: 1.2.0
spec:
  inputSchema:
    $ref: schemas/research-request.v2

  steps:
    - id: retrieve
      capability: service:rag-retrieval@^2
      input:
        query: $.input.question
        plan: $.context.retrievalPlan
      retry:
        maxAttempts: 3
        backoff: exponential

    - id: synthesize
      capability: agent:research-synthesizer@^4
      dependsOn:
        - retrieve
      input:
        evidence: $.steps.retrieve.output.items

    - id: publish
      capability: service:report-publisher@^1
      dependsOn:
        - synthesize
      compensation:
        capability: service:report-publisher.delete@^1

  completion:
    require:
      - citations_verified
      - audit_committed
```

---

## Dynamic capability admission

A user may introduce an MCP, Agent, Service, or Workflow through the UI, but
dynamic onboarding never bypasses engineering controls.

The platform creates an evidence package and deploys only after every mandatory
gate passes.

### Gate 1: Parse and normalize

- Validate supported API version.
- Require stable DNS-style identity.
- Require semantic version.
- Reject unknown or ambiguous fields.
- Canonicalize the package.
- Compute an immutable digest.
- Require owner and support contact.

### Gate 2: Schema and compatibility

- Validate JSON Schema draft 2020-12.
- Reject permissive unknown inputs by default.
- Classify breaking and non-breaking changes.
- Type-check workflow bindings and transforms.
- Validate output-to-input compatibility.
- Validate error contracts.
- Validate compensation compatibility.

### Gate 3: Supply chain

- Verify signature and trusted publisher.
- Generate and validate an SBOM.
- Evaluate license policy.
- Scan dependencies and images for vulnerabilities.
- Scan files and generated code for malware.
- Scan for secrets and credentials.
- Require immutable image digests.

### Gate 4: Security and policy

- Issue least-privilege workload identity.
- Apply default-deny network policy.
- Evaluate tool and action allowlists.
- Validate data-classification compatibility.
- Validate tenant and regional constraints.
- Deny forbidden autonomous actions.
- Require human approval where risk demands it.

### Gate 5: Sandbox and evaluation

- Run contract-conformance tests.
- Run held-out quality evaluations.
- Test prompt-injection resistance.
- Enforce CPU, memory, process, network, and time limits.
- Exercise timeout, retry, dependency, and malformed-output failures.
- Exercise compensation and partial rollback.

### Gate 6: Approval and publication

- Enforce separation of duties.
- Require security, data, platform, or business approval by risk class.
- Require expiration on every exception.
- Verify that evidence is complete.
- Record owner acceptance of SLOs and operational responsibilities.
- Sign the registry publication.

### Gate 7: Deploy and observe

- Produce a signed immutable release bundle containing the specification,
  package, image, Helm package, evidence, security, credential-isolation, and
  resilience profile digests.
- Submit only that approved desired state to the Capability Operator.
- Have the operator reconcile an allowlisted Helm package into a restricted
  Agent or MCP runtime namespace.
- Apply identity, quota, runtime, disruption, autoscaling, and network policy.
- Verify readiness and startup probes.
- Send canary traffic.
- Discover the runtime descriptor, Agent Card or MCP capabilities, schemas,
  health, metrics, dashboard templates, alert rules, dependencies, and
  evaluation state.
- Validate discovered metadata against the signed release bundle.
- Generate or bind required dashboards and alerts.
- Arm automatic pause and rollback.
- Register as `candidate` and promote the logical capability alias only when
  policy, reliability, quality, security, and safety signals pass.

The Capability Operator is the only component authorized to create or update
Agent and MCP runtime releases. UI, CI, generated packages, and developer
workspaces submit desired state and evidence; they do not deploy production
workloads directly. The complete contract is defined in
[Dynamic Agent and MCP Admission, Deployment, and Discovery](dynamic-agent-mcp-lifecycle.md).

### Admission outcomes

| Outcome | Behavior |
| --- | --- |
| Pass | Sign, publish, deploy, and begin canary observation |
| Conditional | Allow only in sandbox or review mode with restrictions and expiration |
| Quarantine | Preserve evidence, prevent execution, and route findings to the owner |
| Reject | Do not publish or issue runtime identity; explain every failed control |

---

## Registry-driven discovery and composition

Discovery is not a global list of endpoints. It is a policy-filtered resolution
process.

### Resolution inputs

- human and workload identity;
- tenant;
- environment and region;
- purpose;
- requested capability;
- compatible input/output schema versions;
- risk class;
- data classification;
- cost and latency budget;
- lifecycle requirements;
- health and evaluation state.

### Resolution output

The registry returns an exact capability revision containing:

- kind and stable ID;
- semantic version;
- immutable image or package digest;
- endpoint;
- input, output, and error schema versions;
- owner;
- policy actions;
- workload audience;
- dependencies;
- model and search aliases;
- evaluation version and status;
- SLO;
- telemetry contract;
- compensation capability;
- lifecycle status.

After operator reconciliation, registry discovery automatically converges the
well-known service descriptor, Agent Card or MCP capability declarations,
input/output/error schemas, metrics contract, dashboards, alert rules, health,
capacity, region, evaluation, owner, runbook, dependencies, and deployment
evidence. Discovery is validated against the signed release bundle and does
not independently confer active status.

### Intent-to-outcome flow

```text
User or event
  │ identity + tenant + purpose + prompt + budget
  ▼
Workflow compiler
  │ required capabilities + schemas + transaction boundaries
  ▼
Service registry
  │ policy + compatibility + health + region + lifecycle filtering
  ▼
Immutable execution plan
  │ pinned versions + digests + schemas + aliases + policy + indexes
  ▼
Durable coordinator
  │ idempotent tasks + inbox/outbox + checkpoints + receipts
  ▼
Evidence package
    result + citations + audit + quality + cost + rollback state
```

### Immutable execution plan

Every active run freezes:

- workflow ID and version;
- plan hash;
- registry snapshot;
- Service, Agent, and MCP versions;
- input/output/error schemas;
- model, embedding, and reranker aliases;
- source and index versions;
- policy version;
- identity and purpose;
- RAG plan;
- budget;
- deadlines;
- compensation graph;
- invalidation epochs.

Mid-run configuration changes do not silently mutate the plan.

---

## Durable transactions and rollback

Distributed AI workflows cannot rely on a single database transaction across
every external system. ContextWeaver uses durable orchestration and Saga
compensation.

### Forward execution

1. Allocate a run and freeze a registry snapshot.
2. Persist the compiled plan.
3. Write each command and outbox event in the same PostgreSQL transaction.
4. Publish commands from the outbox.
5. Consumers deduplicate through inbox keys.
6. Validate task inputs and outputs against pinned schemas.
7. Record a signed execution receipt.
8. Checkpoint after every externally visible transition.
9. Finalize only when required evidence and policy obligations are complete.

### Failure classification

| Class | Behavior |
| --- | --- |
| Retryable | Retry with bounded attempts, backoff, jitter, and deadline |
| Compensatable | Stop forward execution and run compensations in reverse order |
| Approval-required | Pause durably and create a human task |
| Terminal | Fail closed, preserve evidence, and require manual remediation |

### Cross-pod recovery

| Failure point | Recovery |
| --- | --- |
| Database commit succeeds but publish fails | Transactional outbox republishes |
| Worker fails before acknowledgement | RabbitMQ redelivers |
| Worker disappears while executing | PostgreSQL lease expires and another replica claims |
| External effect succeeds before worker failure | Provider idempotency or receipt reconciliation prevents duplicate effect |
| Result commits before acknowledgement | Inbox deduplication returns the existing result |
| Scheduler, timer, or HITL pod fails | Another replica claims the durable wait after lease expiry |

Multiple replicas protect availability. Inbox/outbox, leases, checkpoints,
idempotency, receipts, and reconciliation protect the work.

### Compensation

1. Stop issuing new irreversible actions.
2. Build the compensation sequence from completed task receipts.
3. Resolve pinned compensation capability versions.
4. Execute compensations in reverse dependency order.
5. Make compensation idempotent.
6. Record completed and incomplete reversals.
7. Route incomplete compensation to manual operations.
8. Never present a partially compensated run as successful.

---

## Hierarchical RAG

ContextWeaver can retrieve from:

- personal/user knowledge;
- group/team knowledge;
- organization knowledge;
- service-local knowledge;
- workflow-required knowledge;
- Agent operating knowledge;
- MCP tool knowledge.

The hierarchy is not a simple overwrite chain.

### Required ordering of decisions

1. Establish tenant, user, groups, roles, purpose, and data classification.
2. Load the selected Service, Workflow, Agent, and MCP RAG declarations.
3. Determine mandatory authoritative sources.
4. Remove sources that fail ACL, residency, retention, lifecycle, consent, or
   classification rules.
5. Select healthy and compatible index generations.
6. Allocate scope quotas and preference boosts.
7. Execute authorization filters inside candidate generation.
8. Rerank eligible candidates.
9. Enforce authority and evidence floors.
10. Produce a context pack with provenance handles and citations.

### Scope behavior

| Scope | Typical content | Who can publish | Typical precedence |
| --- | --- | --- | --- |
| User | Private notes, preferences, drafts, user sources | The user | Highest discretionary boost for personal prompts |
| Group | Team standards, shared decisions, team sources | Group owner or delegated publisher | High for team-scoped work |
| Organization | Policy, standards, catalogs, authoritative references | Organization administrator/publisher | Highest authority when mandatory |
| Service | Runbooks, API behavior, telemetry semantics | Service owner | High for service-specific questions |
| Workflow | Required sources, purpose, quotas, citation rules | Workflow owner | Controls the effective retrieval plan |
| Agent | Instructions, examples, evaluation guidance | Agent owner | Supports reasoning but cannot override policy |
| MCP | Tool semantics, parameters, operational guidance | MCP owner | Supports safe tool selection and invocation |

### Prompt-aware examples

#### Personal productivity prompt

Preferred order:

1. user;
2. group;
3. service;
4. organization.

Organization sources still override preference when marked authoritative.

#### Team implementation prompt

Preferred order:

1. group;
2. service;
3. workflow;
4. organization;
5. Agent.

Private user material is excluded unless explicitly requested and shareable.

#### Regulated workflow decision

Preferred order:

1. workflow;
2. organization;
3. service;
4. Agent;
5. MCP.

Workflow policy and authoritative organization evidence lead. Personal
preference cannot displace compliance or safety requirements.

#### Production incident response

Preferred order:

1. service;
2. workflow;
3. on-call group;
4. organization;
5. MCP;
6. Agent.

Current service runbooks and incident procedures receive priority.

### RAG invariants

- Preference never overrides authorization.
- Every candidate is tenant- and ACL-filtered inside the search query.
- Required authoritative sources cannot be displaced by a high similarity
  score from a less authoritative source.
- Every candidate includes source, version, owner, scope, classification,
  chunk, embedding, index, policy, and score provenance.
- A membership, consent, source, policy, model, or index change can invalidate
  the plan.
- Private content is not copied into broad caches.
- Citations bind to immutable source versions.

---

## Metrics and KPIs

### Reliability

- request rate;
- success rate;
- error rate by taxonomy;
- p50, p95, and p99 latency;
- saturation;
- queue depth and oldest message age;
- retry rate;
- circuit-breaker state;
- dependency availability;
- error-budget burn.

Dimensions:

- capability;
- version;
- tenant;
- environment;
- region;
- dependency.

### MCP execution

- tool-call count;
- schema-rejection rate;
- authorization-denial rate;
- timeout rate;
- side-effect count;
- idempotency hit rate;
- compensation success rate;
- undeclared-output rate;
- tool receipt completeness.

Dimensions:

- MCP server;
- tool;
- schema version;
- caller Agent;
- caller workflow;
- risk class.

### Agent quality

- task completion rate;
- groundedness score;
- plan revision count;
- tool-selection accuracy;
- human-escalation rate;
- loop depth;
- evaluation score;
- prohibited-action attempts;
- budget exhaustion rate.

Dimensions:

- Agent;
- Agent version;
- model alias;
- prompt version;
- workflow;
- evaluation suite.

### RAG quality

- eligible candidate count;
- ACL denial count;
- recall at K;
- precision at K;
- reranker lift;
- citation coverage;
- citation validity;
- source freshness;
- authority conflicts;
- stale index rejection;
- retrieval-plan invalidation.

Dimensions:

- scope;
- source;
- index version;
- embedding model;
- reranker;
- query class;
- tenant.

### Governance

- policy-decision count;
- deny rate;
- approval wait time;
- unsigned or untrusted artifact attempts;
- expired exceptions;
- audit completeness;
- schema compatibility failures;
- evaluation-policy breaches.

Dimensions:

- policy version;
- identity;
- tenant;
- resource;
- action;
- purpose;
- capability version.

### Economics

- input tokens;
- output tokens;
- embedding volume;
- search queries;
- compute duration;
- cost per run;
- cost per successful outcome;
- budget burn;
- cache savings;
- provider fallback cost.

Dimensions:

- tenant;
- workflow;
- model alias;
- provider;
- capability;
- cost center.

---

## Grafana dashboard schemas

Dashboards should be versioned definitions referenced by capability
specifications.

### Common dashboard envelope

```yaml
apiVersion: observability.contextweaver.io/v1
kind: DashboardSpec
metadata:
  name: capability-operations
  version: 2.0.0
  owner: platform-observability
spec:
  audience:
    - operator
    - capability-owner
  variables:
    - tenant
    - environment
    - region
    - capability
    - version
    - modelAlias
  requiredLabels:
    - service.name
    - service.version
    - deployment.environment
    - contextweaver.tenant
    - contextweaver.correlation_id
  panels: []
  alerts: []
```

### Executive posture dashboard

Purpose:

- platform availability;
- governed run volume;
- quality trend;
- critical safety events;
- monthly AI cost;
- adoption;
- top business outcomes.

Suggested panels:

1. platform SLO status;
2. successful governed outcomes;
3. quality and groundedness trend;
4. policy denials and safety incidents;
5. model and retrieval cost;
6. active capabilities by lifecycle state;
7. business KPI contribution.

### Capability operations dashboard

Purpose:

- operate one Service, Workflow, Agent, or MCP capability.

Suggested panels:

1. request rate and success rate;
2. latency percentiles;
3. error taxonomy;
4. dependency health;
5. schema rejection;
6. policy denial;
7. tool usage;
8. model routing;
9. RAG quality;
10. evaluation score;
11. token and cost rate;
12. deployment and registry annotations.

### Governance evidence dashboard

Purpose:

- provide audit and risk evidence.

Suggested panels:

1. admission gate status;
2. signature and publisher trust;
3. unresolved vulnerability findings;
4. policy decisions;
5. approval state and wait time;
6. active exceptions and expiry;
7. evaluation breaches;
8. provenance completeness;
9. compensation failures;
10. audit export health.

---

## Alert catalog

| Severity | Alert | Example condition | Automated response |
| --- | --- | --- | --- |
| Critical | Unauthorized side effect | Protected tool executes without a matching allow decision or identity receipt | Disable capability version, revoke runtime identity, preserve evidence, page security and owner |
| Critical | Cross-tenant retrieval | Candidate tenant or ACL does not match the frozen retrieval plan | Fail closed, quarantine result/index generation, invalidate caches and active plans |
| Critical | Audit integrity failure | Required protected action has no durable audit or execution receipt | Pause affected workflows and block finalization |
| Warning | Quality regression | Held-out evaluation is below threshold for two readings | Pause promotion, route to prior version, open evaluation incident |
| Warning | Schema incompatibility | Runtime rejects more than 1% of calls or registry detects a breaking contract | Block new compositions and identify pinned callers |
| Warning | Error-budget burn | Fast or slow burn exceeds the capability SLO policy | Roll back/circuit-break according to service policy |
| Warning | Budget burn | Projected model cost exceeds budget by 20% | Apply lower-cost route, tighten quota, notify owner |
| Warning | Compensation failure | Saga compensation is incomplete after bounded retries | Stop workflow and create manual-operations task |
| Info | RAG freshness drift | Required source or index exceeds its freshness objective | Schedule ingestion and mark responses degraded |
| Info | Exception expiry | Temporary policy or security exception approaches expiry | Notify owner and block promotion after expiry |

---

## Delivery model

### Phase 1: Specify

- canonical Service, Workflow, Agent, and MCP schemas;
- compatibility rules;
- identity envelope;
- policy hooks;
- telemetry contract;
- evaluation card;
- compensation declaration;
- signed publication format.

### Phase 2: Admit

- UI-based onboarding;
- source and publisher provenance;
- signatures;
- SBOM;
- vulnerability, malware, license, and secret scanning;
- sandbox evaluation;
- policy decision;
- risk-based approval;
- staged promotion.

### Phase 3: Compose

- registry discovery;
- logical alias resolution;
- workflow compilation;
- schema-safe bindings;
- immutable execution plans;
- durable execution;
- Saga compensation;
- evidence finalization.

### Phase 4: Optimize

- hierarchical RAG;
- model routing;
- quality and cost optimization;
- continuous evaluation;
- SLOs and error budgets;
- multi-region resilience;
- governed self-service.

---

## Conclusion

The platform is not the model.

It is the system that makes models, tools, data, and automation trustworthy
together.

A spec-driven control plane lets organizations introduce AI capability at
software speed while retaining the controls expected of critical services:

- explicit contracts;
- identity;
- policy;
- compatibility;
- observability;
- evidence;
- transactionality;
- reversible change.

---

**Interactive HTML edition:**  
`http://127.0.0.1:18081/content/spec-driven-ai-platform-whitepaper.html`

**Source:**  
`contextweaver-nextgen-docs/content/spec-driven-ai-platform-whitepaper.md`
