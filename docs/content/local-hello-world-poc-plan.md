# Local Hello World Governed AI PoC Implementation Record

**Originally planned:** September 21, 2026  
**Reviewed:** September 25, 2026  
**Status:** Operational local vertical slice; production Azure hardening remains

## 1. Demonstrated outcome

An authenticated local user can select **Hello World Governed AI and RAG
Service**, submit a release-assessment request, and observe one durable Service
Run spanning three exact immutable Workflows:

| Workflow key | Registry reference | Nodes |
| --- | --- | ---: |
| Decision | `workflow://hello-world-decision/1.5.0` | 8 |
| Publication | `workflow://hello-world-publication/1.4.0` | 2 |
| Verification | `workflow://hello-world-verification/1.3.0` | 1 |

The run retrieves governed evidence, executes parallel risk and readiness work,
synthesizes a recommendation, waits durably for human approval, publishes only
after approval, verifies the result, and returns typed output with citations,
trace context, events, and a publication receipt.

The second built-in Service, **Governed Announcement and Callback Service
1.3.0**, reuses Publication `1.4.0` and Verification `1.3.0` while pinning
Decision `1.4.0`. Catalog and Build resolve these older valid Workflow
revisions exactly rather than substituting the latest logical Workflow.

## 2. Operational local topology

```text
Browser / User Web
        |
        +--> Authentication Gateway
        +--> Registry and Configuration
        +--> Intent Router
        |
        v
Workflow Compiler
        |
        v
Run Coordinator
  PostgreSQL state, inbox/outbox, runs, nodes, waits and evidence
        |
        +--> RabbitMQ quorum queues
        +--> RAG Retrieval / pgvector
        +--> Notification Service
        |
        +--> Understand worker
        +--> RAG worker
        +--> Risk worker
        +--> Readiness worker
        +--> Synthesis worker
        +--> Publisher MCP role
        `--> Finalizer role

Observability:
  Prometheus + Loki + Tempo + Alloy + Grafana
```

Local infrastructure also includes Valkey and private MinIO buckets for
artifacts, source snapshots, extracted content, and context packs.

## 3. Durable execution behavior

The local implementation persists:

- Service Runs and child Workflow Runs;
- immutable Registry and compiled-plan snapshots;
- node state, inputs, typed results, attempts, and transition links;
- inbox/outbox records and idempotency keys;
- approval proposals, action hashes, assignments, decisions, and expiry;
- timers, callback tokens by digest, external-event inbox records, and
  notification delivery receipts;
- publication and verification receipts;
- citations, final typed results, terminal errors, and audit evidence; and
- replayable Service events correlated with logs, metrics, and traces.

Workers acknowledge commands only after durable result handling. Retry and
redelivery rely on stable message and operation identities, not best-effort
in-memory state.

## 4. Human and external waits

The qualified slice supports:

- assigned HITL approval and rejection;
- optional separation of duty;
- durable timer waits;
- authenticated triggers and callback-correlated event waits;
- notification plus wait patterns;
- expiry and operator cancellation;
- duplicate callback protection; and
- restart-safe resume without holding a browser request or worker.

Approval Inbox lists pending actions assigned to the current user, role, or
group. Run History separates Overview, Execution, Waits and approvals,
Timeline, and Evidence so operators can investigate without rendering the
entire run at once.

## 5. Qualification evidence

The local qualification has demonstrated:

- approved execution through Decision, Publication, and Verification;
- rejected execution that completes Decision and skips protected publication;
- coordinator restart while waiting for approval, followed by successful
  resume;
- finalizer replay for historical rejected runs without duplicate committed
  effects;
- multiple concurrent user and Service runs;
- quota and rate-limit enforcement;
- drained RabbitMQ command queues after completed qualification;
- Prometheus metrics for coordinator and worker roles;
- correlated structured logs in Loki;
- worker spans in Tempo; and
- a Grafana dashboard for Service, Workflow, and node state.

## 6. Registry and product behavior

Services Studio now uses:

- **Catalog** for the executable Service estate, exact Workflow associations,
  visual flow, versions, recent runs, and launch;
- **Build** for Service and Workflow authoring; and
- **Portfolio** for cross-Service lifecycle and dependency posture.

Only composed executable Service manifests are shown as business Services.
Internal platform microservices are excluded from the Service estate.

Built-in and Custom origin is explicit Registry metadata and is independent of
Draft, Published, Active, or Deprecated lifecycle state.

The Components experience discovers:

- `example-release-advisor-agent@1.2.0` as an Agent requiring **No setup**; and
- `example-operations-mcp@1.0.0` as a configurable MCP with scoped overlays.

## 7. Remaining production work

The PoC does not claim:

- production Entra identity and centralized policy enforcement;
- private managed Azure data and messaging services;
- dynamic Agent/MCP admission and operator-owned deployment;
- general-purpose execution of arbitrary user-authored capability packages;
- production credential exchange and capability tokens;
- complete multi-tenant, security, performance, and disaster-recovery
  qualification; or
- production operational ownership and SLO approval.

Those requirements remain governed by the canonical Azure, authorization,
credential-isolation, dynamic-capability, resilience, and readiness
specifications.
