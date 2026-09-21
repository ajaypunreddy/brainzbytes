# Reusable Enterprise Agentic AI Platform Conceptual Design

This document defines a proposed reusable enterprise agentic AI platform for first-class, dynamically selected workflows over a generic N-agent framework. It is reusable across workflows, agents, MCP services, user/group/organization data scopes, models, and infrastructure; configuration and operations remain independent of business logic. **The current Python code remains an unchanged four-agent, in-process example.** The proposed framework supports any number of independently deployable A2A agent microservices, and every agent has a generic `DynamicMCPClient`.

This is conceptual design only. **No Python or other implementation code is changed.**

[Open the self-contained HTML architecture explorer](multi-agent-orchestration-animation.html).

[Read the focused cloud-neutral infrastructure, GitOps, and platform lifecycle design](CLOUD-NEUTRAL-INFRASTRUCTURE.md).

[Read the canonical Azure production platform and end-to-end parallel, serial, and HITL proof-of-concept specification](azure-production-platform-and-poc.md).

## Executive decisions

| Decision | Recommended design |
| --- | --- |
| Workflows are first-class | An approved, versioned workflow definition selects required agent capabilities and services and declares the dependency DAG, parallelism, conditions, bounded loops, HITL gates, resilience policy, budgets, and terminal aggregation. |
| Topology is data | Agent count, node labels, dependencies, joins, and conditions are workflow data/configuration, not scheduler code. Agent A, Agent B, and Agent N are runtime examples only. |
| Dynamic workflow selection | A typed Prompt Understanding result drives rules plus semantic candidate retrieval and policy-aware scoring. Prompt text cannot directly select a privileged workflow. |
| Safe fallback | A high-confidence candidate is selected. Close adequate candidates cause a clarification interrupt. No adequate match can enter a policy-gated Constrained Workflow Composer that uses approved capabilities and control nodes only. |
| Compile before execution | A fail-closed Workflow Validator/Compiler validates the graph, contracts, policies, scopes, classifications, service availability, and budgets before producing an immutable execution plan. |
| Whole-graph authorization preflight | After workflow selection/composition and contract/DAG compilation, build a Complete Authorization Manifest for every statically reachable required, optional, and fallback capability/resource. The PDP evaluates the whole reachable graph before any dispatch. |
| Immutable per-run plan | Each authorized run pins `workflow_id`, version, plan hash, authorization manifest hash, policy snapshot, decision evidence, allowed capability envelopes, field projections, token bounds, fallback sets, revocation epoch, expiry, selected service versions/endpoints, ready sets, barriers, conditions, and budgets. It never stores bearer tokens. |
| Generic N-agent runtime | LangGraph calculates `ready_set`, fans out eligible A2A tasks, evaluates typed conditions, opens barriers, permits only bounded validated replan, and aggregates declared terminal outputs. |
| Capability-based references | Workflow nodes reference capabilities and version/trust/tenant constraints, never hard-coded endpoints. The Agent Registry resolves those references to available A2A services. |
| Dynamic MCP for every agent | Every agent independently discovers and invokes any authorized MCP capability through `DynamicMCPClient`; workflows do not bind agent nodes to MCP endpoints. |
| Four logical registries | Workflow Catalog/Registry, A2A Agent/Agent Card Registry, MCP Service Registry, and Schema/Contract Registry are separate logical contracts even if they share platform infrastructure. |
| Typed artifact edges | Workflow edges carry typed, immutable, schema-validated artifacts. Dependencies determine readiness only; explicit bindings and field policy determine the information delivered to a node. |
| Canonical report | Terminal artifacts are deterministically bound into one schema-validated machine-readable report object. Separate signed, disclosure-aware renderers produce JSON, HTML, PDF, dashboard, and event views without changing facts. |
| Private data stays external | MCP Plugin Hosts contain connector logic, configuration, mappings, and schemas only. Private user data remains in external systems and is retrieved just-in-time under delegated identity, tenant partitioning, RLS, minimization, redaction, provenance, and audit. |
| Hierarchical RAG is policy-resolved | Each selected workflow declares RAG requirements. An Effective RAG Policy Resolver merges organization, group, and user controls and produces an immutable Federated Retrieval Plan for the run. |
| Security and preference are separate | Security precedence is `organization > group > user`, with the most restrictive applicable control winning. Retrieval preference is `user > group > organization` only as a bounded boost or tie-breaker that cannot override relevance, authority, ACLs, or mandatory sources. |
| Governed scoped ingestion | Personal content is private by default; group publication requires an owner, `rag.publisher`, or automated governance; organization publication and rollback require a system/RAG administrator. All scopes share one quarantine-capable governance pipeline. |
| Governed lifecycle | Workflows move through `draft -> validate -> approve -> canary -> active -> deprecated`, with version pins, health gates, rollback, and promotion of approved compositions. |
| Fail closed | Invalid plans, hard policy denials, unapproved high-risk composition, identity/RLS/redaction failures, stale authorization, and unavailable sensitive audit stop execution. |

## Typed Contracts, Artifacts, and Reporting

> **"Dependencies control when an agent may run; schemas and bindings control what information it receives."**

This is a platform invariant, not an implementation preference. A dependency edge is only a scheduling barrier. It does not imply that all fields from an upstream state, message, prompt, or agent response are copied into a downstream prompt. Every business value crossing a workflow edge is a typed, immutable, validated artifact. The downstream request is assembled from explicit bindings over workflow input, permitted fields in validated dependency artifacts, and typed context/citation references. The complete request must validate against the receiving Agent Card input schema before A2A dispatch.

Concatenating upstream prose or arbitrary state into a downstream prompt is prohibited. This separation preserves topology as workflow data while making information flow statically reviewable, policy-projectable, auditable, and deterministic across retry, fallback, checkpoint, and resume.

### Contract and artifact design rules

1. Every `AgentDefinition`/Agent Card declares an immutable agent/capability identity, supported version range, `input_schema_ref`, `output_schema_ref`, supported artifact/media types, required scopes, supported data classifications, trust tier, optional stream/chunk schema, and error schema.
2. Every `WorkflowDefinition` declares a workflow input schema, per-node capability and expected schema versions, `depends_on`, explicit `input_bindings`, condition/optional-branch typing, report input bindings, canonical report output schema, and renderer policy.
3. Every schema reference resolves through the logically separate Schema/Contract Registry. A run pins exact versions even when a definition uses an approved compatible range.
4. Unknown fields, ambiguous bindings, and additional properties are rejected by default. Any extension point must be explicitly typed.
5. Transforms are bounded, deterministic, versioned, allowlisted, non-Turing-complete, and side-effect free. Arbitrary code, scripts, model-generated expressions, endpoints, credentials, and network access are prohibited.
6. Raw structured model, agent, MCP, or retrieval output is untrusted. It cannot satisfy a dependency, enter agent context, become report input, or be disclosed until its schema, policy, integrity, and provenance checks pass.
7. A validated artifact is immutable. Correction, repair, migration, or redaction creates a new artifact with lineage to its predecessor; it never mutates history.
8. A barrier opens only after every accepted required dependency artifact validates, is policy-projected, persists successfully, and has a verified content hash.
9. Large or sensitive values use scoped artifact/reference handles where possible. The A2A control envelope, status, progress, telemetry, registry records, and DLQ entries carry references and metadata rather than raw PHI.
10. Final report generation creates one canonical machine-readable object. Rendering is a downstream presentation function and cannot add, remove, reinterpret, or repair canonical facts.

### Responsibility matrix

| Component | Owns | Must prove | Explicit non-responsibility |
| --- | --- | --- | --- |
| Schema/Contract Registry | Immutable schema definitions, semantic versions, compatibility mode, field classifications, owner, lifecycle, deprecation, impact graph, and approved adapter references | Definition integrity/signature, unique immutable version, compatibility result, lifecycle eligibility, and metadata authorization | Stores no PHI, example payloads, prompts, secrets, task artifacts, MCP results, or report bodies |
| Workflow Catalog | Approved `WorkflowDefinition` topology, capability references, `depends_on`, bindings, conditions, resilience, report policy, lifecycle, rollout, and owner | Definition signature, lifecycle, tenant eligibility, and reference to approved contracts/capabilities | Does not resolve A2A endpoints, MCP endpoints, or store runtime artifacts |
| A2A Agent Registry | Agent Cards, capability/version resolution, endpoint references, trust, tenant/region eligibility, health, and capacity | Agent identity, signed card, compatible input/output/error/stream schemas, health, trust, and policy eligibility | Does not define workflow topology or resolve MCP tools |
| MCP Service Registry | Service/tool capability metadata, schemas, scopes, side effects, endpoint references, trust, region, health, and owner | Compatible tool input/output contracts, exact scopes, service identity, health, and policy eligibility | Does not define workflows, resolve autonomous agents, or contain private source data |
| Workflow Type Checker/Contract Compiler | Static schema/binding/condition/error/fallback/report checks and deterministic plan generation | Every required field is constructable exactly once; all types, policies, versions, transforms, branches, fallbacks, and report bindings are valid | Does not silently repair or execute an invalid definition |
| Runtime Contract Gateway | Output parse/validation/repair orchestration, classification, field projection, policy checks, artifact persistence/hash, and downstream input validation | No unvalidated/malformed/policy-unsafe value crosses an A2A/MCP/RAG/report boundary | Does not infer missing business facts or relax a schema |
| Input Binding Engine | Declarative selection and bounded transformation of workflow input, dependency artifacts, ContextPack, citations, and run metadata | Source path exists; destination is declared; transform is approved; type and policy are compatible | Does not concatenate prompts, run arbitrary code, retrieve new data, or select endpoints |
| Artifact Store | Encrypted tenant-isolated immutable artifact bodies and metadata, integrity, lineage, retention/deletion/legal hold, residency, and access audit | Content hash, schema ref, producer/run/node binding, sensitivity, provenance, retention, tenant isolation, and access decision | Does not act as a registry or silently migrate artifacts |
| Canonical Report Aggregator | Deterministic report bindings and validation of one canonical machine-readable report | All required report fields are constructable from permitted terminal artifacts/citations/run decisions; partial/degraded state is explicit and permitted | Does not format channels or invent missing facts |
| Renderer Layer | Signed/versioned/disclosure-aware templates and isolated JSON/HTML/PDF/dashboard/event rendering | Template signature/version, disclosure projection, canonical object hash, output integrity, and sandbox policy | Cannot change canonical facts, call agents/tools, or repair report data |
| Observability & SRE | Contract/artifact/binding/report telemetry, SLOs, alerts, capacity, compatibility/version adoption, incidents, and bounded operations | Telemetry allowlist excludes payloads/PHI; actions preserve schema, policy, identity, trust, residency, and audit invariants | Does not read unrestricted artifact bodies or directly mutate governed configuration |

### Four registries remain logically distinct

| Registry | Primary key | Resolves | Contains | Never contains |
| --- | --- | --- | --- | --- |
| Workflow Catalog/Registry | workflow ID + immutable version | Intent to approved workflow topology/configuration | Workflow input schema ref, capability/schema constraints, dependencies, bindings, policy, report contract, lifecycle, rollout, owner | Runtime payloads, task artifacts, endpoints selected by a model, secrets |
| A2A Agent/Agent Card Registry | agent service/capability ID + version | Workflow capability node to a compatible A2A executor | Agent Card, endpoint reference, input/output/error/stream refs, artifact/media types, scopes, classifications, trust, region, health | Workflow topology, MCP tool selection, business payloads |
| MCP Service Registry | service/tool ID + version | Authorized tool capability to a compatible MCP service | Tool input/output schemas, exact scopes, side effects, endpoint reference, trust, region, health, owner | Workflow topology, agent selection, source records |
| Schema/Contract Registry | contract ID + semantic version | Schema reference/range to one immutable contract version | Format, definition hash/location, compatibility metadata, field labels, owner, lifecycle, deprecation, consumer impact and approved adapter refs | PHI, example payloads, prompts, secrets, credentials, artifacts, MCP results |

These registries may share databases, deployment automation, signing infrastructure, or administration surfaces. Their APIs, authorization, metadata, lifecycle, ownership, and audit decisions remain logically separate so that publishing an agent, workflow, tool, or schema cannot implicitly publish the others.

### Conceptual Schema/Contract Registry metadata

The registry stores contract definitions and governance metadata, not business examples. A definition may be JSON Schema, Pydantic-compatible JSON Schema, Avro, or Protobuf. The normalized metadata contract is format-neutral:

```yaml
contract_id: artifact://analysis/findings
version: 3.1.0
format: json-schema # json-schema | pydantic-json-schema | avro | protobuf
definition_ref: object://contract-definitions/analysis-findings/3.1.0
definition_sha256: sha256-symbolic-definition
signature_ref: signature://contracts/analysis-findings/3.1.0
compatibility:
  mode: backward
  compared_with: [3.0.0]
  result: compatible
  approved_adapter_refs: []
classification_metadata:
  default: internal
  fields:
    subject_ref:
      label: ePHI
      purpose_restrictions: [care-support]
      minimum_necessary: reference-only
      consent_required: true
      retention_policy_ref: policy://retention/ephi-shortest
      residency_policy_ref: policy://residency/regulated-us
      redaction_rule_ref: policy://projection/tokenize-direct-id
    findings:
      label: sensitive
      disclosure_policy_ref: policy://disclosure/authorized-workspace
owner: data-contracts-team
lifecycle:
  state: active
  approved_at: symbolic-time
  canary_percentage: 100
  deprecated_at: null
  retired_at: null
  successor_ref: null
consumer_impact_graph_ref: graph://contracts/analysis-findings/3.1.0
created_at: symbolic-time
audit_ref: audit://contract-publication/symbolic
payload_examples: prohibited
phi_or_secret_values: prohibited
```

Schema field annotations inform policy but do not grant authority. Runtime identity, purpose, consent, relationship, tenant, environment, and destination policy may further restrict a field. No lower-scope annotation or binding can widen an authorization decision.

### AgentDefinition / Agent Card contract

```yaml
agent_definition:
  agent_id: agent://analysis/findings
  agent_version: 4.7.2
  capability_id: capability://analysis.compare
  capability_version_range: ">=4.7.0 <5.0.0"
  endpoint_ref: service://analysis-agent
  input_schema_ref: schema://agent/analysis-input/4.0.0
  output_schema_ref: schema://artifact/analysis-findings/3.1.0
  supported_artifact_types:
    - application/vnd.enterprise.analysis+json
    - application/vnd.enterprise.artifact-reference+json
  supported_media_types: [application/json]
  required_scopes: [workflow.node.execute, evidence.read.summary]
  supported_data_classifications: [internal, sensitive, ePHI]
  trust_tier: regulated
  streaming:
    supported: true
    chunk_schema_ref: schema://agent/analysis-chunk/1.2.0
    completion_schema_ref: schema://agent/stream-complete/1.0.0
  error_schema_ref: schema://agent/error/2.0.0
  idempotency: required
  owner: analysis-capability-team
  tenant_eligibility: policy-resolved
  regions: [approved-region]
  signature_ref: signature://agent-card/analysis-findings/4.7.2
```

The version resolved for a run must satisfy the workflow's capability and schema constraints simultaneously. A health-compatible but schema-incompatible agent is not a fallback. Stream chunks are untrusted partial output; only a valid completion object or a workflow-declared, schema-valid partial artifact may enter the artifact pipeline.

### WorkflowDefinition contract and A/B -> C fan-in example

The following YAML is illustrative configuration, not implementation code. Agent A, B, and C are explanatory runtime node labels only:

```yaml
workflow_definition:
  workflow_id: workflow://typed-fan-in-report
  version: 2.3.0
  owner: workflow-platform
  status: active
  workflow_input_schema_ref: schema://workflow/fan-in-input/2.0.0

  nodes:
    - node_id: A
      capability_id: capability://evidence.summarize
      agent_version_range: ">=3.0.0 <4.0.0"
      expected_input_schema_ref: schema://agent/evidence-input/2.0.0
      expected_output_schema_ref: schema://artifact/evidence-summary/2.1.0
      depends_on: []
      input_bindings:
        subject_ref:
          from: workflow_input
          select: $.subject_ref
        context_pack_ref:
          from: workflow_input
          select: $.context_pack_ref

    - node_id: B
      capability_id: capability://risk.evaluate
      agent_version_range: ">=5.2.0 <6.0.0"
      expected_input_schema_ref: schema://agent/risk-input/3.0.0
      expected_output_schema_ref: schema://artifact/risk-assessment/1.4.0
      depends_on: []
      input_bindings:
        subject_ref:
          from: workflow_input
          select: $.subject_ref
        policy_profile:
          from: workflow_input
          select: $.policy_profile

    - node_id: C
      capability_id: capability://analysis.synthesize
      agent_version_range: ">=4.7.0 <5.0.0"
      expected_input_schema_ref: schema://agent/synthesis-input/4.0.0
      expected_output_schema_ref: schema://artifact/synthesis/3.0.0
      depends_on: [A, B] # scheduling barrier only
      input_bindings:
        subject_ref:
          from: workflow_input
          select: $.subject_ref
        evidence_findings:
          from: artifact
          node_id: A
          select: $.findings
        risk_findings:
          from: artifact
          node_id: B
          select: $.risks
        citation_refs:
          from: workflow_input
          select: $.context_pack_ref
          transform_ref: transform://context-pack/citation-refs/1.0.0
      conditions:
        - expression_ref: condition://evidence/sufficient/2.0.0
          on_false:
            behavior: skip
            output_contract:
              nullable_fields: [synthesis]
              status_value: insufficient_evidence
      error_schema_ref: schema://agent/error/2.0.0
      fallback:
        capability_id: capability://analysis.synthesize
        agent_version_range: ">=4.6.0 <5.0.0"
        required_input_schema_ref: schema://agent/synthesis-input/4.0.0
        required_output_schema_ref: schema://artifact/synthesis/3.0.0

  report:
    output_schema_ref: schema://report/analysis/3.0.0
    input_bindings:
      workflow_id:
        from: run_metadata
        select: $.workflow_id
      workflow_version:
        from: run_metadata
        select: $.workflow_version
      plan_hash:
        from: run_metadata
        select: $.plan_hash
      subject_ref:
        from: workflow_input
        select: $.subject_ref
      findings:
        from: artifact
        node_id: C
        select: $.findings
      risks:
        from: artifact
        node_id: B
        select: $.risks
      citations:
        from: context_pack
        select: $.citation_manifest
      quality:
        from: run_metadata
        select: $.quality
      policy_and_hitl:
        from: run_metadata
        select: $.policy_and_hitl
      execution_status:
        from: run_metadata
        select: $.execution_status
    partial_degraded_policy:
      allowed: true
      only_when:
        - missing_artifact_is_declared_optional
        - output_schema_accepts_explicit_status_variant
        - disclosure_policy_allows
      prohibited_for: [policy_violation, ephi_projection_failure]
    renderer_policy:
      allowed_formats: [json, html, pdf, dashboard, event]
      template_refs:
        html: template://analysis/html/5.4.1
        pdf: template://analysis/pdf/3.2.0
        dashboard: template://analysis/dashboard/2.0.0
      require_signed_template: true
      disclosure_policy_ref: policy://disclosure/analysis-report
      network_access: prohibited
```

`depends_on: [A, B]` only prevents C from becoming ready before accepted A and B artifacts exist. The `input_bindings` block is the exclusive declaration of what C receives. An upstream field not selected by a binding is absent from C's input even when it exists in the artifact.

### A2A transport envelope

The transport envelope is separate from the business payload and can be logged only under the telemetry allowlist:

```yaml
a2a_envelope:
  task_id: task-symbolic
  context_id: context-symbolic
  correlation_id: correlation-symbolic
  workflow_id: workflow://typed-fan-in-report
  workflow_version: 2.3.0
  plan_hash: sha256-symbolic-plan
  node_id: C
  attempt: 1
  idempotency_key: idempotency-symbolic
  payload:
    schema_ref: schema://agent/synthesis-input/4.0.0
    artifact_refs: [artifact://run/A/symbolic, artifact://run/B/symbolic]
    reference_ref: object://scoped-bound-input/symbolic
    inline_value: prohibited-for-sensitive-large-payload
  identity:
    workload_identity_ref: identity://workload/synthesis-agent
    delegated_policy_token_ref: token-ref://symbolic
  policy:
    sensitivity: ePHI
    purpose: care-support
    policy_decision_ref: policy-decision://symbolic
    expires_at: symbolic-time
  status:
    state: accepted
    schema_ref: schema://a2a/status/1.0.0
    message_code: TASK_ACCEPTED
    raw_phi_or_business_payload: prohibited
  error:
    schema_ref: schema://agent/error/2.0.0
    value_ref: null
```

Status and progress use codes, percentages, schema IDs, artifact IDs, hashes, and safe diagnostics. They never echo raw prompts, artifact bodies, PHI, tool results, or rendered report content.

### Immutable artifact metadata contract

```yaml
artifact_metadata:
  artifact_id: artifact://run-symbolic/A/output-1
  schema_ref: schema://artifact/evidence-summary/2.1.0
  media_type: application/vnd.enterprise.evidence-summary+json
  content_sha256: sha256-symbolic-content
  content_ref: object://tenant-symbolic/artifacts/encrypted-symbolic
  producer:
    agent_id: agent://evidence/summarizer
    agent_version: 3.4.2
    capability_id: capability://evidence.summarize
  execution:
    workflow_id: workflow://typed-fan-in-report
    workflow_version: 2.3.0
    run_id: run-symbolic
    plan_hash: sha256-symbolic-plan
    node_id: A
    attempt: 1
  sensitivity:
    highest_label: ePHI
    field_policy_projection_ref: projection://symbolic
  policy_decision_refs: [policy-decision://access/symbolic]
  provenance_refs: [provenance://source/symbolic]
  citation_refs: [citation://manifest/symbolic/chunk-1]
  predecessor_artifact_refs: []
  created_at: symbolic-time
  retention_policy_ref: policy://retention/ephi-shortest
  delete_after: symbolic-time
  legal_hold_ref: null
  residency: approved-region
  tenant_ref: tenant://symbolic
  integrity_status: verified
```

The content reference is resolved only by an authorized workload inside the applicable regulated boundary. An artifact hash or metadata record without a successful durable body commit is not accepted and cannot open a barrier.

### CitationManifest / ContextPack contract

```yaml
context_pack:
  context_pack_id: context-pack://run-symbolic/retrieval-1
  schema_ref: schema://rag/context-pack/2.1.0
  retrieval_policy_ref: policy://rag/effective/symbolic
  retrieval_policy_version: 42
  embedding_version: embedding.v4
  reranker_version: reranker.v3
  principal_scope_ref: principal-scope://symbolic
  chunks:
    - chunk_ref: chunk://organization/policy/symbolic
      content_ref: object://authorized-chunk/symbolic
      score: 0.94
      scope: organization
      authority: authoritative
      freshness:
        source_version: 44
        retrieved_at: symbolic-time
        expires_at: symbolic-time
      classification: internal
      source_ref: source://organization/policy/current
      provenance_ref: provenance://organization/policy/symbolic
      access_decision_ref: policy-decision://rag/symbolic
  citation_manifest:
    schema_ref: schema://rag/citation-manifest/1.3.0
    citations:
      - citation_id: citation-symbolic-1
        chunk_ref: chunk://organization/policy/symbolic
        source_ref: source://organization/policy/current
        canonical_locator_ref: locator://symbolic
  integrity:
    manifest_sha256: sha256-symbolic-manifest
    policy_and_index_versions_pinned: true
```

Agents consume this typed pack or its scoped handle. They never receive an arbitrary concatenation of retrieved text. System instructions remain separate from retrieved content, which is always treated as untrusted data.

### Governed Context and Memory contract

Retrieval answers, "What authorized evidence is relevant now?" Memory answers,
"What authorized continuity may survive this step or session?" The two are
composable but not interchangeable. The Context and Memory Service is a policy
enforcement point in `cw-rag`; it does not become an unrestricted database
owned by an Agent.

```yaml
memory_operation:
  operation: write
  memory_type: session       # working | session | semantic | long_term
  tenant_id: tenant-symbolic
  subject_id: principal-symbolic
  purpose: conversation_continuity
  classification: internal
  policy_decision_id: policy-decision://memory/symbolic
  correlation_id: correlation-symbolic
  content_ref:
    artifact_id: artifact-symbolic
    version: "1"
    sha256: sha256-symbolic-content
  provenance:
    source_type: workflow
    source_id: run-symbolic
    created_by: agent-symbolic
    confidence: 0.90
  retention:
    expires_at: symbolic-time
    legal_hold: false
  approval_id: null          # required for long_term writes
```

The service accepts immutable references and governance metadata, not raw
prompts, credentials, tokens, secrets, connection strings, or arbitrary inline
content. Working memory remains owned by workflow checkpoints; PostgreSQL owns
session metadata and durable state; object storage owns content bodies;
vector/search providers own semantic indexes; Valkey remains cache and
ephemeral coordination only.

Every read, write, summarize, correction, and forget operation re-evaluates
tenant, subject, purpose, classification, provenance, retention, legal hold,
delegated authority, and policy. Similarity and personal preference can affect
ranking only after authorization. Model output is never promoted to approved
long-term organizational knowledge without explicit admission and approval.

### Canonical report contract and renderer separation

The canonical report schema is domain-specific, but every report envelope includes deterministic execution and evidence metadata:

```yaml
canonical_report:
  report_id: report://run-symbolic/final
  report_schema_ref: schema://report/analysis/3.0.0
  canonical_content_sha256: sha256-symbolic-report
  workflow:
    id: workflow://typed-fan-in-report
    version: 2.3.0
    plan_hash: sha256-symbolic-plan
  schema_versions:
    workflow_input: schema://workflow/fan-in-input/2.0.0
    node_A_output: schema://artifact/evidence-summary/2.1.0
    node_B_output: schema://artifact/risk-assessment/1.4.0
    node_C_output: schema://artifact/synthesis/3.0.0
    report: schema://report/analysis/3.0.0
  runtime_versions:
    agents:
      A: agent://evidence/summarizer@3.4.2
      B: agent://risk/evaluator@5.3.1
      C: agent://analysis/synthesis@4.7.2
    services: [service://mcp/records@2.8.0]
    models: [model://approved/symbolic@version]
  artifact_refs:
    - artifact://run-symbolic/A/output-1
    - artifact://run-symbolic/B/output-1
    - artifact://run-symbolic/C/output-1
  citation_manifest_ref: citation://manifest/symbolic
  provenance_refs: [provenance://source/symbolic]
  findings: domain-typed-value
  confidence_and_quality:
    confidence: 0.91
    groundedness: 0.95
    citation_validation: passed
  policy_and_hitl:
    decision_refs: [policy-decision://symbolic]
    hitl_approval_refs: [approval://symbolic]
    disclosure_validation: passed
  execution_status:
    state: complete # complete | partial | degraded | failed
    fallbacks_used: []
    omitted_optional_sections: []
  timestamps:
    started_at: symbolic-time
    completed_at: symbolic-time
  correlation_id: correlation-symbolic
```

The Canonical Report Aggregator binds these fields deterministically from terminal artifacts, the CitationManifest, immutable run metadata, approvals, quality results, and policy decisions. It validates the object once against `report.output_schema_ref`. A renderer receives that immutable object plus a signed template reference and an output disclosure projection. It may change layout, pagination, color, localization, or channel-specific navigation, but not facts, citations, status, confidence, policy decisions, or artifact references.

### Workflow Type Checker / Contract Compiler algorithm

```text
compile(definition, effective_policy, registry_snapshots):
  verify workflow identity, signature, owner, lifecycle, rollout and tenant eligibility
  resolve workflow input and report schema refs to exact immutable versions

  for each node:
    resolve capability and Agent Card version constraints
    resolve exact input, output, stream/chunk and error schema refs
    prove at least one policy/trust/tenant/region eligible executor or declared wait/fallback

  verify graph:
    node IDs unique; edges known; required nodes reachable
    no cycles outside declared bounded loops
    depends_on, barriers, conditions, optional/quorum and cancellation semantics coherent

  for each destination input field:
    require exactly one binding unless schema declares an explicit default
    resolve source = workflow input | accepted upstream artifact | ContextPack | run metadata
    prove selected path exists in the pinned source schema
    prove destination path exists in the pinned destination schema
    reject unknown, duplicate, ambiguous and additional properties by default
    prove source and destination types, cardinality, nullability and classification compatible
    if transform exists:
      require signed allowlisted deterministic bounded transform version
      prove transform input/output schema compatibility and policy preservation

  verify conditions and optional branches:
    prove every skipped/missing artifact path is represented by nullable, union or default behavior
    prove condition expression schema and outcome variants are exhaustive

  verify resilience:
    prove retry output contract unchanged
    prove fallback agent/error/output schemas compatible
    prove migration/adapter is approved and version-pinned

  verify report:
    resolve every required report input binding exactly once
    prove constructability from terminal artifacts, CitationManifest and run metadata
    prove partial/degraded variants and disclosure policy are explicit
    verify signed renderer policy and template compatibility

  verify scopes, classification, purpose, consent, minimum necessary, residency,
         retention, model/RAG policy, HITL, provenance, budgets, audit and service availability

  emit deterministic diagnostics or:
    immutable execution plan(
      exact schema pins,
      binding graph,
      transform/condition versions,
      capability/service/model/policy versions,
      report and renderer policy,
      plan_hash over all preceding values
    )
```

Static checks reject unresolved schemas, incompatible versions, missing/duplicate/ambiguous bindings, nonexistent paths, incompatible types, implicit additional properties, unsafe transforms, untyped optional branches, incompatible errors/fallbacks, and reports that cannot be constructed. The compiler never guesses a field mapping, drops a required field, coerces an incompatible value, or silently widens a union.

### Conditions, optional branches, and union typing

- A condition evaluates only typed fields or policy-safe metadata using a signed deterministic expression version.
- A skipped optional node must produce a declared absence variant: an optional artifact reference, a nullable field, a discriminated union such as `completed | skipped | unavailable`, or an approved schema default.
- A quorum barrier declares the accepted artifact set and how unavailable members are represented. It cannot silently substitute fewer artifacts.
- A binding from an optional artifact must either guard on the same discriminant, target a compatible nullable/union destination, or supply an explicit schema-valid default.
- A partial/degraded report is a first-class schema variant with reason codes, missing optional artifact references, fallbacks, quality impact, and policy decision. It is not a renderer-generated banner over an invalid report.
- PHI/policy violations, unknown classification, missing consent, failed field projection, integrity failure, or unauthorized disclosure can never use a partial/degraded success variant.

### Runtime artifact and fan-in sequence

```text
load and verify immutable plan, exact schema pins, binding graph and policy snapshot
build/validate workflow input artifact
resolve effective hierarchical RAG policy and build validated ContextPack/CitationManifest

ready_set = nodes whose depends_on barriers and conditions are satisfied
for each ready node:
  assemble input using only declared bindings
  project fields under current purpose/classification/disclosure policy
  validate complete pinned Agent Card input schema
  dispatch A2A envelope separate from business payload

for each agent or MCP output candidate:
  parse structured output
  validate pinned output schema
  if malformed:
    apply bounded repair/retry policy
    on exhaustion use only declared compatible fallback, permitted HITL correction, or fail
  enforce field labels, purpose, minimum necessary, consent, residency and disclosure
  redact/tokenize/project permitted fields
  persist immutable encrypted artifact and metadata
  verify content hash and durable commit
  only then mark dependency accepted

when A and B are accepted:
  open C barrier
  bind selected workflow/A/B/ContextPack fields into C input
  validate C input schema
  dispatch C using A2A schema/artifact references

collect declared terminal validated artifacts
bind canonical report from artifacts, CitationManifest, run metadata, HITL, quality and policy
validate canonical report schema and disclosure policy
render through signed isolated templates without changing canonical facts
return protected response and emit payload-free contract/artifact/report telemetry
```

#### Structured-output repair policy

1. Prefer constrained decoding or native structured output against the pinned output schema.
2. Parse and validate without lossy coercion. Preserve the invalid candidate only in the authorized short-lived repair boundary if policy permits; do not persist it as a valid artifact.
3. A repair prompt or deterministic normalizer receives validation diagnostics and the minimum candidate fragment needed. It cannot add facts, retrieve data, change classification, choose an endpoint, or change the schema version.
4. Limit attempts by node and end-to-end time/token/cost budgets; record safe reason codes and attempt counts.
5. Revalidate the entire repaired object, field classification projection, provenance, and policy.
6. On exhaustion, invoke only a definition-declared schema-compatible fallback, a schema-constrained HITL correction when policy permits, or terminal failure. Never pass malformed output downstream.

### Schema evolution, compatibility, migration, and rollback

Contracts use semantic versions and an explicit compatibility mode:

- Backward-compatible additive changes may use a minor version only when new fields are optional or have schema-valid deterministic defaults and `additionalProperties` behavior remains explicit.
- Breaking field removal, rename, semantic change, type narrowing/widening that changes interpretation, new required field, classification relaxation/tightening requiring consumer action, or incompatible encoding requires a major version.
- Patch versions correct metadata or validation defects without changing accepted business semantics; immutable prior definitions remain addressable.
- Lifecycle is `draft -> validate -> approve -> active/canary -> deprecated -> retired`. Canary may coexist with active, but each run pins one exact version.
- The consumer impact graph identifies workflows, Agent Cards, MCP tools, transforms, renderers, stored artifacts, checkpoints, and report consumers affected by a proposed version.
- Approved adapters/migrations come only from the signed deterministic transform registry. Each declares source/destination schemas, policy/classification preservation, limits, owner, tests, and rollback.
- Runs pin exact schemas, transforms, templates, policy, service/model versions, and the binding graph. Resume uses the same pins unless policy revocation requires a newly compiled immutable plan revision.
- Migration failure leaves the source artifact and prior plan intact, emits deterministic diagnostics, and invokes rollback or manual governance; it never partially mutates stored content.
- Deprecation includes owner, successor, consumer deadline, compatibility evidence, adoption telemetry and rollback window. Retirement is blocked while resumable runs or retained artifacts still require the contract unless an approved migration exists.

### Field-level security, PHI projection, and regulated storage

Schema metadata can label each field `public`, `internal`, `sensitive`, or `ePHI` and attach purpose restrictions, minimum-necessary rules, consent requirements, retention, residency, redaction/tokenization, model/provider eligibility, and disclosure policy. Runtime policy intersects these annotations with validated identity, tenant, relationship/resource authority, purpose, consent, destination, workflow/node, current revocation epochs, and legal/organizational controls.

Projection occurs before A2A downstream transfer, MCP/model context, report aggregation, cache, render, telemetry, and export. A binding sees only the policy-projected artifact view. Fields denied to the downstream purpose do not appear as null placeholders unless the destination schema explicitly models denied/withheld status without leaking existence. For large or sensitive fields, bindings prefer scoped references whose dereference authorization is evaluated at use time.

The Contract Registry is outside the PHI payload path and contains metadata only. The Artifact Store is inside the regulated boundary for any artifact that creates, receives, maintains, or transmits ePHI. It uses encryption in transit/at rest, tenant isolation, private endpoints, KMS/HSM and rotation, access audit, integrity verification, residency, shortest applicable retention, deletion/tombstone propagation, legal hold, backup/restore, disaster recovery, and authorized support access. Whether a vendor requires a BAA or other terms remains an organizational legal/privacy/vendor-risk decision.

### Audit, telemetry, SLOs, and version adoption

Audit events record safe references to actor/workload identity, tenant, workflow/version, plan hash, schema IDs/versions, binding graph hash, artifact IDs/hashes, policy/consent/approval decisions, producer/service/model/template versions, validation/repair/fallback status, report hash/status, timestamps and correlation. Audit records contain no artifact body or raw PHI.

Operational telemetry includes:

- schema resolution latency and failures by contract ID/version/reason;
- workflow compile success, binding cardinality/path/type/condition/report constructability errors;
- raw output parse/validation failures, bounded repair attempts and exhaustion;
- classification/projection decisions by safe reason code, never field values;
- artifact size buckets, persist latency, hash/integrity failures, retention class and storage availability;
- dependency/barrier wait, input binding latency, downstream input validation and A2A/MCP schema compatibility;
- ContextPack/citation schema validation, authority/coverage/freshness and provenance completeness;
- canonical report construction/validation success, missing optional fields, partial/degraded/fallback reasons;
- renderer/template version, sandbox latency/failure and disclosure validation;
- schema/agent/MCP/workflow/template version adoption, deprecated consumers and migration/rollback status.

Telemetry contains schema IDs, version/hash, artifact IDs/hashes, size buckets, status, safe reason codes, timing and correlation only. Raw prompts, PHI, artifact bodies, bound input values, MCP results, ContextPack chunks and report contents are prohibited.

Initial SLOs are conceptual targets to ratify with workload owners and risk analysis:

| Pipeline | Service level indicator | Initial objective | Fail-safe behavior |
| --- | --- | --- | --- |
| Contract resolution/type checking | Eligible compile requests resolved and deterministically checked | 99.9% availability; p95 compile latency within approved workflow-size budget | No plan on unresolved/incomplete check |
| Runtime output validation | Output candidates receive final validation/repair disposition | 99.95% disposition availability; bounded attempt/time budget | Barrier remains closed |
| Artifact persistence/integrity | Valid projected artifacts durably committed with matching hash | 99.99% success for accepted artifacts; zero accepted hash mismatches | Artifact not accepted; retry/fail |
| Binding/downstream validation | Ready-node inputs assembled and validated | 99.95% availability; p95 within node dispatch budget | No A2A dispatch |
| Canonical report pipeline | Eligible runs construct and validate a report or explicit failure object | 99.9% availability; zero unvalidated report release | No renderer input |
| Renderer pipeline | Valid canonical reports produce requested channel output | 99.9% availability per required channel; canonical hash preserved | Retry/signed compatible renderer or explicit render failure |
| PHI telemetry exclusion | Sampled/continuous DLP checks find no raw PHI payload | 100% exclusion objective | Stop affected telemetry path, alert, assess incident |

Error budgets cannot authorize bypassing schema validation, artifact integrity, identity, classification, minimum necessary, residency, audit, report validation, or disclosure policy.

### Contract, artifact, and report failure matrix

| Failure | Detection | Barrier/report effect | Safe outcome |
| --- | --- | --- | --- |
| Unresolved schema reference | Registry lookup/signature/lifecycle failure | No plan; if resume, node remains blocked | Reject before publish/execute; deterministic diagnostic; restore registry or approved pinned version |
| Incompatible schema version | Compatibility and Agent Card/workflow constraint check | No plan or fallback dispatch | Select only approved compatible version/adapter; otherwise reject |
| Binding missing, duplicate, or ambiguous | Exactly-one required binding check | No plan | Author correction; never infer mapping |
| Binding path or type mismatch | Source/destination schema traversal and type check | No plan | Correct binding or approved typed adapter |
| Conditional/optional/union mismatch | Exhaustiveness/nullability/default analysis | No plan | Declare typed absence/union/default behavior |
| Unsafe or failed transform/migration | Transform registry/signature/bounds/result validation | No plan or new artifact; source remains intact | Roll back; approved migration/HITL governance; no partial mutation |
| Invalid agent/model output | Parse/schema validation | Dependency remains unsatisfied | Bounded repair/retry, compatible fallback, permitted schema-constrained HITL, then fail |
| Repair exhausted | Attempt/time/token/cost budget | Dependency remains unsatisfied | Fallback/HITL only if declared and compatible; otherwise fail |
| Artifact persistence or hash failure | Durable commit/hash verification | Dependency remains unsatisfied; barrier closed | Idempotent retry/circuit/fail; never accept metadata-only artifact |
| Classification/minimum-necessary/purpose/consent violation | Field policy engine | Artifact rejected; no downstream/report disclosure | Fail closed, revoke/isolate/alert/audit; organizational incident assessment |
| A2A envelope/payload schema mismatch | Pre-dispatch or receiver validation | No execution | Reject, re-resolve only compatible agent, or fail |
| MCP tool/result incompatibility | Compatibility mediation and result validation | Tool result cannot enter context/artifact pipeline | Compatible service/tool fallback or fail; no raw result |
| ContextPack/CitationManifest invalid | Retrieval contract/provenance/authority validation | Agent input/report citation binding blocked | Bounded reretrieve, insufficient-evidence artifact, permitted HITL, or fail |
| Report not constructable | Compile-time report analysis or runtime missing required artifact | No canonical object | Reject workflow before publish or fail run; partial only if typed and policy allowed |
| Canonical report validation failure | Report schema/disclosure validation | No renderer input/release | Correct source artifact/binding through new immutable lineage; otherwise fail |
| Renderer/template failure | Signature/version/sandbox/output integrity check | Canonical object remains valid; requested view unavailable | Retry or signed compatible renderer; explicit render failure; facts unchanged |
| Policy/PHI hard failure | Identity/RLS/audit/KMS/residency/disclosure check | All affected barriers/release closed | Fail closed; no partial/degraded success |
| DLQ escalation | Retry/fallback exhausted | Run blocked/failed | Store IDs, hashes, refs and safe diagnostics only; never raw PHI |

### Phased implementation backlog for typed contracts

This backlog refines the broader platform phases later in the document. It does not change code now.

1. **Phase TC0 - contract governance foundation:** ratify invariant and owners; deploy logically separate Contract Registry metadata APIs; define semantic versions, compatibility modes, field labels, lifecycle, signatures, impact graph, approved transform registry, and no-PHI registry policy.
2. **Phase TC1 - compile-time safety:** version Agent Cards and WorkflowDefinitions with exact input/output/error/stream/report refs; implement schema resolution, exactly-one binding, path/type/additional-property, condition/optional/union/default, transform, fallback and report-constructability checks; include schema pins and binding graph in the immutable plan hash.
3. **Phase TC2 - runtime artifact gateway:** implement structured-output parsing, bounded repair, classification/projection, encrypted immutable Artifact Store, metadata/hash/lineage, barrier acceptance, declarative binding, downstream input validation, A2A envelope separation and reference-based sensitive transfer.
4. **Phase TC3 - MCP/RAG mediation and canonical reporting:** mediate agent/tool schemas; admit MCP results through the artifact pipeline; produce CitationManifest/ContextPack; implement deterministic Canonical Report Aggregator and isolated signed disclosure-aware JSON/HTML/PDF/dashboard/event renderers.
5. **Phase TC4 - evolution, resilience and operations:** implement consumer impact/adoption, canary/deprecation/retirement, migrations/adapters/rollback, exact-pin resume, compatible fallback, typed partial/degraded reports, DLQ reference policy, contract/artifact/report metrics, SLOs, DLP and failure injection.

Exit evidence includes compile fixtures for valid and invalid bindings, compatibility tests, A/B -> C barrier tests, malformed-output repair exhaustion, artifact hash/persistence failure, policy projection, MCP/RAG result validation, canonical report equivalence across renderers, migration/rollback, resume with exact pins, PHI-exclusion DLP, independent HA/failover, and no topology-specific scheduler branches.

### Current Python example versus the proposed contract architecture

The current Python example remains an unchanged four-agent in-process demonstration. It does not implement the Contract Registry, versioned Agent Card input/output contracts, `WorkflowDefinition.input_bindings`, compile-time type checking, edge Contract Gateway, immutable Artifact Store, typed A2A envelope separation, MCP result artifact mediation, ContextPack/CitationManifest, canonical report object, renderer isolation, schema evolution governance, or contract/artifact/report SLOs described here.

The proposed architecture remains generic: workflow definitions can declare any approved node count, dependency graph, condition, bounded loop, HITL gate, fallback and report contract. A/B -> C is used only to make fan-in semantics concrete. Implementation begins only after these conceptual contracts, field policies, ownership boundaries, failure behavior and governance are approved.

## Platform Planes

The target is a platform, not a single workflow or agent graph. Five stacked primary planes carry runtime requests and results: **User Plane -> Workflow Plane -> Agent Plane -> MCP Plane -> Infrastructure Plane**. The **Configuration Plane** publishes cross-cutting desired state, while the **Observability & SRE Plane** measures actual state and returns bounded operational feedback. Security, identity, privacy, governance, policy, and FinOps are guardrail spines enforced at every plane boundary rather than an optional eighth runtime plane.

## Whole-Graph Authorization Preflight and Continuous Enforcement

> **Preflight the whole reachable graph, then reauthorize every selected action at use time.**

The canonical normative specification is
[Continuous Entitlement and Runtime Authorization](continuous-entitlement-enforcement.md).

Authorization is both a planning invariant and a runtime invariant. A successful sign-in or network-reachable workload identity is not permission to execute an arbitrary workflow, invoke a tool, query data, call a model, transfer an artifact, or disclose a report. Before execution, the platform proves that the originating principal may cause every statically reachable capability and resource in the selected graph. During execution, it reauthorizes the exact selected action with current arguments, destination, purpose, classification, and revocation state.

### Exact whole-graph preflight algorithm

```text
function authorize_candidate(request, principal, candidate_workflow):
  context = authenticate_and_resolve(
    principal,
    tenant, groups, roles, relationships,
    device, session, consent, purpose
  )
  require PDP.allow(
    subject=context,
    resource=(candidate_workflow.id, candidate_workflow.version),
    action="workflow.run.eligible",
    purpose=context.purpose
  )

  compiled = compile_contracts_and_dag(candidate_workflow)
  retrieval_plan = resolve_hierarchical_rag_policy(compiled, context)
  manifest = build_complete_authorization_manifest(
    workflow=compiled,
    retrieval_plan=retrieval_plan,
    include_all_statically_reachable_required=true,
    include_all_statically_reachable_optional=true,
    include_all_declared_fallbacks_and_alternates=true
  )

  # Prompt, router, composer, and LLM output are advisory. They cannot add
  # privileges, endpoints, service IDs, tool names, scopes, or destinations.
  decision = PDP.evaluate(
    subject=context,
    manifest=manifest,
    policy_families=[RBAC, ABAC, ReBAC, capability, data, model, disclosure],
    policy_version=current_policy_version,
    revocation_epoch=current_revocation_epoch
  )

  if decision.denied_required is not empty:
    reject_before_dispatch(decision.reason_codes)

  for branch in decision.denied_optional:
    if not compiled.schema_explicitly_allows_omission(branch):
      reject_before_dispatch("optional branch is structurally required")
    if not policy_explicitly_allows_omission(branch):
      reject_before_dispatch("optional branch omission is not authorized")
    if not compiled.report_remains_constructable_without(branch):
      reject_before_dispatch("report cannot be constructed after pruning")
    compiled = prune_branch(compiled, branch)

  for fallback in compiled.fallbacks_and_alternates:
    if decision.pre_authorized_fallback(fallback) and
       compiled.schema_and_policy_compatible(fallback):
      record_authorized_fallback_set(fallback)
    else:
      mark_requires_new_validated_authorized_plan_revision(fallback)

  recompiled = revalidate_dag_bindings_budgets_and_report(compiled)
  final_manifest = rebuild_manifest_if_pruned(recompiled, manifest)
  final_decision = PDP.confirm(final_manifest, decision)

  return freeze_authorized_immutable_execution_plan(
    recompiled, final_manifest, final_decision,
    expiry=min_authorization_expiry(final_decision)
  )
```

No A2A dispatch, MCP discovery, RAG query, model call, or protected data read occurs before this algorithm produces an `AUTHORIZED_PLAN`. A required denial rejects the run. An optional denial prunes only when omission is explicitly modeled by both schema and policy and the report remains constructable. A fallback or alternate is usable only when it is pre-authorized and schema/policy compatible; otherwise it requires a newly compiled, validated, authorized immutable plan revision.

### Credential non-possession contract

Authorization creates references and constrained authority; it never places
credential values into the execution plan. Agents receive only a narrow
workload identity plus `identityRef`, `delegationRef`, `policyDecisionRef`,
and `credentialRef`. Trusted MCP, model, data, and connector gateways validate
the current tenant, principal, purpose, run, node, operation, resource,
audience, consent, policy version, and revocation epoch before performing
short-lived workload or OBO token exchange. The resolved credential remains
inside the trusted gateway and is prohibited from Agent inputs, RabbitMQ
payloads, checkpoints, artifacts, logs, traces, metrics, audit, and DLQs.

The canonical profile is
[Credential Non-Possession and Delegated Authority](credential-non-possession.md).

### Complete Authorization Manifest conceptual schema

```yaml
authorization_manifest:
  workflow:
    workflow_id: workflow://symbolic-report
    version: 4.2.0
    route: route://report-analysis
    lifecycle: active
  agents:
    required:
      - capability: capability://evidence.summarize
        trust_tier: regulated
        version_range: ">=3.0.0 <4.0.0"
    optional:
      - capability: capability://risk.enrich
        trust_tier: regulated
        version_range: ">=2.0.0 <3.0.0"
        omission_policy_ref: policy://workflow/optional-risk
  mcp:
    reachable:
      - capability: capability://records.lookup
        tool_category: records-read
        operation_risk: read
        exact_service_endpoint: deferred_registry_resolution
      - capability: capability://records.update
        tool_category: records-write
        operation_risk: high_write
        hitl_required: true
  rag:
    hierarchical_scopes: [personal, eligible-groups, organization]
    namespaces: [namespace://personal/symbolic, namespace://group/eligible, namespace://org/approved]
    data_classifications: [internal, sensitive, ePHI]
    required_authoritative_sources: [source://organization/policy/current]
  models:
    approved_provider_classes: [provider://approved-regulated]
    models: [model://approved-family]
    regions: [approved-region]
    retention: no-retain
    training: prohibited
  artifacts:
    - schema_ref: schema://artifact/evidence/2.1.0
      field_classifications: { findings: sensitive, subject_ref: ePHI }
      downstream_projections:
        agent://synthesis: [findings, citation_refs]
  report:
    schema_ref: schema://report/symbolic/3.0.0
    fields: [summary, findings, citations, limitations]
    renderers: [secure-json, secure-html, secure-pdf]
    delivery_destinations: [authenticated-workspace]
    download_actions: [scoped-single-report-download]
  controls:
    hitl_requirements: [high-risk-write, sensitive-release]
    fallback_and_alternate_capability_sets: [fallback-set://synthesis-compatible]
    budgets: { tokens: 45000, external_calls: 20, duration_ms: 90000 }
    environment: production
    region: approved-region
```

The manifest describes capability and resource envelopes, not raw data, bearer tokens, or model-selected endpoints. Exact dynamic MCP or agent service endpoints may be resolved later, but only within a pre-authorized capability, trust, version, environment, region, and risk envelope. Any plan revision that adds a reachable capability/resource or widens an envelope must repeat compilation, manifest construction, PDP evaluation, and immutable-plan freeze.

### Authorized Immutable Execution Plan

The authorization result is frozen with the compiled graph as an **Authorized Immutable Execution Plan**:

| Field | Required meaning |
| --- | --- |
| `plan_hash` | Hash of the exact compiled DAG, bindings, conditions, schema pins, budgets, and selected immutable configuration. |
| `policy_version` / `policy_snapshot_hash` | Exact policy generation and signed snapshot used for the preflight decision. |
| `authorization_manifest_hash` | Hash of the final manifest after any explicitly permitted optional pruning. |
| `authorization_decision_ids` / `evidence_refs` | PDP decision IDs, reason codes, and privacy-safe evidence references for eligibility, manifest entries, pruning, fallback sets, and release policy. |
| `allowed_agent_capability_envelopes` | Capability, trust tier, version range, classifications, purpose, tenant, region, and service constraints allowed at A2A selection. |
| `allowed_mcp_capability_envelopes` | Reachable MCP capabilities/tool categories, operation/read-write risk, service constraints, exact-tool visibility rules, and HITL requirements. |
| `allowed_rag_envelopes` | Hierarchical scopes, namespaces, data classes, ACL/RLS requirements, required authorities, query bounds, and index constraints. |
| `allowed_model_envelopes` | Providers, models, regions, retention/training rules, context classifications, and projection constraints. |
| `allowed_report_envelopes` | Canonical schema/fields, renderers/templates, recipient/destination/channel, download action, and disclosure projection. |
| `field_projections` | Per artifact boundary, destination agent/model/report purpose, allowed fields, classifications, transformations, and expiry. |
| `token_constraints` | Per node/tool audience, scopes, maximum lifetime, nonce, plan/node binding, replay and idempotency requirements. Raw bearer tokens are prohibited. |
| `fallback_authorization_sets` | Only the compatible fallback/alternate capability sets approved in advance. |
| `revocation_epoch` / `expiry` | Epoch and earliest expiry that trigger pause/revalidation before the next protected action. |

Plan immutability does not permit stale authority. A hard revocation, changed policy/relationship/consent/service trust, or expired decision pauses the run before the next protected action. Resume uses the same plan only if every protected dependency remains current; otherwise a new immutable plan revision with parent hash is required.

### PDP and PEP responsibility model

| Enforcement component | Responsibility | Required evidence |
| --- | --- | --- |
| **PDP** | Evaluate RBAC + ABAC + ReBAC plus capability, data, model, and disclosure policy over the manifest and exact runtime actions. Consult Policy Store, Relationship Data, and Attribute Sources. | Decision ID, policy version/snapshot hash, reason codes, evidence refs, revocation epoch, expiry, obligations; no raw PHI/secrets. |
| **UX/API Gateway PEP** | Authenticate; enforce route/API eligibility, tenant/session/device/purpose/consent; prevent client-supplied capabilities. | Principal/session decision and workflow eligibility decision. |
| **Workflow Compiler/Scheduler PEP** | Require complete manifest preflight, optional-prune rules, authorized plan, current epoch, and node readiness before dispatch. | Manifest hash, plan hash, prune/fallback decisions, per-node reauthorization. |
| **A2A Gateway/Agent Ingress PEP** | Reauthorize principal/delegation + workflow/run/plan/node + selected capability/service/version + purpose/classification immediately before dispatch and again at ingress. | Audience/scope/expiry/nonce/plan-node binding, decision ID, idempotency/replay state. |
| **MCP Discovery PEP** | Authorize requested capability and which service metadata may be disclosed before discovery. | Capability/disclosure decision and visible service metadata set. |
| **MCP listTools/Call PEP** | Authorize visible tools/schemas, then exact service/tool/operation/validated arguments/read-write risk/purpose; require HITL for high-risk writes. | Separate discovery, listTools, exact-call, argument, and HITL decisions. |
| **RAG/Query Gateway PEP** | Enforce tenant/user/group/document/row/field ACL/RLS inside vector/search/DB queries. | Query decision, effective predicates, namespace/data-class envelope, required-source result. |
| **Model Gateway PEP** | Authorize provider/model/region/retention/training/data class/context projection immediately before each model call. | Model destination and projected-context decision. |
| **Artifact/Binding Gateway PEP** | Authorize each projected field and destination agent purpose/trust before binding or A2A transfer. | Source/destination field decision, classification, purpose, projection hash. |
| **Report/Disclosure/Download Gateway PEP** | Authorize canonical fields, renderer/template, recipient/destination/channel, and each delivery/download action. | Disclosure projection and release/download decision bound to report hash. |

PEPs never treat an `ALLOW` as transferable to a different resource, action, purpose, classification, plan node, destination, or epoch. A PEP denies when it cannot obtain or validate an applicable decision.

### Delegation chain and confused-deputy prevention

```text
user identity token
  -> workflow-scoped eligibility decision/delegation
  -> node-scoped short-lived audience-bound A2A token
  -> MCP service/tool-scoped OBO token exchange
  -> DB/search user + tenant + purpose RLS/ACL context
```

Never forward a raw user token. Every service validates audience, scope, expiry, nonce, issuer, tenant, purpose, `plan_hash`, node/tool binding, and replay/idempotency state. A platform workload or network identity being able to reach a service is **not** proof that the originating user may cause that service capability or action. The downstream service must validate both the platform service identity and the originating user's delegated authority.

This distinction prevents the **confused-deputy** threat: a privileged scheduler, agent, MCP gateway, connector, model gateway, or report service must not use its own network reach or broad workload credential to perform an action that the originating user could not authorize. Prompt/router/LLM output is advisory and cannot grant privileges, inject endpoints/tool names, choose a tenant, or widen a token.

### Required, optional, and fallback semantics

| Reachability kind | Unauthorized result | Safe behavior |
| --- | --- | --- |
| Required capability/resource | Any required manifest entry is denied or unverifiable. | Reject before dispatch; no protected execution. |
| Optional branch | Entry is denied. | Prune only when workflow schema and policy explicitly permit omission and deterministic report validation proves the report remains constructable; record `optional_pruned` and reason. Otherwise reject. |
| Fallback/alternate | Candidate is not in a pre-authorized compatible fallback set. | Do not use it. Compile, validate, manifest, authorize, and freeze a new plan revision, or fail closed. |
| Dynamic endpoint | Exact service endpoint is not known at preflight. | Resolve only within the pre-authorized capability/trust/version/region/environment envelope, then reauthorize the exact service at use time. |

### Continuous authorization matrix

| Boundary | Reauthorize immediately before | Decision inputs |
| --- | --- | --- |
| A2A dispatch | Every task dispatch and receiving-agent admission | Principal/delegation, tenant, workflow/run/plan/node, selected agent capability/service/version, purpose, classification, field projection, audience/scope/expiry/nonce. |
| MCP discovery | Querying the MCP registry/discovery broker | Requested capability, principal/workload delegation, purpose, classification, allowed service metadata disclosure, plan/node. |
| MCP `listTools` | Returning tool names or schemas | Exact service, visible capability/tool categories, schema disclosure, purpose, classification, policy version. |
| Exact MCP call | Sending the call | Service, tool, operation, schema-valid arguments, field/record bounds, read/write risk, purpose, token audience/scopes/expiry; HITL for high-risk write. |
| RAG/vector/DB query | Every query | Tenant, user, groups, relationships, consent, document/row/field ACL/RLS predicates, namespace, data class, required authority, purpose, epoch. |
| Model call | Every prompt/context submission | Provider, model, region, retention, training, data class, context field projection, purpose, vendor status. |
| Artifact binding/A2A transfer | Every projected field transfer | Source artifact/hash/schema, field classification, destination agent capability/trust, purpose, allowed transformations, plan/node. |
| Canonical report rendering | Binding/rendering canonical fields | Report hash/schema, disclosed fields, renderer/template/version, purpose, partial/degraded policy. |
| Delivery/download | Every recipient, destination, channel, and download | Current identity/session/tenant/relationship/consent, report hash, field projection, destination/channel, token expiry, policy/epoch. |

### TOCTOU, revocation, pause, and resume

Immediately before each protected action, the PEP compares the plan's policy version/snapshot hash, revocation epoch, decision expiry, membership, consent, resource relationship, service trust/health, vendor approval, token lifetime, and relevant classification with current authoritative state. This closes time-of-check/time-of-use gaps.

| Change detected | Runtime behavior |
| --- | --- |
| Hard revocation, tenant/relationship/consent loss, service trust withdrawal, token expiry, or policy prohibition | Cancel pending dispatch, revoke outstanding scoped tokens where supported, pause/isolate the run, invalidate decision cache, preserve privacy-safe evidence, and fail closed unless a new plan can be authorized. |
| Policy or classification change that narrows fields/capabilities | Stop before use; rebuild bindings/manifest, recompile report constructability, reauthorize, and create a child immutable plan revision. |
| Membership/source/index/model/vendor change | Revalidate affected RAG/model/service envelope and all dependent citations/artifacts; resume only when the same plan remains valid or a new authorized revision is frozen. |
| Resume after checkpoint | Verify plan/manifest/policy hashes, revocation epoch, decision expiries, memberships, consent, service trust, artifact integrity, source/citation validity, and token freshness. Never resume with stored bearer tokens. |
| PDP or authoritative attribute source unavailable | Fail closed for sensitive decisions. A signed cached decision may be used only within its bounded safe TTL, exact key, obligations, epoch, and classification policy. |

### Decision cache, audit, and evidence rules

Authorization decision caching is optional and conservative. A cache entry is keyed by the full tuple:

```text
principal + tenant + workflow + plan + node + resource + action +
purpose + classification + policy_version + revocation_epoch
```

The key also includes material argument/field-projection hashes where the action is argument- or data-dependent. TTL is bounded by the shortest of decision expiry, token lifetime, relationship/consent freshness, service-trust freshness, and policy maximum. High-risk writes, final disclosures, downloads, and any policy-marked non-cacheable decision require live evaluation. Hard revocations invalidate matching entries immediately; inability to prove epoch freshness is a miss, not an allow. Cached decisions cannot be reused across tenants, principals, purposes, classifications, nodes, actions, resources, destinations, report hashes, or plan revisions.

Audit and evidence events contain: `decision_id`, parent/preflight decision ID, reason codes, allow/deny/prune/obligation result, principal/tenant/workflow/run/plan/node references, manifest/plan/policy hashes, policy version, revocation epoch, resource/action/capability identifiers, argument/projection hash, data classification, purpose, token audience/scope/expiry metadata, HITL/fallback/prune references, timestamp, PEP identity, and privacy-safe authoritative evidence refs. Raw PHI, secrets, bearer tokens, unrestricted arguments, prompts, retrieved content, and report bodies are prohibited.

### Authorization failure matrix

| Failure | Detection point | Safe outcome |
| --- | --- | --- |
| User not eligible for workflow/version | Eligibility PDP decision | Reject before graph/resource preflight and dispatch. |
| Required manifest entry denied | Whole-graph PDP preflight | Reject before dispatch; return privacy-safe reason code. |
| Optional entry denied but omission not explicitly valid | Compiler/PDP preflight | Reject; never silently prune. |
| Optional entry safely pruned | Compiler/PDP preflight | Recompile bindings/report, rebuild manifest hash, record prune decision, freeze narrowed plan. |
| Unauthorized fallback/alternate | Resolution or failover | Do not invoke; require new validated/authorized plan revision or fail. |
| PDP unavailable or decision stale | Any PEP | Fail closed unless an exact bounded safe cache entry is valid and policy permits it. |
| Policy/revocation epoch changes mid-run | Continuous epoch check | Pause/revoke/invalidate; revalidate same plan or freeze an authorized child revision. |
| Token audience/scope/expiry/nonce/plan-node check fails | A2A/MCP/service ingress | Reject, record replay/security reason, revoke related attempts, never fall back to workload-only authority. |
| Confused-deputy attempt | Downstream dual identity/delegation check | Deny even when network/service identity is allowed; alert and preserve evidence. |
| Exact MCP arguments or high-risk write denied | MCP call PEP | Do not call; request required HITL only if policy permits and approval cannot widen authority. |
| RAG ACL/RLS cannot be enforced in-query | Query PEP/source | No query or result; fail closed or use an already authorized declared alternate source. |
| Model destination/context projection denied | Model PEP | Do not transmit context; approved compatible model only if in authorized set. |
| Artifact field/destination denied | Binding PEP | Remove only if schema/policy explicitly allow and report remains constructable; otherwise fail. |
| Report field/renderer/recipient/channel/download denied | Disclosure PEP | No render/release/download for that projection/destination; recompute a narrower authorized report only if schema/policy permit. |

### Testing and evidence plan

1. **Manifest completeness tests:** enumerate every statically reachable required, optional, condition, bounded-loop, fallback, alternate, MCP category, RAG source, model, artifact field, report renderer/destination, HITL gate, budget, environment, and region; compare compiler reachability with manifest entries.
2. **Negative preflight tests:** deny each required manifest entry in turn and prove zero dispatch/tool/query/model activity; deny optional entries and prove pruning happens only with explicit schema/policy permission and report constructability.
3. **Fallback tests:** exhaust primary services and prove only pre-authorized compatible fallback sets run; every other alternate requires a new parent-linked plan revision.
4. **PEP boundary tests:** exercise allow/deny at UX/API, scheduler, A2A ingress, MCP discovery, `listTools`, exact call, RAG query, model, binding, report, delivery, and download. Prove prompt/model-supplied endpoint/tool names never become authority.
5. **Delegation tests:** prove raw user tokens are never forwarded or persisted; validate audience/scope/expiry/nonce/plan-node binding, replay protection, idempotency, OBO exchange, and DB/search user+tenant RLS context.
6. **TOCTOU and revocation tests:** change role, group, relationship, consent, policy, service trust, classification, vendor status, and token expiry between preflight and each use boundary; prove pause/revoke/revalidate/new-plan or fail-closed behavior.
7. **Confused-deputy tests:** give the platform workload network access while denying the user action; prove every downstream service rejects workload-only authority.
8. **Decision-cache tests:** verify exact key partitioning, bounded TTL, argument/projection hashes, hard-revocation invalidation, epoch freshness, and non-cacheable high-risk/final-disclosure policy.
9. **Report disclosure tests:** vary fields, renderer, recipient, destination, channel, and download action independently; prove each requires a current report-hash-bound decision.
10. **Evidence tests:** reconcile manifest hash, plan hash, policy snapshot, decision IDs/reason codes, PEP events, token metadata, prune/fallback/HITL evidence, and final disclosure without raw PHI, secrets, tokens, prompts, source content, or report bodies.

## End-to-End Prompt-to-Report State Flow

This chapter is a layman-friendly trace of one request through the proposed platform. It is conceptual design only. **No Python or other implementation code is changed.** Symbolic identifiers illustrate contracts and state; they are not real people, records, endpoints, credentials, or PHI.

The guiding invariant is:

> **Dependencies control when work may run; schemas, explicit bindings, and field policy control what data each step receives.**

### Complete 32-stage flow

| Step | State before | Action/lookup | Contract/policy | State after | Failure/alternate path |
| --- | --- | --- | --- | --- | --- |
| **1. Receive prompt** | `NEW` | Accept a bounded prompt and optional governed upload handle. | Ingress schema, type/size allowlist, tenant-safe envelope | `RECEIVED` | Reject malformed or prohibited input before protected work. |
| **2. Authenticate and resolve principal context** | `RECEIVED` | Authenticate and resolve tenant, groups, roles, relationships, device, session, consent, and purpose. | OIDC/MFA, current authoritative attributes, deny default | `PRINCIPAL_RESOLVED` | Missing, stale, cross-tenant, or incompatible context fails closed. |
| **3. Authorize workflow eligibility** | `PRINCIPAL_RESOLVED` | PDP authorizes whether the principal may run each candidate workflow/version. | RBAC + ABAC + ReBAC, lifecycle, tenant, purpose, risk | `WORKFLOW_ELIGIBLE` | Ineligible candidates are removed; no eligible candidate means reject. |
| **4. Create Run State** | `WORKFLOW_ELIGIBLE` | Create run/correlation IDs and privacy-safe initial audit state. | Tenant isolation, idempotency, no raw PHI telemetry | `PROMPT_RECEIVED` | Persistence failure stops; duplicate idempotency returns prior run ref. |
| **5. Understand request** | `PROMPT_RECEIVED` | Produce typed intent, entities, risk, classification, and capability needs. | PromptUnderstanding schema; model output is advisory | `CLASSIFIED` | Invalid output gets bounded repair or permitted clarification. |
| **6. Select or compose workflow** | `CLASSIFIED` | Retrieve eligible catalog candidates, score, clarify, or constrained-compose approved nodes. | Eligibility filter precedes scoring; no model-supplied privilege/endpoints/tools | `WORKFLOW_SELECTED` | Ambiguity waits; invalid/unapproved composition rejects. |
| **7. Compile contracts and DAG** | `WORKFLOW_SELECTED` | Resolve schemas; validate bindings, DAG, barriers, conditions, loops, fallback, budgets, and report constructability. | Exactly-one bindings, deterministic transforms, immutable pins | `CONTRACTS_VALIDATED` | Any structural, contract, scope, or constructability error rejects. |
| **8. Resolve hierarchical RAG plan** | `CONTRACTS_VALIDATED` | Merge org/group/user controls and declare scopes, namespaces, classes, and required authoritative sources. | Most restrictive security wins; preference never grants authority | `RAG_POLICY_RESOLVED` | Missing mandatory policy/source requirement or stale epoch rejects. |
| **9. Build Complete Authorization Manifest** | `RAG_POLICY_RESOLVED` | Enumerate workflow/route; every reachable required/optional/fallback agent, MCP category/risk, RAG scope/source, model policy, artifact projection, report/delivery action, HITL, budget, environment, and region. | Compiler reachability; dynamic endpoint may remain deferred inside capability envelope | `AUTHORIZATION_MANIFEST_BUILT` | Incomplete enumeration or unbounded dynamic privilege rejects. |
| **10. PDP whole-graph preflight** | `AUTHORIZATION_MANIFEST_BUILT` | Evaluate RBAC + ABAC + ReBAC plus capability, data, model, and disclosure policy over the entire manifest. | Policy/Relationship/Attribute Stores, current policy version and revocation epoch | `AUTHORIZATION_PREFLIGHT` | Required denial or unverifiable decision rejects before dispatch. |
| **11. Decide required, optional, and fallback outcomes** | `AUTHORIZATION_PREFLIGHT` | Reject denied required entries; prune denied optional branches only when schema/policy permit and report remains constructable; record pre-authorized compatible fallback sets. | Deterministic recompile and manifest rebuild after pruning | `AUTHORIZED_GRAPH` | Unauthorized fallback or unsafe optional omission requires new plan or reject. |
| **12. Freeze Authorized Immutable Execution Plan** | `AUTHORIZED_GRAPH` | Freeze plan/manifest/policy hashes, decision IDs/evidence, envelopes, field projections, token bounds, fallback sets, epoch, and expiry. | Signed immutable plan; no bearer tokens | `AUTHORIZED_PLAN` | Hash/persistence failure stops; stale authority never becomes a plan. |
| **13. Reauthorize RAG query** | `AUTHORIZED_PLAN` | Check current principal, purpose, scopes, classifications, required sources, policy/epoch, and exact in-query ACL/RLS predicates. | RAG/query PEP, tenant/user/group/document/row/field ACL/RLS | `RAG_QUERY_AUTHORIZED` | Predicate/source authority cannot be proven: no query. |
| **14. Search approved knowledge** | `RAG_QUERY_AUTHORIZED` | Query only authorized namespaces with ACL/RLS inside every vector/search/DB query and bounded quotas. | Authorized RAG envelope, current memberships/consent, authority/freshness | `RAG_HITS_RETRIEVED` | Only pre-authorized compatible source fallback; otherwise stop/insufficient evidence. |
| **15. Build trusted ContextPack** | `RAG_HITS_RETRIEVED` | Threshold, dedupe, rerank, conflict-check, enforce authoritative floor, and build typed ContextPack/CitationManifest. | Minimum necessary, provenance, grounding/coverage, context schema | `RAG_READY` | Bounded retrieval/replan/HITL; partial only when schema/policy allow. |
| **16. Resolve exact agent within envelope** | `RAG_READY` | Resolve healthy Agent Cards/services satisfying allowed capability, trust, version, tenant, region, and classification envelope. | Signed registry metadata; no prompt/model endpoint | `AGENTS_RESOLVED` | Only pre-authorized compatible fallback; otherwise new plan or fail. |
| **17. Calculate Ready Set** | `AGENTS_RESOLVED` | Compute zero-unmet-dependency nodes and barriers from accepted artifact IDs. | Authorized immutable DAG, conditions, budgets, deadlines | `RUNNING/READY` | Undeclared optional/quorum/fallback behavior is prohibited. |
| **18. Reauthorize and dispatch A2A** | `RUNNING/READY` | Immediately authorize principal/delegation + workflow/run/plan/node + exact agent capability/service/version + purpose/classification, then issue a node-scoped token. | A2A PEP, audience/scope/expiry/nonce/plan-node binding, idempotency/replay | `RUNNING/A2A_TASK` | Any mismatch stops dispatch even if network service identity is allowed. |
| **19. Reauthorize model call** | `RUNNING/A2A_TASK` | Agent validates input; model PEP authorizes provider/model/region/retention/training/data class/context projection. | Approved model envelope, current vendor/service trust, projected context | `RUNNING/REASONING` | Unapproved destination or projection fails closed. |
| **20. Decide whether MCP is needed** | `RUNNING/REASONING` | DynamicMCPClient requests a declared capability, never an endpoint/tool name from model output. | Authorized MCP capability envelope | `MCP_REQUESTED` or `AGENT_OUTPUT_CANDIDATE` | Capability outside manifest requires a new plan revision or fail. |
| **21. Reauthorize MCP discovery disclosure** | `MCP_REQUESTED` | Authorize requested capability and which compatible service metadata may be disclosed. | MCP discovery PEP, purpose/classification/plan/node | `MCP_DISCOVERY_AUTHORIZED` | Deny reveals no unauthorized service metadata. |
| **22. Reauthorize listTools and schemas** | `MCP_DISCOVERY_AUTHORIZED` | Resolve exact service and authorize visible tools and schemas independently. | Service identity/trust/health/region/version and schema-disclosure policy | `MCP_TOOL_VISIBLE` | No unauthorized name/schema is returned. |
| **23. Reauthorize exact MCP call and OBO** | `MCP_TOOL_VISIBLE` | Validate arguments; authorize service + tool + operation + arguments + read/write risk + purpose; require HITL for high-risk write; exchange tool-scoped OBO token. | Audience/scope/expiry/nonce/plan-node-tool binding; user+tenant context | `MCP_RESULT_RECEIVED` | Denial, replay, token, source RLS, or HITL failure means no call. |
| **24. Make tool result safe** | `MCP_RESULT_RECEIVED` | Validate, minimize, redact/tokenize, classify, and attach provenance before agent context. | Tool result schema, field projection, provenance, cache/telemetry policy | `MCP_RESULT_VALIDATED` | Invalid/overbroad/unlabeled result is quarantined. |
| **25. Produce typed agent artifact** | `AGENT_OUTPUT_CANDIDATE` | Parse/validate, bounded-repair, project, persist, and hash immutable output. | Output/artifact schemas, lineage, sensitivity, citations, retention | `ARTIFACT_VALIDATED` | No accepted artifact means no dependency completion. |
| **26. Reauthorize artifact binding/transfer** | `ARTIFACT_VALIDATED` | Authorize every projected field for the destination agent capability, purpose, trust, and classification. | Artifact/binding PEP, source hash/schema, field projection hash | `BINDING_AUTHORIZED` | Optional field removal only if schema/policy/report permit; otherwise fail. |
| **27. Update dependency barrier** | `BINDING_AUTHORIZED` | Count only accepted artifacts; open barriers only when declared required dependencies exist. | `depends_on`, conditions, optional/quorum rules, checkpoint schema | `WAITING/BARRIER` or `READY_SET` | Task success alone never decrements dependency counts. |
| **28. Bind and dispatch next node** | `READY_SET` | Build complete downstream schema from declared permitted fields; repeat stages 17-28. | Deterministic bindings/transforms plus new A2A use-time authorization | `RUNNING/NEXT_NODE` or `TERMINAL_COMPLETE` | Unknown/missing/ambiguous/forbidden fields fail before dispatch. |
| **29. Build canonical report** | `TERMINAL_COMPLETE` | Deterministically bind terminal artifacts, citations, run, quality, policy, and HITL facts; validate one canonical object. | Report schema, authorized artifact reads, explicit partial status | `REPORT_VALIDATED` | Missing required facts or invalid report stops release. |
| **30. Reauthorize report disclosure and rendering** | `REPORT_VALIDATED` | Authorize fields, renderer/template, purpose, recipient class, destination/channel, report hash, and required HITL; render without changing facts. | Report/disclosure PEP, current policy/epoch, reviewer authority | `RENDERED_AUTHORIZED` | Denied disclosure produces no render/release; narrower report only if modeled. |
| **31. Save, audit, and observe** | `RENDERED_AUTHORIZED` | Persist checkpoint, decision IDs/reason codes, refs/hashes/versions, and payload-free telemetry. | WORM audit, retention/deletion/legal hold, no raw PHI/secrets/tokens | `AUDITED` | Mandatory audit/checkpoint failure stops disclosure. |
| **32. Reauthorize delivery/download and return** | `AUDITED` | Reauthorize current recipient, destination, channel, disclosed fields, and each download action; return encrypted report/citations. | Report-hash-bound scoped token, current session/relationship/consent/epoch | `COMPLETED` | Change/expiry/revocation becomes failed/cancelled/expired with no disclosure. |

### Run state machine

```text
RECEIVED
  -> PRINCIPAL_RESOLVED
  -> WORKFLOW_ELIGIBLE
  -> CLASSIFIED
  -> WORKFLOW_SELECTED
  -> CONTRACTS_VALIDATED
  -> RAG_POLICY_RESOLVED
  -> AUTHORIZATION_MANIFEST_BUILT
  -> AUTHORIZATION_PREFLIGHT
  -> AUTHORIZED_GRAPH
  -> AUTHORIZED_PLAN
  -> RAG_QUERY_AUTHORIZED
  -> RAG_READY
  -> RUNNING
  -> WAITING/BARRIER
  -> RUNNING              # repeat for the next ready set
  -> REPORT_VALIDATED
  -> HITL                 # optional and policy-bound
  -> RENDERED_AUTHORIZED
  -> AUDITED
  -> COMPLETED

Any permitted transition may instead produce:
  FAILED | CANCELLED | EXPIRED
```

`WAITING/BARRIER` is not a failure. It means a downstream node cannot start until all declared dependencies have accepted typed artifacts. `HITL` is also not blanket authority: a reviewer can make only the decision or schema-bounded correction declared by the workflow and policy.

### Registry and state-store lookup inventory

| Lookup/store | Why it is consulted | What it returns | What it must not return or decide |
| --- | --- | --- | --- |
| **Workflow Catalog** | Map typed intent to approved workflow candidates | Signed active workflow IDs/versions, eligibility, capability and contract references | Runtime payloads, model-selected endpoints, credentials, or implicit privilege |
| **Schema Registry** | Prove workflow, A2A, MCP result, artifact, ContextPack, citation, and report types | Immutable schema versions, classifications, compatibility, lifecycle, approved adapter refs | PHI, prompt examples, secrets, artifacts, or business results |
| **Policy / Relationship / Attribute Stores** | Supply current PDP inputs for eligibility, preflight, and use-time decisions | Signed/versioned policy, relationships, consent, purpose, device/session, service trust, revocation epoch | Raw bearer tokens, implicit allow, model-generated authority, or cross-tenant attributes |
| **Authorization Manifest / Decision Store** | Prove whole-graph reachability and retain privacy-safe decision evidence | Manifest/plan/policy hashes, decision IDs/reason codes, envelopes, prune/fallback sets, expiry | Raw PHI, secrets, tokens, source content, or report bodies |
| **RAG policy / ACL / membership / indexes** | Determine permitted modes, scopes, sources, and evidence | Effective policy, eligible namespaces, ACL-filtered hit refs, scores, provenance, revocation epoch | Forbidden documents, cross-tenant rows, or preference-based authorization |
| **A2A Agent Registry** | Resolve a workflow capability to an agent service | Signed Agent Card, service/endpoint ref, versions, schemas, trust, health, capacity | Workflow topology, MCP selection, or business payloads |
| **MCP Service Registry** | Resolve a requested tool capability | Service/tool metadata, versions, transport, exact scopes, schemas, side effects, trust, health | Private source data, bearer tokens, workflow choice, or agent topology |
| **Artifact Store** | Persist and later bind only accepted typed outputs | Immutable artifact ID/hash, body/reference, schema, producer, policy, provenance, citations, retention | Mutable history, unvalidated output, implicit downstream permission |
| **Report Template Registry** | Resolve the presentation contract after canonical validation | Signed compatible disclosure-aware renderer/template version | New facts, agent/tool execution, canonical repair, or access authority |

The stores may share physical infrastructure, but their logical authorization, lifecycle, metadata, ownership, and audit contracts remain separate.

### Generic A + B -> C fan-in

```text
ready_set = {A, B}

A typed task -> Agent A -> validate/project/persist -> artifact-A
B typed task -> Agent B -> validate/project/persist -> artifact-B

barrier(C) requires accepted artifact-A AND accepted artifact-B
  -> Input Binding Engine selects permitted fields:
       workflow.subject_ref
       artifact-A.findings
       artifact-B.risks
       ContextPack.citation_refs
  -> validate complete C input schema
  -> dispatch typed C A2A task
```

A and B are generic labels and may run in parallel. C does not receive all of A's state, all of B's prose, or a concatenated conversation. It receives exactly the fields declared by versioned bindings and permitted by field policy. The barrier remains closed if either task merely reports "done" without producing an accepted, persisted, hash-verified artifact.

### Hierarchical RAG scope and fusion example

Assume the symbolic principal has:

- personal namespace `personal://principal-symbolic`;
- eligible group `group://blue`;
- organization namespace `org://approved`;
- mandatory authoritative source `source://org-policy`;
- effective mode `hierarchical_fusion`.

The effective security decision is the intersection of organization baseline, applicable group overlays, user overlay, current membership, ACL, consent, purpose, classification, residency, freshness, and required-source policy. The most restrictive applicable rule wins. Retrieval may then search the three eligible namespaces in parallel with separate quotas:

```text
personal hits:     p1, p2        quota 2
group-blue hits:   g1, g2        quota 2
organization hits: o1, o2, o3    quota 3; o1 is mandatory authority

threshold -> ACL recheck -> dedupe -> conflict detection
  -> authority/freshness/risk rerank
  -> bounded user > group > organization preference only among otherwise eligible evidence
  -> enforce organization evidence floor
  -> ContextPack(ctx-symbolic) + CitationManifest(cit-symbolic)
```

If `o1` is unavailable, stale, or conflicts with lower-scope evidence, the platform does not silently prefer personal content. It performs bounded retrieval/replan, asks for permitted human clarification, returns an explicitly schema-valid insufficient-evidence/partial result when policy allows, or fails.

### A2A and MCP are different

| Concept | Plain meaning | Selects what | Carries/returns | Key prohibition |
| --- | --- | --- | --- | --- |
| **A2A** | An agent asks another agent to perform a reasoning task. | The Workflow Plane resolves an agent capability through Agent Cards and the A2A Agent Registry. | Typed task envelope, minimal validated input/reference, status, typed artifact/error | The prompt/model cannot pick a privileged agent endpoint; agents cannot rely on fixed neighbors. |
| **MCP** | An agent uses an authorized tool. | The agent requests a capability; `DynamicMCPClient` and the MCP registry/policy gateway resolve service/tool/schema/scopes. | Typed tool call and minimized validated result with provenance | The model cannot supply endpoint, service, scope, credential, tenant, or arbitrary network destination. |

Every agent has a generic `DynamicMCPClient`, but MCP use remains optional per reasoning step. The workflow declares agent capability nodes and typed dependencies; it does not wire a node directly to an MCP endpoint. MCP plugins contain connector logic, configuration, mappings, and schemas only. Private data remains in external sources and is queried just in time under delegated identity and source-side RLS/ACL.

### Typed artifact handoff

An output is not a dependency artifact merely because an agent, model, MCP service, or retrieval system returned it. The Runtime Contract Gateway performs this sequence:

```text
raw structured output
  -> parse
  -> exact output-schema validation
  -> bounded deterministic repair/retry if allowed
  -> field classification
  -> purpose/consent/minimum-necessary projection
  -> provenance/citation/integrity checks
  -> encrypted tenant-isolated persistence
  -> content hash verification
  -> immutable artifact ID
  -> dependency acceptance
```

The A2A control envelope, progress/status, registry, telemetry, and DLQ contain references and privacy-safe metadata rather than unrestricted artifact bodies. A correction creates a new artifact with lineage; it never mutates the original.

### Canonical report and rendering remain separate

The Canonical Report Aggregator uses deterministic versioned bindings to construct exactly one machine-readable object from accepted terminal artifacts, CitationManifest, run metadata, quality/policy/HITL decisions, and explicit full/partial/degraded status. That object must validate against the pinned report schema before release processing.

Only after validation and any required disclosure/HITL decision does a renderer run:

```text
terminal artifacts + citations + run decisions
  -> deterministic bindings
  -> canonical report object
  -> report schema validation
  -> quality/disclosure/HITL
  -> signed disclosure-aware renderer
  -> JSON | HTML | PDF | dashboard | event
```

All rendered channels reference the same canonical report hash. A renderer can change layout, typography, pagination, localization, and permitted disclosure projection; it cannot add, remove, repair, reinterpret, or call agents/tools to change canonical facts.

### Complete symbolic illustrative run

1. A symbolic user submits: "Create an approved evidence summary for subject-ref-S using the allowed sources and provide citations." The optional input is `upload://symbolic-1`; it contains no real record in this design example.
2. Identity and policy checks establish `tenant-symbolic`, role `requester`, group `group-blue`, purpose `approved-analysis`, current consent, and a compliant session. The run receives `run-104` and `corr-104`.
3. Prompt Understanding validates intent `report_request`, risk `standard`, classification `internal`, and capabilities `evidence.summarize`, `risk.evaluate`, and `analysis.synthesize`.
4. The Workflow Catalog selects `workflow://symbolic-report/4.2.0`. The compiler resolves the workflow input, A/B/C input/output, ContextPack, citation, error, artifact, and report schemas. It proves the DAG and bindings and rejects prompt-supplied endpoint text.
5. The effective RAG mode is `hierarchical_fusion`. Current policy permits personal, `group-blue`, and organization namespaces and requires `source://org-policy`. ACL-filtered searches return symbolic hit references. Dedupe/rerank selects seven citations, including the mandatory organization source, and persists `ctx-9` and `cit-9`.
6. The platform freezes `plan_hash=sha256:plan-symbolic-104`, including all workflow/schema/RAG/index/policy/model/budget/capability pins. The A2A Agent Registry resolves symbolic agent services A, B, and C by capability.
7. The scheduler sets `ready_set={A,B}`. The Input Binding Engine creates separate schema-valid minimal A/B inputs. Authenticated A2A tasks `A-1` and `B-1` run in parallel while C waits.
8. Agent A needs `approved-record.lookup`. Its `DynamicMCPClient` queries the MCP Service Registry, which selects `mcp-records@2.4/getApprovedSummary@2`. An exact-scope OBO token allows a just-in-time source query under tenant/user RLS. The minimized validated result carries provenance `source://symbolic-records/query-7`; no private source body is stored in registry or telemetry.
9. Agent A's structured output needs one bounded repair, then validates, projects, persists, and hashes as `art-A-17/sha256:a17-symbolic`. Agent B validates directly as `art-B-22/sha256:b22-symbolic`.
10. Only those accepted artifact IDs satisfy C's A+B barrier. The binding engine selects permitted fields `art-A-17.findings`, `art-B-22.risks`, `ctx-9`, and `cit-9`; the complete C input validates and dispatches task `C-1`.
11. C produces terminal artifact `art-C-31/sha256:c31-symbolic`. The Canonical Report Aggregator binds A/B/C terminal facts, citations, versions, quality, policy, and HITL metadata into `canonical-report-104/sha256:report-symbolic`, which validates against `schema://report/symbolic/3.0.0`.
12. The disclosure gate determines that symbolic review is required. An authorized reviewer approves the exact canonical hash. `secure-html@5.4.1` renders an HTML view without changing facts.
13. The final checkpoint and WORM audit record all symbolic refs, hashes, versions, decisions, timing, quality, and status. Telemetry contains no prompt, artifact body, tool result, or raw PHI.
14. A final authorization check returns the encrypted report and seven citations to the symbolic user. The run becomes `COMPLETED`; retention, deletion, consent, membership, and download authorization controls remain active.

### Layman glossary

| Term | Plain-language meaning |
| --- | --- |
| **Prompt** | What the user asks, plus references to allowed inputs. It is a request, not an authorization grant. |
| **Workflow** | The approved versioned recipe describing tasks, dependencies, decisions, budgets, and final report rules. |
| **Schema** | A contract that says which fields and data types are valid and how they may be classified. |
| **RAG** | Retrieval-Augmented Generation: searching approved knowledge to ground reasoning and citations. |
| **Agent** | A specialized reasoning service selected by capability, contract, trust, health, and policy. |
| **A2A** | Agent-to-Agent: one service sends another a typed, authenticated task. |
| **MCP** | Model Context Protocol: an agent discovers and invokes an authorized tool capability through governed mediation. |
| **Artifact** | A validated, policy-projected, immutable saved output with a schema, ID, hash, and provenance. |
| **Barrier** | A scheduling wait point that opens only after all declared required dependency artifacts are accepted. |
| **Canonical Report** | The single schema-valid machine-readable source of final facts used by every renderer. |
| **HITL** | Human-in-the-loop clarification, correction, or approval that is explicitly declared, authorized, bounded, and audited. |

This flow is compliance-enabling, not certification, guaranteed compliance, or legal advice. A deployment still requires organizational risk analysis, legal/privacy review, approved policies and procedures, workforce controls, vendor due diligence and BAAs where applicable, training, incident and contingency processes, and ongoing evidence.

### Seven-plane responsibility matrix

| Plane | Purpose | Owns | Consumes | Produces | Scaling and security boundary |
| --- | --- | --- | --- | --- | --- |
| **1. User Plane** | Experience and human control surface | Web/mobile/chat/API/CLI entry points; authentication/session/tenant context; prompt and file/source ingestion; personal RAG management; role-based group submission/approval; organization RAG administration; HITL; notifications/run status; final result/citations | Effective channel/config policy, identity, source-governance decisions, workflow status, citations, alerts | Authenticated typed requests, source submissions, clarification/approval/correction decisions, feedback, result interactions | Scales by channel, tenant, and session. It cannot invent identity, scopes, workflow privilege, agent/MCP endpoints, or bypass ingestion/release policy. |
| **2. Workflow Plane** | Convert intent into an immutable execution plan and release decision | Typed prompt understanding; workflow retrieval/scoring, clarification, constrained composition; versioned Workflow Catalog; validator/compiler/policy approval; hierarchical RAG policy resolution; federated retrieval plan; immutable plan/checkpoint; DAG scheduler, ready sets, fan-out/fan-in barriers, bounded replan; aggregation/release | Typed user request, effective config hash, identity/purpose/classification, workflow versions, Agent Cards, MCP capability metadata, health, policy, evidence/provenance | Immutable execution plan, A2A tasks, ready/running/completed sets, checkpoints, release decisions, final classified result | Scales routers, compilers, schedulers, and runs independently. A plan cannot widen authority; compilation fails closed on invalid graph, policy, contract, budget, residency, or capability availability. |
| **3. Agent Plane** | Distributed reasoning and collaboration | Generic N-agent service mesh/pool; Agent Registry/Agent Cards and capability resolution; independent A2A microservices; workload identity; model gateway use; prompts; agent-local bounded state; A2A tasks/messages/status/artifacts; compatible fallback | Immutable plan node, workflow context, citation manifest, policy labels, Agent Card resolution, workload identity, model policy | Typed minimal artifacts, status, provenance handles, tool-capability requests, privacy-safe telemetry | Each agent capability scales and versions independently. Agents have no fixed neighbor, topology code, or hard-coded MCP endpoint; every agent uses `DynamicMCPClient`. |
| **4. MCP Plane** | Reusable tools and private-data capabilities for any authorized agent | MCP Service Registry and policy/discovery gateway; capability negotiation/`listTools`; independent MCP service pool; plugin hosts/connectors; tool schemas/scopes; JIT delegated identity/OBO; minimization/redaction/labels/provenance; health-aware discovery, circuits, compatible alternate service | Agent capability request, workload and delegated identity, tenant/purpose/classification, tool policy, service health | Minimized typed tool result, provenance, audit record, health/status, deterministic error | Services scale/version independently by capability. Plugins contain connector logic/configuration/schema only, never user private data; external systems enforce tenant partition and RLS. |
| **5. Infrastructure Plane** | Shared runtime foundations | Compute/orchestration, service mesh/network/API gateway/load balancing/autoscaling; identity provider/workload identity/KMS/secrets/certificates; durable state/checkpoint/plan/catalog stores; event bus/queues/DLQ/cache; ACL-aware vector/search with user/group/org namespaces; object/provenance storage and invalidation; model/embedding/reranking infrastructure; multi-region/residency/backup/DR | Desired capacity/config, workload requests, identity and data policies, SRE actions | Runtime capacity, identity/tokens, durable records, events, retrieved evidence handles, model results, health | Scales per service, region, tenant, queue, index, and model. Network, encryption, residency, tenant isolation, ACL, availability, and disaster-recovery controls are enforced here without embedding business workflow topology. |
| **6. Configuration Plane** | Cross-cutting desired state and governance | Portals/APIs/GitOps/policy-as-code; hierarchical resolver with organization baseline -> group overlays -> user overlays; workflow definitions/rollouts; Agent Cards; MCP service/tool metadata/scopes; model/RAG policies; prompts; budgets; flags; retention/residency; validation/approval/versioning/canary/rollback; effective config snapshot/hash | Reviewed admin, group publisher, user, evaluation, and SRE change proposals; environment/region constraints; secret references | Signed immutable configuration versions, effective snapshot/hash per run, publication/invalidation events, rollback target | Scales reads separately from authoring and resolution. User manages personal RAG; members submit group RAG but owner/`rag.publisher` approves; only admin manages organization RAG. Carries no private user data or secrets and references secrets by ID. |
| **7. Observability & SRE Plane** | Cross-cutting actual state and operations | OpenTelemetry traces/logs/metrics; A2A/MCP correlation and workflow/plan/version tags; latency/availability/errors/saturation; RAG and LLM quality/safety/drift; token/cost/FinOps; SLOs/error budgets; alerts/dashboards/incidents/runbooks/on-call; registry health/capacity/rate limits/circuits/retries; audit/compliance; replay/synthetic/canary/shadow and rollback recommendations | Privacy-safe telemetry, health, audit, quality, capacity, cost, config/workflow/plan/model/RAG tags from every plane | Alerts, error-budget decisions, scale/throttle/failover/rollback recommendations or actions, human escalation, governed change proposals | Tenant-safe telemetry and operations scale independently of business services. Raw private data, secrets, unrestricted prompts, and high-cardinality private identifiers are prohibited. SRE actions remain policy-bounded and audited. |

### Control plane, runtime/data planes, desired state, and actual state

- The **Configuration Plane** is the platform control plane for governed desired state. It says what versions, policies, capabilities, budgets, rollouts, retention, and residency should apply. It does not execute business tasks.
- The **User, Workflow, Agent, and MCP Planes** are request/runtime planes. The Workflow Plane has a compile-time control function, but each run executes only an immutable approved plan rather than mutable configuration.
- The **Infrastructure Plane** is the shared runtime and data foundation. It supplies identity, compute, messaging, durable state, model, retrieval, storage, and resilience services without owning workflow-specific business decisions.
- The **Observability & SRE Plane** is the actual-state plane. It records what occurred, measures health/quality/cost, compares actual state to SLOs and desired state, and proposes or performs only authorized bounded operations.
- A run binds `config_hash`, `workflow_id/version`, `plan_hash`, policy/model/index versions, capability resolutions, identity/purpose/scopes, and invalidation epochs. Mid-run desired-state changes do not silently mutate that run; policy revocation can pause it and require revalidation or a new approved plan revision.

Desired state and actual state are deliberately separate. Evaluation or telemetry may create a `ChangeProposal`, but only Configuration Plane validation, approval, versioning, and publication can create new desired state. This prevents user feedback, model output, monitoring, or SRE automation from directly rewriting prompts, workflows, RAG policy, Agent Cards, MCP scopes, or production rollout.

### Top-level cross-plane flows

#### Request and result flow

```text
User Plane
  authenticated prompt / files / tenant context / HITL
    -> Workflow Plane
       typed intent -> select/compose -> validate -> resolve RAG -> immutable plan
         -> Agent Plane
            capability-resolved parallel A2A tasks and bounded reasoning
              -> MCP Plane
                 dynamic discovery -> negotiate/listTools -> selected service
                   -> Infrastructure Plane / external systems
                      workload + delegated identity, tenant RLS, models, indexes, stores

Infrastructure/MCP minimized result + provenance
  -> Agent typed artifacts
    -> Workflow barriers / aggregation / quality / policy / HITL / release
      -> User final result + citations + status
```

Every downward request/action and upward result/provenance transition is authenticated, authorized, schema-validated, classified, correlated, deadline-bounded, and audited. Security, identity, privacy, governance, policy, and FinOps controls guard each boundary.

#### Configuration publication flow

```text
admin organization baseline
  + approved group overlays
  + user personal overlays
  + environment/region overlays
  + workflow/agent/MCP/model/prompt/budget/retention/residency versions
    -> validate -> policy simulation -> approve -> version -> canary
      -> hierarchical resolution; most restrictive security wins
        -> signed EffectiveConfigSnapshot + config_hash
          -> User | Workflow | Agent | MCP | Infrastructure | Observability & SRE
```

Configuration is published laterally and downward through versioned APIs, watch streams, or events. Consumers acknowledge the version/hash, retain a last-known-good non-expired snapshot only where policy permits, and fail closed when a mandatory security configuration cannot be proven current.

#### Telemetry, SRE, and governed feedback flow

```text
every plane
  -> privacy-safe traces + logs + metrics + health + audit + quality + cost
    -> Observability & SRE
       compare with SLO/error budget and desired-state versions
         -> scale | throttle | circuit | compatible failover | rollback | human escalation
           -> affected runtime/infrastructure plane

user correction + HITL outcome + evaluation + incident recommendation
  -> reviewed ChangeProposal
    -> Configuration Plane validation/approval/versioning/canary
      -> new immutable desired-state version (never direct mutation)
```

RAG quality includes retrieval coverage, groundedness, citation correctness, and scope hit counts without content leakage. Operations include replay, synthetic tests, canary and shadow traffic, incident response, rollback recommendations, and auditable on-call action.

### Plane ownership, APIs, and contracts

Each plane should have a platform owner with an explicit service-level boundary. Product/domain teams publish versioned workflow, prompt, capability, and source configuration through platform contracts; they do not fork scheduler, identity, registry, telemetry, or connector security mechanisms.

| Producer -> consumer | Owning teams | Suggested API/contract | Required invariants |
| --- | --- | --- | --- |
| User -> Workflow | Experience/API team -> Workflow platform team | `RunRequest`, `SourceSubmission`, `HITLDecision`, `GET /runs/{run_id}`, notification stream | Validated tenant/session; typed purpose/classification; idempotency; file handles rather than ungoverned payload copies |
| Configuration -> every plane | Configuration/governance team -> all plane owners | `EffectiveConfigSnapshot`, `config_hash`, signed version API, watch/event stream, acknowledgement and invalidation event | Hierarchical merge trace; approvals; environment/region overlay; no secrets/private data; monotonic version; expiry and rollback target |
| Workflow -> Agent | Workflow runtime team -> Agent platform/capability teams | A2A Agent Card discovery plus `Task`, `TaskStatus`, `Artifact`, cancel/resume and heartbeat contracts | Capability/schema/version/trust/tenant/region/health resolution; task-plan binding; idempotency; deadline; minimal artifacts |
| Agent -> MCP | Agent platform -> MCP platform/capability teams | MCP discovery, capability negotiation/`listTools`, tool invocation/result/error contracts | Workload + delegated identity; exact scopes; purpose/classification; schema; side-effect/HITL declaration; no model-supplied endpoint |
| MCP -> Infrastructure/external source | MCP capability team -> Infrastructure/data-source owner | OBO token exchange, connector request, source query/RLS contract, provenance envelope | JIT least privilege; tenant binding; server-side RLS; minimization/redaction; residency; no connector persistence |
| Workflow -> retrieval infrastructure | Workflow/RAG platform -> Search/model infrastructure | `FederatedRetrievalPlan`, ACL-filtered query, evidence/provenance manifest, invalidation contract | Organization/group/user policy versions; all eligible groups; in-query ACL; quotas; required authority; citation and cache scope |
| Every plane -> Observability & SRE | Each plane owner -> SRE/telemetry team | OTLP traces/logs/metrics, health/heartbeat, audit event, evaluation event | Shared trace/A2A/MCP correlation IDs; workflow/plan/config/model/RAG tags; privacy allowlist; no raw private data |
| Observability & SRE -> runtime/configuration | SRE team -> plane owner/configuration team | `SREAction` and `ChangeProposal` with reason, scope, expiry, approval class, rollback target | Policy-bounded scale/throttle/failover; direct emergency actions audited; persistent changes require configuration review/versioning |

### Prohibited coupling

- User clients cannot select privileged workflow versions, Agent Cards, MCP services/tools, model endpoints, scopes, or data namespaces.
- Workflow definitions reference capabilities and contracts, never A2A or MCP endpoints. Scheduler code contains no workflow-specific topology branches.
- Agents cannot depend on fixed neighboring agents, bypass A2A task contracts, query databases directly, or hard-code MCP tools/endpoints.
- MCP services cannot choose workflows or agents. Plugins contain connector logic/config/schema only and cannot store private user data.
- Infrastructure services cannot infer business authorization from prompt text or replace Workflow Plane policy/release decisions.
- Configuration cannot carry bearer tokens, secret values, prompts, private records, task artifacts, or MCP results. It references managed secrets by ID.
- Observability cannot become a private-data side channel or directly mutate durable product configuration. Telemetry is privacy-safe; persistent recommendations become reviewed change proposals.
- SRE fallback, failover, retry, throttling, and rollback cannot weaken identity, tenant, purpose, classification, RLS, residency, provenance, schema, or audit requirements.

## Current example versus proposed framework

| Area | Current Python example | Proposed conceptual framework |
| --- | --- | --- |
| Topology | One known four-agent fan-out/fan-in graph | Runtime-selected versioned workflow data defining an arbitrary DAG |
| Agent deployment | Four in-process nodes | N independent, versioned, horizontally scalable A2A microservices |
| Workflow choice | Caller enters the example graph | Prompt Understanding and Workflow Router select an eligible workflow version |
| Dispatch | Local graph functions | Capability resolution followed by authenticated, idempotent A2A tasks |
| Agent discovery | Local references | Separate Agent Registry/Agent Cards filtered by capability, schema, version, policy, trust, tenant, region, health, and capacity |
| MCP access | Example-specific associations | The same `DynamicMCPClient` in every agent; runtime many-to-many discovery through policy |
| Hierarchical RAG | No USER/GROUP/ORGANIZATION policy resolver or federated retrieval plan | Workflow-selected mode, organization-first security merge, bounded user-first retrieval preference, in-query ACLs, governed ingestion, citations, and immutable retrieval plan |
| Private data | Example tool data | JIT external access with delegated identity, RLS, minimization, redaction, provenance, and no raw-data telemetry |
| Workflow data flow | In-process example state/messages | Dependencies control readiness; versioned schemas, explicit bindings, and field policy exclusively control downstream inputs |
| Edge output | Example node return values | Raw structured candidates -> validate/repair -> classify/project -> encrypted immutable artifact -> accepted dependency |
| RAG context | Example-specific context | Typed `CitationManifest`/`ContextPack` with chunk references, scores, scope, authority, freshness, classification, policy version, and provenance |
| Final output | Example aggregation | One canonical schema-validated report object rendered independently as JSON/HTML/PDF/dashboard/event without changing facts |
| Resume | Example state | Immutable compiled plan, policy snapshot, checkpoint, task attempts, and audit chain |
| Extension | Change graph code | Publish capabilities/cards/services and workflow data; framework topology code does not change |
| Security implementation status | Existing example controls only | Proposed compliance-enabling safeguards described below; **no Python changes are made by this conceptual design** |

## Security and HIPAA Safeguards

### Disclaimer and authoritative foundation

This chapter describes a **compliance-enabling architecture**, not certification, guaranteed compliance, an exhaustive control mapping, or legal advice. No diagram, product feature, or technical control alone makes a deployment HIPAA compliant. Each regulated entity and business associate must determine the requirements that apply to its role and use case, perform and document its own risk analysis, select reasonable and appropriate safeguards, map implemented controls to applicable requirements, and retain evidence of risk-based decisions.

The authoritative foundation is [NIST SP 800-66 Rev. 2, Implementing the Health Insurance Portability and Accountability Act (HIPAA) Security Rule: A Cybersecurity Resource Guide](https://csrc.nist.gov/pubs/sp/800/66/r2/final). Consistent with that guide, the architecture protects ePHI created, received, maintained, or transmitted by regulated entities against reasonably anticipated threats and hazards and reasonably anticipated impermissible uses or disclosures. The design also uses well-established [HHS HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html) concepts: risk analysis and risk management; administrative, physical, and technical safeguards; assigned security responsibility; workforce access controls and training; access control, audit control, integrity, authentication, and transmission security; incident procedures; contingency planning; periodic evaluation; and business-associate arrangements.

The architecture still requires organizational risk analysis, approved policies and procedures, legal and privacy review, workforce access lifecycle controls, sanctions, vendor due diligence, BAAs where applicable, training, incident and breach-assessment procedures, contingency exercises, periodic evaluations, and ongoing evidence. HHS and NIST guidance must be interpreted for the organization's facts, applicable law, contracts, risk tolerance, and deployment model.

### Security architecture principles

1. **PHI-aware zero trust at every boundary.** Authenticate explicit user and workload identities; authorize each route, API, workflow node, A2A task, MCP operation, retrieval query, model call, and release. Use least privilege, deny by default, short-lived audience-bound tokens, mTLS/service mesh, purpose-of-use, tenant/patient/resource context, and continuous authorization.
2. **One UX platform, distinct workspaces.** Use a shared UX shell with isolated User Workspace, Group Workspace, Admin Console, and Operations/SRE Console routes. Server-issued capabilities determine navigation. Frontend hiding is never authorization; every route and API has a backend policy enforcement point.
3. **Layered authorization.** Combine RBAC with ABAC and relationship/resource checks. Role grants define possible actions; attributes and current relationships narrow them for tenant, group, patient/resource, purpose, classification, consent, device, region, time, and risk. Sensitive configuration uses separation of duties and explicit approval.
4. **Minimum necessary before context construction.** Determine the smallest permitted fields, rows/documents, time range, volume, and precision before retrieval and again before A2A, MCP, RAG, model, output, cache, and telemetry boundaries.
5. **Classified trust zones.** Apply `Public`, `Internal`, `Sensitive`, and `ePHI` labels. ePHI is processed only inside the regulated boundary by approved identities, workloads, stores, providers, regions, and network paths. A service that creates, receives, maintains, or transmits ePHI is evaluated inside the vendor-risk and BAA boundary.
6. **Immutable decisions and integrity.** Bind each run to signed/versioned configuration, policy and consent references, `workflow_id`, `plan_hash`, model/index/agent/MCP versions, approvals, integrity/provenance hashes, and invalidation epochs.
7. **Private by default.** No raw PHI appears in logs, traces, metrics, shared caches, A2A status messages, Agent Cards, MCP registry metadata, DLQ payloads, or configuration. Prefer scoped references and provenance handles to copied content.
8. **Approved AI destinations only.** The model gateway enforces provider approval, contract/BAA status where applicable, no-training/no-retention settings, region/residency, private connectivity, context/token limits, model/prompt versions, and PHI policy. No unapproved destination receives PHI.
9. **Human accountability.** High-impact clinical, financial, and administrative actions and sensitive disclosures require HITL according to policy. The platform is not an autonomous clinical decision maker; final clinical decisions remain with qualified humans.
10. **Secure availability.** Multi-region deployment is used only where policy and residency permit. Degradation, retry, failover, and recovery never weaken identity, authorization, privacy, integrity, residency, or audit. Sensitive work fails closed if authoritative policy, identity, audit, KMS, required source, or approved vendor dependencies cannot be proven.

### Workspaces and capability enforcement

| Experience | Intended actors | Server-issued capabilities | Mandatory enforcement |
| --- | --- | --- | --- |
| **User Workspace** | Authenticated end users | Run approved workflows; manage personal sources; view authorized results/citations; provide consent, clarification, and HITL input | User/tenant/resource relationship, purpose, consent, classification, session/device, workflow and data policy |
| **Group Workspace** | Group contributors, publishers, and owners | Submit to staging; review; publish/rollback only with publisher/owner authority | Current membership; group resource relationship; separation between submit and publish where required; content governance |
| **Admin Console** | RAG, workflow, agent/MCP, security/privacy administrators and auditors | Govern organization sources, workflows, services, model policy, roles, evidence, and reviews | Strong MFA/device posture; PAM/JIT; SoD; two-person approval for sensitive changes; immutable audit; no routine SRE access |
| **Operations/SRE Console** | SRE/operator and authorized incident responders | Observe health; execute scoped runbooks; disable/fail over services; contain incidents | Tenant/environment scope; JIT elevation; reason and expiry; command allowlist; no raw PHI by default; enhanced audit and review |

The shared shell may deploy as one frontend, but authorization remains at backend PEPs. A client cannot create a capability, pass a role, select an unrestricted tenant, or call a privileged API merely because it knows the route.

### RBAC, ABAC, and relationship/resource capability matrix

| Role | Example allowed capabilities | Required ABAC/ReBAC constraints | Explicit limits / approvals |
| --- | --- | --- | --- |
| `user` | Run eligible workflow; read own authorized artifacts; manage personal RAG | Tenant, subject identity, purpose, consent, resource relationship, classification, session/device | Cannot publish group/org content or administer services |
| `group.contributor` | Submit group content to staging; view permitted group runs | Current group membership and group resource relationship | Cannot publish; quarantined content remains ineligible |
| `group.publisher` / owner | Review, approve, publish, deprecate, or roll back group content | Current owner/publisher relationship, group, classification, purpose, environment | SoD may require a different submitter and approver |
| `rag.admin` | Govern organization RAG, sources, ACL models, retention, and index versions | Tenant/environment/region, source ownership, classification, legal hold | Organization publication and destructive lifecycle actions require approval |
| `workflow.admin` | Author, validate, canary, promote, deprecate, and roll back workflows | Tenant/environment, risk tier, approved capabilities/models, change window | Cannot self-approve high-risk production versions |
| `agent_mcp.admin` | Register and operate Agent Cards, MCP services/tools, trust tiers, and allowlists | Service owner, environment, region, attestation, image/version, vendor approval | Cannot grant data authority beyond policy; sensitive registration requires review |
| `security_privacy.admin` | Define security/privacy policy, investigate incidents, approve exceptions, review evidence | Case/tenant scope, purpose, JIT access, device posture | Break-glass/exception access is time-bound and independently reviewed |
| `sre.operator` | Observe and perform approved scale, throttle, disable, isolate, failover, restore, and rollback actions | Tenant/environment/service scope, incident/change reference, JIT expiry | No content access by default; persistent config changes use admin workflow |
| `auditor` | Read immutable configuration, policy, access, change, and evidence records | Audit engagement, tenant, time window, least-privilege fields | Read-only; no secrets, raw PHI, or operational mutation |

RBAC defines the action ceiling. ABAC and relationship/resource checks can only narrow it. Policy evaluation includes current identity, tenant, roles, group and patient/resource relationships, purpose, consent/authorization, action, data classification, requested fields/volume, device/session, location/region, risk, time, service trust, and approval state.

### ePHI request and disclosure flow

```text
sign-in + unique ID + MFA + device/session posture
  -> server capability decision for workspace route and API
  -> purpose + consent/authorization + patient/tenant/resource relationship
  -> classify Public/Internal/Sensitive/ePHI
  -> calculate minimum necessary rows/fields/documents/volume
  -> authorize user eligibility for candidate workflow/version
  -> select/validate workflow and compile contracts/DAG/RAG requirements
  -> build Complete Authorization Manifest for every reachable capability/resource
  -> PDP whole-graph preflight using RBAC + ABAC + ReBAC + capability/data/disclosure
  -> required deny: reject; optional deny: explicit safe prune or reject
  -> freeze Authorized Immutable Execution Plan + manifest/policy/decision hashes
  -> reauthorize exact A2A dispatch; exchange node-scoped audience-bound token
  -> authorize MCP discovery, listTools, and exact call independently at use time
  -> exchange short-lived tool-scoped OBO token; never forward raw user token
  -> execute source-side tenant partition + row/field/document ACL/RLS in query
  -> minimize/redact/tokenize/pseudonymize; attach provenance handles
  -> approved model gateway: provider/contract/BAA/retention/training/region policy
  -> injection, grounding, citation, confidence, safety, and disclosure validation
  -> HITL when sensitive disclosure or high-impact action policy requires it
  -> encrypted response + citations + uncertainty/scope labels
  -> immutable audit event; DLP-redacted telemetry to SIEM/SOAR

Any missing identity, purpose, consent, relationship, current policy, source ACL/RLS,
audit, KMS, approved model/vendor destination, or required HITL decision -> STOP / DENY.
```

The plan holds references and hashes, not bearer tokens or unrestricted ePHI. A revocation, membership change, consent change, source deletion, reclassification, vendor status change, or security policy change invalidates the affected authorization, cache, plan, and checkpoint scope before the next protected action.

### Minimum-necessary algorithm

1. Validate user and workload identity, tenant, route/API capability, session, MFA, and device posture.
2. Normalize the declared purpose-of-use and requested action; reject unsupported, conflicting, or model-invented purposes.
3. Resolve current consent/authorization and patient, tenant, group, or resource relationship from authoritative services.
4. Classify request, source, intermediate artifacts, and expected response; an uncertain classification selects the more restrictive path.
5. Intersect the workflow's declared data contract with RBAC, ABAC, relationship, source ACL, purpose, consent, legal hold, residency, and output policy.
6. Produce a signed `MinimumNecessarySet`: allowed sources, row predicates, document ACLs, fields, time range, volume, precision, transformations, destinations, expiry, and reason.
7. Enforce source predicates inside every database/vector/search query. Post-query filtering cannot be the only authorization control.
8. Minimize again at MCP result, A2A artifact, RAG context, model input, model output, response, cache, and telemetry boundaries. Prefer aggregate, tokenized, pseudonymized, or de-identified output where appropriate.
9. Require a plan-hash-bound HITL decision when policy identifies a sensitive disclosure or high-impact write. Approval cannot widen the precomputed authority.
10. Audit the allow/deny decision, policy and plan versions, field set, transformations, destination, reviewer, and provenance without raw PHI. Re-evaluate on expiry or invalidation.

If the minimum-necessary set is empty, contradictory, unverifiable, or cannot be enforced at the source, the request fails closed.

### Trust zones and vendor/BAA boundary rules

| Boundary | Rule |
| --- | --- |
| Public/Internal zone | May use only destinations approved for that classification; classification can become stricter after inspection |
| Sensitive zone | Requires authenticated private paths, stronger release and logging controls, and tenant-safe storage/caching |
| Regulated ePHI processing boundary | Includes every workload, queue, store, backup, model, agent, MCP service, connector, and telemetry component that creates, receives, maintains, or transmits ePHI |
| Vendor-risk / BAA boundary | Model providers, cloud services, agent/MCP vendors, telemetry vendors, support subprocessors, and backup/DR providers require due diligence, approved contracts, and BAAs where applicable before receiving ePHI |
| Unapproved destination | Egress is denied. DNS/network/service-mesh allowlists, private endpoints, model/MCP gateways, and policy prevent transmission |
| Registry/configuration boundary | Agent Cards and MCP registry metadata contain capability, schema, version, trust tier, health, owner, and endpoint references only; no PHI, bearer token, credential, or secret |
| Support/operations boundary | Content access is disabled by default; exceptional access is purpose-bound, tenant-scoped, JIT, alerted, logged, and reviewed |

Contracts do not replace technical enforcement, and technical enforcement does not replace contracts. Vendor status is a live policy input: expiration, scope mismatch, unapproved subprocessor, region mismatch, or failed evidence can disable routing and invalidate affected plans.

### A2A controls

| Control area | Required design |
| --- | --- |
| Service identity | Signed/attested workload identity; Agent Card pins capability, version, schemas, trust tier, health, owner, tenant/region constraints, and approved image/provenance |
| Task envelope | Minimal purpose-bound context; tenant/resource reference; sensitivity label; policy token/reference; `workflow_id`; `plan_hash`; correlation ID; idempotency key; deadline; expected artifact schema |
| Delegation | Token exchange at boundaries; short-lived audience-bound scopes; never forward a raw user token; replay protection and cancellation |
| Content | Use scoped evidence/provenance handles where possible; no PHI in status/heartbeat messages; artifact fields are allowlisted and minimized |
| Runtime | mTLS/service mesh, egress deny by default, workload sandbox, per-task budgets, schema validation, integrity/provenance hash, bounded retries |
| Release | Scheduler validates task/plan binding, schema, classification, policy reference, provenance, and hash before decrementing dependencies or opening barriers |

### MCP controls

| Control area | Required design |
| --- | --- |
| Registry and discovery | Metadata only; signed service identity; owner, trust tier, health, version, schema, side-effect class, required scopes, region, and vendor approval |
| Authorization | Authorize `discover`, `listTools`, and `call` separately; intersect user/workload authority, purpose, classification, consent, tool allowlist, service trust, and workflow plan |
| Tool safety | Validate input/output schema; classify read versus write and risk; require HITL for high-risk write/action; use replay protection and idempotency |
| Source access | Short-lived OBO token, private endpoint, egress allowlist, tenant partition, source-side ACL/RLS, query limits, timeout, and audit |
| Result | Minimize/redact/tokenize, validate content, attach classification and provenance, and return reference handles when possible |
| Plugin host | Sandbox connectors; secrets by reference from managed secret service; no plugin-stored private data; no arbitrary network egress; signed/SBOM-scanned image |

### RAG controls

| Control area | Required design |
| --- | --- |
| Ingestion | Approved source and owner; consent/authority; quarantine; malware/content validation; DLP and ePHI classification; prompt-injection/content-poisoning scan; ACL; lineage; version |
| Retrieval | Immutable federated plan; current membership/consent; in-query tenant/row/field/document ACL; tombstone and region filters; fair quotas; required authoritative sources |
| Context | Dedupe/fusion/rerank cannot override authority; reserve mandatory source budget; separate retrieved evidence from system instructions; treat evidence as data, never executable instructions |
| Output | Groundedness, citation correctness, conflict and confidence thresholds, disclosure policy, de-identification validation where used, HITL as required |
| Cache | Disabled for private results by default; otherwise tenant/user/purpose/workflow/policy/index/field-set scoped, encrypted, short lived, and event-invalidated; never cross-user |
| Lifecycle | Membership, consent, source deletion, reclassification, ACL, index, model, or policy change propagates invalidation to chunks, embeddings, caches, plans, checkpoints, and citations |

### Model gateway and AI-specific controls

| Control area | Required design |
| --- | --- |
| Provider admission | Approved provider/model and region; security/privacy/legal/vendor review; BAA and data-processing terms where applicable; approved subprocessors |
| Data use | No training on submitted data; no retention or the shortest approved retention; abuse monitoring configured consistently with policy; tenant isolation |
| Input | Minimum necessary context; system instructions separated from user/retrieved data; injection scanning; content limits; secrets removed; allowed modalities only |
| Output | Schema, groundedness, citation, safety, bias, confidence, policy, PHI disclosure, and high-impact action validation before release |
| Human role | HITL for policy-defined sensitive disclosures and high-impact clinical/financial/admin actions; final clinical decisions remain with qualified humans |
| Lifecycle | Version and sign model, prompt, RAG policy, evaluation set, gateway rule, and release decision; canary, rollback, safety/bias/drift evaluation, and change approval |

Evaluation includes prompt-injection resistance, content-poisoning resistance, PHI memorization/leakage tests, unauthorized tool-use attempts, citation/groundedness, false disclosure, bias and safety, model drift, context overflow, and fail-closed behavior. Evaluation data is governed under the same classification, retention, access, and vendor rules as production data.

### Encryption and key management

| Area | Design requirement |
| --- | --- |
| In transit | TLS at the edge; mTLS/service mesh for workloads; private endpoints where available; certificate rotation; approved protocols/ciphers; audience and hostname binding |
| At rest | Encrypt databases, object stores, vector indexes, queues, caches, checkpoints, artifacts, audit, backups, and portable media |
| KMS/HSM | Central policy with region/tenant/environment separation; managed identities; key usage audit; dual control for sensitive operations; HSM-backed keys where risk requires |
| Tenant keys | Per-tenant or dedicated keys where risk, contract, isolation, or revocation needs justify them; record the topology decision and operational impact |
| Rotation/revocation | Automated certificate/token/secret/key rotation; emergency revocation; crypto-agility; re-encryption plan; tested recovery without bypass |
| Secrets | Vaulted and referenced by ID; never in workflow/config, Agent Cards, MCP metadata, images, prompts, logs, or DLQ payloads |
| Failure | Sensitive operations fail closed when required keys, certificate validation, token exchange, or current key policy is unavailable |

### Audit controls and conceptual event schema

Audit records are distinct from diagnostic telemetry. They are append-only, time-synchronized, correlation-aware, access-controlled, encrypted, and written to tamper-evident/immutable storage such as WORM where appropriate. Availability requirements and fail-closed behavior are set by risk and workflow classification.

| Field group | Conceptual fields | Privacy constraint |
| --- | --- | --- |
| Event identity | `event_id`, `event_type`, timestamp, monotonic sequence, region, environment | No content payload |
| Actor/workload | pseudonymous user reference, workload identity, tenant, role set, device/session assurance | No direct identifier unless specifically required and access-controlled |
| Purpose/resource | purpose code, resource/provenance reference, relationship type, classification | Reference/handle rather than record data |
| Authorization | PDP/PEP, policy version/hash, decision, reason code, minimum-necessary field-set hash, consent reference | No bearer token or consent document |
| Execution | `workflow_id/version`, `plan_hash`, A2A/MCP/model/RAG versions, tool/action class, source reference | No prompt, retrieved text, model output, or tool result |
| Human decision | HITL type, reviewer role/reference, decision, scope, expiry | No reviewer comments containing PHI |
| Outcome | allow/deny/stop/contain, response classification, error class, affected scope | Safe error code only |
| Correlation/integrity | trace/correlation ID, `previous_hash`, `event_hash`, signature, clock source | Hashes do not justify storing sensitive payloads |
| Retention/governance | retention class, legal-hold flag/reference, disposal status | Apply least privilege and purpose limitation |

### No-PHI telemetry policy

The allowlist is the policy; unlisted fields are dropped. DLP scans the telemetry pipeline before export.

| Channel | Allowed examples | Prohibited examples |
| --- | --- | --- |
| Metrics | Counts, duration, error class, saturation, token count, policy decision count, scope hit count | Names, record IDs, prompt fragments, retrieved text, model/tool output |
| Traces | Correlation IDs, service/operation, workflow/plan/config/model version, classification, safe decision code | Raw request/response bodies, tokens, query text with PHI, database rows |
| Diagnostic logs | Safe template ID, bounded error code, service version, retry/circuit state | Free-form payload dumps, stack context containing content, secrets |
| A2A/MCP status | Task/tool reference, lifecycle status, schema version, safe failure code | PHI summary, source record, raw exception content, bearer token |
| Registry/configuration | Capability, schema, version, trust tier, owner, health, secret reference | PHI, credentials, tokens, private task/artifact data |
| Caches/DLQ | Scoped opaque key/reference and encrypted minimal replay metadata if approved | Shared raw result, unrestricted prompt/context, PHI payload in DLQ |

Telemetry vendors are evaluated inside the vendor/BAA boundary if they create, receive, maintain, or transmit ePHI. The design goal is to keep PHI out of telemetry regardless of contract status.

### Data lifecycle and resilience

1. **Acquire/ingest:** Verify source owner, authority/consent, approved purpose, vendor path, classification, file/content type, and region. Quarantine before parsing or indexing.
2. **Inspect/govern:** Run malware/content validation, DLP/ePHI classification, injection/poisoning analysis, ACL mapping, lineage capture, and human approval where required.
3. **Store/index:** Encrypt, apply tenant and resource ACLs, pin source and embedding/index versions, record provenance, and prevent quarantine from becoming retrieval eligible.
4. **Use/disclose:** Reauthorize purpose and minimum necessary in-query, minimize at each boundary, enforce model/tool destination policy, validate output, and audit disclosure.
5. **Retain/hold:** Apply documented record-specific retention schedules and legal holds. Audit retention and operational telemetry retention are separate decisions.
6. **Delete/invalidate:** Tombstone immediately; deny retrieval; propagate membership, consent, source, ACL, and deletion invalidation to chunks, embeddings, caches, plans, checkpoints, replicas, and downstream citations; verify completion.
7. **Backup/recover:** Encrypt backups; separate credentials/keys; use immutable backups where appropriate; test restore, tenant isolation, RTO/RPO, integrity, and deletion reconciliation.
8. **Dispose:** Cryptographically erase or sanitize media and backups according to policy and shared-responsibility contracts; retain evidence of disposal.

Multi-region routing is allowed only in approved locations. Graceful degradation is allowed only when privacy and security remain intact, missing-scope labels are explicit, evidence is adequate, and workflow policy permits it. Authoritative organization, policy, identity, audit, KMS, and required-source dependency failures fail closed for sensitive workflows.

### Administrative, physical, and technical safeguard responsibility matrix

| Safeguard area | Organization / regulated entity | Platform owner | Cloud/vendor/shared responsibility | Evidence examples |
| --- | --- | --- | --- | --- |
| Administrative - risk analysis/management | Own enterprise risk analysis, treatment plan, acceptance, policies, periodic evaluation | Provide threat model, control inventory, risk inputs, secure defaults, remediation tracking | Provide assurance reports, service risks, change notices | Risk register, treatment approvals, control mapping, evaluation reports |
| Administrative - assigned responsibility | Assign security/privacy responsibility and decision rights | Define service/control owners and on-call escalation | Name accountable vendor contacts | RACI, role descriptions, escalation roster |
| Administrative - workforce | Joiner/mover/leaver, authorization, training, sanctions | Enforce role/capability lifecycle, PAM/JIT, SoD, audit | Control vendor workforce access and support paths | Access reviews, training records, termination tests, sanctions process |
| Administrative - incident/contingency | Own incident, breach assessment, notification decisions, continuity priorities | Detect, contain, preserve evidence, restore, test RTO/RPO | Notify and cooperate under contract; provide recovery evidence | Runbooks, tabletop records, incident timeline, restore tests |
| Physical - facilities/infrastructure | Validate shared-responsibility model and contractual controls | Configure region, redundancy, private networking, backups | Operate data-center physical access, environmental and media controls | Attestations, region inventory, media disposal evidence |
| Physical - endpoint/workstation/device | Approve workstation use, facility access, device/media policies | Enforce admin posture, session timeout, download restrictions, endpoint integration | Secure vendor support endpoints | MDM/EDR posture, device inventory, exception approvals |
| Technical - access/authentication | Define role, relationship, purpose, consent, and break-glass policy | Implement unique IDs, MFA integration, PDP/PEP, OBO, PAM/JIT, automatic logoff | Enforce service identity and contracted support access | Policy tests, token traces without secrets, access reviews |
| Technical - audit/integrity | Define required events, retention, review, investigation use | Emit immutable audit, time sync, hashes/signatures, monitoring | Preserve provider logs and assurance evidence | WORM proof, hash-chain checks, time-sync alerts, review tickets |
| Technical - transmission/encryption | Approve crypto/network and key requirements | TLS/mTLS, private endpoints, egress policy, at-rest encryption, KMS integration | Protect provider networks/storage and key services | Config scans, certificate/key rotation, network tests |

### Vendor due-diligence and BAA checklist

- Identify the service, legal entity, subprocessors, support model, data flows, data locations, and whether it creates, receives, maintains, or transmits ePHI.
- Complete security, privacy, legal, procurement, architecture, and data-governance review before enabling PHI.
- Confirm contract and BAA applicability; execute a BAA where applicable before transmission.
- Document permitted uses/disclosures, no-training/no-retention settings, abuse-monitoring behavior, support access, and data ownership.
- Verify regions/residency, cross-border transfer, private connectivity, egress controls, tenant isolation, and encryption/key model.
- Review access controls, MFA/PAM, personnel screening/training, incident handling, breach cooperation, and notification provisions without assuming a universal deadline.
- Review vulnerability management, penetration testing, secure development, dependency/container/image scanning, SBOM, signing, provenance, and change notice.
- Review audit availability, retention, export, legal hold, deletion, backup, restore, media sanitization, and contract termination/data return.
- Validate availability, capacity, RTO/RPO, disaster recovery, service dependency and subprocessor resilience, and failover locations.
- Obtain and review current independent assessments and remediation status appropriate to risk; assurance reports do not replace the entity's own risk analysis.
- Record the approved services/models/regions/capabilities in policy and registry allowlists with owner, expiry, evidence references, and periodic reassessment date.
- Define rapid disablement when vendor status, contract scope, region, subprocessor, retention, or evidence no longer satisfies policy.

### Security operations, incident, and contingency flow

```text
privacy-safe OTel + immutable audit + DLP + threat intelligence
  -> SIEM/SOAR + anomaly/UEBA + correlation
  -> triage safe metadata; request JIT content access only when authorized
  -> contain: revoke token / disable workflow-agent-MCP / isolate tenant
              rotate secret-key / block egress / quarantine artifact
  -> preserve evidence: immutable events, config/plan/version hashes, timeline
  -> security + privacy + legal breach assessment process
       (no hardcoded legal conclusion or notification deadline)
  -> eradicate/remediate: patch, rebuild, re-key, re-index, invalidate, retest
  -> recover: approved backup/region, integrity validation, phased restore
  -> monitor + post-incident review + risk/control update + workforce/vendor action
```

Break-glass is a separate, exceptional path: strong identity and device posture, narrow tenant/resource/purpose scope, short expiry, two-person approval where feasible, immediate security/privacy notification, enhanced command and data-access audit, no unrestricted download, and mandatory post-use review. It cannot disable immutable audit or silently bypass the regulated boundary.

Security operations include anomaly/UEBA and threat detection; vulnerability, patch, dependency, container and image scanning; SBOM, signing and provenance verification; secret scanning; penetration tests; prompt-injection/red-team exercises; restore and failover tests; and incident/tabletop exercises. Runbooks provide explicit containment switches for token revocation, workflow/agent/MCP disablement, tenant isolation, secret/key rotation, egress blocking, and evidence preservation.

### Threat and control matrix

| Threat / failure | Prevent / detect controls | Required response |
| --- | --- | --- |
| Stolen user session | Unique ID, MFA, conditional access, device posture, short session, anomaly detection | Revoke session/tokens, isolate access, review audit, require reauthentication |
| Excess privilege / admin misuse | RBAC+ABAC+ReBAC, SoD, PAM/JIT, device policy, approval, immutable audit | Stop action, revoke elevation, investigate, access review, sanctions process as applicable |
| Cross-tenant or unrelated patient access | Tenant partition, resource relationship, purpose/consent, in-query ACL/RLS, scoped keys/cache | Block output, isolate tenant scope, purge/invalidate cache, incident assessment |
| Prompt injection or poisoned RAG | Quarantine, scanning, instruction/data separation, tool allowlist, output validation, provenance | Reject/quarantine evidence, disable source/version, invalidate index/cache/plan, investigate |
| Agent impersonation or task replay | Signed/attested identity, mTLS, audience token, nonce, idempotency, task-plan binding | Reject task/artifact, revoke identity/token, disable service version, preserve evidence |
| MCP tool abuse / unsafe write | Separate discover/list/call authorization, schema, read/write risk, allowlist, HITL, sandbox/egress | Stop or checkpoint, revoke tool permission, disable MCP service, review approval |
| Unapproved model/vendor disclosure | Gateway allowlist, vendor/BAA policy, private endpoint, region/no-retain enforcement, egress deny | Block transmission, disable provider route, invalidate plans, vendor/security/privacy escalation |
| PHI in logs/traces/cache/DLQ | Payload logging off, allowlist, DLP, scoped cache, reference handles, tests | Stop export/release, quarantine/purge, rotate affected credentials/keys, preserve safe evidence |
| Model hallucination or unsupported clinical claim | Grounding/citation/confidence rules, required authoritative sources, HITL, qualified-human decision | Do not release unsupported claim; re-retrieve, label uncertainty, HITL or fail closed |
| Integrity/config tampering | Signed/versioned config, plan/artifact/provenance hashes, SBOM/signing, WORM audit | Reject version, roll back known good, disable service, investigate supply chain |
| KMS/audit/policy dependency failure | HA, monitored freshness, bounded signed snapshots where policy permits, fail-closed classification | Stop sensitive workflow; no protected output; restore dependency and revalidate |
| Deletion/consent/membership lag | Push invalidation, tombstone deny, revocation epochs, reconciliation, completion evidence | Deny immediately, invalidate cache/plan/checkpoint/index, reconcile replicas/backups |
| Region outage or destructive event | Approved multi-region topology, encrypted immutable backup, tested restore, RTO/RPO | Fail over only to approved region with intact controls or fail closed; invoke contingency plan |

### Control evidence and testing

| Control objective | Evidence / test |
| --- | --- |
| Identity and access | MFA/conditional-access configuration, role and relationship tests, quarterly access review, joiner/mover/leaver and emergency-revocation test |
| Route/API enforcement | Negative tests showing hidden or directly called admin/ops routes remain denied; policy decision/version captured |
| Minimum necessary | Policy fixtures proving excess fields/rows/documents are not queried or forwarded; field-set hash in audit |
| A2A/MCP delegation | Token audience/scope/expiry tests, raw-token absence, replay/idempotency tests, signed identity/attestation verification |
| RAG/source authorization | In-query ACL/RLS tests, cross-tenant and removed-membership tests, required-authority tests, tombstone and consent invalidation |
| Model/provider control | Gateway deny tests for unapproved model/region/retention; vendor/BAA inventory match; no-training/no-retention configuration evidence |
| PHI leakage prevention | DLP canaries and synthetic PHI tests across logs, traces, metrics, cache, A2A status, registry, DLQ, and support workflows |
| Integrity/supply chain | Signature/hash verification, provenance/SBOM records, dependency/image scan, tamper rejection, known-good rollback test |
| Audit | Required-event coverage, WORM/immutability proof, hash-chain and clock-skew tests, least-privilege audit access review |
| Lifecycle | Source deletion, membership/consent revocation, legal hold, retention expiry, cache/index/plan invalidation, backup disposal evidence |
| Resilience | KMS/policy/audit/vendor outage fail-closed tests, approved-region failover, backup restore, RTO/RPO, degraded-mode security assertions |
| Incident readiness | Token/service/tenant kill-switch drill, key/secret rotation, evidence-preservation exercise, breach-assessment and tabletop records |
| AI quality/safety | Versioned evaluation sets, injection/poisoning, grounding/citation, bias/safety/drift, high-impact HITL and qualified-human decision tests |

Evidence is versioned, attributable, time-bounded, protected from alteration, retained according to policy, and linked to a control owner and remediation status. Test success does not eliminate the need for periodic risk analysis and evaluation when systems, uses, vendors, threats, or regulations change.

### Residual risks and explicit non-goals

- The platform cannot determine by itself whether an organization is a covered entity or business associate, whether data is PHI in every context, whether a BAA is legally required, or whether a disclosure is legally permitted.
- De-identification is a governed legal/privacy process, not a redaction checkbox; residual re-identification risk requires review and validation.
- Model behavior remains probabilistic. Grounding, evaluation, and HITL reduce but do not eliminate hallucination, bias, unsafe advice, prompt injection, or disclosure risk.
- Relationship, consent, directory, and classification sources can be stale or wrong; fail-closed and reconciliation controls reduce but do not remove upstream governance risk.
- Administrators, support staff, vendors, and qualified human reviewers remain potential insider-risk paths requiring workforce and contractual controls.
- Metadata, access patterns, embeddings, and provenance may be sensitive even when direct identifiers are absent.
- Multi-region resilience may conflict with residency, contract, or deletion requirements; security and privacy take precedence over availability.
- Break-glass access is intentionally exceptional and creates residual risk that must be accepted, monitored, and reviewed.
- This conceptual design does not prescribe a specific legal retention period, breach conclusion, notification deadline, clinical use, provider, control implementation, or certification.
- **No Python or other implementation code changes are included.** Implementation begins only after governance, risk, legal/privacy, vendor, architecture, and control-owner decisions are approved.

### Security implementation backlog

| Phase | Conceptual scope | Exit evidence before the next phase |
| --- | --- | --- |
| **1. Governance and risk baseline** | Determine regulated roles/use cases, inventory ePHI flows/vendors, risk analysis, threat model, responsibility matrix, policy set, clinical-use boundary, control mapping, BAA process | Approved risk register, owners, policies, vendor/BAA inventory, data-flow inventory, residual-risk decisions |
| **2. Identity and policy** | IdP, unique IDs, MFA/conditional access, session/logoff, workload identity, RBAC+ABAC+ReBAC PDP/PEPs, capabilities, PAM/JIT, SoD, break-glass | Route/API negative tests, access reviews, OBO tests, emergency-access drill, immutable authorization events |
| **3. Data protection** | Classification, minimum necessary, in-query ACL/RLS, encryption/KMS, tenant key decision, DLP, no-PHI telemetry, lifecycle, retention/hold/deletion, backup | Cross-tenant/field tests, key rotation, DLP canaries, deletion propagation, restore and disposal evidence |
| **4. Secure workflow, A2A, and MCP** | Signed immutable plans/config, service attestation, task/tool schemas, audience tokens, replay/idempotency, sandbox, private endpoints, egress, HITL writes | Contract and abuse tests, provenance/hash validation, denied unapproved tool/egress, containment switches |
| **5. AI and RAG controls** | Governed ingestion/quarantine, injection/poisoning defenses, authoritative RAG, model gateway/vendor policy, grounding/citation/disclosure validation, evaluation and drift | Evaluation reports, unapproved-provider deny tests, PHI leakage tests, qualified-human HITL evidence |
| **6. SecOps and DR** | SIEM/SOAR/UEBA, scanning/SBOM/signing, vulnerability/patch process, incident/breach assessment, immutable backup, RTO/RPO, regional failover | Detection exercises, penetration findings tracked, tabletop, kill-switch drill, backup/restore and failover tests |
| **7. Audit and readiness** | Control-to-requirement mapping, evidence catalog, periodic evaluation, vendor reassessment, workforce training/access review, remediation and residual-risk approval | Internal readiness review with traceable evidence; gaps and risk decisions documented; no certification claim |

This backlog is sequencing guidance only. Risk may require controls from later phases before any ePHI pilot, and no phase authorizes processing until prerequisite organizational and vendor decisions are complete.

### Security open decisions and recommended defaults

| Open decision | Recommended default |
| --- | --- |
| Separate admin deployment? | Use one shared UX shell with isolated Admin and Operations routes plus backend PEPs by default. Use separate frontend/network deployment when risk analysis, regulatory, tenant, support, or network-isolation requirements justify it. |
| IdP / PDP / PEP? | Use the enterprise IdP plus one authoritative, highly available policy decision contract and PEPs at edge, workflow, A2A, MCP, retrieval, source, model, and release boundaries. Policy decisions are versioned and deny by default. |
| KMS topology? | Use managed KMS with environment and region separation, managed identities, centralized policy, key-use audit, automated rotation, and HSM protection where risk requires. |
| Model providers? | Start with the smallest allowlist of providers/models that pass security/privacy/legal/vendor review, approved contract/BAA requirements, no-training/no-retention, region, private connectivity, and evaluation gates. |
| Per-tenant keys? | Use per-tenant keys for higher-risk tenants or where contract, isolation, revocation, or regulatory analysis requires; otherwise use strongly separated envelope keys with a documented risk decision. |
| Audit retention? | Set from legal, security, privacy, contractual, and operational analysis; separate immutable audit from short-lived diagnostics; use the shortest period that satisfies approved requirements. |
| Break-glass? | Disabled for routine use; narrow JIT scope, strong identity/device, two-person approval where feasible, immediate alert, short expiry, enhanced immutable audit, and mandatory review. |
| BAA inventory? | Maintain a live policy-integrated inventory for every provider/subprocessor that may create, receive, maintain, or transmit ePHI, with owner, service/model/region scope, evidence, expiry, and disablement trigger. |
| Regional topology? | Single approved region plus tested backup initially; add multi-region only where residency and vendor contracts permit and every failover path preserves policy, key, audit, and deletion controls. |
| Clinical-use boundary? | Default to administrative and informational decision support. Do not enable autonomous diagnosis/treatment or final clinical decisions; qualified humans remain accountable, and new clinical uses require specific risk, legal, privacy, safety, and governance review. |

## Cloud-Neutral Infrastructure and Delivery

The complete source-tree, component tradeoff, pipeline, bootstrap, upgrade, rollback, capacity, and disaster-recovery specification is in [CLOUD-NEUTRAL-INFRASTRUCTURE.md](CLOUD-NEUTRAL-INFRASTRUCTURE.md).

> **Terraform builds the foundation; Helm packages services; Argo CD continuously reconciles runtime desired state.**

This is conceptual design only. No Terraform, OpenTofu, Helm, CI pipeline, Kubernetes manifest, or Python implementation code is created yet.

### Portable but provider-aware foundation

Kubernetes is the portable runtime abstraction. Azure uses AKS, AWS uses EKS, and GCP uses GKE. **AKS is an Azure target, not the cloud-neutral layer.** A versioned common platform contract defines cluster, network, identity, KMS, load-balancer, storage-class, object, data, DNS, and telemetry outcomes. Provider-specific Terraform implementations satisfy that contract with explicit capability differences.

The initial operating posture is one cloud and one region per environment, multi-zone placement, tested AKS/EKS/GKE conformance, and same-cloud multi-region disaster recovery where the service tier requires it. Simultaneous active-active multi-cloud is not a default claim. It requires a measured business need, compatible data and identity behavior, equivalent security/vendor controls, an operating model, and repeated failover evidence.

Terraform/OpenTofu provisions:

- Account/subscription/project prerequisites, encrypted state/locking, CI OIDC federation, and KMS roots.
- Provider network, private connectivity, DNS, identity, KMS, managed data foundations, AKS/EKS/GKE, node pools, storage classes, and load balancers.
- Vault and Argo CD bootstrap plus non-secret platform contract publication.
- Observability and disaster-recovery foundations.

Argo CD then owns Kubernetes apply and continuous reconciliation. Terraform does not use the Helm provider as the application lifecycle manager. Every service is an independent Helm chart using a shared library chart; ApplicationSets compose cloud/environment/region/tenant-tier overlays.

### Layered platform topology

| Layer | Recommended design |
| --- | --- |
| Global/edge | Cloud DNS abstraction; provider CDN/WAF/DDoS adapter; external load balancer; Istio Gateway through Gateway API; Entra OIDC |
| Kubernetes target | Common contract -> Azure/AKS, AWS/EKS, GCP/GKE adapters, each owning provider network/IAM/KMS/LB/storage details |
| Cluster foundation | Namespaces; Istio strict mTLS and egress; cert-manager; external-dns; Vault HA plus External Secrets/CSI; Kyverno/Gatekeeper; Argo CD/ApplicationSets; Argo Rollouts; OCI registry; NetworkPolicy |
| Runtime | UX/API; workflow/control; N-agent A2A pool; dynamic MCP pool; workflow/agent/MCP/schema/policy/artifact/report services; RAG/model/connector services |
| Workload resilience | HPA/KEDA, PDB, topology spread, anti-affinity, priority classes, requests/limits, startup/readiness/liveness, preStop and graceful drain |
| Shared data | PostgreSQL HA + JSONB + pgvector initially; Valkey ephemeral only; RabbitMQ quorum queues as the required/default backbone; S3-compatible object abstraction over Blob/S3/GCS |
| Scale options | Kafka/Redpanda for measured streaming scale; OpenSearch/Qdrant/Milvus for measured search/vector scale; MongoDB only for a measured document need |
| Observability | OpenTelemetry, Prometheus -> Mimir/Thanos, Loki, Tempo, Grafana, Alertmanager, OpenCost, optional Pyroscope, SIEM/SOAR; no PHI telemetry |
| Security/supply chain | Entra, workload federation/SPIFFE-compatible identity, Vault KMS auto-unseal, SBOM/scanning/Cosign/provenance/signature admission |
| Resilience | Multi-AZ system/general/compute/optional GPU pools, Cluster Autoscaler, probes, circuits, bulkheads, backpressure, encrypted restore, approved-region failover |

Primary protocol contracts are HTTPS/OIDC at the edge, mTLS internally, A2A over HTTPS, MCP streamable HTTP in production, RabbitMQ AMQP 0-9-1 over TLS/mTLS, PostgreSQL over TLS, object API over TLS, and OTLP over TLS. The RabbitMQ Streams protocol is optional for stream queues; MCP stdio is local development only.

Agents, MCP services, workflow services, and UX/API are stateless and horizontally scalable. Durable run, checkpoint, artifact, registry, event, and report state remains external. No durable in-memory state may be required to resume or retry a run.

### Data platform default and managed-service boundary

Start with PostgreSQL HA for control, registry, run, checkpoint, Saga, transactional outbox/inbox, JSONB document metadata, and pgvector use. Use Valkey/Redis only for ephemeral server-side session records, JWKS metadata, bounded policy decisions, rate limits, idempotency, and coordination with bounded TTL. **Never cache raw bearer tokens.** Use RabbitMQ quorum queues for durable commands/events and an S3-compatible platform object API over Blob, S3, or GCS for artifacts. RabbitMQ carries identifiers and immutable object references, not large payloads, and is never authoritative workflow state.

Use an approved managed RabbitMQ-compatible service or RabbitMQ Cluster Operator. Production requires an odd-sized three-zone cluster, persistent storage, PDB, topology spread, anti-affinity, quorum queues, publisher confirms, persistent messages, manual acknowledgements, TTL/delivery limits, bounded delay/backoff retry exchanges, DLX/DLQs, prefetch backpressure, least-privilege vhost/exchange/queue permissions, and tested definitions recovery and upgrade/drain procedures. Delivery is at least once with idempotent consumers; ordering is only per queue/routing/aggregate key when required. There is no XA assumption between PostgreSQL and RabbitMQ.

Use RabbitMQ Streams only for measured high-throughput replay or longer retention. Add Kafka/Redpanda only when measured high-retention streaming, event analytics, throughput, replay, or ecosystem needs justify it. Add OpenSearch, Qdrant, or Milvus only when measured search/vector capacity, latency, or recall exceeds PostgreSQL. Add MongoDB only when measured document-distribution or access needs justify a second database.

Provider-managed production data services are preferred when they reduce HA, patch, backup, restore, and BAA/evidence burden while satisfying the platform interface. In-cluster operators improve physical portability but transfer 24x7 HA, patching, scaling, backup, restore, security, and evidence ownership to platform SRE.

### Source, infrastructure, and GitOps separation

```text
platform-source/
|-- services/
|-- shared-libraries/
|-- contracts/
|-- chart-sources/
|-- tests/
|-- build/Dockerfiles/
|-- pipeline-templates/{service-ci.yml,helm-ci.yml}
`-- CODEOWNERS

platform-infrastructure/
|-- terraform/modules/{contracts,network,identity,kms,cluster,data-foundation,observability,dr}/
|-- terraform/providers/{azure,aws,gcp}/
|-- terraform/stacks/{bootstrap,network,identity,cluster,data-foundation,platform-foundation,observability,dr}/
|-- environments/{dev,integration,stage,prod}/<cloud>/<region>/
|-- policy/terraform/
|-- tests/{contract,policy,recovery}/
|-- pipeline-templates/{terraform-ci.yml,terraform-cd.yml,cluster-upgrade.yml,dr-test.yml}
`-- CODEOWNERS

platform-gitops/
|-- clusters/<environment>/<cloud>/<region>/
|-- applications/{base,overlays}/
|-- values/{common,environments}/
|-- argocd/{projects,applicationsets,sync-waves}/
|-- policies/
|-- rollouts/
|-- promotions/
|-- platform-contracts/
|-- pipeline-templates/{promote.yml,gitops-verify.yml}
`-- CODEOWNERS
```

Large teams may use one repository per service with `src/`, `tests/`, `Dockerfile`, `chart/`, `contracts/`, pipeline metadata, and CODEOWNERS. A monorepo uses the same structure under `services/<service>/`. Schemas, workflows, Agent Cards, MCP metadata, policy, and templates are versioned and signed; use a separate governance repository when organization scale and separation of duties justify it.

Environment trees contain only non-secret identifiers, immutable digests/versions, capacity policy, and Vault references. Secrets are prohibited in Git, Terraform state/plans, Helm values, images, registries, workflows, and pipeline logs.

### Immutable build and promotion flow

```text
source commit
  -> CI test/type/lint/contract/security/build
  -> signed OCI image/chart + SBOM + provenance + immutable digest
  -> GitOps promotion PR
  -> dev -> integration -> staging -> production approvals/attestations
  -> Argo CD sync
  -> Argo Rollouts canary or blue-green through Istio
  -> readiness + metric + trace + error-budget + quality + security gates
  -> 100 percent promotion or automatic traffic rollback to known-good
```

Terraform CD publishes a signed non-secret cluster/platform contract after apply. GitOps bootstrap consumes the contract as a versioned input, not through direct mutable access to Terraform state.

### Common parameterized pipelines

| Pipeline | Purpose and principal stages | Output | Permission boundary |
| --- | --- | --- | --- |
| `terraform-ci.yml` | fmt, validate, tflint, Checkov/tfsec equivalent, policy/conftest, Terraform test, plan, cost, sign plan | Signed plan and evidence | Plan-only cloud role; no apply/secrets |
| `terraform-cd.yml` | OIDC, verify plan/commit/expiry, approval, state lock, exact apply, output verification, publish non-secret contract, drift record | State version and signed platform contract | One stack/state apply role; no app mutation |
| `service-ci.yml` | tests, type/lint, contracts, SAST/SCA/license/secrets, image, SBOM, scan, sign, OCI push | Signed image digest and attestations | Service OCI write only |
| `helm-ci.yml` | lint, template, values schema, unit, policy, kubeconform, integration, package, sign, push | Signed chart digest and compatibility | Chart OCI write only; no cluster apply |
| `promote.yml` | verify artifacts/attestations, compatibility, GitOps digest/config update by PR, approvals | Target GitOps commit | GitOps PR only; no direct cluster access |
| `gitops-verify.yml` | sync/health, smoke, contracts, synthetic, SLO/quality/security gates, promote/rollback | Release attestation or incident | Health/rollout status only |
| `cluster-upgrade.yml` | compatibility, backup, control plane, surge pool, PDB-aware drain, readiness, retire old pool | New version contract and evidence | Cluster-upgrade role only |
| `dr-test.yml` | isolated restore, reconcile, RTO/RPO/integrity/security tests, delete exact test stack | Recovery evidence and backlog | One explicitly named recovery stack |

The templates take cloud, environment, region, stack, service, and risk parameters. Provider-specific stages implement a common contract rather than becoming three divergent pipelines.

### Bootstrap and platform state machine

```text
UNPROVISIONED
  -> BOOTSTRAPPING
  -> FOUNDATION_READY
  -> PLATFORM_SYNCING
  -> VALIDATING
  -> ACTIVE
  -> UPGRADING/CANARY
  -> ACTIVE

Failure: VALIDATING or UPGRADING/CANARY
  -> ROLLED_BACK | DEGRADED | FAILED
  -> RECOVERING -> VALIDATING -> ACTIVE
```

Bootstrap first establishes state backend/locking, CI federation, KMS roots, DNS and account/subscription/project prerequisites. Approved Terraform applies proceed by dependency: network -> identity/KMS -> managed data -> AKS/EKS/GKE -> node pools/storage/LB -> Vault/bootstrap -> Argo CD.

Argo CD sync waves proceed: CRDs/operators -> mesh/cert/policy/secrets -> observability -> registries/state/messaging adapters -> platform services -> agents/MCP -> UX. Readiness, smoke, contract, security, synthetic-workflow, backup, and SLO evidence are required before `ACTIVE`.

### Zero-downtime application and data delivery

Critical production services use at least two and preferably three replicas across zones, PDB, topology spread, anti-affinity, `maxUnavailable=0`, tested surge, distinct startup/readiness/liveness probes, preStop and termination grace, connection/queue drain, graceful cancellation, idempotency, bounded retries, capacity headroom, and leader election where needed.

HTTP, A2A, MCP, event, workflow, artifact, and schema contracts remain backward compatible across N-1/N+1 during the rollback window. Existing runs remain pinned to immutable versions unless a hard revocation requires stop or migration.

A conceptual canary moves through 1, 5, 25, 50, and 100 percent using Istio traffic control. Every gate evaluates readiness, errors, latency, saturation, traces, error budget, security, contract tests, and output quality. A hard-gate failure stops promotion, shifts traffic to known-good, aborts the Rollout, and has Argo CD reconcile the previous digest/config.

Database changes use expand-and-contract:

1. Add compatible schema.
2. Deploy compatible dual-read/write behavior when needed.
3. Backfill with throttling, checkpoints, pause/resume, and verification.
4. Switch reads through a separate immutable configuration.
5. Observe through the rollback window.
6. Remove old structures only in a later independently approved change.

Never couple destructive migration to the first application rollout. Native HA/failover, PITR backup, and an isolated restore test are mandatory for critical data.

### Cluster, Terraform, config, workflow, and secret upgrades

Kubernetes upgrades validate provider/add-on/workload compatibility, backups, PDBs, and headroom; upgrade the provider-managed control plane; create a surge or blue-green node pool; cordon/drain honoring PDB; verify rescheduling/readiness; move traffic; and retire the old pool after the rollback window. Risky major platform changes use a parallel cluster, GitOps reconciliation, approved restore/replication, validation, and traffic cutover.

Terraform changes perform plan, policy, cost, drift, approval, small-stack apply, and output verification. Prefer forward fix because many provider operations are not safely reversible; roll back only when reversibility is proven. State locking/versioning and break-glass audit are mandatory.

Config, workflows, schemas, Agent Cards, MCP metadata, and report templates are signed immutable versions with compatibility/policy validation and canary/tenant rollout. Per-run pins remain stable. Vault secret and certificate rotation overlaps old/new validity, reloads without restart where supported, verifies the new version, then revokes the old version.

### Rollback and day-2 operations

On release failure: stop promotion; shift Istio traffic back; reconcile the previous image/chart/config digest; disable a bad agent, MCP, workflow, or schema version; retain compatible database structures; preserve workflow checkpoints and events; create an incident; and keep raw PHI and bearer tokens out of rollback logs and DLQs.

Day-2 work includes Terraform drift and GitOps reconciliation, dependency/base-image/OS/Kubernetes/add-on patching, key/cert/secret rotation, capacity and autoscaling, backup/restore/DR drills, chaos, vulnerability remediation, SLO/error-budget review, version deprecation, and end-of-life.

Initial SRE targets should be validated under representative load: local PDP p95 under 75 ms, A2A dispatch overhead p95 under 250 ms excluding agent/model time, MCP gateway overhead p95 under 200 ms excluding the tool, queue admission p95 under 100 ms, and at least 30 percent critical-service deployment/incident headroom until evidence supports another value.

Recovery objectives are tiered. A starting point is RPO 5 minutes/RTO 2 hours for critical PostgreSQL control/checkpoint metadata, RPO 15 minutes/RTO 4 hours for required artifacts/events, and rebuild-based recovery for caches and derived indexes. Each workflow/data owner approves its actual objectives and restore evidence.

### Delivery non-negotiables

1. Kubernetes, not AKS, is the portable abstraction.
2. Provider-aware implementations are explicit and contract-tested.
3. Terraform provisions foundations; Argo CD owns continuous Kubernetes state.
4. Every service uses an independent chart plus a shared library chart.
5. All release artifacts and configuration are immutable, signed, and promoted by digest/version.
6. No secrets or bearer tokens enter state, values, Git, images, registries, workflows, telemetry, or DLQs.
7. Valkey is ephemeral and never caches raw bearer tokens.
8. PostgreSQL HA + JSONB + pgvector, Valkey, RabbitMQ quorum queues, and the S3 abstraction are the initial data defaults.
9. Zero-downtime is an application, data, infrastructure, and operational contract, not only a replica count.
10. This chapter defines future implementation; **no implementation code is introduced now.**

## Logical architecture

```text
User prompt + validated identity
  -> Prompt Understanding
       typed intent, entities, risk, data classification, required capabilities
  -> Workflow Router
       eligible candidate retrieval + rules + semantic matching + policy scoring
       |
       +-- clear high score ------> approved Workflow Catalog version
       +-- ambiguous close scores -> clarification HITL -> route again
       +-- no adequate match -----> policy-gated Constrained Workflow Composer
                                      approved capabilities/control nodes only
  -> Workflow Validator / Compiler
       resolve Schema/Contract Registry refs
       graph + exactly-one binding + path/type/branch/fallback/report validation
       policy + availability + budget validation
  -> Authorization Manifest Builder
       enumerate every reachable required/optional/fallback agent, MCP category,
       RAG source, model, artifact field projection, report/delivery action and HITL
  -> PDP + Policy Store + Relationship Data + Attribute Sources
       RBAC + ABAC + ReBAC + capability/data/model/disclosure preflight
       required deny -> reject; optional deny -> explicit safe prune or reject
  -> Authorized Plan Gate
       freeze manifest/policy/decision hashes, allowed envelopes, token bounds,
       fallback authorization sets, revocation epoch and expiry; no bearer tokens
  -> Effective RAG Policy Resolver
       workflow RAG requirements + tenant/user/groups/roles + purpose/classification
       security precedence: organization > group > user; most restrictive wins
  -> immutable Federated Retrieval Plan
       mode + eligible scopes/indexes + quotas + bounded boosts + required sources
       policy/index/model/cache/invalidation versions
  -> federated retrieval
       normalize -> scoped query with in-query ACL -> dedupe/fuse/rerank
       -> authority/coverage/conflict gate -> context packer -> citation manifest
  -> Policy Approval
       required for dynamic composition or high-risk workflows
  -> immutable Compiled Execution Plan + checkpoint/audit
       exact schema pins + binding graph included in plan hash
  -> LangGraph Runtime Scheduler
       ready_set / running_set / completed_set / dependency_count
       conditions / barriers / bounded validated replan / terminal aggregation
       continuous reauthorization before every protected action
  -> Agent Registry / Agent Cards
       capability + version + endpoint + schemas + health + trust + tenant + region
  -> N independently deployed A2A agent services
       each service has standard A2A endpoint + DynamicMCPClient
  -> Runtime Contract Gateway
       parse/validate/bounded repair -> classify/project -> persist/hash
       open barriers only for accepted immutable artifacts
       bind dependency artifacts -> validate complete downstream input
  -> MCP Gateway / Discovery Broker
       separate PEP decisions for discovery metadata, listTools and exact call
  -> separate metadata-only MCP Service Registry
  -> independently deployed MCP service + Plugin Host
  -> external private system under delegated user/tenant RLS context
  -> minimized structured MCP result + provenance + policy labels
       result re-enters the validated artifact pipeline
  -> Canonical Report Aggregator
       deterministic terminal artifact/citation/run/HITL/quality/policy bindings
  -> Renderer Layer
       signed disclosure-aware JSON/HTML/PDF/dashboard/event views; facts unchanged
  -> Report / Disclosure / Download PEP
       reauthorize fields, renderer, recipient, destination, channel and download
```

HITL, security, resilience, observability, RAG, governed memory, model policy, checkpointing, and audit are cross-cutting platform services. PEPs protect the UX/API gateway, compiler/scheduler, A2A gateway and agent ingress, MCP discovery/`listTools`/call gateway, RAG/query gateway, model gateway, artifact/binding gateway, and report/disclosure/download gateway. A token broker/exchange issues short-lived audience-bound delegations, while a revocation event stream invalidates decisions and pauses affected runs. Workflow selection, graph compilation, complete manifest preflight, and authorized-plan freeze happen before graph execution; dynamic agent and MCP resolution happen only inside the authorized envelopes through their respective registries.

## Workflow architecture

### Responsibility model

| Component | Responsibility | Explicit non-responsibility |
| --- | --- | --- |
| API edge | Validate request schema, OIDC identity, tenant, audience, and base scopes | Does not trust prompt-supplied identity or endpoint names |
| Prompt Understanding | Produce typed intent, entities, risk, data classification, required capabilities, locale, and confidence | Does not authorize or directly select privileged workflows |
| Workflow Router | Retrieve eligible catalog candidates using rules and semantic matching; score and explain ranking | Does not bypass tenant/policy filters or execute a graph |
| Workflow Catalog/Registry | Store signed, approved, immutable workflow versions, schemas, lifecycle status, rollout, owner, and audit metadata | Stores no bearer tokens, prompts, private records, task artifacts, or MCP results |
| Schema/Contract Registry | Store immutable schema definitions, compatibility/classification metadata, owner, lifecycle, deprecation, impact graph, and approved adapter references | Stores no PHI, example payloads, secrets, prompts, artifacts, or MCP results |
| Constrained Workflow Composer | Build candidate DAG data from approved Agent Card capabilities and approved control-node templates | Cannot emit arbitrary executable code, endpoints, tool names, or unbounded logic |
| Workflow Validator/Compiler | Validate and resolve a candidate into a deterministic execution plan or reject it | Does not repair unsafe input silently |
| Input Binding Engine | Assemble node/report inputs through safe declarative selectors and approved deterministic transforms over workflow input and validated artifact/context references | Does not concatenate prompts, execute arbitrary code, or infer mappings |
| Runtime Contract Gateway | Validate/repair output, enforce field policy, persist/hash artifacts, update barriers, and validate bound downstream inputs | Never passes malformed or policy-unsafe content |
| Artifact Store | Persist encrypted tenant-isolated immutable artifacts, metadata, hashes, lineage, retention/deletion/legal hold, residency, and access audit | Does not act as a registry or mutate accepted artifacts |
| Canonical Report Aggregator | Deterministically bind and validate one canonical report object | Does not render channels or invent missing facts |
| Renderer Layer | Render signed disclosure-aware JSON/HTML/PDF/dashboard/event output in isolation | Cannot change canonical facts or call agents/tools |
| Policy Approval | Apply human/admin approval to dynamic compositions and high-risk workflows; optionally promote a validated definition | Cannot override hard identity, residency, legal, isolation, or RLS controls |
| Compiled Plan Store | Persist immutable plans, hashes, policy snapshots, pinned service resolutions, checkpoints, and resume lineage | Does not store secrets or raw external data |
| LangGraph Runtime Scheduler | Calculate ready nodes, dispatch A2A tasks, evaluate conditions/barriers, enforce budgets, checkpoint, replan through validation, and aggregate | Contains no workflow-specific topology branches |
| Agent Registry/Agent Cards | Resolve workflow capability references to compatible A2A service instances | Does not resolve MCP tools or grant scopes |
| A2A agent service | Execute one declared capability and return typed status/artifacts; use `DynamicMCPClient` as needed | Does not depend on fixed neighboring agents or model-supplied endpoints |
| MCP Gateway/Discovery Broker | Filter MCP discovery/invocation by workload, delegated user, tenant, purpose, scopes, classification, health, trust, and region | Does not store user records or let tool names bypass registry policy |
| MCP Service Registry | Store metadata-only MCP service/tool contracts and health references | Does not resolve autonomous agent executors |
| MCP Plugin Host | Run approved connector logic/configuration/mappings/schema and JIT source access | Never contains or persists private user data |
| External data system | Remain source of truth and enforce tenant partitioning and server-side RLS | Does not rely only on connector-side filtering |
| Observability/audit | Track routing, plan, execution, cost, quality, overrides, provenance, and redacted security events | Never logs bearer tokens or raw private data |

### Registry separation

| Registry | Primary key | Resolves | Important metadata |
| --- | --- | --- | --- |
| Workflow Catalog/Registry | workflow ID + immutable version | User intent to approved topology/configuration | triggers, typed schemas, capability references, policies, lifecycle, rollout, owner |
| Agent Registry/Agent Cards | agent service ID + version | Workflow capability node to A2A executor | capabilities, A2A endpoint reference, schemas, trust, tenant, region, health, capacity |
| MCP Service Registry | service/tool ID + version | Agent capability request to MCP service/tool | tool schemas, scopes, endpoint reference, side effects, classification, trust, region, health |
| Schema/Contract Registry | contract ID + semantic version | Schema ref/range to an immutable definition | format, definition hash, compatibility, classifications, owner, lifecycle, deprecation, impact graph, approved adapter refs |

These four registries may use shared databases, deployment tooling, or governance infrastructure, but their APIs, authorization rules, metadata models, lifecycle decisions, and payload prohibitions remain logically separate.

## Hierarchical RAG Policy and Data Plane

The proposed platform adds policy-governed retrieval and ingestion at three scopes:

- **USER**: personal content is private by default and available only to the owning user under purpose, consent, classification, residency, retention, and workflow controls.
- **GROUP**: content is shared only with current eligible group members/roles. Ordinary members may submit to staging; publication requires a group owner, `rag.publisher`, or approved automated governance.
- **ORGANIZATION**: organization-wide or domain-authoritative content is published, versioned, deprecated, and rolled back only by a system/RAG administrator.

The architecture prefers logical tenant/organization/group/user namespaces or partitions on an **ACL-aware Vector/Search Platform**. Separate physical indexes are permitted when isolation, residency, scale, or operations require them. The policy and query contract is the same in either deployment: authorization filters execute inside every vector/search query.

The first implementation foundation now exists in `cw-source-catalog` and
`cw-rag-ingestion`. The Source Catalog records ownership, authority, source and
ACL revisions, freshness, index generations, revocation, deletion, and legal
hold. The ingestion coordinator accepts references only, pins all processing
versions, blocks known-stale data, and requires shadow-generation validation
before atomic publication.

### Security precedence versus retrieval preference

These are independent mechanisms and must never be collapsed into one scope ordering:

| Mechanism | Ordering | Meaning | Prohibited interpretation |
| --- | --- | --- | --- |
| Authorization and purpose | Explicit deny or missing authorization wins | Determines whether the source is eligible at all | Ranking cannot restore an ineligible source |
| Mandatory policy | Applicable regulatory and organization obligations win | Reserves required evidence and restrictive handling | User/group preference cannot remove a mandatory source or control |
| Content authority | Designated owner or system of record wins for its facts | Resolves factual and ownership-specific conflicts | Organization scope alone does not make every document authoritative |
| Personalization | User over group over organization defaults when permitted | Applies bounded preferences after governance | Personal preference cannot override policy, legal, residency, or system-of-record facts |
| Classification/retention/residency | Most restrictive applicable control wins | Governs handling, location, lifecycle, and disclosure | Lower-scope configuration cannot relax the control |

Human approval cannot override hard authorization, legal, residency, isolation,
or source-authority rules. Prompt instructions and model output cannot alter
the compiled precedence decision.

### Responsibility diagram

```text
selected workflow_id/version + workflow.rag
  + validated tenant_id/user_id
  + all current group memberships/roles
  + purpose + classification + consent
  + organization/group/user policy versions
  + model/embedding/reranker/index/invalidation versions
        |
        v
Effective RAG Policy Resolver
  security merge: organization > every applicable group > user
  most restrictive wins; lower scopes only narrow
        |
        v
immutable Federated Retrieval Plan
  mode + eligible scopes/namespaces + deterministic group allocation
  quotas + bounded boosts + thresholds + required authoritative sources
  ACL filters + versions + cache scope + fail-closed behavior
        |
        v
query normalization
  -> eligible scope/index resolution
  -> parallel scoped retrieval OR threshold-driven strict fallback
  -> ACL-filtered candidates
  -> dedupe + scope-aware fusion
  -> cross-encoder/LLM rerank
  -> authority + freshness + policy scoring
  -> coverage/conflict decision and optional HITL
  -> context budget packer
  -> citation/provenance manifest
  -> immutable workflow Execution Plan/checkpoint
  -> N-agent A2A execution
```

### Responsibility model

| Component | Responsibility | Fail-closed boundary |
| --- | --- | --- |
| Workflow Catalog | Store immutable workflow RAG requirements with each approved workflow version | Missing or invalid RAG requirements reject compilation when retrieval is required |
| RAG Policy Registry | Store signed, versioned organization, group, and user policies plus lifecycle and owner metadata | Missing mandatory organization or applicable policy version stops sensitive retrieval |
| Identity/membership/consent service | Return validated tenant/user, all current memberships/roles, consent, purpose eligibility, and revocation epochs | Stale or unavailable authorization data stops protected retrieval |
| Effective RAG Policy Resolver | Merge workflow requirements and applicable policies without widening authority | Any unresolved conflict, unsupported control, or illegal lower-scope relaxation rejects the plan |
| Federated Retrieval Planner | Select mode, eligible scopes/indexes, deterministic group quotas, boosts, thresholds, authority floor, versions, cache, and invalidation scope | A plan that cannot enforce ACL, residency, retention, required source, or citation constraints is not emitted |
| ACL-aware Vector/Search Platform | Apply tenant, subject, group/role, purpose, classification, consent, source ACL, residency, tombstone, and version filters inside the query | Post-filter-only authorization is prohibited |
| Fusion/reranker/context packer | Dedupe, apply bounded preference, rerank for relevance/authority/freshness/risk, reserve required sources, and fit cited evidence within budget | Required authority, provenance, or coverage cannot be dropped to fit the budget |
| Ingestion services | Enforce scope RBAC and send every source through shared governance | Failed validation, DLP, injection/poisoning, PII, embedding, ACL, or provenance checks reject/quarantine the source |
| Source Catalog and Freshness Ledger | Record source/version/owner/authority/ACL/classification/hash/index generation/model/lineage/tombstone metadata | Known-stale, revoked, quarantined, deleted, or legal-hold sources are not queryable |
| Atomic Index Publisher | Build a shadow generation, prove counts/hashes/ACL/lineage/quality/poisoning/compatibility, then switch the logical alias | Partial generations and incompatible readers never receive production traffic |
| Invalidation bus | Propagate source, consent, membership, policy, classification, workflow, model, and index changes | Stale plans/caches/checkpoints are denied until revalidated |
| LangGraph runtime | Store the Federated Retrieval Plan with the immutable Execution Plan, enforce plan versions, and pass only approved context/handles to agents | Resume or protected actions stop on policy, membership, consent, index, or invalidation epoch mismatch |

### Source freshness and publication

An active index generation is a disposable, governed projection of
authoritative storage. Event notifications reduce latency, while periodic
reconciliation proves completeness and detects lost, duplicated, delayed, or
out-of-order events.

```text
source revision N+1 observed
  -> Source Catalog marks source stale/pending
  -> query-time policy blocks known-stale generation for exact-freshness uses
  -> ingestion builds shadow generation N+1
  -> validate security, lineage, ACLs, counts, hashes and quality
  -> validate old/new service reader compatibility
  -> atomically move logical alias from generation N to N+1
  -> Source Catalog marks indexedRevision == sourceRevision
  -> retain generation N for bounded rollback
```

Revocation and deletion deny retrieval before physical cleanup completes.
Cleanup then propagates through chunks, vectors, lexical indexes, caches,
memory references, ContextPacks, reports, evaluation datasets, and backups
subject to legal hold.

### Zero-downtime service versioning

Service aliases route only new work. Immutable workflow plans and ingestion
jobs pin exact service and contract versions so in-flight work can complete on
the old version while new replicas receive canary traffic.

Upgrades use expand-only data migrations, at least two replicas,
`maxUnavailable: 0`, readiness/startup probes, graceful draining, mixed-version
compatibility tests, atomic alias promotion, and a rollback window. Contract or
data cleanup occurs only after no supported reader needs the old shape.

Downgrade is allowed only when the previous binary can read the current stored
and index schemas, the previous index/service generation remains available,
and no active work depends on new-only behavior. Otherwise the safe response is
a forward fix.

### Effective policy resolver inputs and merge semantics

The resolver consumes:

- `workflow_id` and immutable workflow version.
- The workflow RAG requirements defined below.
- Validated `tenant_id` and `user_id`.
- All current group memberships and roles, including ownership and `rag.publisher`.
- Purpose, data classification, requested domains, destination, and release intent.
- Consent grants and revocations.
- Organization, group, user, workflow, policy-provider, membership, and consent versions/epochs.
- Current eligible index/namespace versions and required model, embedding, and reranker versions.

The merge is deterministic:

1. Validate identity, tenant, workflow version, purpose, classification, consent, and policy-version signatures.
2. Start from mandatory organization controls and workflow requirements. When they conflict, use the stricter control or reject if they are incompatible.
3. Apply every current workflow-eligible group policy. A deny from any applicable policy is a deny. Allowed sets are intersected; maximums use the minimum; minimum protections use the maximum; booleans use the safer value.
4. Apply the user policy only to narrow the result or opt out. It cannot widen a domain, scope, model, retention, residency, cache, authority, telemetry, or release permission.
5. Intersect the result with runtime capability, region, index health, and source lifecycle eligibility.
6. Freeze the inputs, merge trace, decisions, versions, and invalidation epochs into the Federated Retrieval Plan.

Representative merge operators:

| Policy field | Merge operator |
| --- | --- |
| Allowed scopes/domains/groups/models/regions | Set intersection |
| Denied scopes/domains/sources | Set union |
| Maximum `top_k`, cache TTL, retention, volume, context budget | Minimum allowed maximum |
| Minimum relevance, coverage, authority, audit, DLP, citation requirements | Maximum required minimum |
| Required authoritative sources | Union, unless a higher policy explicitly replaces with a stricter signed set |
| Fail-closed, citations required, raw telemetry prohibited, private cache prohibited | Logical OR toward the safer behavior |
| Scope boost | Clamp to the smallest applicable bound; never use as an authorization or authority signal |
| Retrieval mode | Workflow selects from the policy-allowed set; otherwise reject |

### Workflow-selectable retrieval modes

| Mode | Query behavior | Intended use | Authority behavior |
| --- | --- | --- | --- |
| `hierarchical_fusion` | Default. Query every eligible personal, group, and organization namespace concurrently with in-query ACLs and per-scope/per-group quotas; then dedupe, fuse, rerank, and apply bounded preference | Broad evidence synthesis with predictable latency and diversity | Required organization sources are reserved and cannot be displaced |
| `strict_fallback` | Query personal first; query all eligible groups only when personal relevance/coverage is insufficient; query organization only when earlier stages remain insufficient | Cost/latency-sensitive workflows where lower-scope evidence may be sufficient and no mandatory organization floor exists | Any required organization source is queried regardless of fallback stage |
| `org_authoritative` | Query mandatory organization sources and organization evidence, with optional group/personal supplements | Policy, compliance, regulated, or official-answer workflows | Organization authority is a hard floor; lower scopes may supplement or expose conflict but cannot replace it |

`hierarchical_fusion` is the safe default because it avoids arbitrary early stopping and lets the reranker compare eligible evidence concurrently. `strict_fallback` is valid only when the workflow explicitly selects it and the effective policy permits it.

### Conceptual workflow RAG policy

This YAML is illustrative configuration, not executable code:

```yaml
rag:
  mode: hierarchical_fusion
  allowed_scopes: [user, group, organization]
  allowed_domains: [records, approved-knowledge, policy]
  eligible_group_selection:
    include_domains: [finance, research]
    exclude_groups: []
    allocation: explicit-priority-with-fair-floor
    priorities:
      finance: 1
      research: 2
    minimum_per_eligible_group: 1
  per_scope:
    user: { top_k: 8, quota: 5, bounded_boost: 0.04 }
    group: { top_k: 12, total_quota: 6, bounded_boost: 0.02 }
    organization: { top_k: 10, quota: 5, bounded_boost: 0.00 }
  evidence:
    minimum_relevance: 0.72
    minimum_coverage: 0.80
    required_authoritative_sources:
      - source://organization/policy/current
    conflict_behavior: resolver_then_hitl
  versions:
    query_model: query-normalizer.v2
    embedding_model: embedding.v4
    reranker: cross-encoder.v3
  citations:
    required: true
    provenance_manifest: required
    include_scope_and_authority_labels: true
  cache:
    result_cache: authorization-scoped
    shared_cross_user_result_cache: prohibited
    ttl_seconds: 300
  governance:
    residency: required-region
    retention: shortest-applicable-policy
    data_classification: confidential
    fail_closed_on:
      - policy_unavailable
      - acl_unavailable
      - required_authority_unavailable
      - audit_unavailable
```

Required workflow RAG fields are: retrieval mode; allowed scopes and domains; per-scope `top_k`/quotas; bounded scope boosts; minimum relevance/coverage; required authoritative sources; eligible group selection; query/model/embedding/reranker versions; citations/provenance; cache policy; residency; retention; data classification; and fail-closed behavior.

### Immutable Federated Retrieval Plan schema

The resolver output is immutable and is stored with the workflow Execution Plan and every checkpoint:

```yaml
federated_retrieval_plan:
  plan_id: rag-plan-symbolic
  plan_hash: sha256-symbolic-rag-plan
  workflow: { id: private-data-analysis, version: 3.2.0 }
  principal:
    tenant_id: symbolic-tenant
    user_id: symbolic-user
    membership_epoch: 42
    consent_epoch: 17
    eligible_groups:
      - { id: finance, roles: [member], priority: 1, quota: 3 }
      - { id: research, roles: [member], priority: 2, quota: 3 }
  effective_policy:
    decision_hash: sha256-symbolic-policy
    resolver_version: 2.1.0
    organization_policy_version: 19
    group_policy_versions: { finance: 8, research: 4 }
    user_policy_version: 6
    security_precedence: organization-group-user
    merge_trace_ref: audit://policy-decision/symbolic
  retrieval:
    mode: hierarchical_fusion
    allowed_scopes: [user, group, organization]
    allowed_domains: [records, approved-knowledge, policy]
    index_versions:
      user: user-index.v17
      group: { finance: finance-index.v31, research: research-index.v12 }
      organization: org-index.v44
    quotas: { user: 5, finance: 3, research: 3, organization: 5 }
    bounded_scope_boosts: { user: 0.04, group: 0.02, organization: 0.00 }
    minimum_relevance: 0.72
    minimum_coverage: 0.80
    required_authoritative_sources: [source://organization/policy/current]
    acl_filter_template_version: acl-query.v7
  models:
    query_model: query-normalizer.v2
    embedding_model: embedding.v4
    reranker: cross-encoder.v3
  context:
    token_budget: 12000
    citations_required: true
    provenance_manifest_required: true
  cache:
    key_dimensions:
      [tenant, user, groups, workflow, policy_versions, index_versions, scopes]
    ttl_seconds: 300
    cross_user_result_cache: prohibited
  governance:
    purpose: decision-support
    data_classification: confidential
    residency: required-region
    retention: shortest-applicable-policy
    fail_closed: true
  invalidation:
    plan_epoch: 133
    policy_epoch: 88
    source_catalog_epoch: 71
```

The plan contains identifiers, versions, filters, quotas, and provenance handles, not bearer tokens or unrestricted raw content. A checkpoint stores the plan hash and invalidation epochs. A membership, consent, source, policy, workflow, classification, or relevant index-version change can invalidate the plan before the next protected action.

### Scoring, quotas, and multiple groups

Conceptual ranking:

```text
candidate_score =
    semantic_relevance
  + bounded_scope_preference
  + source_authority
  + freshness
  + policy_quality
  - risk_penalty
```

- Eligibility and ACL decisions happen before scoring and are never represented as a positive score.
- `bounded_scope_preference` is clamped by effective policy and must be too small to overturn a material relevance or authority difference.
- Required organization sources are reserved before context packing and cannot be removed by personal/group rank.
- Per-scope `top_k` controls retrieval breadth; quotas control how many candidates may survive into fusion/context.
- Quotas are not guaranteed result counts. Low-quality evidence is not admitted merely to fill a quota.
- Dedupe uses canonical source/chunk/content hashes and preserves every contributing scope/authority/provenance reference.

For multiple groups:

1. Resolve all current memberships and roles at plan creation and again at protected query/resume boundaries according to policy.
2. Apply workflow domain/group filters and policy intersections.
3. Allocate by explicit workflow priority when configured, with a policy-defined fair minimum for every eligible group.
4. Otherwise use deterministic fair quotas, not directory order, discovery order, hash order, or first-response order.
5. A membership removal or role loss immediately invalidates that group's eligibility, related cache entries, retrieval plans, and protected checkpoints.

### ACL-aware query rules

Every vector/search request must carry server-derived filters for:

- Tenant and subject/user identity.
- Current eligible group IDs and required roles.
- Workflow ID/version and purpose.
- Data classification and allowed domains.
- Consent grants and revocation epoch.
- Source-level ACL, lifecycle, residency, retention, and legal-hold state.
- Namespace/index version and tombstone/deletion epoch.

The filters must be enforced inside candidate generation. Client-side or post-retrieval filtering alone is not an authorization boundary. Search results include only authorized candidate metadata and provenance handles; raw content is returned only to an authorized retrieval/context component.

### Ingestion RBAC matrix

| Operation | User/personal owner | Ordinary group member | Group owner | `rag.publisher` | Automated governance | System/RAG administrator |
| --- | --- | --- | --- | --- | --- | --- |
| Submit personal source | Allow for own personal namespace | N/A | N/A | N/A | Policy-controlled | Policy-controlled support |
| Manage/delete personal source | Allow for own source | N/A | N/A | N/A | Policy-controlled lifecycle | Break-glass/support only with audit |
| Submit group source to staging | If a current group member | Allow for current group | Allow | Allow | Allow when service identity is approved | Allow |
| Publish group source | Deny unless also owner/publisher | Deny | Allow for owned group | Allow for entitled group/domain | Allow after automated gates and policy approval | Allow |
| Deprecate/rollback group version | Deny | Deny | Allow for owned group | Allow for entitled group/domain | Policy-controlled | Allow |
| Publish/version/deprecate/rollback organization source | Deny | Deny | Deny | Deny unless separately a system/RAG admin | Only through explicitly authorized administrative automation | Allow |
| Bypass quarantine or DLP/injection failure | Deny | Deny | Deny | Deny | Deny | No direct bypass; remediate and rerun, or use separately governed exception workflow |

Personal content is private by default. Group staging is not retrieval-eligible. Organization publication always uses separation of duties, signed versions, and audit.

### Shared ingestion governance lifecycle

```text
source or upload connector
  -> authenticate scope and operation
  -> verify ownership and consent
  -> malware and file validation
  -> classification and DLP
  -> prompt-injection and poisoning scan
  -> parse and chunk
  -> PII redaction or tokenization
  -> embed with pinned model/version
  -> write ACL-aware namespace/index partition
  -> write provenance/catalog version
  -> emit cache/index/source invalidation event
  -> eligible for retrieval only after every required gate passes
```

Any failed required gate rejects or quarantines the source. Quarantine has an isolated store, narrow reviewer role, reason code, retention limit, and no model/retrieval eligibility. Reprocessing creates a new candidate version; it does not silently mutate an approved version.

### Provenance, citations, authority, and conflict

Each candidate carries a provenance handle for source ID/version, owner/publisher, scope, authority class, ACL decision reference, source/chunk hash, classification, timestamps, parser/chunker version, embedding version, index version, and retrieval score components.

The citation manifest:

- Preserves required organization sources and marks them as authoritative.
- Records all scopes contributing to a deduplicated candidate.
- Provides stable display-safe citations while keeping sensitive source identifiers out of telemetry.
- Binds citations to the workflow run, retrieval plan hash, policy/index versions, and context item hashes.
- Enables output validation to reject unsupported or stale claims.

When personal, group, and organization evidence conflict, the pipeline retains the conflicting candidates, authority labels, and citations. A deterministic conflict classifier decides whether the disagreement is immaterial, can be resolved by declared authority rules, or must open HITL/manual review. Organization-authoritative content is not silently replaced, and personal evidence is not silently discarded when it exposes a relevant discrepancy.

### Cache isolation and privacy

Retrieval cache keys include:

```text
tenant_id
+ user_id
+ sorted eligible group IDs and role/membership epoch
+ workflow_id/version
+ effective policy decision/version
+ index/namespace versions
+ allowed scopes/domains
+ purpose/classification/consent epoch
+ query normalization/model/reranker versions
```

- No cross-user result cache is permitted.
- Shared caches may contain signed public metadata or non-sensitive model artifacts, never authorization-bearing private results.
- Raw private content is excluded from logs, traces, metrics labels, audit payloads, workflow checkpoints, and A2A artifacts unless explicitly authorized for that artifact contract.
- A2A and workflow state use provenance/reference handles where possible.
- Cache lookup rechecks current revocation/invalidation epochs; TTL alone is insufficient.

### Deletion, consent, membership, and lifecycle invalidation

The following events publish targeted invalidations:

- Source deletion or right-to-delete request.
- Consent revocation.
- Group membership removal or role loss.
- Policy update or revocation.
- Source reclassification, DLP finding, or legal/residency change.
- Workflow version change.
- Embedding/reranker/index migration or rollback.
- Source deprecation, quarantine, or authority change.

A deletion creates an immediate tombstone that denies retrieval before physical embedding removal finishes. The platform then invalidates affected embeddings, search documents, caches, Federated Retrieval Plans, and checkpoints as policy requires; propagates deletion to replicas/backups under retention policy; and records completion without retaining deleted content. Resume is allowed only after epoch checks and, when required, plan recompilation.

### Privacy-safe RAG observability

Record:

- Per-scope and per-group query/hit counts.
- Relevance and coverage distributions.
- Scoped retrieval, ACL, fusion, rerank, context-pack, and total latency.
- Required-source presence, citation completeness, authority decisions, and conflict/HITL rate.
- Policy/plan/index/model versions and invalidation decisions.
- Quarantine, embedding, deletion propagation, cache isolation, and fallback outcomes.

Redact or pseudonymize user/group/source identifiers, query text, content, embeddings, and private citation targets. Metrics dimensions must be bounded and privacy-reviewed. Audit stores decision references and hashes rather than raw private payloads.

### Hierarchical RAG threat and control table

| Threat | Required controls |
| --- | --- |
| User policy relaxes organization controls | Deterministic organization-first merge, set intersection, most-restrictive operators, signed policy versions, and resolver tests |
| Personal document shadows mandatory policy | Required organization source floor, authority scoring, reserved context budget, output citation validation, and fail closed when missing |
| Cross-user or stale-group cache leak | Full authorization-scoped cache key, no cross-user result cache, membership/consent epochs, invalidation, and lookup-time recheck |
| Vector search returns unauthorized candidates | In-query tenant/subject/group/role/purpose/classification/consent/source filters; deny post-filter-only designs |
| Arbitrary group ordering biases evidence | Resolve all current eligible groups and use explicit priority with fair floor or deterministic fair quotas |
| Membership removal remains effective too long | Revocation epoch check, event-driven cache/plan/checkpoint invalidation, and query-time membership enforcement |
| Poisoned or prompt-injected content enters index | Staged ingestion, malware/file checks, DLP, injection/poisoning detection, provenance, quarantine, and publisher/admin separation |
| Malicious publisher widens audience | Server-derived namespace/ACL policy, signed publication version, separation of duties, approval, and audit |
| Citation points to deleted or changed source | Version-bound provenance handle, tombstone check, invalidation, citation validation, and re-retrieval |
| Telemetry leaks private content or identifiers | Content logging disabled, allowlisted redacted fields, bounded dimensions, DLP scanning, and privacy-safe audit references |
| Embedding migration mixes incompatible vectors | Versioned dual-read/dual-write migration, compatibility checks, pinned plan versions, canary, and rollback |
| Strict fallback skips required authority | Required source floor executes regardless of fallback stage; compiler rejects incompatible policy |

### RAG failure matrix

| Failure | Detection | Safe behavior | Escalation/outcome |
| --- | --- | --- | --- |
| Personal index unavailable | Health/timeout/circuit for pinned user index | Continue only if effective policy permits other scopes and evidence floors still pass; never use another user cache | Labeled scope loss, degraded result, or insufficient evidence |
| Group partial failure | One or more eligible group queries fail | Preserve deterministic quotas for survivors; do not reassign failed group authority arbitrarily | Warning plus coverage gate; HITL/manual ops if material |
| Required organization source unavailable | Source/index/authority check fails | Fail closed | Dependency incident and authorized manual operations |
| ACL or policy service unavailable | Preflight/query policy dependency fails | Fail closed for protected/sensitive workflows; do not issue unfiltered query | Security/availability alert |
| Stale membership | Epoch mismatch or current membership check differs from plan | Deny removed group, invalidate cache/plan/checkpoint, and recompile if allowed | Audited stop or new immutable plan |
| Ingestion quarantine | Malware/DLP/injection/poisoning/PII/ACL/provenance gate fails | No retrieval eligibility | Authorized remediation/reprocess queue |
| Embedding failure | Worker/model/index error | Bounded retry; keep prior approved version only if still valid | Reprocessing/manual operations |
| Low relevance or coverage | Evidence floor fails | One declared bounded re-retrieval or fallback expansion | Insufficient-evidence artifact or HITL |
| Conflicting evidence | Cross-scope contradiction classifier | Preserve citations/authority; do not silently blend | Resolver, HITL, or manual policy owner |
| Cache isolation violation | Key/subject mismatch or canary/privacy detector | Block result, purge affected scope, rotate epoch | Security incident |
| Deletion propagation lag | Tombstone/reconciliation monitor | Tombstone denies immediately; invalidate caches/plans while physical deletion completes | Privacy operations with completion SLA |
| Index-version/freshness drift | Result version differs from plan or freshness policy | Reject candidates and refresh/recompile | Rollback or reindex |
| Required citation missing | Output validation cannot bind claim to manifest | Do not release unsupported claim | Re-retrieve, HITL, or fail closed |
| Residency/retention conflict | Resolver cannot find a compliant index/plan | Reject plan | Policy/data owner review |

Fallback and HITL never weaken identity, ACL, classification, residency, retention, purpose, required authority, citation, privacy, or audit controls.

## Prompt Understanding contract

Prompt Understanding returns typed, schema-validated fields rather than forwarding free text as a routing instruction:

```yaml
intent:
  name: analyze-private-records
  confidence: 0.93
entities:
  record_set_ref: symbolic-reference
risk:
  level: high
  reasons: [private-data, multi-source]
data_classification: confidential
required_capabilities:
  - records.retrieve.summary
  - analysis.compare
  - response.aggregate
requested_output_schema: analysis-report.v2
user_context:
  tenant_ref: symbolic-tenant
  granted_scopes: [workflow.execute, records.read.summary]
constraints:
  residency: required-region
  deadline_ms: 90000
```

All security context comes from validated identity and policy. Prompt-derived risk and classifications may increase controls but can never reduce them.

## Workflow selection algorithm

Conceptual pseudocode:

```text
understanding = understand_and_type(prompt, validated_identity)
eligibility = policy.filter_workflows(
  tenant, user scopes, data classification, residency, lifecycle, rollout
)

candidates = catalog.retrieve(
  exact intent/trigger rules,
  semantic examples,
  required capabilities,
  typed input schema,
  tenant service availability
)

for candidate in candidates intersect eligibility:
  score(candidate) =
    intent_match
    + capability_coverage
    + input_schema_compatibility
    + policy_eligibility
    + tenant/service_availability
    + healthy_version_rollout
    - risk_or_deprecation_penalties

if top.score >= selection_threshold
   and top.score - second.score >= selection_margin:
  selected = top.approved_version

else if top.score >= adequacy_threshold
        and top.score - second.score < selection_margin:
  persist clarification HITL with safe choices
  return clarification request

else if constrained_composition is tenant-enabled:
  candidate_graph = compose from approved capabilities + approved control nodes
  require validator and policy/human approval

else:
  return no-workflow-match with safe guidance and operations reference

definition = validate_workflow_definition(selected or approved candidate_graph)
if invalid: reject fail closed

rag_plan = effective_rag_policy_resolver(
  workflow_id/version, workflow.rag,
  tenant/user, all current group memberships/roles,
  purpose, classification, consent,
  policy/model/index/invalidation versions
)
if unresolved or unenforceable: reject fail closed

evidence = execute_federated_retrieval(rag_plan)
if required authority missing: reject fail closed
if coverage insufficient or material conflict: bounded fallback/retrieval or HITL per plan

plan = validate_compile(definition, rag_plan, citation_manifest, context_handles)
persist immutable execution plan + retrieval plan hash + policy snapshot + checkpoint
execute plan
```

### Recommended routing thresholds

- `selection_threshold = 0.85`.
- `selection_margin = 0.12` between the top two eligible candidates.
- `adequacy_threshold = 0.70`.
- If top score is at least `0.85` and the margin is at least `0.12`, select the approved workflow version.
- If top score is at least `0.70` but the margin is below `0.12`, ask a focused clarification question and route again using the persisted typed context.
- If top score is below `0.70`, report no adequate match or enter constrained composition only when tenant policy enables it.
- High-risk/private-data requests may raise thresholds or require approval; they never lower thresholds.
- Router scores and model output are advisory. Eligibility, authorization, lifecycle, rollout, and service availability are deterministic gates.

## Conceptual workflow definition schema

The normative contract is defined in [WorkflowDefinition contract and A/B -> C fan-in example](#workflowdefinition-contract-and-ab---c-fan-in-example). The following additional YAML is illustrative configuration, not runnable code; it uses the same rule that `depends_on` controls readiness while `input_bindings` exclusively control delivered fields:

```yaml
id: private-data-analysis
name: Private Data Analysis
version: 3.2.0
status: active
owner: data-intelligence-platform
intents: [analyze-private-records, compare-private-records]
triggers:
  rules: [intent-is-private-analysis]
  examples:
    - Compare my authorized records and explain the trend
workflow_input_schema_ref: schema://private-analysis-input.v2
artifact_schemas:
  retrieval: schema://record-summary.v2
  analysis: schema://analysis-findings.v3
nodes:
  - id: retrieve-authorized
    runtime_label_example: Agent A
    required_agent_capabilities: [records.retrieve.summary]
    agent_version_constraint: ">=2.0 <3.0"
    expected_input_schema_ref: schema://private-analysis-input.v2
    expected_output_schema_ref: schema://record-summary.v2
    depends_on: []
    input_bindings:
      record_set_ref: { from: workflow_input, select: $.record_set_ref }
    output_artifact: retrieval
  - id: analyze-trend
    runtime_label_example: Agent B
    required_agent_capabilities: [analysis.compare]
    agent_version_constraint: ">=3.1 <4.0"
    expected_input_schema_ref: schema://analysis-compare-input.v3
    expected_output_schema_ref: schema://analysis-findings.v3
    depends_on: [retrieve-authorized]
    input_bindings:
      record_summaries: { from: artifact, node_id: retrieve-authorized, select: $.summaries }
    conditions: [retrieval.has_sufficient_evidence]
    output_artifact: analysis
  - id: aggregate-response
    runtime_label_example: Agent N
    required_agent_capabilities: [response.aggregate]
    expected_input_schema_ref: schema://response-aggregate-input.v2
    expected_output_schema_ref: schema://analysis-synthesis.v2
    depends_on: [analyze-trend]
    input_bindings:
      findings: { from: artifact, node_id: analyze-trend, select: $.findings }
    terminal: true
parallelism:
  max_concurrency: 4
  concurrency_groups:
    private-source-read: 1
bounded_loops:
  - id: evidence-refresh
    maximum_iterations: 1
    validator_required_on_replan: true
timeout:
  workflow_ms: 90000
  default_node_ms: 30000
retry:
  max_attempts: 2
  backoff: bounded-exponential-jitter
circuit_breaker:
  profile: private-data-read
fallback:
  agent: compatible-registry-resolution
  workflow_version: 3.1.4
hitl_interrupt_policy:
  require_for: [large-volume, sensitive-field, release-external]
required_user_scopes: [workflow.execute, records.read.summary]
required_tool_scopes: [records.read.summary]
data_classifications: [confidential]
residency: [required-region]
model_policy: private-data-approved-model
rag:
  mode: hierarchical_fusion
  allowed_scopes: [user, group, organization]
  allowed_domains: [records, approved-knowledge, policy]
  per_scope:
    user: { top_k: 8, quota: 5, bounded_boost: 0.04 }
    group: { top_k: 12, total_quota: 6, bounded_boost: 0.02 }
    organization: { top_k: 10, quota: 5, bounded_boost: 0.00 }
  minimum_relevance: 0.72
  minimum_coverage: 0.80
  required_authoritative_sources: [source://organization/policy/current]
  eligible_group_selection: explicit-priority-with-fair-floor
  versions:
    embedding: embedding.v4
    reranker: cross-encoder.v3
  citations_provenance: required
  cache: { cross_user_result_cache: prohibited }
  residency: required-region
  retention: shortest-applicable-policy
  data_classification: confidential
  fail_closed: true
budgets:
  token_limit: 45000
  cost_limit: symbolic-cost-limit
  time_limit_ms: 90000
report:
  output_schema_ref: schema://analysis-report.v2
  input_bindings:
    findings: { from: artifact, node_id: aggregate-response, select: $.findings }
    citations: { from: context_pack, select: $.citation_manifest }
    execution_status: { from: run_metadata, select: $.execution_status }
  renderer_policy:
    allowed_formats: [json, html, pdf, dashboard, event]
    require_signed_template: true
rollout_percentage: 25
deprecation: null
audit:
  created_by: approved-owner
  approved_by: approved-review-group
  change_ref: symbolic-change-reference
  created_at: symbolic-time
```

A second catalog entry can use the same framework without fixing topology:

```yaml
id: knowledge-summary
name: Governed Knowledge Summary
version: 5.0.1
status: canary
owner: knowledge-platform
intents: [summarize-approved-knowledge]
workflow_input_schema_ref: schema://knowledge-query.v2
nodes:
  - id: retrieve-grounding
    runtime_label_example: Agent A
    required_agent_capabilities: [knowledge.retrieve]
    expected_input_schema_ref: schema://knowledge-query.v2
    expected_output_schema_ref: schema://knowledge-evidence.v2
    depends_on: []
    input_bindings:
      query: { from: workflow_input, select: $.query }
  - id: check-evidence
    runtime_label_example: Agent B
    required_agent_capabilities: [evidence.evaluate]
    expected_input_schema_ref: schema://evidence-evaluate-input.v2
    expected_output_schema_ref: schema://evidence-quality.v2
    depends_on: [retrieve-grounding]
    input_bindings:
      evidence: { from: artifact, node_id: retrieve-grounding, select: $.evidence_refs }
  - id: summarize
    runtime_label_example: Agent N
    required_agent_capabilities: [response.summarize]
    expected_input_schema_ref: schema://grounded-summary-input.v3
    expected_output_schema_ref: schema://grounded-summary.v3
    depends_on: [retrieve-grounding, check-evidence]
    input_bindings:
      evidence: { from: artifact, node_id: retrieve-grounding, select: $.evidence_refs }
      quality: { from: artifact, node_id: check-evidence, select: $.quality }
    terminal: true
parallelism: { max_concurrency: 3 }
bounded_loops: [{ id: reretrieve, maximum_iterations: 1 }]
retry: { max_attempts: 2 }
fallback: { workflow_version: 4.8.3 }
hitl_interrupt_policy: { require_for: [low-grounding, external-release] }
required_user_scopes: [workflow.execute, knowledge.read]
data_classifications: [internal]
model_policy: grounded-summary
rag:
  mode: org_authoritative
  allowed_scopes: [group, organization]
  required_authoritative_sources: [source://organization/knowledge/current]
  citations_provenance: required
  cache: { cross_user_result_cache: prohibited }
budgets: { token_limit: 25000, time_limit_ms: 60000 }
report:
  output_schema_ref: schema://grounded-summary-report.v3
  input_bindings:
    summary: { from: artifact, node_id: summarize, select: $.summary }
    citations: { from: context_pack, select: $.citation_manifest }
    execution_status: { from: run_metadata, select: $.execution_status }
  renderer_policy: { allowed_formats: [json, html, pdf, dashboard, event], require_signed_template: true }
rollout_percentage: 10
audit: { change_ref: symbolic-change-reference }
```

`Agent A`, `Agent B`, and `Agent N` are labels used only to explain possible runtime resolutions. They are not service identities or fixed framework roles. **Topology is workflow data/configuration, not code.**

## Constrained composition

Constrained composition is optional and disabled by default. If enabled:

1. The composer may reference only approved Agent Card capabilities, approved artifact schemas, and approved control nodes such as condition, barrier, bounded loop, HITL, aggregation, and fallback.
2. It cannot emit source code, scripts, arbitrary expressions, network addresses, endpoint names, tool names, credentials, or new scopes.
3. Capability references are symbolic. Agent endpoints are resolved later through the Agent Registry; MCP services are independently discovered by executing agents.
4. Conditions use a deterministic, versioned, non-Turing-complete expression language over typed artifacts and policy-safe metadata.
5. Loops have explicit iteration, time, token, and cost bounds.
6. The composer cannot weaken policy, classification, residency, approval, audit, retention, or HITL requirements.
7. The full candidate enters the same validator/compiler as catalog workflows.
8. Dynamic or high-risk compositions require human/admin approval before execution.
9. An approved composition may be promoted into the catalog as a new immutable version with owner, tests, rollout, and rollback metadata.
10. Invalid or unapproved composition fails closed; it is never partially executed.

## Validator/compiler checks

The validator/compiler rejects a workflow unless all checks pass:

- Workflow identity, version, lifecycle status, owner, signature, rollout eligibility, and tenant overlay.
- Known node IDs, approved node types, unique references, and known agent capabilities.
- Agent capability/version/trust/tenant/region constraints with at least one eligible service or an explicit approved wait/fallback policy.
- All workflow input, Agent Card input/output/error/stream, intermediate artifact, ContextPack/CitationManifest, MCP tool/result, and canonical report schema references resolve to approved immutable versions.
- Every required node and report input field has exactly one binding unless the destination schema declares an explicit default.
- Every binding source/destination path exists; types, cardinality, nullability, union discriminants, classifications, and additional-property rules are compatible.
- Unknown, duplicate, ambiguous, implicit additional, and unbound required fields are rejected by default.
- Every transform is a signed, versioned, allowlisted, bounded, deterministic, side-effect-free transform with compatible input/output schemas; arbitrary code is prohibited.
- Valid edge endpoints, no cycles outside declared bounded-loop constructs, no unreachable required nodes, and reachable terminal aggregation.
- Correct `depends_on` counts, barriers, join semantics, conditions, optional/quorum/null/union/default behavior, and cancellation behavior.
- Deterministic, allowlisted conditions and bounded loops.
- Fan-out, concurrency-group, node-count, token, cost, model, time, and external-call budgets.
- Retry, timeout, idempotency, circuit-breaker, compensation, and schema-compatible fallback policies.
- Error, repair, retry, fallback agent, migration/adapter, and partial/degraded output schema compatibility.
- Required user, A2A, tool, and downstream scopes; data classification, residency, purpose, retention, and egress constraints.
- Required workflow, node, tool, and output-release HITL gates.
- Model/RAG/memory policy, grounding requirements, provenance, minimization, and redaction requirements.
- Report constructability from terminal artifacts, CitationManifest, run metadata, quality/policy/HITL decisions; canonical report validation; signed disclosure-aware renderer policy.
- MCP compatibility between the agent's input need, tool input/output schemas, and the structured result artifact admitted to agent context.
- Workflow, agent, MCP, identity, audit, and tenant/service availability.
- No model-supplied endpoint, service ID, or tool name bypasses a registry.

Validation produces deterministic diagnostics. It does not silently remove nodes, widen scopes, substitute incompatible agents, or weaken controls.

## Immutable compiled execution plan

The compiled plan is persisted before dispatch:

```yaml
workflow_run_id: symbolic-run
workflow_id: private-data-analysis
workflow_version: 3.2.0
workflow_definition_hash: sha256-symbolic-definition
plan_hash: sha256-symbolic-plan
authorization_manifest_hash: sha256-symbolic-authorization-manifest
compiled_at: symbolic-time
compiler_version: workflow-compiler.v1
workflow_input_schema_ref: schema://private-analysis-input.v2
schema_pins:
  retrieval_input: schema://private-analysis-input.v2
  retrieval_output: schema://record-summary.v2
  analysis_input: schema://analysis-compare-input.v3
  analysis_output: schema://analysis-findings.v3
  report_output: schema://analysis-report.v2
binding_graph_hash: sha256-symbolic-binding-graph
policy_snapshot:
  policy_version: policy-symbolic
  policy_snapshot_hash: sha256-symbolic-policy
  revocation_epoch: 88
  user_tenant_scope_ref: symbolic-authorized-context
  data_classification: confidential
authorization:
  stage: authorized_plan
  workflow_eligibility: allow
  decision_ids: [decision://eligibility/1, decision://preflight/2]
  reason_codes: [eligible, manifest-allowed]
  evidence_refs: [evidence://identity/symbolic, evidence://policy/symbolic]
  allowed_agent_capabilities:
    - { capability: records.retrieve.summary, trust: regulated, version: ">=2.4 <3.0" }
  allowed_mcp_capabilities_tools:
    - { capability: records.lookup, category: records-read, risk: read }
  allowed_rag_scopes_data_classes:
    scopes: [user, group, organization]
    data_classes: [internal, confidential]
  allowed_models_regions:
    providers: [approved-regulated-provider]
    models: [approved-model-family]
    regions: [approved-region]
    retention: no-retain
    training: prohibited
  field_projections_hash: sha256-symbolic-field-projections
  report_disclosure_policy_hash: sha256-symbolic-report-disclosure
  token_constraints:
    max_lifetime_seconds: 300
    audience_scope_plan_node_nonce_binding: required
  fallback_authorization_set: [fallback://records-compatible]
  expiry: symbolic-time-plus-bounded-window
federated_retrieval_plan:
  plan_id: rag-plan-symbolic
  plan_hash: sha256-symbolic-rag-plan
  mode: hierarchical_fusion
  allowed_scopes: [user, group, organization]
  eligible_groups: [finance, research]
  security_precedence: organization-group-user
  policy_versions: { organization: 19, finance: 8, research: 4, user: 6 }
  index_versions: { user: 17, finance: 31, research: 12, organization: 44 }
  quotas: { user: 5, finance: 3, research: 3, organization: 5 }
  required_authoritative_sources: [source://organization/policy/current]
  citation_manifest_ref: provenance://manifest/symbolic
  cache_scope: tenant-user-groups-workflow-policy-index-scopes
  invalidation_epochs: { plan: 133, policy: 88, membership: 42, consent: 17 }
nodes:
  retrieve-authorized:
    capability: records.retrieve.summary
    selected_agent_service_id: records-agent
    selected_agent_version: 2.4.1
    selected_agent_endpoint_ref: service://records-agent
    agent_card_hash: sha256-symbolic-card
    input_schema_ref: schema://private-analysis-input.v2
    output_schema_ref: schema://record-summary.v2
    input_bindings:
      record_set_ref: { from: workflow_input, select: $.record_set_ref }
depends_on:
  retrieve-authorized: []
  analyze-trend: [retrieve-authorized]
  aggregate-response: [analyze-trend]
initial_ready_set: [retrieve-authorized]
barriers:
  analyze-trend: { type: all, required: [retrieve-authorized] }
conditions:
  analyze-trend: [retrieval.has_sufficient_evidence]
budgets:
  token_limit: 45000
  time_limit_ms: 90000
  max_concurrency: 4
hitl_gates: [large-volume, sensitive-field, release-external]
fallbacks:
  agent: compatible-registry-resolution
  workflow_version: 3.1.4
artifact_pipeline:
  output_validation: required
  field_policy_projection: required
  persistence_and_hash_before_dependency_acceptance: required
  downstream_input_validation: required
report:
  output_schema_ref: schema://analysis-report.v2
  input_bindings_hash: sha256-symbolic-report-bindings
  renderer_policy_hash: sha256-symbolic-renderer-policy
```

The plan is immutable for the run. Checkpoints persist the plan hash, authorization manifest hash, policy snapshot hash/version, revocation epoch, decision IDs, and parent checkpoint. The plan stores token constraints and references, never raw bearer tokens. A failover task attempt may use only a pre-authorized compatible alternate or a newly compiled, validated, authorized plan revision. Any bounded replan creates a new immutable plan revision with parent hash, reason, approvals, fresh complete manifest, PDP decisions, policy snapshot, and audit event; it never mutates history.

## LangGraph runtime scheduling

```text
load immutable plan and checkpoint
verify plan hash, authorization manifest hash, policy validity, revocation epoch,
membership/consent/service-trust state, retrieval-plan validity, and resume eligibility

if retrieval is required and cited context is not already valid:
  resolve effective organization/group/user RAG policy
  freeze immutable Federated Retrieval Plan
  query eligible scopes according to mode with authorization filters in every query
  dedupe, fuse, rerank, enforce required organization authority, and check coverage/conflict
  open HITL or fail closed when the retrieval plan requires it
  validate and persist typed ContextPack/CitationManifest references

while terminal aggregation is incomplete:
  ready_set = enabled nodes whose accepted dependencies and conditions pass
  for each ready node:
    assemble input from only declared workflow/artifact/ContextPack bindings
    apply field-level purpose/classification/minimum-necessary projection
    validate complete pinned Agent Card input schema
    resolve/confirm pinned A2A service through Agent Registry
    reauthorize principal/delegation + workflow/run/plan/node + exact agent service
    issue node-scoped, short-lived, audience-bound token; never forward user token
    dispatch A2A envelope separate from business payload
  track task status and raw structured output candidates

  for each terminal task:
    parse and validate the pinned output schema
    if malformed, apply bounded repair/retry; then compatible fallback, permitted HITL, or fail
    validate task binding, identity, provenance, policy, classification, and budget
    project permitted fields; persist immutable artifact; verify content hash
    update running_set and completed_set
    only after validation and durable persistence, decrement accepted dependency counts
    open declared barriers when join policy passes

  if workflow requires a decision:
    persist HITL interrupt and checkpoint; never auto-approve

  if bounded replan is requested:
    send candidate revision through validator/compiler and required approval
    continue only with a new immutable validated plan revision

  if no node is ready or running while required nodes remain:
    classify blocked dependency, deadlock, unavailable capability, or policy stop

bind one canonical report object from declared terminal artifacts, CitationManifest, run metadata, HITL, quality, and policy
validate report schema and disclosure policy
reauthorize disclosed fields, renderer/template, recipient, destination and channel
render JSON/HTML/PDF/dashboard/event through signed isolated templates without changing facts
apply checkpoint, audit, and payload-free telemetry
reauthorize each delivery/download against current policy and report hash; return protected response
```

The scheduler has no branches for `private-data-analysis`, `knowledge-summary`, four agents, or any particular topology.

## Agent and MCP execution contracts

### A2A

A2A delegates workflow nodes to autonomous executors. Each task is bound to the workflow run, plan hash, workflow/node versions, selected agent service/version, capability, pinned input/output/error/stream schemas, delegated identity reference, purpose, deadline, idempotency key, and policy snapshot. Its transport envelope carries task/context/correlation/workflow/plan/node IDs, payload schema/artifact references, identity/policy token references, sensitivity, purpose, expiry, and typed status/error separately from the business payload. Status is monotonic and contains no raw PHI. Cancellation and retry are authenticated and idempotent. Agent output is a raw structured candidate until the Runtime Contract Gateway validates, projects, persists, and hashes it; only the resulting artifact may unlock dependencies.

Every registered agent:

- Is an independently deployable and scalable A2A microservice.
- Publishes a signed Agent Card with capability ID/version range, `input_schema_ref`, `output_schema_ref`, supported artifact/media types, required scopes/classifications/trust tier, optional streaming/chunk schema, error schema, endpoint reference, tenant/region eligibility, health, capacity, and owner.
- Uses a generic `DynamicMCPClient`.
- Has no fixed neighboring agent or hard-coded MCP endpoint dependency.
- Returns minimized artifacts with confidence, warnings, policy labels, and provenance references.

### MCP

MCP lets an executing agent discover and invoke tools. `DynamicMCPClient` sends a capability request, expected schemas, exact requested scopes, classification, purpose, tenant/user delegation reference, trust, region, and deadline to the policy gateway. The gateway filters the metadata-only MCP registry and returns authorized compatible metadata. Compatibility mediation proves the agent's typed need can be constructed for the tool input schema and that the tool output can be validated and projected into the expected result schema. The structured MCP result re-enters the same validation, classification, provenance, immutable artifact, and field-projection pipeline before it can reach agent context.

The client performs `listTools`/capability negotiation, schema validation, short-TTL authorization-scoped metadata caching, token-free connection pooling, timeout, bounded retry, circuit breaking, and alternate service selection. MCP streamable HTTP is the production transport; stdio is local development only.

### A2A, MCP, LangGraph, HITL, and Workflow responsibilities

| Concern | Workflow | LangGraph | A2A | MCP | HITL |
| --- | --- | --- | --- | --- | --- |
| Topology | Declares nodes, dependencies, conditions, loops, barriers, aggregation | Executes compiled topology | Runs one resolved node task | Used inside a task, not topology | Pauses routing, approval, node, tool, or release decisions |
| Selection | Router selects workflow version | Uses immutable plan | Agent Registry resolves capability | MCP Registry resolves tool capability | Clarifies ambiguity or approves governed risk |
| State | Defines typed schema refs, `depends_on`, bindings, artifact and report contracts | Maintains sets, counts, checkpoints and accepted artifact IDs | Emits safe status and raw structured output candidates | Returns typed tool result/provenance candidates | Persists exact request/decision/expiry |
| Policy | Declares required controls and budgets | Enforces plan/policy snapshot | Enforces task delegation | Enforces exact tool/data scopes | Cannot bypass hard controls |
| Failure | Declares retry/fallback/replan policy | Classifies and applies bounded behavior | Reports executor/task failure | Reports discovery/tool/source failure | Resolves only allowed human decisions |

## Private-data and plugin invariants

```text
Any authorized agent
  -> DynamicMCPClient
  -> policy/discovery gateway
  -> metadata-only MCP registry
  -> selected MCP service and approved Plugin Host
  -> connector logic/configuration/mappings/schema
  -> managed secret reference + OAuth token exchange/OBO
  -> external source under server-derived tenant/user RLS context
  -> field filtering + minimization + redaction/tokenization
  -> structured result + provenance + policy labels
```

- Plugins never contain or persist private user data.
- Private data stays in external databases and is retrieved just-in-time.
- Direct agent-to-database access is prohibited.
- External systems enforce tenant partitioning and RLS; connector filtering is not the security boundary.
- No cross-user private-data cache exists. Private-result caching is disabled by default.
- Raw private data, prompts, tokens, secrets, connector credentials, and private rows never enter registry metadata, plan state, logs, traces, metrics labels, or audit payloads.
- Sensitive access fails closed if required privacy-safe audit cannot be recorded.
- RAG and memory are tenant-, purpose-, retention-, and provenance-governed. Private cross-request memory is disabled by default.

## Workflow lifecycle and governance

```text
draft -> validate -> approve -> canary -> active -> deprecated
             ^          |          |         |
             +----------+----------+---------+-> rollback to healthy pinned version
```

| Stage | Gate |
| --- | --- |
| Draft | Owner, schemas, capabilities, tests, policy metadata, budgets, and change reference are present |
| Validate | Static graph/compiler checks, policy simulation, service eligibility, contract tests, privacy tests, and failure tests pass |
| Approve | Authorized human/admin signs version; high-risk and composed definitions have required reviewers |
| Canary | Tenant/percentage rollout with score, quality, latency, cost, error, override, and policy monitors |
| Active | Healthy version is eligible for normal routing within rollout and tenant filters |
| Deprecated | Removed from new routing; retained only for approved resume/retention windows |
| Rollback | Router stops selecting unhealthy version and pins the last healthy approved version; in-flight behavior follows plan and emergency policy |

Workflow definitions are immutable after approval. Changes create a new version. Tenant-specific overlays may narrow scopes, rollout, residency, budgets, or eligible versions; overlays cannot widen base authority.

## Caching, versioning, and rollback

- Cache only signed workflow metadata, semantic indexes, and authorization-safe candidate features.
- Key candidate caches by catalog generation, tenant overlay, lifecycle, rollout cohort, classification, and policy version.
- Use short TTLs for health and availability; revocation and policy changes invalidate relevant entries immediately.
- Cache no prompt payloads or private results in shared routing caches.
- Pin workflow version and plan hash per run. Resume requires the same plan unless policy mandates revalidation.
- Retain the current and at least one known-good rollback version through the rollback window.
- A version marked unhealthy is removed from new routing. Existing runs pause, continue, or migrate only according to emergency policy and validator-approved plan revision.
- Agent or MCP failover never relaxes capability, schema, trust, tenant, residency, classification, or scope constraints.

## Observability

Every run emits privacy-safe correlated events for:

- Schema contract IDs/versions/hashes, compatibility mode/result, resolution latency, version adoption, deprecation impact, migration/adapter, and rollback status.
- Binding graph hash; exactly-one/path/type/condition/union/default diagnostics; binding latency; downstream input validation; no bound field values.
- Raw-output validation status, bounded repair attempt/exhaustion counts, field-projection reason codes, artifact IDs/hashes/size buckets/persist latency/integrity, and barrier wait.
- Canonical report schema/validation/status/hash, partial/degraded/fallback reason codes, renderer/template version, disclosure decision, rendering latency, and output integrity.
- Typed intent/confidence, required capabilities, risk, and data classification.
- Candidate workflow IDs/versions, per-factor scores, threshold, margin, exclusions, selected version, clarification, or no-match reason.
- Composition status, validation diagnostics, approvals, promotion reference, and catalog lifecycle.
- Plan hash, policy snapshot, compiler version, agent resolution versions/endpoints, and checkpoint lineage.
- Node queue time, start/end, attempts, ready/running/completed sets, dependency counts, barrier/condition outcomes, and bounded replan lineage.
- A2A latency/status/artifact schema; MCP discovery/service/tool metadata, provenance, minimization markers, and circuit state.
- Token, cost, time, external-call, and concurrency budget consumption.
- Failures, fallbacks, version rollback, human overrides, DLQ/manual operations, and final classified outcome.
- Outcome quality, grounding/citation quality, user clarification rate, routing precision, workflow success rate, and policy false-positive review.

No event contains raw private records, bearer tokens, secrets, connector credentials, unrestricted prompts, bound input values, artifact bodies, MCP results, ContextPack chunks, canonical report contents, or model-generated endpoint names.

## Security and threat controls

| Threat | Required controls |
| --- | --- |
| Prompt injection selects privileged workflow | Treat router/model output as advisory; filter by validated user/tenant scopes, classification, lifecycle, rollout, and policy before scoring and again before compile/execute |
| Incomplete whole-graph authorization | Compiler enumerates every reachable required, optional, fallback, agent, MCP category, RAG scope/source, model, artifact projection, report renderer/destination/download, HITL, budget, environment, and region into a Complete Authorization Manifest; PDP preflight is mandatory before dispatch |
| Model supplies endpoint/tool name | Workflow references capabilities only; accept endpoint/service/tool identifiers only from signed Agent/MCP registry resolution |
| Composer creates executable payload | Approved node templates and deterministic expressions only; no code, scripts, URLs, credentials, or arbitrary tool names |
| Workflow grants new scopes | Compiler intersects declared requirements with validated identity, consent, tenant policy, Agent Card, MCP metadata, and downstream policy; missing scope rejects |
| Stale plan resumes after policy change | Verify policy snapshot and revocation epoch on resume; pause and revalidate or stop |
| Malicious workflow version | Signed immutable versions, separation of duties, tests, approval, canary, health gating, audit, and rollback |
| Agent selection crosses tenant/trust boundary | Registry filtering and endpoint identity binding by capability, schema, version, tenant, trust, region, health, and plan constraints |
| Confused deputy uses platform reach as user authority | Every downstream PEP validates both service identity and originating user delegation bound to workflow/plan/node/resource/action/purpose; network reach or workload identity alone never authorizes the action |
| Cross-tenant private-data access | Delegated tenant binding, exact scopes, service-side authorization, database tenant partitioning, and server-side RLS |
| Plugin contains or persists records | Signed package scanning, connector-only schema, storage/egress deny by default, and runtime detection |
| Excessive data reaches model | Purpose-bound field/volume limits, aggregation, minimization, redaction/tokenization, model policy, and scoped HITL |
| Raw data enters telemetry | Payload logging disabled, field allowlists, DLP scanning, safe errors, and audit fail-closed for sensitive access |
| Approval widens authority | Bind approval to plan hash, user, tenant, scopes, classification, volume, purpose, destination, expiry, and reviewer authority |
| Unbounded retry/replan | Global and per-node budgets, idempotency, bounded loops, circuit breakers, validator-only replan, and hard deadlines |

## Failure and escalation matrix

| Failure | Detection | Required behavior | Escalation/outcome |
| --- | --- | --- | --- |
| No workflow match | Top score below adequacy threshold | Use constrained composition only if enabled; otherwise do not execute | Safe no-match response, catalog operations reference, optional manual design queue |
| Ambiguous match | Adequate candidates within selection margin | Persist typed context and ask focused clarification | HITL interrupt; reroute after answer; timeout never auto-selects |
| Invalid composed graph | Validator rejects schema, graph, policy, budget, or availability | Fail closed before dispatch | Return deterministic diagnostics; send to author/admin queue |
| Workflow/version eligibility denied | Eligibility PDP rejects principal/tenant/purpose/relationship | Remove candidate; never compile or dispatch it | Select another independently eligible candidate or return safe denial |
| Required authorization manifest entry denied | Whole-graph PDP preflight returns a required denial | Reject before any A2A/MCP/RAG/model dispatch | Privacy-safe decision/reason code; author/security review |
| Optional manifest entry denied | PDP denies an optional branch | Prune only when workflow schema and policy explicitly allow omission and report constructability revalidates | Rebuild manifest and freeze narrowed plan; otherwise reject |
| Unauthorized fallback/alternate | Candidate is absent from pre-authorized fallback set or incompatible | Do not use it | New compiled/validated/authorized plan revision or fail closed |
| Unresolved/incompatible schema or migration failure | Contract resolution, compatibility, lifecycle, signature, adapter, or migration result fails | Reject before publish/plan; keep source artifact and prior plan immutable | Approved compatible pin/adapter/rollback only; otherwise author/governance correction |
| Binding missing/path/type/ambiguity | Exactly-one, source/destination path, type, cardinality, nullability, union/default, or additional-property check fails | Reject before plan; no dispatch | Correct definition or approved deterministic adapter; never infer mapping |
| Approval denied/timeout | Required composition/high-risk approval not granted | Do not compile/execute or release | Audited stop; optional manual review |
| Workflow version unhealthy | Health/SLO/canary gate trips | Remove from new routing and select approved known-good version | Rollback alert; pause incompatible in-flight runs |
| Agent capability unavailable | No eligible Agent Card/service for node | Keep node out of `ready_set`; apply declared compatible fallback/wait | HITL/config operations, DLQ, or blocked outcome |
| Mid-run agent/MCP/service failure | Timeout, terminal failure, circuit, invalid output/artifact, or schema incompatibility | Bounded idempotent retry; compatible registry re-resolution only | Labeled degraded result only if report schema and policy explicitly permit; else checkpoint/DLQ/manual ops |
| Budget exhausted | Token/cost/time/external-call limit reached | Stop new dispatch; cancel safely; checkpoint | HITL for explicit extension if policy allows, otherwise partial/blocked audited outcome |
| Policy changed after checkpoint | Revocation epoch or policy snapshot mismatch | Pause before resume or next protected action; revalidate plan | New approved plan revision or audited stop |
| PDP unavailable or cached decision stale | PDP timeout/unavailable, TTL/policy/epoch/key mismatch | Exact bounded safe cache only when policy permits; otherwise fail closed | Retry control plane, pause, or audited stop; never success-shaped fallback |
| A2A/MCP token invalid or replayed | Audience/scope/expiry/nonce/plan-node-tool/idempotency check fails | Reject at ingress; no action | Reauthenticate/re-exchange only within plan; alert on replay |
| Confused-deputy attempt | Workload can reach service but originating delegation does not authorize action | Deny despite network/service identity | Security alert and privacy-safe evidence |
| Bounded replan rejected | Validator/policy/approval rejects candidate revision | Preserve prior immutable plan; do not mutate checkpoint history | Continue prior safe path if possible, otherwise blocked/DLQ/manual ops |
| Condition/barrier unsatisfied | No ready/running nodes while required nodes remain | Apply only declared optional/quorum/fallback semantics | Deadlock/blocked outcome and operations alert |
| Invalid A2A output or repair exhausted | Parse/output schema/provenance/policy mismatch or repair budget exhausted | Reject candidate; do not persist/accept artifact or decrement dependency counts | Compatible fallback or schema-constrained HITL only if declared; otherwise fail; DLQ refs/metadata only |
| Artifact persistence/hash failure | Durable commit or content hash verification fails | Do not accept artifact; barrier remains closed | Idempotent bounded retry/circuit, then fail/manual operations; never accept metadata alone |
| Canonical report construction/validation failure | Required report binding unavailable or report/disclosure schema fails | Do not invoke renderer or release | Typed partial/degraded report only if schema and policy explicitly permit; otherwise fail |
| Report disclosure/render/delivery/download denied | Field, renderer/template, recipient, destination, channel, or download action is not currently authorized | Do not render, deliver, or issue download token | Narrower schema-valid report only when policy permits; otherwise no disclosure |
| Renderer/template failure | Signature/version/sandbox/timeout/output integrity check fails | Canonical report remains immutable; requested presentation unavailable | Retry or signed compatible renderer; explicit render failure; renderer cannot change facts |
| MCP registry unavailable | Discovery fails | Use only unexpired authorization-scoped metadata with live auth/health, else stop | Labeled dependency failure |
| Identity/OBO failure | Token exchange or audience/scope validation fails | One bounded reauthentication when refreshable; never use stale token | Reauthenticate or stop/escalate |
| RLS/tenant/redaction/audit failure | Security invariant check fails | Immediate fail closed; emit no protected data | Security alert, audited incident, manual operations |
| Low RAG grounding | Evidence/quality policy fails | One bounded re-retrieval if declared and validated | HITL or insufficient-evidence artifact |

Retries share end-to-end budgets. Fallbacks never weaken identity, authorization, capability, schema, data classification, residency, trust, HITL, provenance, or audit.

## Generic extension process

### Add or change a workflow

1. Define typed intent/examples, workflow input schema, node input/output/error/stream schemas, capabilities, `depends_on`, explicit input bindings, conditions/optional/union/default behavior, joins, loops, HITL, resilience, budgets, canonical report schema/bindings, renderer policy, owner, and audit metadata.
2. Reference approved capabilities, never endpoints.
3. Run exactly-one binding, source/destination path/type, conditions/optional branches, safe transform, error/fallback, report constructability, policy simulation, capability availability, schema compatibility, security/privacy, failure, and budget tests.
4. Obtain required approval and publish a new immutable catalog version.
5. Canary by tenant/percentage and monitor routing, quality, latency, cost, policy, failure, and override signals.
6. Promote to active or roll back. Deprecate old versions only after resume and retention windows.

### Add an agent capability

1. Implement the standard A2A executor with structured output, workload identity, idempotency, cancellation, safe status, telemetry, and generic `DynamicMCPClient`; output remains untrusted until the platform artifact gateway accepts it.
2. Publish a signed Agent Card with capability/version range, input/output/error/optional stream schemas, artifact/media types, required scopes/classifications/trust tier, endpoint reference, tenant/region constraints, health, capacity, and owner.
3. Add policy entitlements and contract/failure/privacy tests.
4. Reference the capability in workflow data. No scheduler topology code changes.

### Add an MCP capability

1. Deploy an independently versioned MCP service and Plugin Host.
2. Define approved tool input/output schemas, expected artifact result schema, scopes, classification, side effects, volume, HITL, trust, region, health metadata, and compatibility mediation.
3. Implement delegated identity, RLS, JIT source access, minimization, redaction, provenance, audit, and no private-data persistence.
4. Register metadata and authorize discovery. Agents keep using capability requests; no agent receives a hard-coded endpoint, and every MCP result enters the validated artifact/provenance pipeline before agent context.

## Phased implementation plan

### Phase 0: Platform boundaries, identity, and infrastructure foundation

1. Ratify the seven plane boundaries, owning teams, cross-plane schemas, versioning rules, trust boundaries, prohibited coupling, and security/privacy/governance/FinOps guardrails.
2. Define typed Prompt Understanding, workflow identity/version, tenant/user principal, purpose, classification, consent, group membership/role, revocation epoch, and policy-version contracts.
3. Select authoritative identity, membership, consent, policy, residency, retention, legal-hold, and classification providers; define workload identity, audience binding, KMS/secrets/certificate references, and OBO exchange.
4. Establish compute/orchestration, service mesh/network/API gateway, durable plan/checkpoint/catalog storage, event bus/queues/DLQ/cache, object/provenance storage, ACL-aware vector/search, model gateway, regional placement, backup, and DR foundations.
5. Define the ACL-aware query contract and prove authorization filters execute inside candidate generation for every physical index or logical namespace.
6. Define cache-key dimensions, no-cross-user result-cache controls, data minimization, telemetry redaction, audit references, and fail-closed dependencies.

Exit evidence: plane contract tests, threat model, tenant/region isolation, identity/OBO, backup/restore, policy simulation, consent revocation, membership removal, stale epoch, residency, and ACL/policy/audit failure tests pass.

### Phase 1: Configuration and Observability & SRE planes

1. Implement the configuration schema and authoring/read APIs for workflow definitions, Agent Cards, MCP metadata/scopes, model/RAG policies, prompts, budgets, flags, retention, residency, and environment/region overlays.
2. Implement deterministic hierarchy resolution: organization baseline -> every applicable group overlay -> user overlay, with most restrictive security winning. Enforce user personal-RAG ownership, group submission plus owner/`rag.publisher` approval, and administrator-only organization RAG.
3. Add validation, policy simulation, approval, signed immutable versions, canary, rollback, watch/event publication, consumer acknowledgement, expiry, last-known-good rules, and effective config snapshot/hash binding per run. Store secret IDs only, never secret values or private user data.
4. Establish OpenTelemetry conventions for trace/A2A/MCP correlation IDs and workflow/config/plan/model/RAG tags; deploy privacy-safe trace, log, metric, health, audit, quality, and cost pipelines before business execution.
5. Define the SLO hierarchy and error budgets for platform, plane, service/capability, tenant tier, and critical workflow; implement alerts, dashboards, runbooks, on-call, incident, replay, synthetic, canary, shadow, and rollback-recommendation workflows.
6. Implement policy-bounded `SREAction` and reviewed `ChangeProposal` contracts. Prove scale/throttle/circuit/failover/rollback cannot weaken identity, tenant, purpose, classification, RLS, residency, provenance, schema, or audit.
7. Establish control-plane HA, tenant isolation for operations, telemetry retention/deletion, configuration propagation consistency, and regional failover.

Exit evidence: hierarchical configuration simulations, approval/RBAC, immutable hash reproducibility, rollback, propagation-lag behavior, privacy/DLP telemetry tests, correlated synthetic runs, SLO burn alerts, and safe SRE action drills pass.

### Phase 2: Governed ingestion and scoped data foundation

1. Implement separate personal, group staging/publication, and organization administrative APIs with the RBAC matrix in this document.
2. Implement the shared governance pipeline: ownership/consent, malware/file validation, classification/DLP, injection/poisoning scan, parse/chunk, PII controls, versioned embedding, ACL namespace write, and provenance.
3. Build isolated quarantine and approval workflows. Group members can submit, but only owners, `rag.publisher`, or approved automation can publish; organization publication remains administrator-only.
4. Add signed source versions, deprecation/rollback, tombstones, right-to-delete, reclassification, and source/index invalidation events.
5. Prove rejected/quarantined content cannot become retrieval-eligible or enter model context/telemetry.

Exit evidence: personal privacy defaults, group staging/approval, organization separation of duties, poisoning/DLP quarantine, provenance completeness, and deletion propagation tests pass.

### Phase 3: Federated retrieval

1. Implement the Effective RAG Policy Resolver and immutable Federated Retrieval Plan schema.
2. Implement `hierarchical_fusion` as the default, `strict_fallback` as an explicit workflow option, and `org_authoritative` with a mandatory organization source floor.
3. Resolve all current eligible groups; implement explicit priority with a fair minimum or deterministic fair quotas when priority is absent.
4. Implement parallel scoped retrieval, in-query ACLs, per-scope quotas, canonical dedupe, bounded scope boosts, cross-encoder/LLM rerank, authority/freshness/risk scoring, and context-budget packing.
5. Implement citation/provenance manifests, coverage thresholds, conflict classification, required-source enforcement, and insufficient-evidence/HITL outcomes.
6. Prove that personal content cannot shadow required organization policy and that low-quality evidence is not admitted merely to fill a quota.

Exit evidence: relevance/coverage benchmarks, authority-conflict fixtures, fair multi-group tests, cache-isolation tests, index-failure tests, and citation validation pass.

### Phase 4: Workflow compiler and runtime integration

1. Extend the versioned Workflow Catalog schema with workflow input, per-node input/output/error/stream schema refs, `depends_on`, explicit input bindings, optional/union/default behavior, canonical report bindings/renderer policy, and RAG policy fields while retaining four separate Workflow, A2A Agent, MCP Service, and Schema/Contract registries.
2. Update the validator/compiler to resolve exact schema versions; prove exactly-one bindings, paths/types/additional-property rules, conditions/optional branches, safe transforms, fallback/error compatibility and report constructability; also validate RAG requirements, effective config hash, policy/model/index versions, quotas, required authority, cache/residency/retention, and fail-closed behavior.
3. Bind schema pins, binding graph, Federated Retrieval Plan, ContextPack/CitationManifest handles, Agent Card resolutions, budgets, approvals, report/renderer policy, and invalidation epochs into one immutable Execution Plan/checkpoint hash.
4. Implement plan-driven LangGraph `ready_set`, `running_set`, `completed_set`, artifact-accepted dependency counts, conditions, barriers, bounded loops, persistent HITL, budget enforcement, checkpoint/resume, and validator-only replan.
5. Demonstrate multiple workflow shapes and agent counts from data/configuration without topology-specific runtime branches.

Exit evidence: selected workflows deterministically reproduce configuration/policy/retrieval decisions, checkpoint/resume rejects stale epochs, invalid plans fail before dispatch, and all runs correlate to established telemetry.

### Phase 5: Independent A2A agents and dynamic MCP

1. Define Agent Card, capability resolution, A2A envelope/payload separation, safe status/error, structured output candidate, Runtime Contract Gateway, immutable artifact metadata/store, delegation, health, version pinning, explicit binding, and compatible fallback contracts.
2. Implement a Capability Operator as the sole Agent/MCP deployment authority.
   It verifies signed immutable release bundles, reconciles allowlisted Helm
   packages into isolated Agent or MCP runtime namespaces, applies workload
   identity, queue permissions, security, network, quota, disruption,
   autoscaling, and observability profiles, and rejects unmanaged drift.
3. Deploy independently scalable agent microservices; every agent uses the same generic `DynamicMCPClient` and has no fixed neighbor or hard-coded tool endpoint.
4. Deploy the separate metadata-only MCP Service Registry and policy/discovery gateway with streamable HTTP, workload identity, delegated OBO, consent, tool input/output schemas, agent/tool compatibility mediation, deadlines, circuits, and compatible selection.
5. Automatically discover and validate the runtime service descriptor, Agent
   Card or MCP tools/resources/prompts, schemas, health, capacity, metrics,
   dashboards, alerts, evaluation state, dependencies, and evidence after
   operator deployment. Candidate registration does not become active until
   signed-bundle verification and canary gates pass.
6. Deploy connector-only Plugin Hosts and enforce external source tenant partitioning/RLS, JIT access, minimization, redaction/tokenization, provenance, and no raw telemetry.
7. Use only provenance/reference handles in A2A/workflow artifacts unless the artifact contract and field policy explicitly authorize minimized content; validate and persist MCP results before any agent binding.
8. Deploy the Canonical Report Aggregator and signed disclosure-aware renderer sandboxes; prove JSON/HTML/PDF/dashboard/event views preserve one canonical report hash.

Exit evidence: independent scale/canary/failover, task binding, schema validation, dynamic MCP discovery from every agent, RLS, minimization, and private-data handling tests pass.

### Phase 6: End-to-end resilience, invalidation, and rollout

1. Implement event-driven invalidation for source deletion, consent revocation, membership/role removal, policy/configuration update, reclassification, workflow/model/index version change, quarantine, deprecation, and rollback.
2. Complete privacy-safe quality telemetry for scope/group hit counts, relevance/coverage, groundedness, citation correctness, policy/authority decisions, conflict/HITL, cache isolation, ingestion, deletion, and plan/checkpoint invalidation without content leakage.
3. Run failure injection for configuration propagation, control-plane HA, workflow routing/composition, policy/ACL/audit, personal/group/org indexes, required authority, membership staleness, quarantine, embeddings, cache isolation, deletion lag, A2A/MCP, HITL, budgets, and DLQ/manual operations.
4. Complete security/privacy review, load/fairness tests, disaster recovery, regional failover, model/index migration, retention/deletion, SLO/error-budget exercises, canary, shadow, rollback, and manual-operations drills.
5. Remove example-specific topology logic only after plan-driven parity and operational evidence are complete.

**No phase changes Python or other implementation code now.** Implementation begins only after the conceptual contracts, defaults, governance, plane ownership, and threat model are approved.

## Open questions and recommended defaults

| Open question | Recommended default |
| --- | --- |
| Centralized or federated Configuration Plane? | Use one logically centralized schema, policy, version ledger, hierarchy resolver, and effective-snapshot contract, with regionally replicated read/cache and event-distribution nodes. Permit federated domain authoring only through the same validation, approval, signing, and publication contract. |
| SRE tenant isolation? | Partition telemetry, dashboards, alerts, automation credentials, rate limits, and operator authorization by tenant and environment. Cross-tenant aggregate metrics must be de-identified; tenant-scoped incident access is time-bound, least-privilege, and audited. |
| Telemetry retention? | Apply the shortest approved purpose- and classification-specific window; separate high-volume operational metrics from audit retention, prohibit raw private content, aggregate early, and support tenant deletion/legal-hold policy without extending unrelated data. |
| SLO hierarchy? | Define platform and plane SLOs, then service/capability and critical-workflow objectives with tenant-tier overlays. Use the strictest applicable objective for release/fallback decisions and prevent one tenant's burn from consuming another tenant's budget. |
| Environment and region overlays? | Resolve immutable base -> environment -> region -> tenant organization -> group -> user overlays. Infrastructure placement may narrow availability; no overlay may widen security, residency, model, tool, data, or release authority. Record the full merge trace and hash. |
| Configuration propagation consistency? | Require strongly consistent version creation and approval; distribute snapshots with monotonic versions, signatures, acknowledgement, and bounded staleness. Security revocations use push invalidation and fail closed after the allowed propagation window; never mix fields from different versions. |
| Configuration/control-plane HA? | Use multi-zone quorum for writes, multi-region replicated reads, tested leader/failover behavior, signed last-known-good snapshots with explicit expiry, and an offline emergency rollback path requiring two-person approval. Sensitive operations stop when freshness or signature cannot be proven. |
| Catalog-only or constrained composition? | Catalog-only by default. Enable constrained composition per tenant after governance maturity; always validate and require approval for dynamic/high-risk compositions. |
| Tenant-specific workflow overlays? | Allow narrowing overlays for eligible versions, rollout, budgets, residency, scopes, and approvals. Never allow an overlay to widen base authority. |
| Routing threshold and margin? | `selection_threshold=0.85`, `selection_margin=0.12`, `adequacy_threshold=0.70`; raise for high risk. |
| Approval requirement? | Human/admin approval for every dynamic composition and every high-risk workflow/version before execution; scoped HITL for sensitive node/tool/release decisions. |
| Plan retention? | Retain immutable plan, hashes, policy/approval references, checkpoints, and privacy-safe audit for the shortest approved compliance window; no tokens or raw private data. |
| Workflow authoring UX? | Schema-guided visual DAG editor plus versioned text view, validation diagnostics, policy simulation, test fixtures, diff/review, canary controls, and rollback selection. |
| Selection after clarification? | Persist typed context, add the structured answer, rerun eligibility and scoring, and require the same thresholds; never let a choice bypass authorization. |
| Workflow version policy? | Pin an immutable version per run, stop routing unhealthy versions, retain a known-good rollback version, and revalidate policy on resume. |
| Condition language? | Deterministic, versioned, non-Turing-complete expressions over typed artifacts and policy-safe metadata. |
| Agent fallback? | Only registry-resolved services satisfying the same capability, schemas, version constraints, trust, tenant, residency, policy, and deadline. |
| MCP transport? | Authenticated streamable HTTP in production; stdio only for local development. |
| Private result caching? | Disabled by default; no cross-user cache under any circumstance. |
| Long-term memory? | Disabled for private cross-request use by default; require explicit tenant/purpose/retention/provenance/deletion governance. |
| Audit unavailable? | Fail closed for sensitive/private-data discovery, access, or release. |
| Physical indexes or logical namespaces? | Prefer one ACL-aware Vector/Search Platform with tenant/org/group/user logical namespaces or partitions. Use separate physical indexes only for proven residency, isolation, scale, or operational requirements; keep the same in-query authorization contract. |
| Group publisher approval? | Ordinary members submit to staging. Require a group owner, `rag.publisher`, or explicitly approved automated governance to publish; no direct quarantine bypass. |
| Multiple-group priority? | Use explicit workflow/domain priority with a fair minimum for every eligible group. If absent, use deterministic fair quotas; never use discovery, directory, hash, or response order. |
| Fusion weights and scope boosts? | Benchmark per domain, version them in policy, and keep user/group boosts small and bounded (`0.04`/`0.02` illustrative) so they cannot overcome a material relevance or authority difference. |
| Required organization floor? | Require all workflow-declared authoritative organization sources and reserve context budget for them. Fail closed when a mandatory source is unavailable or uncitable. |
| Policy provider? | Use one authoritative policy-decision service integrated with the identity/membership provider, consent ledger, classification/DLP catalog, and RAG Policy Registry; record signed version references in the plan. |
| Data residency and retention? | Select only compliant namespaces/indexes, use the strictest applicable retention, store no raw private content in plans/telemetry, and reject when no compliant retrieval path exists. |
| Embedding model migration? | Version embeddings and index generations; use compatibility-tested dual-write/dual-read canaries, pin each retrieval plan to one explained generation, and retain rollback until tombstone/deletion reconciliation completes. |
