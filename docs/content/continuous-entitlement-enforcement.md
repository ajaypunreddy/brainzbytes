# Continuous Entitlement and Runtime Authorization

**Specification date:** September 21, 2026  
**Status:** Normative architecture; implementation pending

## Executive invariant

Authentication establishes identity. It does not grant ambient authority to
run a Service, Workflow, Agent, MCP, tool, model, RAG query, artifact transfer,
or disclosure action.

ContextWeaver authorizes at two mandatory boundaries:

1. **request-time whole-graph preflight** proves that the principal may start
   the selected Service and its complete reachable execution plan; and
2. **runtime per-action enforcement** proves that the exact action remains
   authorized immediately before it executes.

Neither decision replaces the other. Request-time evaluation prevents the
platform from creating an unauthorized plan. Runtime evaluation prevents stale
authority, dynamic branches, changed arguments, revocation, and
confused-deputy behavior from producing an unauthorized side effect.

## Login establishes identity, not tool authority

After login, Identity Context normalizes:

- tenant and principal identifiers;
- groups, roles, relationships, and service assignments;
- authentication method, strength, session, device, and environment;
- consent and declared purpose context;
- identity, entitlement, relationship, policy, and revocation epochs; and
- privacy-safe correlation identifiers.

The user interface may use a bounded entitlement summary to hide unavailable
Services and actions. That summary is an optimization and user-experience
control. It is never accepted as an execution authorization decision.

## Three authorization layers

| Layer | Question |
| --- | --- |
| Service entitlement | May this principal use this published Service and Workflow version? |
| Capability authorization | May this plan invoke these Agents, MCPs, tools, models, RAG scopes, fallbacks, and compensation operations? |
| Resource/action authorization | May this exact tool operation act on this exact resource with these arguments, classification, purpose, and risk at this moment? |

A user does not require access to every tool registered on the platform. The
user requires access to every mandatory capability reachable by the selected
plan, every pre-authorized fallback or compensation capability, and every
dynamic capability before that branch is selected.

## Request-time whole-graph preflight

Before creating or dispatching a run:

1. API Gateway validates the authenticated session and anti-forgery context.
2. Identity Context resolves the canonical tenant, principal, groups, roles,
   relationships, authentication strength, consent, and purpose.
3. Entitlement Service validates the selected Service and Workflow.
4. Workflow Compiler resolves the versioned DAG and computes the complete
   transitive closure of:
   - required nodes;
   - optional nodes;
   - conditional branches;
   - fallback and alternate capabilities;
   - compensation operations;
   - Agents, MCPs, and exact tool categories;
   - RAG sources and logical namespaces;
   - model, region, retention, and classification constraints;
   - artifacts, field projections, renderers, recipients, and destinations.
5. Policy Decision Service evaluates the complete Authorization Manifest.
6. A required denial rejects the request before any protected dispatch.
7. An optional branch may be removed only when its omission is explicitly
   permitted by schema and policy and the final report remains constructable.
8. The compiler freezes an Authorized Immutable Execution Plan.

The plan records hashes, versions, decision references, permitted capability
envelopes, field projections, token constraints, fallback sets, expiry, and
revocation epochs. It never stores bearer tokens or credential values.

## Runtime per-action enforcement

Before every protected node or MCP tool call, Run Coordinator and the
applicable policy-enforcement point evaluate:

- tenant, originating principal, delegated workload, workflow, run, and node;
- immutable plan and Authorization Manifest hashes;
- selected Agent, MCP, service, tool, and version;
- exact operation, validated arguments, target resource, and destination;
- read, write, financial, deployment, disclosure, or other side-effect class;
- purpose, classification, residency, consent, relationship, and environment;
- current entitlement, relationship, policy, credential, and revocation
  epochs;
- required HITL approval, separation of duties, and approval expiry;
- rate, concurrency, cost, token, and time budgets; and
- replay, nonce, and idempotency constraints.

An allow decision produces a short-lived capability token bound to:

```yaml
subject: principal://tenant-a/user-a
audience: mcp://mcp-sre
service: service://incident-response/4.1.0
workflow: workflow://triage/3.2.0
run: run://01J...
node: node://query-production-health
tool: query_geneva
operations: [read]
resources: [service://payments]
purpose: incident-investigation
planHash: sha256:...
policyDecisionId: decision://...
nonce: nonce://...
expiresAt: 2026-09-21T13:15:00Z
```

The token is audience-specific, non-transferable, short-lived, and narrower
than the user's overall entitlement. The MCP ingress validates it again and
enforces tool schema, operation, resource, and argument constraints. Agents
cannot mint, widen, exchange, inspect, or reuse these tokens.

## Dynamic branches and tool discovery

The orchestrator exposes only authorized capability metadata to a planner or
model. Discovery itself is authorization-filtered.

If runtime selection requests a capability outside the frozen envelope:

1. pause the run;
2. compile a child plan revision;
3. rebuild the Authorization Manifest;
4. repeat entitlement and policy evaluation;
5. require HITL when policy demands it; and
6. continue only with a newly signed plan revision linked to the parent hash.

Model output, prompt text, retrieved content, tool output, or an Agent cannot
add a tool, endpoint, scope, recipient, or privilege to the authorized plan.

## Reauthorization triggers

Runtime authorization is mandatory:

- immediately before every MCP, model, RAG, artifact, and disclosure call;
- after a timer, external wait, or HITL pause;
- after pod recovery, retry, redelivery, or checkpoint resume;
- when a policy, entitlement, relationship, consent, credential, service
  trust, or revocation epoch changes;
- when a fallback, alternate, or compensation path is selected;
- before an irreversible or high-risk action;
- before credential exchange; and
- when the previous decision or capability token expires.

A hard revocation stops subsequent protected work. Completed actions remain in
the immutable audit trail and are reconciled or compensated according to their
side-effect contract.

## Decision and evidence model

Every request-time and runtime decision records:

- decision ID and timestamp;
- subject, tenant, workload, workflow, run, and node references;
- action, capability, resource, purpose, classification, and risk;
- policy version and snapshot hash;
- entitlement, relationship, credential, and revocation epochs;
- allow, deny, conditional, or HITL-required result;
- privacy-safe reason and obligation codes;
- plan, manifest, argument, and result hashes where applicable;
- expiry and revalidation deadline; and
- links to approval, execution, provider, compensation, and audit receipts.

Sensitive data, bearer tokens, credentials, raw authorization headers, and
unapproved tool arguments are excluded from decision evidence.

## Failure behavior

| Condition | Required behavior |
| --- | --- |
| Required capability denied during preflight | Reject before run creation or protected dispatch |
| Optional capability denied | Prune only when schema and policy explicitly permit omission |
| Runtime decision unavailable | Fail closed for protected work |
| Decision expired | Pause and reauthorize |
| Entitlement or policy epoch changed | Re-evaluate before the next protected node |
| MCP rejects capability token | Record denial and stop, retry, fallback, or compensate according to the plan |
| Dynamic tool outside the authorized envelope | Require a new compiled and authorized plan revision |
| User loses access during HITL or timer wait | Do not resume until current authorization succeeds |
| Credential revoked | Deny exchange and prevent the operation from reaching the external system |

## Enforcement ownership

| Component | Enforcement responsibility |
| --- | --- |
| Authentication Gateway | Authenticate the human and maintain the revocable session |
| Identity Context | Normalize tenant, principal, groups, roles, relationships, device, purpose, and epochs |
| Entitlement Service | Resolve Service, Workflow, Agent, MCP, and tool entitlements |
| Workflow Compiler | Build the complete capability closure and Authorization Manifest |
| Policy Decision Service | Evaluate preflight and exact runtime actions |
| Run Coordinator | Require a current decision before dispatch, retry, resume, fallback, or compensation |
| Credential Broker | Mint the minimum short-lived delegated credential without exposing it to the Agent |
| Agent/A2A ingress | Validate node-scoped delegation and plan binding |
| MCP discovery and ingress | Filter visible tools and independently enforce exact calls |
| RAG and data gateways | Apply tenant, ACL, purpose, classification, and row/field predicates in the query |
| Model Gateway | Enforce model, provider, region, retention, training, classification, and projection policy |
| Disclosure Gateway | Authorize fields, renderer, recipient, destination, delivery, and download |
| Audit Service | Preserve privacy-safe decision and execution evidence |

## Caching rules

Entitlement and policy results may be cached only when:

- the cache key includes tenant, principal, action, resource, purpose,
  classification, environment, policy version, and all applicable epochs;
- the TTL never exceeds the earliest source decision expiry;
- hard revocation invalidates or supersedes the cached result;
- high-risk writes and disclosures use live or near-live evaluation; and
- failure to refresh does not become an implicit allow.

## Current implementation status

The complete model is present in the conceptual architecture, but the runtime
services are not yet implemented end to end. `cw-entitlement-service`,
`cw-policy-decision-service`, `cw-workflow-compiler`, and
`cw-run-coordinator` currently remain scaffolds.

The next executable slice must implement:

1. persistent identity, group, role, relationship, and entitlement records;
2. bulk whole-graph entitlement and policy evaluation;
3. deterministic Authorization Manifest generation;
4. immutable authorized plan persistence;
5. short-lived plan/node/tool-bound capability tokens;
6. runtime reauthorization and epoch invalidation;
7. MCP ingress token and argument enforcement;
8. durable decision receipts and authorization-negative tests; and
9. recovery tests proving that resumed work cannot reuse stale authority.
