# Dynamic Agent and MCP Admission, Deployment, and Discovery

**Specification date:** September 21, 2026  
**Status:** Normative architecture; implementation pending

## Executive invariant

Every new Agent and MCP capability is introduced dynamically through the
ContextWeaver control plane. Users and teams submit specifications and
packages; they do not deploy arbitrary workloads directly.

The platform:

1. normalizes and validates the specification;
2. scans the package, source, dependencies, SBOM, and image;
3. evaluates security, policy, compatibility, and quality;
4. requires risk-appropriate approval;
5. signs an immutable release bundle;
6. instructs the platform Capability Operator to reconcile an approved Helm
   release into an isolated Agent or MCP runtime namespace;
7. verifies runtime health and canary evidence; and
8. automatically registers the deployed service's schemas, operations,
   metrics, dashboards, alerts, dependencies, and lifecycle state.

No UI action, generated package, Agent, MCP, CI job, or developer workspace
may bypass these gates.

## Terminology

Agent and MCP "workspaces" are isolated runtime namespaces and release
boundaries. They are distinct from interactive JupyterLab and VS Code user
workspaces.

```text
cw-agents-<tenant-or-domain>-<capability>
cw-mcps-<tenant-or-domain>-<capability>
```

Production deployments may group compatible low-risk capabilities where
policy permits, but identity, network authority, secrets, queues, resource
limits, telemetry, and lifecycle remain independently attributable.

## End-to-end lifecycle

```text
UI / API / Git submission
        |
        v
Canonical AgentSpec or MCPSpec
        |
        v
Package and image evidence pipeline
  schema | compatibility | signatures | SBOM | licenses
  malware | secrets | SAST | dependency and image CVEs
  contract | sandbox | quality | safety | resilience tests
        |
        v
Policy and human approval
        |
        v
Signed immutable release bundle
  spec digest | image digest | chart digest | evidence digest
        |
        v
Capability Operator
  creates/updates desired-state custom resource
  renders approved Helm package
  reconciles namespace, identity, policy, queues, service, probes
        |
        v
Restricted Agent or MCP runtime namespace
        |
        v
Runtime attestation and discovery
  well-known service descriptor
  input/output/error schemas
  tools/resources/prompts or Agent Card
  metrics/dashboard/alert references
  health, capacity, region, trust, and evaluation state
        |
        v
Service Registry candidate -> canary -> active
```

## Submission package

An onboarding request contains references to immutable artifacts:

```yaml
apiVersion: platform.contextweaver.io/v1
kind: CapabilityRelease
metadata:
  name: incident-triage
  version: 1.4.0
  owner: sre-platform
spec:
  capabilityKind: Agent
  specificationRef: artifact://sha256/spec
  packageRef: artifact://sha256/package
  image: registry.example/incident-triage@sha256:image
  helmPackageRef: oci://registry.example/charts/agent-runtime@sha256:chart
  securityProfileRef: security://agent-restricted/1.0.0
  credentialIsolationProfileRef: security://credential-non-possession/1.0.0
  resilienceProfileRef: resilience://durable-worker/1.0.0
  evidenceBundleRef: evidence://sha256/admission
```

Mutable tags, unpinned dependencies, inline credentials, unsigned packages,
unapproved charts, and unknown specification fields are rejected.

## Admission gates

### Specification and compatibility

- Strict `AgentSpec` or `MCPSpec` schema validation.
- Stable identity, owner, semantic version, and support route.
- Strict input, output, error, stream, artifact, and event schemas.
- Tool side-effect, idempotency, receipt, and compensation declarations.
- Dependency and consumer compatibility.
- Mixed-version, rollback, and active-run safety.
- Credential non-possession and durable-work profile references.

### Package and supply chain

- Trusted publisher and signature verification.
- Package digest and immutable image digest.
- SBOM generation and policy validation.
- Dependency and container vulnerability scanning.
- Malware, generated-code, archive, and secret scanning.
- License and provenance policy.
- Base-image, runtime, and architecture allowlists.
- Reproducible build and attestation where required.

### Security and isolation

- Non-root, read-only-root, restricted security context.
- No privilege escalation, host mounts, host namespaces, or runtime sockets.
- Service-account token automount disabled for Agents.
- Default-deny ingress and egress.
- Agent access limited to RabbitMQ and the internal Model Gateway.
- MCP access limited to assigned queues and its approved connector domain.
- Workload identity, secret-broker path, audience, and operation boundaries.
- Resource quota, LimitRange, RuntimeClass, and node-placement policy.

### Quality, safety, and resilience

- Contract tests and malformed-input/output tests.
- Held-out capability evaluations and regression thresholds.
- Prompt-injection, data-exfiltration, and prohibited-action tests.
- Duplicate delivery, retry, timeout, restart, and cross-pod recovery tests.
- Dependency degradation and circuit-breaker tests.
- Idempotency and compensation tests for side effects.
- Startup, readiness, liveness, and graceful-drain tests.

### Approval

Approval policy is based on risk, data class, side effects, tenant scope,
external authority, and deployment environment. Separation of duties applies:
the submitting identity cannot self-approve a restricted production release.
Exceptions are scoped, justified, approved, monitored, and expire.

## Capability Operator contract

The Capability Operator is the only component authorized to create or update
Agent and MCP runtime releases. It reconciles signed desired state into
approved Helm packages.

The operator must:

- verify the release bundle, evidence, signatures, and immutable digests again
  at reconciliation time;
- reject direct or drifted resources that have no approved desired-state
  owner;
- create the target namespace and required labels;
- apply ResourceQuota, LimitRange, Pod Security, NetworkPolicy, service
  account, workload identity, RabbitMQ permissions, and secret-reference
  bindings;
- render only allowlisted, digest-pinned Helm packages;
- deploy the Agent or MCP image by digest;
- configure replicas, probes, topology spread, PodDisruptionBudget, graceful
  drain, HPA or KEDA, and observability injection;
- publish Kubernetes status and events;
- detect and correct drift;
- pause, quarantine, roll back, drain, or remove a capability through the same
  governed desired state; and
- never accept raw Helm values that can widen security or credential access.

The operator uses Kubernetes and Helm APIs only. Cloud-specific resources are
represented through the signed platform contract and workload-identity
bindings.

## Runtime discovery and registry convergence

After deployment, the Registry Controller discovers the capability through
its service identity and approved internal endpoint. The runtime exposes:

```text
/.well-known/contextweaver-service
/health
/ready
/v1/capabilities
/v1/schemas/input
/v1/schemas/output
/v1/schemas/error
/metrics
```

Agent runtimes additionally expose an Agent Card or equivalent declared
capability descriptor. MCP runtimes expose declared tools, resources, prompts,
transports, side-effect classes, and schema references.

The registry record includes:

- kind, stable capability ID, semantic version, and image/package/chart
  digests;
- endpoint and workload audience;
- input, output, error, stream, artifact, event, and tool schemas;
- dependencies and compatible version ranges;
- policy actions, scopes, data classes, residency, and risk;
- health, readiness, capacity, region, and current replica state;
- SLO and resilience profile;
- metrics contract and scrape metadata;
- dashboard and alert-rule references;
- evaluation suite, score, safety state, and last evaluation;
- compensation capabilities;
- owner, support, runbook, and lifecycle status; and
- complete admission and deployment evidence references.

Discovery alone does not make a capability active. The registry validates the
runtime descriptor against the signed release bundle and admits it first as a
candidate. Synthetic and canary traffic, dashboards, alerts, and evaluation
must remain healthy before the logical capability alias is promoted.

## Metrics and dashboard automation

Every admitted capability declares a standard metric contract:

- request or task rate;
- success, failure, timeout, cancellation, and policy denial;
- latency and queue wait;
- retries, redeliveries, idempotency hits, and DLQ activity;
- CPU, memory, concurrency, saturation, and replica health;
- model token, cost, and provider outcome where applicable;
- tool calls, side-effect receipts, and compensation results;
- evaluation score and safety violations; and
- version, tenant-safe, region, and lifecycle labels.

The observability controller creates or updates:

- service and capability overview dashboards;
- Agent quality and model-use dashboards;
- MCP tool, side-effect, and compensation dashboards;
- SLO and error-budget dashboards;
- security and policy-denial dashboards;
- deployment, canary, rollback, and drift dashboards; and
- matching alert rules and runbook links.

Dashboard generation uses signed templates and declared metric contracts.
Capability code cannot publish arbitrary dashboard queries or privileged data
sources.

## Updates, rollback, and removal

An update creates a new immutable capability version. The operator overlaps
old and new replicas, performs synthetic and canary validation, and promotes
the logical alias only after every gate passes. Active workflows remain pinned
to their resolved version.

Rollback requires compatible contracts, readable state, retained image/chart
digests, and a valid previous release bundle. Unsafe rollback is rejected in
favor of a forward fix.

Removal first marks the capability draining, prevents new resolution, waits
for or migrates pinned work, revokes queue and credential authority, preserves
required evidence, then removes runtime resources according to retention
policy.

## Current implementation status

As of September 21, 2026, the architecture and whitepaper define dynamic
admission, specification validation, scanning, approval, deployment, and
registry-driven discovery. The Registry service supports persistent
registration and initial release compatibility validation.

The complete lifecycle is not implemented. The repository catalog currently
has no dedicated Capability Operator implementation; Agent and MCP runtime
repositories and executable `AgentSpec`/`MCPSpec` schemas remain pending.
Package admission, SBOM/signature verification, vulnerability policy,
operator-owned Helm reconciliation, runtime attestation, automatic schema and
tool discovery, dashboard generation, canary promotion, drift correction, and
governed removal must still be built.

