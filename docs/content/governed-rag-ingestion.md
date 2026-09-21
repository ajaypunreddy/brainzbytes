# Governed, Fresh, and Version-Safe RAG

**Publication date:** September 18, 2026  
**Status:** Source Catalog and ingestion contract foundation implemented locally

## 1. Non-negotiable outcomes

1. Documents remain in storage owned by a user, group, or organization.
2. ContextWeaver receives delegated, least-privilege access by reference.
3. Raw document bodies, secrets, and connector credentials are not accepted by
   the Source Catalog or ingestion control APIs.
4. Event-driven change detection is always paired with periodic
   reconciliation.
5. A changed, deleted, revoked, quarantined, or legal-hold source is immediately
   ineligible for retrieval.
6. A new index generation becomes queryable only after complete validation and
   an atomic alias switch.
7. Active workflow runs pin exact service, contract, policy, source, index,
   extractor, chunker, embedding, and reranker versions.
8. Upgrades and safe downgrades run old and new service versions concurrently
   without interrupting active requests or ingestion jobs.

Absolute zero propagation delay is not achievable in a distributed system.
The enforceable guarantee is stronger and measurable: **known-stale data is
never returned**. A policy-sensitive query fails closed, waits for publication,
or uses an approved authoritative direct lookup when its source revision is
newer than the active index generation.

## 2. Service boundaries

```text
User / Group / Organization Storage
  -> delegated read-only connector
  -> Source Catalog + Freshness Ledger
  -> change event and periodic reconciler
  -> ingestion admission and security scans
  -> immutable artifact reference
  -> extraction / chunking / embeddings
  -> shadow index generation
  -> validation and compatibility gate
  -> atomic logical-alias publication
  -> authorization-first retrieval
  -> ContextPack + CitationManifest
```

| Component | Responsibility |
| --- | --- |
| `cw-source-catalog` | Ownership, authority, allowed purpose, storage/credential references, ACL revision, classification, residency, retention, lineage, tombstones, and index freshness |
| `cw-rag-ingestion` | Event/reconcile scheduling, security admission, version-pinned processing, shadow index construction, validation, atomic publication, retirement, and deletion |
| `cw-artifact-gateway` | Immutable normalized content bodies and hashes |
| `cw-policy-decision-service` | Source registration, ingestion, publication, retrieval, export, correction, and deletion decisions |
| `cw-model-gateway` | Approved embedding/reranker/model aliases and provider controls |
| `cw-rag-retrieval` | Effective Retrieval Plan, query-time ACLs, precedence, conflict handling, and freshness enforcement |
| `cw-context-citation` | ContextPack, CitationManifest, source revision, and lineage evidence |
| `cw-context-memory` | Policy-bound continuity; never a replacement for authoritative source storage |
| `cw-audit-service` | Immutable decision, access, publication, revocation, deletion, and release evidence |

## 3. Source registration

Every source is registered before ingestion:

```yaml
source:
  sourceId: source://tenant-a/user-a/documents
  tenantId: tenant-a
  ownerScope: user
  ownerId: user-a
  authorityClass: owner_original
  connectorType: s3-compatible
  storageLocationRef: storage://user-a/documents
  credentialRef: secret://delegated/source-reader/user-a
  allowedPurposes: [personal_research]
  classification: confidential
  retentionPolicyRef: retention://user-content
  residency: us
  changeDetection:
    mode: event_and_reconcile
    maximumSourceLagSeconds: 60
```

Ownership and authority are different. A user may own a document without it
being authoritative company policy. A system of record may be authoritative
without permitting arbitrary AI use. Storage ownership never grants access by
itself.

## 4. Freshness ledger

The Source Catalog records:

```yaml
freshness:
  sourceRevision: etag-482
  sourceHash: sha256-source
  aclSnapshotHash: sha256-acl
  observedAt: 2026-09-18T17:30:00Z
  indexedRevision: etag-482
  indexGeneration: rag-user-a-000184
  embeddingModelVersion: embedding-v4
  chunkerVersion: semantic-chunker-v3
  publishedAt: 2026-09-18T17:30:38Z
  state: current
```

Queryable state requires all of the following:

```text
state == current
AND sourceRevision == indexedRevision
AND current ACL decision permits the caller and purpose
AND generation/schema/model versions are allowed by the Retrieval Plan
AND no revocation, deletion, quarantine, or legal-hold tombstone applies
```

Events minimize latency. Full reconciliation detects lost, duplicated,
out-of-order, or unsupported source events. Reconciliation compares stable
source IDs, revisions, hashes, ACL snapshots, classification, retention, and
deletion state.

## 5. Ingestion admission

The shared admission pipeline performs:

1. Connector identity and source authorization.
2. File type, size, archive-depth, parser, and decompression limits.
3. Malware scanning.
4. Classification and DLP.
5. Secrets, PII, PHI, PCI, export-controlled, and regulated-data detection.
6. Hidden text, invisible instructions, and prompt-injection scanning.
7. Poisoning, anomaly, duplication, and source-trust evaluation.
8. Copyright, licensing, consent, and allowed-use validation.
9. Immutable artifact commit.
10. Version-pinned extraction, chunking, embedding, and index-schema writing.
11. ACL, lineage, quality, count, hash, poisoning, and compatibility checks.
12. Atomic publication or quarantine.

Vectors, lexical indexes, extracted entities, summaries, caches, and
ContextPacks inherit the source classification and lifecycle.

## 6. Atomic index publication

The active index is never modified in place for a material revision:

```text
active alias -> generation N

build generation N+1 in isolation
  -> validate counts and hashes
  -> validate ACL filters and lineage
  -> validate quality and poisoning thresholds
  -> validate mixed-version readers
  -> validate rollback readability

atomic alias switch:
active alias -> generation N+1

retain generation N as bounded rollback generation
```

Deletion and access revocation do not wait for physical index cleanup. The
query-time policy boundary denies the source immediately, then the deletion
workflow removes chunks, vectors, lexical entries, caches, memory references,
ContextPacks, reports, evaluation sets, and expired backups.

## 7. Precedence

There is no universal `organization > group > user` rule.

| Dimension | Rule |
| --- | --- |
| Authorization | Explicit deny and missing purpose authorization win |
| Mandatory policy | Applicable regulatory and organization obligations cannot be removed |
| Content authority | The designated owner or system of record wins for its facts |
| Personalization | User preferences may override defaults when no obligation conflicts |
| Classification | The most restrictive applicable handling requirement wins |
| Retention | Legal hold wins; otherwise the approved governing retention policy applies |
| Residency | The most restrictive applicable location rule wins |
| Workflow policy | A workflow may narrow authority but never expand it |
| Ranking | Preferences affect only already-authorized candidates |

Governance determines eligibility, mandatory evidence, exclusions, authority
floors, freshness, retention, residency, disclosure, and citations.
Application policy determines ranking, weights, context budget, task relevance,
and presentation only after governance.

## 8. Effective Retrieval Plan

Every query compiles an immutable plan:

```yaml
effectiveRetrievalPlan:
  tenantId: tenant-a
  principalId: user-a
  purpose: travel_booking
  workflowRef: workflow://travel/4.1.0
  mandatorySources:
    - sourceRef: source://company/travel-policy
      authority: policy
      maximumAgeSeconds: 0
  eligibleSources:
    - scope: user
      purpose: travel_preferences
      weight: 1.0
    - scope: group
      groupId: engineering
      weight: 0.6
  conflictResolution:
    policyObligation: organization_authoritative
    personalPreference: user_authoritative
    factualRecord: designated_system_of_record
    unresolvedConflict: return_both_with_citations
  controls:
    authorizationBeforeSimilarity: true
    currentRevisionRequired: true
    citationsRequired: true
    rawContentLogging: prohibited
```

The complete plan and its source/index/policy/model versions become part of the
workflow evidence.

## 9. Seamless service upgrades and downgrades

Every deployable service version is immutable. Stable logical aliases route new
work; active work remains pinned to its resolved version.

### Upgrade

1. Register the new service and contract versions as `candidate`.
2. Prove backward compatibility or register explicit adapters.
3. Use expand-only database migrations.
4. Start new replicas while old replicas remain ready.
5. Send synthetic, shadow, then canary traffic to the new version.
6. Allow old and new workers to finish version-pinned jobs.
7. Atomically promote the service alias for new work.
8. Drain old replicas only after active runs and queues reach zero.
9. Retain the prior service and index generation for the rollback window.
10. Perform contract cleanup only after no supported reader requires old data.

Kubernetes deployments use:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

At least two replicas, readiness/startup probes, graceful termination,
PodDisruptionBudgets, topology spread, and shared durable state are required for
production zero-downtime claims.

### Multi-service release

A release bundle contains the compatibility graph for all upgraded services.
Dependencies are expanded first, compatible versions overlap, and logical
aliases are promoted as one governed release decision. Existing workflow plans
continue using their pinned versions. New plans see the promoted version set.

### Downgrade

Downgrade is allowed only when:

- the previous binary understands the current stored schema;
- destructive contract/data migrations have not occurred;
- the previous index generation remains available and authorized;
- active work does not depend on new-only fields or behavior;
- compensation or forward migration exists for new side effects.

If any condition fails, the safe response is a forward fix, not a forced
downgrade.

## 10. Cross-vertical controls

- Temporal truth with `effectiveFrom`, `effectiveUntil`, and supersession.
- Immediate ACL and consent revocation.
- Legal hold without automatic retrieval access.
- Field/document lineage and correction.
- Data residency and cryptographic isolation.
- Multimodal OCR/audio/image confidence.
- Human stewardship and dispute handling.
- Model, parser, chunker, tokenizer, and index-schema drift.
- Evaluation for retrieval quality, conflict handling, poisoning, leakage,
  citations, deletion, and freshness.
- Reproducible disaster recovery: indexes are disposable projections rebuilt
  from authoritative sources and the lineage ledger.

## 11. Current implementation

Implemented:

- `cw-source-catalog` repository, contracts, SQLite development adapter,
  PostgreSQL production adapter, migrations, tests, container, and Helm chart;
- source registration, revision observation, exact-revision publication,
  quarantine, revocation, deletion, legal hold, and freshness states;
- `cw-rag-ingestion` reference-only contracts, version-pinned job receipts,
  freshness checks, required publication validation, shadow/atomic generation
  receipts, rollback generation, tests, container, and zero-unavailable rollout
  settings.

Still required:

- real storage connectors and event adapters;
- recurring reconciliation workers;
- malware/DLP/poisoning integrations;
- artifact, embedding, search/vector, and deletion adapters;
- Effective Retrieval Plan implementation in `cw-rag-retrieval`;
- release-bundle and compatibility orchestration in registry/GitOps.

The registry now exposes `POST /v1/releases/validate` as the first
compatibility gate. It rejects release bundles with dependency cycles,
non-backward-compatible contracts, unsafe mixed versions, fewer than two
replicas, nonzero unavailable capacity, missing graceful drain or pinned-work
support, non-expand/migrate/contract data changes, or unreadable rollback
artifacts. Downgrades additionally require the previous reader and index
generation to remain usable. Persistence and atomic promotion of approved
release bundles remain to be added.
