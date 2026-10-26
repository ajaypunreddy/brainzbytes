# Durable Asynchronous Execution Architecture

**Specification date:** September 21, 2026  
**Reviewed:** September 25, 2026  
**Status:** Normative production contract with an operational local vertical slice

```architecture
title | From accepted request to verified result
subtitle | The web request ends after durable admission; queues, workers, checkpoints, and evidence carry the run forward.
layer | 1 | Admit and authorize | cyan
card | User or API request | Identity, purpose, tenant, and idempotency key enter through the edge.
card | Whole-graph policy | The complete Workflow, Agent, MCP, model, data, and fallback graph is authorized.
layer | 2 | Commit durable truth | blue
card | PostgreSQL transaction | Run, immutable plan, first task, and outbox event commit together.
card | 202 Accepted | The caller receives run, status, and replayable event URLs.
layer | 3 | Dispatch and execute | violet
card | RabbitMQ quorum queues | Persistent commands route to independently scalable worker roles.
card | Leased workers | Agents, MCP gateways, RAG, approval, and transforms checkpoint bounded attempts.
layer | 4 | Verify and publish | green
card | Finalizer | Contracts, citations, policy receipts, and side effects are verified.
card | Canonical result | Result, evidence, receipts, metrics, logs, and traces remain replayable.
note | A browser disconnect, pod restart, deployment rollout, or worker loss cannot erase accepted work.
```

## 1. Core rule

ContextWeaver does not execute a production workflow as a chain of synchronous
HTTP calls held in one web request or one pod's memory.

The synchronous boundary ends after admission:

1. authenticate the caller;
2. normalize identity and purpose;
3. resolve the requested Service and Workflow;
4. compile and authorize the complete graph;
5. commit the run, immutable plan reference, initial task, and outbox event in
   PostgreSQL; and
6. return `202 Accepted` with a run identifier and durable event URL.

Everything after acceptance is durable asynchronous work. PostgreSQL owns
truth, RabbitMQ carries commands and events, competing workers claim bounded
leases, and clients observe progress through replayable Server-Sent Events.

```text
Chat / REST client
        |
        | HTTPS request
        v
Edge API + identity + whole-graph authorization
        |
        | one PostgreSQL transaction
        v
Run + immutable plan + task + outbox event
        |
        | 202 Accepted: runId, statusUrl, eventsUrl
        v
Confirmed Outbox Publisher
        |
        v
RabbitMQ quorum exchanges and queues
        |
        +---------------- competing consumers ----------------+
        |                                                     |
        v                                                     v
Agent / transform / RAG workers                      MCP gateway workers
lease + heartbeat + checkpoint                       PEP + JIT credential
        |                                                     |
        +-------------------- durable result ------------------+
                              |
                              v
PostgreSQL inbox + artifact refs + receipts + next outbox
                              |
                              v
Run event projection -> replayable SSE -> client
```

## 2. Why this boundary is mandatory

A long-running request may outlive:

- the browser connection;
- the API pod that accepted it;
- the coordinator replica that scheduled it;
- the Agent or MCP worker that began a node;
- a Kubernetes deployment rollout;
- a node or availability-zone failure;
- a transient model, data, or enterprise-system outage; and
- a human approval session.

Therefore no accepted run, task, timer, approval, checkpoint, or side-effect
decision may exist only in process memory, a local file, a browser session, or
an unacknowledged HTTP response.

## 3. Durable execution components

| Component | Durable responsibility |
| --- | --- |
| Edge API | Validate request, require idempotency key, commit acceptance, return `202` |
| Workflow Compiler | Produce immutable typed DAG and version-pinned execution plan |
| Authorization Planner | Produce the whole-graph authorization manifest and preflight decisions |
| Run Coordinator | Advance node states from committed artifacts and dependencies |
| PostgreSQL | Runs, nodes, tasks, attempts, leases, timers, HITL, inbox, outbox, checkpoints, receipts, Saga state |
| Outbox Publisher | Publish committed commands/events with broker confirms and retry |
| RabbitMQ | Durable quorum queues, persistent messages, redelivery, retry exchanges, DLQs |
| Workers | Claim leases, reauthorize, execute one bounded node attempt, checkpoint, commit results |
| Artifact Gateway | Store immutable large inputs/outputs outside queue messages |
| Event Projector | Build ordered run events and replayable SSE cursors |
| Reconciler | Detect expired leases, unpublished outbox rows, uncertain side effects, and stuck work |

Valkey may cache projections, rate limits, and hot reads. It is never the sole
record of accepted work.

## 4. Command and event contract

Queue messages contain references and integrity metadata, not unrestricted
payloads or credentials:

```yaml
messageId: msg-01...
messageType: run.node.execute
schemaVersion: 1.0.0
tenantId: tenant-a
runId: run-01...
nodeId: risk-agent
attemptId: attempt-03
planRef: plan://run-01.../sha256-plan
inputArtifactRefs:
  - artifact://run-01.../request
authorizationRef: authz://run-01.../risk-agent
policyEpoch: 1442
credentialRef: null
idempotencyKey: run-01...:risk-agent:attempt-03
traceparent: 00-...
createdAt: 2026-09-21T09:00:00Z
expiresAt: 2026-09-21T09:15:00Z
```

Consumers reject messages when the schema, signature, tenant, plan, node,
attempt, authorization, epoch, expiry, or artifact hashes do not match the
authoritative state.

## 5. Transactional inbox and outbox

Every state transition that must emit work or an externally visible event uses
one PostgreSQL transaction:

```text
BEGIN
  validate current run/node/attempt version
  insert inbox deduplication record when consuming
  update run, node, task, attempt, lease, checkpoint, or receipt state
  commit immutable artifact references
  insert one or more outbox rows
COMMIT
```

The outbox publisher publishes only committed rows, waits for RabbitMQ
publisher confirmation, then records publication. A publisher crash leaves the
row pending for another publisher. A duplicate delivery is absorbed by the
consumer inbox and idempotent state transition.

This produces at-least-once transport with an effectively-once business
outcome.

## 6. Scheduling, fan-out, and join

The coordinator does not call Agent pods directly.

For every ready node it:

1. verifies that required input artifacts and dependency states are committed;
2. rechecks run deadline, cancellation, revocation, and compatibility;
3. creates a task and attempt;
4. writes a dispatch command to the outbox; and
5. lets a worker acquire the task through RabbitMQ and a PostgreSQL lease.

A `parallel` node atomically releases all eligible child tasks. A `join` opens
only after every declared required artifact is committed and schema-valid.
Optional and fallback branches follow the immutable plan rather than timing or
arrival order.

## 7. Worker lease and checkpoint protocol

A worker:

1. consumes a command without acknowledging it;
2. writes or verifies the inbox record;
3. atomically acquires a short renewable PostgreSQL lease;
4. loads the pinned plan, input artifacts, policy epochs, and prior checkpoint;
5. reauthorizes the exact protected action;
6. executes within a bounded attempt deadline;
7. checkpoints at a safe semantic boundary;
8. commits output artifacts, receipts, state, and next outbox events;
9. releases the lease; and
10. acknowledges the RabbitMQ message only after durable commit.

If the pod dies, the message remains unacknowledged or the lease expires.
Another replica reclaims the task and resumes from the last compatible
checkpoint.

## 8. Agent, MCP, model, and RAG execution

### Agent nodes

Agents receive typed artifact references, constrained authority, and model
access through the Model Gateway. They do not receive user/provider
credentials, direct database access, or direct MCP network access.

### MCP nodes

The coordinator dispatches an MCP command through the trusted MCP Gateway. The
gateway independently validates the capability token, schema, resource,
purpose, classification, idempotency key, and current policy before resolving
just-in-time credentials and invoking the provider.

### Model nodes

Model requests use version-pinned aliases, bounded token/cost budgets, content
controls, and retry classifications. Streaming tokens are presentation events;
the authoritative node result is the committed typed artifact.

### RAG nodes

Retrieval uses an immutable authorization-first Retrieval Plan. Long-running
ingestion is a separate asynchronous workflow with its own jobs, stages,
leases, checkpoints, generations, validation, and atomic alias publication.

## 9. Durable HITL

HITL never blocks a worker thread or holds a queue message indefinitely.

The coordinator commits:

- approval request and proposed action hash;
- eligible approvers and separation-of-duties rules;
- quorum, deadline, reminders, and escalation;
- plan, run, node, policy, consent, and authorization references; and
- waiting state plus outbox notification events.

Workers release their leases. A later approval, rejection, expiry, or revocation
event is validated and correlated, then creates the next durable task.

## 10. Retry, dead-letter, and compensation

Errors are classified as:

- retryable dependency or capacity failure;
- authorization or revocation pause;
- invalid input or contract failure;
- poisoned or unsupported message;
- uncertain external side effect;
- compensatable business failure; or
- terminal non-compensatable failure.

Retries are bounded, delayed with exponential backoff and jitter, and preserve
the same logical idempotency key. Exhausted or poisoned work enters a classified
dead-letter queue with an authoritative database state and operator runbook.

Saga compensation is itself durable queued work. It has independent
authorization, idempotency, receipts, retries, and escalation.

## 11. Client progress and reconnection

SSE is a projection of the durable event log, not the execution transport.

Each event has:

- run-scoped monotonic sequence;
- event identifier usable as `Last-Event-ID`;
- schema version and safe event type;
- node state and progress;
- artifact, citation, approval, warning, and result references; and
- no secrets, credentials, or unrestricted sensitive payloads.

Disconnecting the browser does not cancel the run. Reconnection resumes from
the last acknowledged event cursor.

## 12. RAG ingestion execution

Each source revision creates a version-pinned ingestion job:

```text
source event or reconciliation
  -> job + stage + outbox commit
  -> queue
  -> fetch worker
  -> immutable source snapshot
  -> scan/classify worker
  -> extract worker
  -> chunk worker
  -> embedding worker
  -> shadow-generation writer
  -> validation worker
  -> atomic alias promotion
  -> publication event
```

Every stage records input/output hashes and can be resumed by another pod.
Partially built generations are never queryable.

## 13. Required proof

Production readiness requires tests that:

- kill API, coordinator, Agent, MCP, RAG, publisher, and event-projector pods at
  every transaction boundary;
- prove outbox recovery after database commit and before broker confirmation;
- prove inbox deduplication after result commit and before acknowledgement;
- expire and reclaim leases;
- resume from checkpoints on another pod;
- preserve HITL waits across deployments;
- reconcile uncertain provider outcomes without duplicate side effects;
- replay SSE from `Last-Event-ID`;
- handle duplicate, delayed, reordered, and poisoned messages;
- recover PostgreSQL and RabbitMQ; and
- demonstrate that no accepted work is silently lost or reported successful
  twice.

## 14. Current implementation truth

The local NextGen vertical slice implements PostgreSQL-backed Service Runs,
Workflow Runs, node state, attempts, waits, transitions, inbox/outbox records,
evidence and final results. RabbitMQ carries typed commands to replaceable
worker roles. Stable message, operation, attempt and action identities protect
retries and redelivery.

The qualified slice includes approval waits, timers, notifications,
external-event waits, authenticated callbacks, expiry, rejection,
cancellation, publication, verification, finalization, receipts, citations,
replayable events and correlated telemetry. Coordinator restart during an
approval wait and duplicate-delivery paths have been exercised successfully.

Production work remains for broad multi-replica lease qualification, generic
arbitrary Agent/MCP dispatch, production capability-token reauthorization,
uncertain external-provider reconciliation across all connectors, cross-region
recovery and the complete platform resilience suite.
