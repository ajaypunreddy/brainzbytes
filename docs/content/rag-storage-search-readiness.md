# RAG Storage and Search Infrastructure Readiness

**Assessment date:** September 21, 2026  
**Status:** Scalable local storage and retrieval foundation implemented; ingestion execution and managed cloud scale-out remain

## Required separation

An embedding model may be external. It is a governed compute provider, not the
authoritative index store.

```text
Authorized chunk reference
        |
        v
ContextWeaver Model Gateway
        |
        v
External or internal embedding model
        |
        v
Numeric embedding vector
        |
        v
ContextWeaver-controlled vector/search storage
```

The model provider receives only the minimum authorized content and returns a
vector. ContextWeaver stores that vector together with tenant, source,
revision, ACL, classification, purpose, lineage, model version, chunker
version, schema version, and generation metadata.

## Actual infrastructure inventory

| Capability | Local foundation | Azure Terraform | Readiness |
| --- | --- | --- | --- |
| Authoritative source files | User/group/organization storage by reference | External owner-controlled storage | Architectural boundary |
| Immutable artifacts | MinIO with persistent Docker volume | ZRS Azure Blob Storage with private `artifacts` container | Provisioned but not wired to RAG |
| Source and freshness metadata | PostgreSQL with persistent Docker volume | No managed PostgreSQL resource | Local only |
| Vector storage | Digest-pinned pgvector PostgreSQL image | None | Implemented locally |
| `pgvector` | Enabled by the versioned RAG migration | Not provisioned | Implemented locally |
| Lexical/full-text RAG schema | Generated `tsvector`, GIN indexes, hybrid query adapter | None | Implemented locally |
| Dedicated search service | None | No Azure AI Search, OpenSearch, Qdrant, or Milvus | Missing |
| RAG bucket/container initialization | Idempotent private MinIO bucket bootstrap | General artifact container only | Implemented locally |
| Ingestion storage wiring | Durable jobs, deterministic stages, transactional outbox, generation metadata | None | Partial |
| Retrieval execution | Active-generation lexical/vector hybrid retrieval with tenant, ACL, purpose, and classification predicates | None | Implemented locally |

## Initial production decision

The initial implementation uses:

- PostgreSQL HA with JSONB, full-text search, and `pgvector`;
- S3-compatible object storage over MinIO locally and Blob/S3/GCS in cloud;
- external or internal embedding models only through the Model Gateway; and
- provider-neutral storage and retrieval adapters.

OpenSearch, Azure AI Search, Qdrant, or Milvus are introduced only after
measured recall, latency, capacity, filtering, or operational requirements
justify a separate search platform.

## Implemented scalable foundation

The local implementation now provides:

- PostgreSQL-backed idempotent ingestion jobs and deterministic stage records;
- transactional outbox events with publish leases, persistent RabbitMQ
  messages, publisher confirmation, and retry backoff;
- versioned generation, alias, document, chunk, embedding, inbox, outbox, and
  deletion-ledger tables;
- tenant row-level-security policies;
- generated lexical vectors and GIN indexes;
- pgvector HNSW indexes for 384, 768, 1024, 1536, and 3072 dimensions;
- `halfvec` indexing for 3072-dimensional embeddings;
- atomic active-generation publication with retained rollback generation;
- governed lexical and hybrid retrieval from only the active generation;
- database-enforced tenant context plus ACL, purpose, and classification
  predicates;
- idempotent creation of private MinIO RAG buckets; and
- HPA, rolling-update, graceful-drain, and PodDisruptionBudget controls for
  ingestion and retrieval.

Integration validation exercised real pgvector migrations, idempotent job
scheduling, 12 durable stage records, transactional outbox delivery to
RabbitMQ, atomic generation publication, and lexical and 384-dimensional
hybrid retrieval.

## Scale boundaries and promotion criteria

PostgreSQL with pgvector is the initial production tier, not an unlimited
distributed-search claim. Before each capacity increase, load tests must
measure vector count, embedding dimensions, write amplification, filter
selectivity, concurrent ingestion, query throughput, p95/p99 latency, recall,
replication lag, vacuum pressure, and shadow-generation storage overhead.

A dedicated distributed search adapter is required when measured objectives
cannot be met through PostgreSQL HA, connection pooling, table partitioning,
read replicas, bounded tenant collections, and workload isolation. The adapter
must preserve the same generation, ACL, purpose, classification, lineage,
deletion, and audit contracts.

## Required storage model

```text
Object storage
  cw-artifacts/
  cw-rag-source-snapshots/
  cw-rag-extracted/
  cw-rag-context-packs/

PostgreSQL
  rag_sources
  rag_index_generations
  rag_documents
  rag_chunks
  rag_embeddings
  rag_generation_aliases
  rag_ingestion_jobs
  rag_ingestion_stages
  rag_deletion_ledger
```

Document bodies and normalized artifacts live in object storage. PostgreSQL
stores governance metadata, lineage, chunks where appropriate, vectors,
lexical search state, generation state, and the active alias.

## Generation and publication

Material updates build a new generation rather than mutating the active
generation:

```text
generation N   active
generation N+1 shadow/building

validate N+1
  counts | hashes | ACL | lineage | quality | poisoning
  schema/model compatibility | rollback readability

atomic transaction:
  active alias -> N+1
  previous rollback generation -> N
```

Retrieval always resolves the active generation through authoritative
metadata and applies tenant, user/group, purpose, classification, ACL,
freshness, and lifecycle predicates inside the database or search query.

## Required local changes

1. Wire Artifact Gateway to object storage.
2. Implement extraction, chunking, Model Gateway embedding, and shadow
   generation writers.
3. Add queue-consuming stage workers with renewable job leases and
   checkpoint recovery.
4. Add connection pooling and tenant/collection partition management.
5. Add deletion, rebuild, backup, restore, and cross-pod recovery tests.
6. Add representative scale, recall, latency, and noisy-neighbor benchmarks.

## Required Azure changes

1. Add Azure Database for PostgreSQL Flexible Server.
2. Configure zone-redundant HA, backups, point-in-time recovery, private
   networking, and private DNS.
3. Enable the approved vector extension.
4. Create least-privilege database roles for catalog, ingestion, retrieval,
   and migration.
5. Add governed Blob containers or prefixes for RAG artifacts and projections.
6. Use workload identity and private endpoints; do not inject storage keys.
7. Add an optional private Azure AI Search adapter only when selected by
   measured requirements.
8. Publish all endpoints and capabilities through the non-secret platform
   contract consumed by GitOps.

## Current conclusion

The local stack now contains the durable schema, pgvector indexes, private RAG
bucket initialization, transactional job/outbox foundation, atomic generation
publication, and functional governed hybrid retrieval. It does not yet execute
artifact extraction, chunking, embedding, and shadow writes autonomously, and
Azure still lacks managed PostgreSQL and an optional distributed search
service. The platform is therefore ready for the next worker/adapters slice,
but it is not yet production-complete or proven at massive scale.
