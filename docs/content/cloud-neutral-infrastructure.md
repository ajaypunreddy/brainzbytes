# Cloud-Neutral Infrastructure and Delivery Design

This document defines the conceptual infrastructure, source organization, delivery pipelines, lifecycle, and operating model for the proposed reusable agentic AI platform. It supplements [CONCEPTUAL-DESIGN.md](CONCEPTUAL-DESIGN.md) and the [interactive architecture explorer](multi-agent-orchestration-animation.html).

> **Terraform builds the foundation; Helm packages services; Argo CD continuously reconciles runtime desired state.**

The greenfield implementation now lives in the sibling NextGen repositories.
Azure foundation code is in `contextweaver-nextgen-infrastructure`, runtime
charts and pipelines are owned by each service repository, and deployment
orchestration is in `contextweaver-nextgen-gitops`.

## 1. Decisions and non-goals

### 1.1 Architecture decisions

| Decision | Recommended design |
| --- | --- |
| Portable abstraction | Kubernetes is the runtime portability boundary. The initial targets are AKS on Azure, EKS on AWS, and GKE on GCP. AKS is an Azure target, not the cloud-neutral abstraction. |
| Provider model | Use common platform contracts and provider-specific Terraform/OpenTofu implementations for network, IAM, KMS, load balancing, storage classes, managed data, DNS, and cluster services. |
| Initial footprint | Start with one cloud and one region per environment. Continuously test portability and implement same-cloud multi-region disaster recovery before considering multi-cloud runtime operation. |
| Multi-cloud posture | Do not claim simultaneous active-active multi-cloud by default. Adopt it only after a measured business need, data-consistency design, vendor review, operating model, and tested failover justify the complexity. |
| Workload state | UX/API, workflow/control services, A2A agents, and MCP services are stateless and horizontally scalable. Durable run, artifact, event, registry, and checkpoint state is external. |
| Provisioning ownership | Terraform/OpenTofu provisions accounts/projects/subscriptions, network, identity, KMS, clusters, node pools, managed data foundations, and bootstrap components. |
| Runtime ownership | Argo CD owns Kubernetes desired state and continuous reconciliation. Terraform does not use the Helm provider for continuous application lifecycle management. |
| Packaging | Every independently deployable service has an independent Helm chart that consumes a shared library chart for standard deployment, service, policy, identity, telemetry, and rollout patterns. |
| Composition | Argo CD ApplicationSets compose environment, cloud, region, tenant tier, and service-set overlays. Sync waves encode dependency ordering. |
| Supply chain | Images, charts, manifests, plans, schemas, workflows, Agent Cards, and MCP metadata are immutable, versioned, signed, scanned, and promoted by digest or content hash. |
| Secrets | Git, Terraform state, Terraform plans, Helm values, images, registries, workflow definitions, and pipeline logs contain no secret values. They contain Vault references or workload-identity bindings only. |
| Token cache | Valkey/Redis never stores raw bearer tokens. It may store opaque session records, JWKS metadata, bounded policy decisions, rate-limit counters, idempotency keys, and non-sensitive ephemeral coordination records with bounded TTL. |

### 1.2 Non-goals

- This document defines the design; executable Azure, Helm, pipeline,
  Kubernetes, and service scaffolds are maintained in their owning NextGen
  repositories.
- It does not guarantee cloud portability without provider qualification and recurring restore, failover, performance, and conformance tests.
- It does not make every provider service identical. The common contract defines required behavior; provider adapters expose documented capability differences.
- It does not place durable workflow state in agent, MCP, workflow, or UX pod memory.
- It does not use Terraform to continuously manage application Helm releases.
- It does not store secrets in GitOps values, Terraform variables/state, container images, OCI metadata, workflow definitions, or CI artifacts.
- It does not treat network reachability or workload identity as originating-user authorization.
- It does not make a HIPAA certification claim. Organizational risk analysis, BAAs where applicable, policies, training, incident processes, and evidence remain required.

## 2. Cloud-portability model

### 2.1 Common platform contract

The common contract defines portable outcomes instead of provider resource names:

| Contract area | Portable requirement | Azure adapter | AWS adapter | GCP adapter |
| --- | --- | --- | --- | --- |
| Kubernetes | Supported version, private API option, OIDC/workload federation, multi-zone node pools, autoscaling | AKS | EKS | GKE |
| Network | Private subnets, controlled egress, private service access, ingress addresses, network policy support | VNet and Azure network services | VPC and AWS network services | VPC and Google Cloud network services |
| Identity | Human OIDC plus workload federation without static cloud keys | Entra and Azure workload identity | Entra/federated OIDC to AWS IAM roles | Entra/federated OIDC to GCP IAM service accounts |
| Key management | Root keys, envelope encryption, rotation, audit, and Vault auto-unseal | Key Vault / Managed HSM | KMS / CloudHSM when required | Cloud KMS / Cloud HSM when required |
| Load balancing | External and internal load balancers compatible with Gateway API/Istio | Azure load balancer/application delivery adapter | AWS load balancer adapter | Google Cloud load balancer adapter |
| Storage classes | Encrypted block and file classes, topology awareness, snapshot support | Azure Disk/Files classes | EBS/EFS classes | Persistent Disk/Filestore classes |
| Object storage | S3-compatible platform object API contract over provider-native encrypted object storage | Blob adapter | S3 adapter | GCS adapter |
| Managed data | PostgreSQL, cache, messaging/search options behind platform-owned interfaces | Approved Azure services | Approved AWS services | Approved GCP services |

The contract is versioned. A provider implementation publishes a non-secret `platform_contract` artifact containing endpoints, issuer references, storage class names, DNS zones, feature flags, region, and capability versions. GitOps bootstrap consumes that artifact; application charts do not inspect Terraform state.

### 2.2 Portability boundary

Kubernetes and platform APIs form the portability boundary. Below it, provider adapters own cloud-specific network, IAM, KMS, DNS, load balancer, storage, managed-data, and cluster behavior. Above it, charts use common Kubernetes, Gateway API, service-mesh, secret-reference, telemetry, and storage contracts.

Provider differences are explicit:

- A capability matrix records supported versions, limits, maintenance behavior, failover modes, private-link semantics, backup features, and BAA evidence.
- Contract tests run against AKS, EKS, and GKE reference environments on a scheduled basis even when production uses one cloud.
- Workload charts contain no provider resource IDs. Environment overlays select provider-neutral storage, ingress, identity, and object API classes.
- Provider-native optimizations are allowed behind an interface when their operational or compliance value exceeds portability cost.

### 2.3 Region and disaster-recovery posture

Each environment begins in one approved cloud and region with multi-availability-zone placement. Production adds a tested same-cloud secondary region when required by the service tier. Failover changes DNS/edge routing to a restored or warm regional stack after data recovery and validation.

Multi-cloud failover remains an open option, not a default claim. It requires compatible data replication or restore, equivalent security controls and vendor agreements, deterministic configuration promotion, tested identity federation, and an RTO/RPO that justifies the additional operating burden.

## 3. Layered reference architecture

### 3.1 Global and edge

1. A cloud-DNS abstraction owns public and private records through provider adapters.
2. CDN, WAF, bot protection, and DDoS controls use an approved provider adapter.
3. The provider external load balancer forwards only approved HTTPS routes.
4. Istio ingress through Kubernetes Gateway API terminates or passes through TLS according to policy and applies authentication, authorization, rate, and routing policy.
5. Entra OIDC authenticates people. The platform exchanges identity at trust boundaries rather than forwarding raw user bearer tokens.

Primary edge protocols are HTTPS and OIDC. Internal service traffic uses strict mTLS.

### 3.2 Kubernetes cluster foundation

| Foundation capability | Recommended component | Purpose |
| --- | --- | --- |
| Service mesh | Istio with strict mTLS | Service identity, traffic policy, egress control, telemetry, retries only where safe, and canary traffic splitting |
| North-south API | Gateway API with Istio Gateway | Portable ingress routing and policy attachment |
| Certificates | cert-manager | Automated internal and external certificate issuance and rotation |
| DNS | external-dns | Reconciled records through provider-specific DNS adapters |
| Secrets | Vault HA plus External Secrets Operator or Secrets Store CSI | Workload-identity-based secret retrieval and rotation without values in Git |
| Admission policy | Kyverno or Gatekeeper | Required labels, signatures, security contexts, allowed registries, resource policy, and exception controls |
| GitOps | Argo CD and ApplicationSets | Desired-state reconciliation, environment composition, health, drift, and rollback |
| Progressive delivery | Argo Rollouts | Canary and blue-green analysis with Istio traffic control |
| Artifact registry | Harbor or an approved provider OCI registry | Signed immutable images, charts, attestations, and provenance |
| Network isolation | Kubernetes NetworkPolicy plus mesh egress policy | Default deny, namespace isolation, and explicit service/egress allowlists |

Namespaces encode platform system, environment, tenant tier, and workload boundaries. Namespace design is not the only tenant control: identity, authorization, data partitions, encryption, policy, quotas, and audit remain mandatory.

### 3.3 Runtime workloads

The runtime includes:

- UX and API gateway services.
- Workflow router, compiler, scheduler, policy-enforcement, binding, artifact, report, and rendering services.
- An N-agent A2A service pool resolved by signed Agent Cards and exact contracts.
- A dynamic MCP service pool resolved by signed metadata and per-call authorization.
- Workflow, Agent Card, MCP, schema/contract, policy, artifact, and report registries or services.
- RAG retrieval, ingestion, model gateway, and connector services.

Every service is independently deployable and horizontally scalable. Workload charts declare:

- HPA for resource/request-based scaling and KEDA for event/queue-driven scaling.
- A PodDisruptionBudget appropriate to replica count and failure domain.
- Topology spread constraints and pod anti-affinity across zones and nodes.
- Priority classes for system, control, latency-sensitive, batch, and optional workloads.
- Resource requests and limits derived from measured load.
- Startup, readiness, and liveness probes with distinct meanings.
- `preStop`, termination grace, connection drain, queue drain, graceful cancellation, and bounded retry behavior.
- No durable in-memory state; leader election only for singleton coordination.

### 3.4 Shared data plane

The recommended initial data platform is:

| Need | Initial recommendation | Scale-triggered alternative |
| --- | --- | --- |
| Control, registry, run, checkpoint, metadata, and initial vector state | PostgreSQL HA with JSONB and pgvector | Add read replicas/partitioning first; introduce a dedicated vector database only after measured pgvector limits |
| Ephemeral cache, rate limits, idempotency, bounded decisions | Valkey/Redis with TLS and bounded TTL | Provider-managed compatible cache when operations or BAA evidence favor it |
| Tasks and durable events | RabbitMQ quorum queues | RabbitMQ Streams for measured high-throughput replay/longer retention; Kafka or Redpanda when measured high-retention streaming, analytics, throughput, or ecosystem needs justify a separate platform |
| Artifact and report bodies | Platform S3-compatible object API over Blob, S3, or GCS | Provider-native direct access only behind the same scoped-reference and policy contract |
| Search/vector at higher scale | PostgreSQL full text and pgvector initially | OpenSearch for search/analytics; Qdrant or Milvus for measured vector scale |

MongoDB is not a default dependency. Add it only when measured document access, schema evolution, distribution, or operational requirements are better served than by PostgreSQL JSONB. A dedicated vector database is likewise introduced only on measured recall, latency, capacity, or operational need.

All data connections use TLS. PostgreSQL uses TLS with identity and least-privilege database roles. Object operations use TLS and short-lived scoped credentials. RabbitMQ uses AMQP 0-9-1 over TLS/mTLS with least-privilege vhost, exchange, and queue permissions; the RabbitMQ Streams protocol is optional only for stream queues. Backups are encrypted, immutable where required, region-aware, restored regularly, and protected by independent retention controls.

#### 3.4.1 RabbitMQ backbone profile

RabbitMQ is the required/default durable command and event backbone. Use an approved managed RabbitMQ-compatible service where it satisfies the platform contract; otherwise install and reconcile RabbitMQ Cluster Operator through GitOps. Production self-hosted topology is an odd-sized cluster spread across three zones, with persistent volumes, PodDisruptionBudget, topology spread constraints, and pod anti-affinity. Quorum queues carry durable commands and events. RabbitMQ Streams are reserved for measured high-throughput replay or longer-retention use cases.

Publishers use persistent messages and publisher confirms. Consumers use manual acknowledgements only after the PostgreSQL inbox, workflow/checkpoint state, and outbound outbox commit. Per-message or queue TTL, delivery limits, dead-letter exchanges/queues, and bounded retry exchanges with delay/backoff prevent unbounded poison-message loops. Consumer prefetch and concurrency limits provide backpressure; priorities are enabled only for a justified bounded queue because they add operational and ordering complexity. Delivery is at least once, consumers are idempotent, and ordering is guaranteed only within the selected queue/routing/aggregate key where required, never globally.

PostgreSQL remains authoritative for run, workflow, checkpoint, Saga, outbox, and inbox state; RabbitMQ is not a workflow database. There is no XA assumption: transactional outbox relays bridge PostgreSQL commits to RabbitMQ, and inbox records deduplicate redelivery. Messages contain schemas, identifiers, and immutable object-store references rather than large payloads.

Operate self-hosted clusters with persistent-storage capacity alerts, exported definitions/policies/users where permitted, backup and definitions-recovery procedures, and tested restore/rebuild runbooks. Set and monitor connection/channel limits, queue and message growth, disk/memory alarms, queue depth, unacked messages, redeliveries, consumer utilization, publish-confirm latency, and DLQ size. Upgrades use version-compatible rolling procedures, quorum-health gates, controlled publisher/consumer connection drain, and rollback/recovery runbooks.

### 3.5 Observability and SRE

| Signal | Recommended path |
| --- | --- |
| Telemetry collection | OpenTelemetry Collectors with workload and gateway tiers |
| Metrics | Prometheus to Mimir or Thanos for durable multi-cluster retention |
| Logs | Loki with strict field allowlists, DLP, and bounded retention |
| Traces | Tempo with sampling rules and privacy-safe attributes |
| Dashboards | Grafana with tenant/environment separation |
| Alerting | Alertmanager integrated with incident management |
| Cost | OpenCost plus provider billing exports |
| Continuous profiling | Optional Pyroscope after privacy and overhead review |
| Security events | SIEM/SOAR through filtered, signed, privacy-safe audit pipelines |
| RabbitMQ SRE | Queue depth, unacked messages, redeliveries, consumer utilization, publish-confirm latency, DLQ size, connection/channel and disk/memory alarms |

No raw PHI, prompts, bearer tokens, private record values, tool results, artifact bodies, or report bodies enter routine metrics, logs, traces, profiles, alerts, or DLQs. Telemetry carries IDs, hashes, schema versions, classifications, decisions, sizes, durations, and statuses only.

### 3.6 Security and supply chain

- Entra authenticates people and supports CI federation.
- Workload federation and SPIFFE-compatible service identity provide short-lived workload credentials.
- Vault runs HA and auto-unseals through the selected provider KMS. Vault policy maps exact workload identity to exact secret paths.
- CI generates SBOMs, runs Trivy or equivalent image/filesystem scanning, signs images and charts with Cosign or equivalent, publishes provenance, and records attestations.
- Admission policy verifies trusted registry, signature, provenance, vulnerability policy, security context, and immutable digest before scheduling.
- Protected branches, CODEOWNERS, environment approvals, and separation of duties govern changes.
- Secrets never appear in Terraform state, plan artifacts, Helm values, Git, images, OCI annotations, workflow definitions, or logs.

### 3.7 Resilience

- Multi-zone system, general, compute, and optional GPU node pools.
- Cluster Autoscaler with minimum capacity for critical workloads.
- At least two replicas, and preferably three across zones, for production critical services.
- PDB, topology spread, anti-affinity, priority, requests/limits, and capacity headroom.
- Timeouts, circuit breakers, bulkheads, bounded retries, backpressure, queue limits, and load shedding.
- Readiness that reflects ability to serve, not merely process liveness.
- Encrypted backup, point-in-time recovery where supported, isolated restore tests, and approved-region failover.
- Checkpoint-preserving cancellation and idempotent replay for agent, A2A, MCP, and workflow operations.

### 3.8 Protocol contract

| Path | Protocol |
| --- | --- |
| User/edge authentication | HTTPS and OIDC |
| Internal service calls | mTLS |
| Agent-to-agent tasks | A2A over HTTPS with typed envelopes |
| MCP production access | MCP streamable HTTP over authenticated mTLS/HTTPS |
| MCP local development | stdio only; never a production transport |
| Tasks/events | RabbitMQ AMQP 0-9-1 over TLS/mTLS; optional RabbitMQ Streams protocol for stream queues |
| Relational/vector control data | PostgreSQL protocol over TLS |
| Artifacts | S3-compatible object API over TLS |
| Telemetry | OTLP over authenticated TLS |

## 4. Managed versus self-hosted decision boundary

Production data services may use provider-managed offerings behind platform-owned interfaces to reduce patching, HA, backup, failover, and compliance-evidence burden. In-cluster operators can maximize portability but transfer on-call, upgrade, scaling, backup, restore, security, and evidence obligations to the platform team.

| Criterion | Prefer provider-managed | Prefer in-cluster/operator |
| --- | --- | --- |
| Team capacity | Small data/platform operations team | Mature 24x7 database/platform SRE |
| BAA/evidence | Provider evidence materially reduces burden | Organization already operates and evidences the service |
| Portability | Interface portability is sufficient | Physical portability is a dominant requirement |
| Recovery | Managed PITR/failover meets RTO/RPO | Custom topology is required and tested |
| Feature need | Provider service meets contract | Required feature is unavailable or materially constrained |
| Cost | Managed total cost is lower | Stable scale and strong operator expertise reduce cost |
| Upgrade control | Provider windows are acceptable | Precise version/patch sequencing is mandatory |

The default is managed PostgreSQL, object storage, and cache where approved. RabbitMQ uses an approved managed RabbitMQ-compatible service when available or RabbitMQ Cluster Operator with the production topology and operational controls defined above. Application code sees the platform event contract, not the provider SKU.

## 5. Source and repository organization

### 5.1 Recommended three-repository model

```text
platform-source/
|-- services/
|   |-- ux-api/
|   |-- workflow-control/
|   |-- contract-gateway/
|   |-- agent-services/
|   `-- mcp-services/
|-- shared-libraries/
|-- contracts/
|   |-- schemas/
|   |-- a2a/
|   |-- mcp/
|   `-- platform/
|-- chart-sources/
|   |-- library-chart/
|   `-- services/
|-- tests/
|   |-- unit/
|   |-- contract/
|   |-- integration/
|   `-- performance/
|-- build/
|   |-- Dockerfiles/
|   `-- packaging/
|-- pipeline-templates/
|   |-- service-ci.yml
|   `-- helm-ci.yml
|-- CODEOWNERS
`-- README.md

platform-infrastructure/
|-- terraform/
|   |-- modules/
|   |   |-- contracts/
|   |   |-- network/
|   |   |-- identity/
|   |   |-- kms/
|   |   |-- cluster/
|   |   |-- data-foundation/
|   |   |-- observability/
|   |   `-- dr/
|   |-- providers/
|   |   |-- azure/
|   |   |-- aws/
|   |   `-- gcp/
|   `-- stacks/
|       |-- bootstrap/
|       |-- network/
|       |-- identity/
|       |-- cluster/
|       |-- data-foundation/
|       |-- platform-foundation/
|       |-- observability/
|       `-- dr/
|-- environments/
|   |-- dev/<cloud>/<region>/
|   |-- integration/<cloud>/<region>/
|   |-- stage/<cloud>/<region>/
|   `-- prod/<cloud>/<region>/
|-- policy/terraform/
|-- tests/
|   |-- contract/
|   |-- policy/
|   `-- recovery/
|-- pipeline-templates/
|   |-- terraform-ci.yml
|   |-- terraform-cd.yml
|   |-- cluster-upgrade.yml
|   `-- dr-test.yml
|-- CODEOWNERS
`-- README.md

platform-gitops/
|-- clusters/
|   |-- dev/<cloud>/<region>/
|   |-- integration/<cloud>/<region>/
|   |-- stage/<cloud>/<region>/
|   `-- prod/<cloud>/<region>/
|-- applications/
|   |-- base/
|   `-- overlays/
|       |-- environment/
|       |-- cloud/
|       |-- region/
|       `-- tenant-tier/
|-- values/
|   |-- common/
|   `-- environments/
|-- argocd/
|   |-- projects/
|   |-- applicationsets/
|   `-- sync-waves/
|-- policies/
|-- rollouts/
|-- promotions/
|-- platform-contracts/
|-- pipeline-templates/
|   |-- promote.yml
|   `-- gitops-verify.yml
|-- CODEOWNERS
`-- README.md
```

The source repository CI builds artifacts only. The infrastructure repository pipeline owns Terraform plan/apply. The GitOps repository owns intended Kubernetes versions, digests, configuration references, policies, and promotions. Argo CD owns apply and reconciliation inside the cluster.

### 5.2 Optional service repositories

Large or independently governed teams may use one repository per service:

```text
service-<name>/
|-- src/
|-- tests/
|   |-- unit/
|   |-- contract/
|   `-- integration/
|-- Dockerfile
|-- chart/
|-- contracts/
|-- pipeline/
|-- CODEOWNERS
`-- README.md
```

The same internal shape can live at `platform-source/services/<service>/` in a monorepo. Repository count changes ownership and release isolation, not the artifact, chart, contract-test, or promotion contract.

### 5.3 Catalog and governance organization

Version and sign these governance artifacts:

- Schemas and compatibility metadata.
- Workflow definitions and safe control templates.
- Agent Cards and A2A contract metadata.
- MCP service/tool metadata and side-effect classifications.
- Policy bundles, disclosure templates, and report templates.
- RAG source/catalog definitions and ingestion policy.

Small organizations may keep them in clearly owned directories in `platform-source` or `platform-gitops`. Larger organizations should use a separate governance repository with dedicated CODEOWNERS, approval policy, signing, publication, and immutable artifact promotion.

### 5.4 Common pipeline templates

A central `pipeline-templates` area publishes pinned, reviewed templates for:

- Terraform CI and CD.
- Application/service CI.
- Helm chart CI.
- Security and supply-chain validation.
- Release and GitOps promotion.
- GitOps health verification.
- Cluster upgrade.
- Disaster-recovery testing.

Templates are parameterized by cloud, environment, region, service, stack, risk tier, and artifact. Do not create three divergent cloud pipelines. Provider-specific steps live behind a common stage contract.

### 5.5 Environment and secret rules

Environment directories contain:

- Non-secret identifiers, regions, feature selections, capacity classes, artifact digests, and Vault paths.
- Immutable chart/image/config/schema/workflow versions.
- Approved provider contract references.

They never contain secret values, raw tokens, private keys, connection passwords, PHI, or unrestricted credentials. Vault references resolve at runtime through workload identity.

### 5.6 Ownership and change control

| Area | Primary owner | Required reviewers |
| --- | --- | --- |
| Provider modules and stacks | Platform infrastructure | Cloud platform, security, SRE |
| Identity, KMS, network policy, admission | Security/platform | Security and service owner |
| Cluster foundation and GitOps | Platform SRE | Security and affected service owners |
| Service source/chart | Service team | Service CODEOWNERS and contract owners |
| Workflows, RAG, schemas, Agent Cards, MCP metadata | Workflow/RAG governance | Domain, security/privacy, contract owner |
| Production promotion | Release owner | Environment approver; manual approval for production/high-risk/HIPAA changes |
| DR policy and tests | SRE/resilience | Data owner, security, platform |

Protected branches require status checks, signed commits or equivalent verified identity where supported, CODEOWNERS, approval count, no self-approval for high-risk changes, and auditable exceptions.

## 6. Artifact and promotion flow

```text
source commit
  -> CI tests, contracts, security, build
  -> immutable OCI image/chart + SBOM + provenance + signatures
  -> GitOps promotion pull request with exact digest/version
  -> environment approval and signed attestations
  -> Argo CD sync
  -> Argo Rollouts progressive delivery through Istio
  -> readiness, contract, security, quality, metric, trace, and SLO gates
  -> promote to 100 percent or automatically shift back and reconcile known-good
```

Terraform CD publishes a signed, non-secret platform contract after apply. GitOps bootstrap consumes that contract as a versioned input. It does not read mutable Terraform state directly and Terraform does not mutate application releases.

## 7. Terraform/OpenTofu design

### 7.1 Module interfaces

Every module exposes a narrow typed interface:

| Module | Required inputs | Non-secret outputs |
| --- | --- | --- |
| `network` | cloud, region, address plan, zones, private connectivity policy, egress class | subnet IDs, route/security policy refs, private DNS refs |
| `identity` | issuer, environment, workload subjects, permission profiles | workload identity refs, issuer/audience metadata |
| `kms` | key purpose, region, rotation, deletion protection, administrators | key refs and policy version |
| `cluster` | Kubernetes version, private/public API policy, network refs, identity refs, zones | cluster endpoint ref, issuer, CA ref, feature/version contract |
| `node-pools` | pool class, zones, size bounds, taints/labels, autoscaling | pool refs and schedulable capabilities |
| `data-foundation` | service class, HA, backup, network, encryption, RTO/RPO | endpoint refs, database/object/messaging capability contract |
| `platform-foundation` | cluster contract, Vault/KMS refs, DNS and registry refs | Argo CD bootstrap endpoint/ref and platform feature contract |
| `observability` | retention, tenant/environment labels, destinations | OTLP/metrics/log/trace endpoint refs |
| `dr` | primary/secondary region refs, backup policy, restore tier | recovery plan ref, replicated artifact refs, last test metadata |

Module outputs never contain passwords, tokens, private keys, or secret material. A secret service may create credentials directly into Vault without returning values to Terraform.

### 7.2 Stack boundaries and apply order

Use separate state and blast-radius boundaries:

1. `bootstrap`: state backend, locking, CI federation, KMS roots, prerequisite DNS/account/project setup.
2. `network`: region network, private endpoints, egress, DNS foundations.
3. `identity`: CI and workload federation, platform roles, KMS policies.
4. `data-foundation`: managed PostgreSQL, cache, object storage, messaging, backups.
5. `cluster`: AKS/EKS/GKE, node pools, storage classes, load balancers.
6. `platform-foundation`: Vault bootstrap, External Secrets/CSI, Argo CD bootstrap.
7. `observability`: durable telemetry backends and SIEM routes.
8. `dr`: secondary-region capacity, replication/backup, recovery automation.

Small stacks reduce lock contention and blast radius. Explicit remote-state or contract references are versioned and read-only. Avoid bidirectional dependencies.

### 7.3 State strategy

- One encrypted, versioned backend and lock domain per environment/cloud/region/stack.
- State access uses CI OIDC federation and least-privilege roles; humans use time-bound break-glass only.
- State and plan artifacts are treated as sensitive even though secrets are prohibited.
- Enable versioning, deletion protection, audit, retention, backup, and tested recovery.
- A plan is tied to repository commit, stack, provider lockfile, policy result, and expiry, then signed before approval.
- CD verifies the exact approved plan and commit before apply.
- Drift jobs record differences and open a change; they do not silently overwrite production.
- Import, moved-resource, provider-upgrade, and state-repair operations require reviewed runbooks and enhanced audit.

## 8. Helm and chart conventions

Every service chart:

- Uses the shared library chart for labels, service accounts, workload identity, Deployment/Rollout, Service, NetworkPolicy, PDB, HPA/KEDA, probes, topology spread, security context, telemetry, and Vault references.
- Pins images by digest in production. Tags are display metadata only.
- Exposes a values JSON schema and fails on unknown or invalid values.
- Contains no secret values and renders only Vault references or ExternalSecret/CSI objects.
- Defines startup, readiness, liveness, `preStop`, termination grace, and drain behavior.
- Declares resource requests/limits, minimum replicas, autoscaling bounds, priority class, zone spread, and disruption policy.
- Uses immutable ConfigMap/Secret-reference names or content hashes so changes are explicit and reversible.
- Publishes chart package, SBOM/provenance, signature, test evidence, and compatibility metadata to OCI.

The library chart standardizes mechanics but does not force identical scaling, SLO, security, or data behavior. Each service owns its values schema and contract tests.

## 9. Argo CD and GitOps design

### 9.1 ApplicationSet dimensions

ApplicationSets generate Applications from approved combinations of:

- Environment: dev, integration, staging, production.
- Cloud: Azure, AWS, GCP.
- Region: approved regional contract.
- Cluster: cluster identity and lifecycle state.
- Service set: platform foundation, data adapters, control plane, agents, MCP, UX.
- Tenant tier: only when dedicated placement is required.

### 9.2 Sync waves

| Wave | Content |
| --- | --- |
| `-50` | CRDs and required operators |
| `-40` | Mesh, Gateway API, cert-manager, policy engines |
| `-30` | Vault integration, External Secrets/CSI, workload identity bindings |
| `-20` | Observability collectors and cluster-level telemetry |
| `-10` | Registry adapters, state, cache, messaging, object, search adapters |
| `0` | Workflow/control, policy, contract, artifact, report services |
| `10` | A2A agents and MCP services |
| `20` | UX/API and external routes |
| `30` | Smoke, contract, synthetic, security, and SLO verification hooks/jobs |

CRD upgrades are separated from custom-resource rollouts when compatibility requires it. Sync-wave ordering is not readiness by itself; health checks and explicit gates prove each dependency.

### 9.3 Reconciliation and promotion

- Argo CD applies and reconciles only Git-approved desired state.
- Production uses automated reconciliation with controlled sync windows and self-heal policy appropriate to risk.
- Promotion creates a PR changing exact image/chart/config/workflow/schema digests or signed versions.
- Existing workflow runs retain immutable version pins unless a hard revocation blocks continued use.
- A rollback PR or automated rollout abort restores the previous known-good digest/config; reconciliation then maintains it.

## 10. Common pipeline definitions

All pipelines use short-lived OIDC federation, immutable inputs, pinned template versions, isolated runners, least privilege, and privacy-safe logs. Common templates are parameterized by cloud, environment, region, stack, service, and risk tier.

### 10.1 `terraform-ci.yml`

| Item | Design |
| --- | --- |
| Trigger | Infrastructure pull request or provider/module dependency update |
| Inputs | Stack, environment, cloud, region, commit, provider lockfile |
| Stages | Format; validate; tflint; Checkov/tfsec equivalent; policy/conftest; Terraform test; provider contract tests; plan; cost estimate; plan redaction check; plan artifact signing |
| Outputs | Signed plan, policy results, cost delta, test evidence, proposed non-secret output contract |
| Permissions | Read source/modules; read non-secret remote contracts; assume plan-only cloud role; write CI artifacts/attestations; no apply or secret read |
| Gates | Required checks and CODEOWNERS; no secrets/state values in logs/artifacts |

### 10.2 `terraform-cd.yml`

| Item | Design |
| --- | --- |
| Trigger | Approved environment deployment referencing a signed CI plan |
| Inputs | Signed plan, exact commit, stack, environment/cloud/region, approval record |
| Stages | OIDC federation; verify plan signature/commit/expiry; environment approval; acquire state lock; apply exact plan; verify outputs and health; publish signed non-secret platform contract; record drift baseline |
| Outputs | Apply evidence, state version reference, non-secret contract artifact, health result, audit record |
| Permissions | Assume stack-scoped apply role; read/write one state/lock; publish contract; no application/GitOps mutation and no broad secret read |
| Gates | Manual production/high-risk approval; break-glass separately audited |

### 10.3 `service-ci.yml`

| Item | Design |
| --- | --- |
| Trigger | Service pull request/merge |
| Inputs | Service path, language/toolchain, contract versions, base image digest |
| Stages | Unit/integration tests; type and lint; A2A/MCP/schema contract tests; SAST; SCA/license; secret scan; image build; SBOM; vulnerability scan; provenance; sign; push immutable OCI digest |
| Outputs | Signed image digest, SBOM, provenance, test/security attestations, compatibility record |
| Permissions | Read source/contracts; write service OCI path and attestations; no environment deployment or production secret access |
| Gates | Severity/license/contract policy and protected branch checks |

### 10.4 `helm-ci.yml`

| Item | Design |
| --- | --- |
| Trigger | Service/library chart pull request/merge |
| Inputs | Chart path, library chart version, supported Kubernetes/provider contract versions |
| Stages | Lint; render/template; values-schema validation; chart unit tests; policy/conftest; kubeconform; integration install/upgrade test; package; SBOM/provenance; sign; push OCI |
| Outputs | Signed chart digest/version, rendered-test evidence, compatibility matrix |
| Permissions | Read chart/contracts; write chart OCI path and attestations; no cluster apply |
| Gates | No secret values, mutable images, invalid policy, or unknown schema fields |

### 10.5 `promote.yml`

| Item | Design |
| --- | --- |
| Trigger | Approved artifact selected for dev, integration, staging, or production |
| Inputs | Signed image/chart/config/schema/workflow digest, source environment evidence, target environment/cloud/region |
| Stages | Verify signatures/attestations; compatibility and policy check; update exact GitOps digest/version; open promotion PR; CODEOWNERS/environment approval; merge |
| Outputs | Auditable GitOps PR/commit and target desired-state version |
| Permissions | Read OCI attestations; create GitOps branch/PR; no direct cluster or Terraform access |
| Gates | Dev -> integration -> staging -> production; manual approval for production/high-risk/HIPAA change |

### 10.6 `gitops-verify.yml`

| Item | Design |
| --- | --- |
| Trigger | Argo sync/rollout event or post-promotion verification |
| Inputs | Cluster contract, Application/Rollout, expected digest/config, SLO and quality policy |
| Stages | Wait for sync/health; smoke; A2A/MCP/schema contract; synthetic workflow; security checks; metrics/traces; error-budget and quality gates; promote rollout or initiate rollback |
| Outputs | Health/quality/security attestation, rollout decision, incident reference on failure |
| Permissions | Read Argo/Kubernetes health and privacy-safe telemetry; update only rollout analysis/status through approved controller; no secret payload read |
| Gates | Automatic rollback on failed hard gate; manual review for ambiguous quality results |

### 10.7 `cluster-upgrade.yml`

| Item | Design |
| --- | --- |
| Trigger | Approved Kubernetes/add-on/node image upgrade |
| Inputs | Current/target versions, provider, cluster, add-on compatibility matrix, maintenance approval |
| Stages | Compatibility validation; backup/checkpoint; provider control-plane upgrade; create surge/blue-green node pool; cordon/drain honoring PDB; reschedule/readiness; move traffic; retire old pool; verify |
| Outputs | Version contract, node-pool status, health/SLO evidence, rollback/forward-fix decision |
| Permissions | Cluster-upgrade provider role and bounded Kubernetes read/drain; no application source or secret read |
| Gates | Capacity headroom, PDB compliance, workload readiness, no SLO breach |

### 10.8 `dr-test.yml`

| Item | Design |
| --- | --- |
| Trigger | Scheduled drill or approved change |
| Inputs | Backup set, recovery stack ID, target isolated environment/region, RTO/RPO objectives |
| Stages | Validate backup/signature; create specifically named isolated recovery stack; restore data/config; GitOps reconcile; integrity/contract/synthetic/security tests; measure RTO/RPO; collect evidence; destroy only the named test stack |
| Outputs | Restore evidence, measured RTO/RPO, integrity results, gaps/backlog, destruction audit |
| Permissions | Read approved backup; create/delete one explicit test stack; isolated DNS/identity; no production mutation |
| Gates | Safety assertion on exact test-stack identity and isolation; human approval before any production failover |

## 11. Lifecycle state machine

```text
UNPROVISIONED
  -> BOOTSTRAPPING
  -> FOUNDATION_READY
  -> PLATFORM_SYNCING
  -> VALIDATING
  -> ACTIVE
  -> UPGRADING/CANARY
  -> ACTIVE

Failure branches:
  VALIDATING or UPGRADING/CANARY
    -> ROLLED_BACK | DEGRADED | FAILED
    -> RECOVERING
    -> VALIDATING
    -> ACTIVE
```

Every transition records actor, exact commit/plan/digests, pipeline and stage, approvals, health/SLO/quality evidence, data phase, cluster/node-pool state, rollback point, next state, and privacy-safe audit references.

## 12. Bootstrap runbook

1. **Pre-bootstrap:** create or verify the versioned state backend and locking, CI OIDC federation, KMS roots, DNS zones, accounts/subscriptions/projects, quotas, billing/ownership, break-glass identities, and audit sinks.
2. **Plan validation:** run format, validation, lint, IaC security, policy, tests, plan, cost, and signed-plan publication.
3. **Approved apply:** apply independently approved stacks in order: network -> identity/KMS -> managed data foundations -> AKS/EKS/GKE -> node pools/storage/LB -> Vault/bootstrap -> Argo CD.
4. **Publish contract:** produce the signed non-secret cluster/platform contract.
5. **GitOps bootstrap:** ApplicationSets instantiate the environment from the approved contract and immutable desired state.
6. **Sync waves:** CRDs/operators -> mesh/cert/policy/secrets -> observability -> registry/state/messaging adapters -> platform services -> agents/MCP -> UX.
7. **Validation:** run readiness, smoke, contract, synthetic workflow, security, backup, telemetry, and SLO tests.
8. **Activation:** approve `ACTIVE` only when all mandatory evidence passes. A partial foundation remains `DEGRADED` or `FAILED`; it is never represented as active.

## 13. Zero-downtime invariants

- At least two critical-service replicas, preferably three, distributed across zones.
- PDB plus rollout policy with `maxUnavailable=0` and a capacity-tested surge.
- Distinct startup, readiness, and liveness probes.
- `preStop`, termination grace, connection drain, queue drain, graceful task cancellation, checkpoint preservation, and idempotent retry.
- Capacity headroom for surge, rescheduling, retries, and a zone failure.
- Backward-compatible N-1/N+1 HTTP, A2A, MCP, event, artifact, and schema contracts during the rollback window.
- No durable in-memory state; leader election for singleton responsibilities.
- Bounded retry with backpressure, circuit breakers, bulkheads, and deadlines.
- Existing workflow runs remain pinned to immutable versions unless hard revocation requires stop or migration.
- Load, soak, failover, and rollback evidence before high-risk production promotion.

## 14. Application and service upgrade runbook

1. PR executes tests, type/lint, contract, SAST, SCA/license, and secret scanning.
2. CI builds the image, creates SBOM/provenance, scans, signs, and publishes an immutable OCI digest.
3. Helm CI validates and signs the independent service chart.
4. Promotion verifies attestations and updates the GitOps digest/chart/config through a PR.
5. Promote dev -> integration -> staging -> production with target-specific evidence. Production/high-risk/HIPAA changes require manual approval.
6. Argo CD reconciles the desired state.
7. Argo Rollouts uses canary or blue-green. A conceptual canary progresses 1 -> 5 -> 25 -> 50 -> 100 percent through Istio.
8. At each gate, check readiness, errors, latency, saturation, traces, contract results, quality metrics, security signals, and error-budget policy.
9. Promote to 100 percent only after all hard gates pass.
10. On failure, stop promotion, shift Istio traffic to known-good, abort the Rollout, and let Argo reconcile the prior digest/config.

## 15. Database and schema upgrade runbook

Use expand-and-contract:

1. Deploy an additive schema change first.
2. Verify old and new application versions remain compatible.
3. Deploy compatible dual-read/dual-write behavior where required.
4. Backfill using bounded batches, checkpoints, throttling, pause/resume, and privacy-safe progress.
5. Verify counts, hashes, constraints, sampled semantics, latency, and replication/backup health.
6. Switch reads through a separately controlled configuration version.
7. Observe through the rollback window.
8. Remove old writes, fields, tables, indexes, or contracts only in a later destructive change with independent approval.

Never couple a destructive migration to the first application rollout. Use native HA/failover, PITR backup, and a successful restore test. If verification fails, stop the backfill, retain compatible paths, restore reads to the old representation, and preserve checkpoints.

## 16. Kubernetes and platform upgrade runbook

1. Validate provider, Kubernetes, mesh, CSI/CNI, Gateway API, policy, cert-manager, External Secrets, Argo, observability, and workload compatibility.
2. Verify backup, restore, capacity headroom, PDBs, and maintenance approval.
3. Upgrade the provider-managed control plane within supported skew.
4. Create a surge or blue-green node pool using the target node image/version.
5. Move a bounded workload sample and verify readiness/SLOs.
6. Cordon and drain old nodes while honoring PDB, termination grace, and workload checkpoints.
7. Verify rescheduling, topology, storage attachment, network, mesh identity, and agent/MCP task behavior.
8. Move remaining traffic/workloads.
9. Retire the old pool only after the rollback window.

For risky major platform changes, provision a parallel cluster, reconcile with GitOps, restore or replicate data through approved mechanisms, validate synthetic workflows and security, shift traffic, and retain the old cluster through the rollback window.

## 17. Terraform change runbook

1. Run format, validation, lint, security, policy, tests, drift, plan, and cost checks.
2. Sign the plan and bind it to the exact commit, stack, environment, provider locks, and expiry.
3. Obtain required CODEOWNERS and environment approval.
4. Acquire the state lock and apply only the small blast-radius stack.
5. Verify outputs, provider health, dependent contract tests, and drift baseline.
6. Publish the new non-secret platform contract when interfaces changed.

Prefer a forward fix because many cloud operations are not safely reversible. Roll back only when the provider operation and data implications are explicitly proven reversible. State lock/versioning, enhanced audit, and time-bound break-glass are mandatory.

## 18. Config, workflow, schema, and secret upgrade runbook

- Publish a signed immutable version.
- Validate policy, compatibility, dependency graph, contracts, migrations, and consumer impact.
- Canary by environment, tenant cohort, workflow, agent/MCP capability, or traffic slice.
- Pin each run to exact workflow, schema, Agent Card, MCP metadata, policy, prompt/model, renderer, and config versions.
- Existing runs continue their pins unless a hard revocation blocks them.
- A rollback selects the prior signed version; it does not mutate history.
- Vault secret/certificate rotation overlaps old and new validity, distributes the new reference, reloads without restart when supported, verifies use, then revokes old material.
- Raw secret values never transit GitOps, Terraform output, chart values, CI artifacts, or workflow state.

## 19. Failure and rollback matrix

| Failure | Detection/gate | Immediate action | Rollback/forward path | Preserved evidence |
| --- | --- | --- | --- | --- |
| Image/chart signature or scan fails | CI/admission | Block publication or admission | Fix source/dependency and rebuild | SBOM, scan, policy decision |
| Canary readiness/latency/error/quality fails | Rollout analysis | Stop promotion; shift traffic to known-good | Argo rollback to previous digest/config | Metrics/traces/status, no raw PHI |
| Agent/MCP/workflow version is faulty | Contract/quality/SLO gate | Disable bad version from routing | Restore prior signed registry/config version | Run pins, checkpoints, decision IDs |
| Schema migration verification fails | Backfill gate | Stop/pause backfill; keep compatible reads/writes | Resume after fix or switch reads back | Checkpoint, counts/hashes, audit |
| Destructive schema incompatible | Preflight/rehearsal | Do not deploy | Redesign as expand-and-contract | Compatibility report |
| Terraform apply partially fails | Apply/health verification | Hold lock; assess provider actual state | Forward fix; reverse only proven-safe operations | State versions, plan, provider events |
| Argo sync unhealthy | Argo health | Stop later waves/promotions | Restore prior Git commit/digest or forward fix | Sync/health history |
| Node-pool drain violates capacity/PDB | Upgrade gate | Stop drain; uncordon if safe | Retain old pool; add capacity/fix PDB | Eviction/readiness evidence |
| Control-plane/add-on incompatibility | Compatibility/health | Stop dependent changes | Provider-supported recovery or parallel cluster | Version matrix and events |
| Vault/certificate rotation fails | Reload/handshake test | Retain overlapping old validity | Restore previous reference; correct new version | Secret version IDs only |
| Data service failover or corruption | SLO/integrity checks | Isolate writes as runbook directs | Native failover, PITR, or restore | WAL/backup refs, integrity evidence |
| Region loss | Regional health and incident declaration | Stop promotion; invoke DR | Restore/reconcile approved secondary, validate, shift DNS | RTO/RPO and decision audit |
| Rollback/DLQ handling | Any failure path | Store metadata and scoped refs only | Reprocess idempotently after authorization | No raw PHI or bearer tokens |

## 20. SLO, capacity, and latency recommendations

These are initial design targets to validate under representative workloads, not guarantees.

| Area | Initial recommendation |
| --- | --- |
| Edge/API availability | 99.9 percent per production region; stricter tiers require explicit multi-region design |
| Workflow control availability | 99.95 percent for scheduling/status APIs where business critical |
| Agent A2A dispatch overhead | p95 platform overhead under 250 ms excluding model/tool execution |
| MCP discovery/listTools | p95 under 300 ms from warm metadata cache |
| MCP call gateway overhead | p95 under 200 ms excluding external tool latency |
| Authorization/PDP | p95 under 75 ms local-region; bounded safe decision cache only when policy permits |
| Queue admission | p95 under 100 ms under normal load; explicit backpressure under saturation |
| Checkpoint commit | p95 under 150 ms for ordinary control metadata |
| Artifact reference publication | p95 under 250 ms excluding large-object upload |
| Recovery objectives | Tiered by data/service; see the DR section |

Capacity rules:

- Size for peak plus canary surge, one-node maintenance, and the required zone-failure scenario.
- Preserve at least 30 percent deploy/incident headroom for critical control services until load evidence supports a different figure.
- Use queue depth, oldest-message age, active tasks, token/model concurrency, MCP downstream limits, CPU, memory, and latency for scaling.
- Cap each tenant, workflow, agent, MCP tool, model, and external dependency independently.
- Shed optional work before required control, cancellation, authorization, audit, and health paths.
- Test long-running stream disconnect, reconnect, cancellation, checkpoint, and idempotent replay behavior.

## 21. Security, supply chain, and HIPAA controls

| Control | Design |
| --- | --- |
| Human identity | Entra OIDC, MFA, conditional access/device policy, JIT/PAM for privileged operations |
| Workload identity | Federation/SPIFFE-compatible identity, short-lived audience-bound credentials, no static cloud keys |
| Service transport | Istio strict mTLS, Gateway API, default-deny NetworkPolicy and egress |
| Secrets | Vault HA, provider-KMS auto-unseal, workload-bound paths, overlap rotation, no values in Git/state/charts/images |
| Supply chain | Protected branches, CODEOWNERS, SAST/SCA/license/secrets, SBOM, scan, Cosign signatures, provenance, signature admission |
| Policy | Kyverno/Gatekeeper plus application PDP/PEPs; exceptions are time-bound, approved, visible, and audited |
| Data | Encryption in transit/at rest, tenant isolation, minimum necessary, scoped references, retention/deletion/legal hold/residency |
| Telemetry | No PHI, raw prompt, private result, bearer token, or secret values; DLP and allowlisted attributes |
| Vendor boundary | Approved providers/services/regions, due diligence and BAAs where applicable, live policy status |
| Evidence | Immutable privacy-safe audit, change/approval/attestation records, restore/DR/security test results |

No cache contains raw bearer tokens. Token exchange occurs at the boundary and yields a short-lived audience- and scope-bound credential. Valkey/Redis may cache opaque server-side session handles, JWKS metadata, decision records keyed by policy/revocation context, rate limits, and idempotency with bounded TTL.

## 22. Backup, DR, RTO, and RPO

### 22.1 Tier recommendations

| Tier | Example data/services | Initial RPO | Initial RTO | Method |
| --- | --- | --- | --- | --- |
| Tier 0 | Identity/policy roots, KMS/Vault recovery material, Git/OCI source of truth | Near-zero configuration loss; key-specific policy | 1 hour | Provider HA, protected export/recovery, Git/OCI replication, documented break-glass |
| Tier 1 | PostgreSQL control/checkpoint/registry metadata, critical artifact metadata | 5 minutes | 2 hours | Multi-AZ HA, PITR, encrypted cross-region backup/replica, isolated restore |
| Tier 2 | Artifact/report objects and event streams required for resume | 15 minutes | 4 hours | Versioned object replication/backup, stream snapshots/replay, integrity checks |
| Tier 3 | Rebuildable indexes, caches, derived telemetry | 24 hours or rebuild point | 24 hours | Rebuild from authoritative source; cache is disposable |

Business and legal requirements may require stricter or shorter retention. RTO/RPO are approved per workflow and data class.

### 22.2 Recovery sequence

1. Declare incident and freeze unrelated promotion.
2. Select the approved recovery region and exact backup/config versions.
3. Provision or activate the small-blast-radius recovery foundation.
4. Restore Vault/KMS access according to split-knowledge/break-glass procedure.
5. Restore PostgreSQL, object artifacts, and messaging/checkpoint data.
6. Reconcile platform and applications from signed GitOps desired state.
7. Validate identity, policy, schemas, data integrity, A2A/MCP/RAG contracts, privacy, synthetic workflows, and SLOs.
8. Shift DNS/edge traffic only after approval.
9. Measure and record RTO/RPO, reconcile divergent work, and complete incident review.

DR tests restore into a specifically named isolated environment and destroy only that explicit test stack after evidence collection.

## 23. Day-2 lifecycle

- Continuous GitOps reconciliation and Terraform drift detection.
- Dependency, base-image, OS/node-image, Kubernetes, add-on, and provider patching.
- Certificate, workload credential, signing key, KMS key, and Vault secret rotation.
- Capacity review, autoscaling tuning, quota management, and cost allocation.
- Backup verification, isolated restore tests, regional failover drills, and RTO/RPO review.
- Chaos tests for node, zone, dependency, queue, network, credential, and policy-source failures.
- Vulnerability triage/remediation with risk-based deadlines and compensating controls.
- SLO/error-budget, latency, quality, fairness, and tenant-isolation review.
- Version adoption, deprecation, end-of-life, and consumer migration.
- Evidence review for access, change, incident, vendor, BAA, retention, and workforce controls.

## 24. Phased implementation backlog

This backlog describes future work only; it contains no implementation code.

### Phase 0: contracts and ownership

1. Approve cloud, region, RTO/RPO, tenancy, and managed-service defaults.
2. Define provider contract schema and AKS/EKS/GKE conformance tests.
3. Establish repository ownership, CODEOWNERS, branch policy, environment approvals, and signing roots.
4. Define secret-reference, workload-identity, telemetry, and supply-chain contracts.

### Phase 1: bootstrap and one-cloud foundation

1. Design state backend/locking, CI federation, KMS roots, network, identity, and cluster stacks.
2. Design managed PostgreSQL, cache, RabbitMQ operator/managed topology, persistent storage, definitions recovery, object, backup, and DR contracts.
3. Establish Vault, External Secrets/CSI, Argo CD, policy, mesh, cert, DNS, and observability bootstrap sequence.
4. Produce the first signed non-secret platform contract.

### Phase 2: packaging and GitOps

1. Define shared library chart and independent service-chart conventions.
2. Define ApplicationSets, projects, sync waves, overlays, health checks, and rollout policy.
3. Define all eight common pipelines and attestations.
4. Exercise dev -> integration -> staging -> production promotion and rollback.

### Phase 3: zero-downtime and data lifecycle

1. Validate replica, PDB, probe, drain, idempotency, and N-1/N+1 contracts.
2. Exercise canary/blue-green and automatic traffic rollback.
3. Exercise expand-and-contract, backfill checkpointing, PITR, and restore.
4. Exercise node-pool and provider control-plane upgrades.

### Phase 4: portability and DR

1. Run scheduled contract tests on AKS, EKS, and GKE.
2. Add same-cloud secondary-region recovery and measured RTO/RPO.
3. Rehearse parallel-cluster migration for high-risk platform changes.
4. Evaluate multi-cloud DR only against a documented business case.

### Phase 5: operational maturity

1. Tune SLOs, capacity, cost, autoscaling, backpressure, and tenant quotas from evidence.
2. Automate patch, certificate/key rotation, restore tests, chaos, vulnerability, and deprecation workflows.
3. Review managed versus operator-run services using measured burden and compliance evidence.
4. Complete organizational security, privacy, vendor, incident, contingency, and evidence processes.

## 25. Open decisions and recommended defaults

| Open decision | Recommended default |
| --- | --- |
| Initial cloud | Select one approved cloud from business context; do not label its managed Kubernetes service cloud-neutral |
| Initial region count | One region per non-production environment; production multi-AZ, with same-cloud secondary region based on tier |
| Active-active multi-cloud | No |
| IaC engine | Terraform or OpenTofu behind the same module/stack contract |
| Kubernetes delivery owner | Argo CD, not Terraform Helm provider |
| Service packaging | Independent chart per service plus shared library chart |
| Registry | Approved provider OCI registry initially; Harbor when cross-cloud governance/replication needs justify it |
| PostgreSQL | Provider-managed HA PostgreSQL with JSONB and pgvector when approved |
| Cache | Managed Valkey/Redis compatible service; ephemeral data only and never raw bearer tokens |
| Messaging | RabbitMQ quorum queues required/default; RabbitMQ Streams or Kafka/Redpanda only on measured replay, retention, throughput, analytics, or ecosystem need |
| Artifacts | S3-compatible platform abstraction over Blob/S3/GCS |
| Document database | PostgreSQL JSONB first; MongoDB only on measured need |
| Vector/search | pgvector first; OpenSearch/Qdrant/Milvus only on measured need |
| Secrets delivery | Vault HA plus External Secrets or CSI using workload identity |
| Admission | Kyverno by default; Gatekeeper where Rego ecosystem/organizational policy favors it |
| Service mesh | Istio strict mTLS with Gateway API |
| Progressive delivery | Argo Rollouts with Istio analysis and traffic control |
| Critical replicas | Three across zones where capacity permits; never fewer than two for production critical services |
| Production rollout | Canary 1/5/25/50/100 or blue-green based on service risk and observability |
| Schema change | Expand-and-contract with separately controlled cleanup |
| Cluster major change | Parallel cluster when in-place risk exceeds operational cost |
| Terraform recovery | Forward fix by default; rollback only when safely reversible |
| Secret rotation | Overlapping validity and reload without restart where supported |
| Production approval | Manual for production, high-risk, security/privacy, and HIPAA-relevant changes |

## 26. Beginner glossary

| Term | Plain explanation |
| --- | --- |
| Terraform/OpenTofu | Provisions cloud foundations such as networks, identity, clusters, managed data, and bootstrap services. |
| Helm | Packages one Kubernetes service and its configurable Kubernetes resources as a versioned chart. |
| Argo CD | Continuously compares the Git-approved Kubernetes desired state with a cluster and reconciles drift. |
| CI | Validates source and builds, scans, signs, and publishes immutable artifacts. |
| CD | Promotes approved artifacts and infrastructure changes through controlled environments. |
| GitOps | Uses reviewed Git state as the auditable source of runtime intent; a reconciler applies and maintains it. |
| Image | Immutable packaged application filesystem and metadata used to start a container. |
| Chart | Versioned Helm package describing how to deploy and configure a service on Kubernetes. |
| Digest | Content-derived immutable identifier; unlike a mutable tag, it identifies exact bytes. |
| Canary | Sends a small, increasing traffic share to a new version while measuring health. |
| Blue-green | Runs old and new versions side by side, then switches traffic as a controlled cutover. |
| PDB | PodDisruptionBudget; limits voluntary disruption so too many replicas are not drained at once. |
| HPA | Horizontal Pod Autoscaler; adjusts pod replicas from resource or custom metrics. |
| KEDA | Event-driven autoscaler; scales from queues, streams, and other event sources. |
| Expand-and-contract | Adds compatible schema first, migrates safely, then removes the old form in a later change. |
| RTO | Recovery Time Objective; target time to restore service. |
| RPO | Recovery Point Objective; maximum acceptable data-loss window measured in time. |
