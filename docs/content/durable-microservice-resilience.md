# Durable Microservice Resilience and Cross-Pod Work Recovery

**Specification date:** September 21, 2026  
**Status:** Normative architecture; partially implemented

## Executive invariant

Every ContextWeaver microservice must remain available through ordinary pod,
node, deployment, and dependency failures. Any accepted unit of work must be
recoverable by another healthy replica without depending on the failed pod's
memory or local filesystem.

Kubernetes restores compute. It does not restore in-memory work. Durable work
recovery therefore requires:

- PostgreSQL as the authoritative run, task, lease, checkpoint, timer, inbox,
  outbox, receipt, and Saga state store;
- RabbitMQ durable quorum queues for commands and events;
- manual acknowledgement only after durable state transition;
- renewable ownership leases and heartbeats;
- idempotency and inbox deduplication;
- immutable execution plans and version-pinned inputs;
- externally visible side-effect receipts and compensation definitions; and
- no authoritative state on pod-local filesystems or in-process caches.

## Recovery sequence

```text
Client or upstream service
        |
        v
API replica validates identity, policy, schema, and idempotency key
        |
        v
PostgreSQL transaction
  - creates run/task
  - records immutable input and plan references
  - writes outbox event
        |
        v
Outbox publisher -> RabbitMQ durable quorum queue
                         |
                  competing consumers
                         |
                  Pod A claims lease
                         |
                 checkpoints progress
                         |
                    Pod A fails
                         |
       message remains unacknowledged or lease expires
                         |
            RabbitMQ redelivery / coordinator reclaim
                         |
                  Pod B claims task
                         |
        loads plan, checkpoint, receipts, and policy epoch
                         |
           resumes or safely replays idempotently
                         |
        commits result, receipt, and next outbox event
                         |
                 acknowledges message
```

The consumer must never acknowledge a message merely because execution
started. It acknowledges only after the corresponding result or failure state
has been committed durably.

## Failure recovery matrix

| Failure point | Required recovery |
| --- | --- |
| Pod fails before the request transaction commits | No work is accepted. The caller retries with the same idempotency key. |
| Task commits but event publication fails | A transactional outbox publisher discovers and publishes the pending event. |
| Worker receives a command and dies before completion | RabbitMQ redelivers the unacknowledged command. |
| Worker becomes unreachable while retaining an assignment | Its renewable PostgreSQL lease expires and another replica claims the task. |
| Worker checkpoints and then fails | The replacement loads the latest compatible checkpoint and continues from the next safe boundary. |
| External action succeeds but the worker dies before completion is recorded | The replacement uses the same idempotency key or reconciles the provider receipt instead of repeating the action blindly. |
| Result commits but message acknowledgement fails | Redelivery is absorbed by the inbox/deduplication record and returns the existing result. |
| Scheduler or timer pod fails | Another scheduler replica claims expired timer leases from PostgreSQL. |
| HITL wait spans deployments or outages | Approval state, reminders, deadlines, quorum, and authorization references remain durable in PostgreSQL. |
| SSE or WebSocket connection fails | Execution continues independently; the client reconnects from a durable event cursor. |
| Node or availability zone fails | Kubernetes reschedules replicas in another failure domain while PostgreSQL, RabbitMQ, and object storage retain state. |
| A new service version rolls out during execution | Existing runs retain pinned versions; new work uses the promoted alias only after compatibility validation. |

## Mandatory service classes

### Stateless request services

API gateways, policy services, registries, catalogs, and synchronous query
surfaces must:

- run at least two replicas;
- keep sessions and mutation state outside the pod;
- require idempotency keys for retried mutations;
- expose lightweight startup, readiness, and liveness probes;
- stop accepting traffic before termination; and
- return explicit retryable or terminal errors rather than success-shaped
  fallbacks.

An interrupted read may be retried. An interrupted write must return or recover
the same logical result for the same idempotency key.

### Durable asynchronous workers

Ingestion, artifact, notification, evaluation, migration, Agent, and MCP
workers must:

- consume from durable queues using competing consumers;
- use manual acknowledgements and publisher confirms;
- persist inbox deduplication before applying a message;
- checkpoint at type-specific safe boundaries;
- apply bounded retries with exponential backoff and jitter;
- route exhausted or invalid work to a classified dead-letter queue; and
- make every externally visible side effect idempotent or compensatable.

### Workflow coordinators

`cw-run-coordinator` replicas must coordinate through PostgreSQL, not
in-process locks. Atomic claims use row locking or conditional lease updates.
The durable state includes:

- run, task, node, attempt, and dependency state;
- ready, running, completed, failed, waiting, and compensating sets;
- immutable plan and registry snapshot hashes;
- owner replica, lease expiry, and heartbeat;
- input, output, error, artifact, and checkpoint references;
- policy, consent, credential, and revocation epochs;
- retry budget, deadline, and next eligible time;
- inbox and outbox identifiers;
- execution and side-effect receipts; and
- Saga compensation progress.

### Schedulers and controllers

Schedulers, reconcilers, and controllers may run multiple replicas, but only
one replica owns a specific timer or reconciliation key at a time. Ownership
must use a renewable database lease or Kubernetes leader election. A failed
leader is replaceable after bounded lease expiry.

### RAG ingestion

RAG ingestion checkpoints deterministic stages such as source fetch, malware
scan, extraction, classification, chunking, embedding, validation, shadow
generation publication, and alias promotion. A replacement resumes from the
last valid stage and never exposes a partially built generation.

### MCP and irreversible side effects

Side-effecting MCP operations require:

- a stable platform idempotency key;
- immutable request hash;
- exact tenant, principal, workflow, run, node, purpose, and operation binding;
- provider request and response receipt;
- reconciliation where provider outcome is uncertain;
- explicit compensation capability where reversal is possible; and
- manual remediation when neither safe replay nor compensation is possible.

RabbitMQ provides at-least-once delivery. ContextWeaver obtains an
effectively-once business outcome through inbox deduplication, idempotent
state transitions, provider idempotency, receipts, and reconciliation.

## Graceful shutdown protocol

On deployment, scaling, eviction, or administrative drain, each workload must:

1. fail readiness and stop receiving new HTTP requests;
2. stop claiming new queue messages and task leases;
3. finish or checkpoint work that can complete within the termination budget;
4. negatively acknowledge or release work that cannot finish safely;
5. flush outbox, receipt, audit, and telemetry buffers;
6. release renewable leases where practical; and
7. terminate only after the bounded drain period.

Abrupt failure remains safe because the same durable recovery rules apply.

## Kubernetes availability profile

Production service charts must declare:

```yaml
availability:
  minimumReplicas: 2
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
  podDisruptionBudget:
    maxUnavailable: 0
  topologySpread:
    nodes: required
    zones: preferred-or-required-by-tier
  gracefulDrain:
    enabled: true
    terminationGracePeriodSeconds: 60
  probes:
    startup: required
    readiness: required
    liveness: required
  autoscaling:
    api: hpa
    workers: keda-queue-depth
```

The production profile also requires immutable images, dependency-aware
readiness, anti-affinity or topology spread, resource requests and limits,
priority classes where justified, and controlled disruption during node or
cluster maintenance.

## Durable dependency requirements

- PostgreSQL must be highly available, backed up, point-in-time recoverable,
  and tested through restore exercises.
- RabbitMQ must use durable quorum queues, persistent messages, publisher
  confirms, consumer acknowledgements, retry exchanges, and dead-letter
  quarantine.
- Object storage must retain immutable artifacts and checkpoints according to
  policy.
- Valkey may accelerate reads, coordination, and rate limits, but it must not
  be the only authoritative record of accepted work.
- Registry, schema, policy, and configuration versions required by an active
  run must remain readable for the run's compatibility window.

## Required resilience tests

Every service must pass the tests applicable to its class:

- terminate a worker before, during, and after durable commit;
- terminate a coordinator while a task lease is active;
- deliver the same message more than once;
- interrupt publishing between database commit and broker delivery;
- interrupt acknowledgement after result commit;
- restart during every checkpointable stage;
- lose a node and, for higher tiers, an availability zone;
- restart or fail over PostgreSQL and RabbitMQ;
- delay, duplicate, reorder, and poison messages;
- expire timers and HITL waits during an outage;
- rotate and revoke identity or credentials during retry;
- deploy mixed service versions while runs are active;
- restore from backup and reconcile queued work; and
- prove that no accepted work is silently lost or reported successful twice.

## Observability and SLO evidence

Each service publishes:

- request and task rate, success, latency, and saturation;
- queue depth, oldest-message age, redelivery, retry, and DLQ counts;
- active and expired leases;
- checkpoint age and resume count;
- inbox deduplication and idempotency-hit count;
- outbox publication lag;
- side-effect reconciliation and compensation state;
- graceful-drain duration and forced termination count; and
- run-level correlation across API, PostgreSQL, RabbitMQ, Agent, MCP, artifact,
  and finalization spans.

Alerts must detect stuck leases, outbox lag, queue-age SLO breaches, retry
storms, DLQ growth, checkpoint stagnation, lost publisher confirms,
compensation failures, and excessive forced pod termination.

## Current implementation status

As of September 21, 2026:

- most service charts default to two replicas and include readiness probes;
- Registry, Source Catalog, and RAG Ingestion include zero-unavailable rolling
  updates, graceful drain, and PodDisruptionBudgets;
- selected services persist state in PostgreSQL;
- Source Catalog and RAG Ingestion have restart-safe local contract
  foundations; and
- release validation requires replica overlap, pinned active work,
  mixed-version safety, graceful drain, and readable rollback data.

The complete platform-wide guarantee is not implemented yet. Transactional
outbox/inbox processing, RabbitMQ task topology, universal task leases,
heartbeats, workflow checkpoints, timer recovery, execution receipts, Saga
recovery, and cross-pod replay remain part of the durable workflow milestone.

Until those components and resilience tests are complete, multiple replicas
provide service availability but do not by themselves guarantee recovery of
every in-flight operation.

