# Credential Non-Possession and Delegated Authority

**Specification date:** September 21, 2026  
**Status:** Normative architecture; partially implemented

## Executive invariant

Agents must never possess user credentials, refresh tokens, provider API
keys, cloud keys, database passwords, object-store credentials, connector
secrets, private keys, or model-provider credentials.

An Agent receives only:

- a narrow workload identity;
- immutable references such as `identityRef`, `delegationRef`,
  `policyDecisionRef`, and `credentialRef`;
- the minimum authorized ContextPack and task input;
- permission to consume its assigned RabbitMQ queue;
- permission to publish typed results; and
- permission to call the internal Model Gateway when policy allows it.

Possession of a reference does not grant authority. A trusted enforcement
gateway resolves the reference only after validating the exact tenant,
principal, purpose, workflow, run, node, operation, resource, policy version,
consent state, and revocation epoch.

## Credential flow

```text
User authenticates
      |
      v
Authentication Gateway -> server-side session
      |
      v
Identity Context + Entitlement + Policy Decision
      |
      v
Immutable plan/message contains references only
      |
      +--------------------------+
      |                          |
      v                          v
Agent sandbox                Trusted gateway
no secret mounts             MCP / model / data / connector
no user token                     |
no provider key                   v
      |                     workload/OBO/token exchange
      |                          |
      +---- typed request ------>|
                                 v
                         short-lived scoped credential
                         retained inside trusted workload
                                 |
                                 v
                         approved external resource
```

The resolved credential is never returned to the Agent, written to RabbitMQ,
stored in a Workflow plan, persisted in an artifact, or copied into logs,
traces, metrics, audit records, dead-letter messages, or reports.

## Canonical credential-isolation profile

Every Service, Workflow, Agent, MCP, model-provider, and storage-connector
specification must reference a versioned security profile:

```yaml
credentialIsolationProfile:
  version: 1.0.0
  possession:
    agent: prohibited
    workflowPlan: prohibited
    messagePayload: prohibited
    artifact: prohibited
    telemetry: prohibited
  acceptedReferences:
    - identityRef
    - delegationRef
    - policyDecisionRef
    - credentialRef
  forbiddenFields:
    - authorization
    - bearerToken
    - refreshToken
    - apiKey
    - password
    - connectionString
    - clientSecret
    - privateKey
    - secretValue
  delivery:
    mode: workload_identity_or_gateway_only
    exportable: false
    maximumLifetimeSeconds: 300
  binding:
    - tenant
    - principal
    - purpose
    - workflow
    - run
    - node
    - operation
    - resource
    - audience
    - policyVersion
    - revocationEpoch
  runtime:
    automountServiceAccountToken: false
    secretMounts: prohibited
    cloudMetadataAccess: prohibited
    secretStoreAccess: prohibited
    directDatabaseAccess: prohibited
    directObjectStoreAccess: prohibited
```

Higher-level organization or regulatory policy may narrow this profile but
may never widen it for an Agent.

## Agent specification requirements

An `AgentSpec` must declare:

- credential possession prohibited;
- no secret or projected secret volumes;
- service-account token automount disabled;
- no direct Vault/OpenBao, cloud metadata, database, object-store, external
  API, Kubernetes API, or MCP endpoint access;
- allowed RabbitMQ virtual host, exchanges, queues, and routing keys;
- allowed Model Gateway audience and logical model aliases;
- default-deny ingress and egress;
- non-root, read-only filesystem, no privilege escalation, no host mounts,
  dropped capabilities, and sandboxed RuntimeClass; and
- telemetry redaction and content-minimization policy.

Tool schemas offered to a model must expose business parameters, not
authorization headers, arbitrary URLs, secret paths, tenant overrides, cloud
resource identifiers outside the approved scope, or raw credential fields.

## MCP and connector requirements

An `MCPSpec` or connector specification must declare:

- the exact external authority and operation classes it owns;
- the secret or workload-identity reference type it may resolve;
- tenant, audience, resource, scope, and purpose restrictions;
- short-lived token lifetime and non-exportability;
- permitted network destination names, ports, and protocols;
- idempotency, side-effect, receipt, and compensation behavior;
- redaction rules for request, response, error, audit, and DLQ data; and
- rotation, revocation, compromise, and break-glass behavior.

Each MCP workload reaches only its assigned RabbitMQ queues and approved
external domain. A Gmail MCP cannot reach payments; a payment MCP cannot
reach Gmail; neither can expose its credential to an Agent.

## Trusted gateway responsibilities

Before resolving any credential, the gateway must verify:

1. authenticated calling workload identity;
2. approved immutable Agent or MCP version;
3. tenant and subject binding;
4. delegation chain and consent;
5. exact operation, resource, audience, and purpose;
6. current entitlement and policy decision;
7. current credential and revocation epochs;
8. expiry and replay protection;
9. rate, concurrency, cost, and risk limits; and
10. audit availability for protected operations.

The gateway obtains or exchanges the smallest possible credential, keeps it in
memory only for the required operation, and never places it in a model-visible
or Agent-visible structure.

Request-time graph authorization and runtime per-action reauthorization are
defined by
[Continuous Entitlement and Runtime Authorization](continuous-entitlement-enforcement.md).
A credential reference, workload identity, prior allow decision, or successful
login is never sufficient by itself to invoke an MCP tool.

## Storage and RAG requirements

Source Catalog and RAG requests carry `storageLocationRef` and
`credentialRef`, never connection strings, SAS tokens, access keys, refresh
tokens, or document bodies.

The trusted connector:

- resolves the source owner and delegated read authority;
- obtains a read-only, resource-scoped, short-lived credential;
- reads only the exact registered source;
- persists immutable artifact references and provenance;
- discards the credential after the operation; and
- denies immediately when consent, ACLs, ownership, or authorization changes.

## Telemetry and evidence

Logs, metrics, traces, audit, workflow plans, checkpoints, RabbitMQ messages,
artifacts, reports, caches, and DLQs must exclude credential values and raw
authorization headers.

Permitted evidence includes:

- opaque credential and delegation reference identifiers;
- issuer and audience class;
- operation and resource class;
- issue, expiry, rotation, and revocation timestamps;
- policy decision and reason codes;
- workload and human principal references;
- token exchange outcome; and
- privacy-safe correlation identifiers.

Secret scanning and structured redaction occur before persistence and before
data is forwarded to observability systems.

## Required conformance tests

- reject secret values and token-shaped fields in every specification;
- reject authorization headers, arbitrary URLs, and secret paths in tool
  arguments;
- prove Agent denial to Vault/OpenBao, Kubernetes, cloud metadata, databases,
  object storage, external providers, and MCP endpoints;
- prove that only the designated gateway can resolve a credential reference;
- reject cross-tenant, wrong-audience, wrong-purpose, expired, replayed, and
  revoked references;
- rotate and revoke credentials while work is queued or retrying;
- inspect logs, traces, metrics, audit, artifacts, caches, and DLQs for secret
  leakage; and
- compromise an Agent test workload and demonstrate that it still cannot
  obtain usable external authority.

## Current implementation status

As of September 21, 2026:

- Source Catalog requires storage and credential references and rejects
  sensitive inline fields;
- RAG Ingestion rejects raw content, credentials, secrets, and tokens;
- Agent sandbox documentation requires no secret injection, disabled
  service-account token automount, default-deny egress, and hardened runtime
  isolation; and
- the whitepaper and conceptual design define reference-only identity,
  delegation, policy, and credential handling.

The complete executable profile is not implemented yet. Canonical JSON
Schemas for Agent, MCP, Workflow, delegation, credential reference, and token
exchange contracts; admission policies; OpenBao/Vault integration; External
Secrets or CSI delivery; OAuth OBO/token exchange; Model Gateway isolation;
connector credential brokerage; and platform-wide conformance tests remain.

The architectural invariant is therefore established and selected RAG
boundaries enforce it, but universal machine enforcement is still a delivery
requirement.
