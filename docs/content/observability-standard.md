# Agent and MCP Observability Standard

Contract version: **1.0**

This contract defines the Prometheus interface for every independently deployed
Agent and MCP. It is a wire-level operational contract, not a shared source-code
dependency. Each service MUST implement and pin this version locally, or consume
an independently published telemetry SDK in production. Services MUST NOT import
observability source from another service or rely on a bundled runtime package.

## Scope and operating model

Roughly 80-90% of production observability is generic: request rate, errors,
duration, concurrency, dependency behavior, side effects, compensation,
resource saturation, and availability. These signals make fleet-wide
dashboards, alerts, capacity planning, and SLOs automatic. The remaining
10-20% is domain-specific KPI telemetry such as bookings confirmed or documents
classified. Domain KPIs MAY extend this contract, but MUST NOT redefine generic
metrics or introduce unbounded labels.

Every service exposes Prometheus text format at `/metrics`. HTTP Agents MAY
serve it on their application listener. MCPs MUST use a dedicated HTTP listener
configured by `METRICS_HOST` and `METRICS_PORT`, independent of stdio or
streamable HTTP transport. The listener starts only from the process entry
point, never as an import side effect.

In Kubernetes, a service-owned `ServiceMonitor` selects the service's named
`metrics` port. Prometheus or an agent-mode collector scrapes the endpoint and
may remote-write to Mimir/Thanos. Collectors inject `cluster`, `namespace`, and
environment labels; applications do not infer them.

## Required metrics

All counters are shown with their exported `_total` suffix.

| Metric | Type | Required labels | Meaning |
| --- | --- | --- | --- |
| `agentic_operation_requests_total` | Counter | `service`, `service_kind`, `operation`, `outcome`, `error_class`, `effect_class` | Completed public operations. |
| `agentic_operation_duration_seconds` | Histogram | same as requests | End-to-end operation duration, including failures. |
| `agentic_operation_inflight` | Gauge | `service`, `service_kind`, `operation` | Operations currently executing. |
| `agentic_operation_errors_total` | Counter | `service`, `service_kind`, `operation`, `error_class` | Failed operations, exactly once per failure. |
| `agentic_dependency_requests_total` | Counter | `service`, `service_kind`, `dependency`, `capability`, `outcome`, `error_class` | Calls to external or internal dependencies. |
| `agentic_dependency_duration_seconds` | Histogram | same as dependency requests | Dependency call duration. |
| `agentic_agent_mcp_calls_total` | Counter | same as dependency requests | Agent-to-MCP calls; a subset of dependency requests. |
| `agentic_agent_partial_failures_total` | Counter | `service`, `service_kind`, `operation` | Agent responses with one or more failed sub-operations. |
| `agentic_mcp_side_effects_total` | Counter | `service`, `service_kind`, `operation`, `effect_class`, `outcome` | MCP attempts with a declared side effect. |
| `agentic_mcp_compensations_total` | Counter | `service`, `service_kind`, `operation`, `outcome` | Compensation attempts and outcomes. |
| `agentic_mcp_idempotency_replays_total` | Counter | `service`, `service_kind`, `operation` | Requests resolved from an idempotency record when determinable. |
| `agentic_build_info` | Gauge | `service`, `service_kind`, `version`, `contract_version` | Constant `1` identifying the build and this contract. |

`service_kind` is `agent` or `mcp`. `outcome` is `success` or `error`.
`error_class` is `none` for success and a bounded machine class for failure.
`effect_class` is one of `none`, `read`, `reversible`, `irreversible`, or
`compensating`. An implementation MAY omit `read` and use `none`.

Agent dependency metrics use a stable target service family in `dependency`
and a manifest capability or tool name in `capability`; never use an endpoint,
instance, URL, or dynamic identifier. A partial result increments the normal
operation success count if a valid response was produced and also increments
`agentic_agent_partial_failures_total`.

## Optional standard extensions

Services implementing these concerns SHOULD use these names:

| Metric | Type | Labels | Meaning |
| --- | --- | --- | --- |
| `agentic_transaction_actions_total` | Counter | common, `operation`, `effect_class`, `outcome` | Forward transaction actions. |
| `agentic_transaction_compensations_total` | Counter | common, `operation`, `outcome` | Orchestrator compensation outcomes. |
| `agentic_model_requests_total` | Counter | common, `dependency`, `capability`, `outcome`, `error_class` | Model gateway calls; capability is a bounded model family, not a deployment ID. |
| `agentic_model_duration_seconds` | Histogram | same as model requests | Model call duration. |
| `agentic_model_tokens_total` | Counter | common, `dependency`, `capability`, `direction` | Input/output token count; `direction` is `input` or `output`. |
| `agentic_rag_retrievals_total` | Counter | common, `capability`, `outcome`, `error_class` | Retrieval operations by bounded retrieval profile. |
| `agentic_rag_duration_seconds` | Histogram | same as retrievals | Retrieval duration. |
| `agentic_rag_documents_returned` | Histogram | common, `capability` | Number of references returned, never document identifiers. |

Queue depth, worker utilization, connection-pool use, rate-limit utilization,
and process/runtime metrics MAY supplement `agentic_operation_inflight` for
saturation. Prefer established exporter names rather than duplicating them.

## Labels, cardinality, privacy, and security

Allowed low-cardinality labels are `service`, `service_kind`, `operation`,
`outcome`, `error_class`, `effect_class`, `dependency`, `capability`, `version`,
and collector-injected `namespace`, `cluster`, or `environment`. Any extension
requires an explicit finite vocabulary, a cardinality budget, and review.

Prometheus labels MUST NEVER contain:

- tenant ID, organization ID, group ID, or user ID;
- run ID, task ID, action ID, transaction ID, command ID, correlation ID, or
  idempotency key;
- email addresses;
- prompts, tool arguments, tool results, model output, or raw queries;
- PHI, PII, bearer tokens, credentials, secrets, or artifact bodies;
- raw exception types from third-party libraries or raw error messages;
- URLs, file paths, document IDs, message IDs, or other unbounded values.

Errors map to a reviewed set such as `invalid_argument`, `forbidden`, `expired`,
`conflict`, `not_found`, `approval_required`, `core_not_committed`, `timeout`,
`dependency_unavailable`, `upstream_failure`, `rejected`, and `internal`.
Unknown values collapse to `rejected` or `internal`; they never become labels.

High-cardinality correlation belongs in privacy-filtered logs and traces with
controlled access, encryption, retention, and audit. Metrics endpoints MUST be
cluster-internal, unauthenticated only inside an authenticated network boundary,
and excluded from public ingress. Apply NetworkPolicy and scrape authorization
appropriate to the cluster. Metrics MUST disclose no customer content.

## Histograms, exemplars, and extensions

Default operation and dependency buckets in seconds are:

`0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30`

Services with measured latency outside that range MAY publish a new contract
minor version with justified buckets. Bucket boundaries must remain identical
across replicas of one metric. Exemplars SHOULD attach sampled trace IDs to
histogram observations when the client and scraper support OpenMetrics. Trace
IDs are exemplar metadata, never normal labels, and access follows trace policy.

New generic metrics use the `agentic_` prefix, Prometheus base-unit suffixes,
and this document's naming rules. Existing metric meaning and labels MUST NOT
change within a major contract version. Additive, bounded metrics are minor
changes; removals or semantic/label changes require a new major version.

## SLIs, SLOs, recording rules, and alerts

Primary service SLIs:

- availability: successful completed operations / all completed operations;
- error rate: errored operations / all completed operations;
- latency: p50, p95, and p99 from the operation histogram;
- dependency reliability and latency by bounded dependency/capability;
- saturation: in-flight work plus Kubernetes CPU, memory, replicas, and queue
  signals where applicable;
- correctness risk: partial failures and failed compensations.

Set service SLOs from product requirements. A common starting point is 99.9%
availability over 30 days with operation-specific p95 latency objectives.
Use `docs/observability/generic-agent-mcp-recording-rules.yaml` to normalize
rates, success ratios, quantiles, and error-budget burn.

For a 99.9% SLO, page on multi-window burn (for example, 14.4x over both 5m and
1h) and ticket on sustained burn (for example, 6x over both 30m and 6h).
Pair burn alerts with no-scrape, failed-compensation, partial-failure, and
resource-saturation alerts. Avoid alerting on a ratio with no traffic.

Keep high-resolution Prometheus data for at least 15 days for incident response.
Remote-write recording rules and selected raw series to a durable backend for
at least the SLO window plus reporting margin (commonly 90-400 days). Retention,
residency, and deletion follow organizational policy; metrics remain
content-free regardless of retention.
