# ContextWeaver Studio Operating Model

**Reviewed:** October 26, 2026  
**Status:** Product operating model with an implemented application foundation and a broader NextGen target.

ContextWeaver is **one AI capability factory with four specialized Studios**.
The Studios are not separate products or isolated builders. They are role-focused
authoring rooms that share the same Registry, identity, policy, configuration,
versioning, evidence, observability, and promotion model.

## 1. The four Studios

| Studio | Primary responsibility | Produces | Consumes |
| --- | --- | --- | --- |
| **MCP Studio** | Build governed tools, connectors, schemas, permissions, and dependency boundaries | Versioned MCP capabilities and service-engine registrations | Credentials by reference, provider APIs, policy, configuration, test fixtures |
| **Agent Studio** | Build and test governed reasoning roles, prompts, memory, capability access, and guardrails | Versioned Agent definitions, skills, evaluation results, and capability requirements | MCP tools, governed RAG, models, policy, identity context |
| **Workflow Studio** | Compose durable orchestration, branching, approvals, retries, waits, parallel work, and compensation | Versioned Workflow DAGs, run definitions, and rehearsal evidence | Agents, MCP tools, human gates, events, timers, typed artifacts |
| **Service Studio** | Package an intent-to-outcome capability behind a stable reusable contract | Versioned Service contracts, exact Workflow associations, SLOs, deployment and publication metadata | Workflows, Agents, MCPs, models, RAG, policy, operational controls |

## 2. Shared lifecycle

Every Studio follows the same governed lifecycle:

`Design → Validate → Rehearse → Govern → Publish → Observe`

1. **Design** — define the contract, owner, inputs, outputs, dependencies, and
   intended risk boundary.
2. **Validate** — check schemas, references, policies, compatibility, required
   evidence, and dependency health.
3. **Rehearse** — execute in a controlled dry-run environment with fixtures,
   simulated side effects, and negative-path tests.
4. **Govern** — evaluate identity, entitlement, data access, credential use,
   human approval, budget, and promotion policy.
5. **Publish** — create an immutable Registry version with provenance and exact
   dependency references.
6. **Observe** — attach metrics, logs, traces, SLOs, evaluation results, run
   evidence, and operational ownership.

## 3. Factory journey

The typical platform journey is:

`Workspace → MCP Studio → Agent Studio → Workflow Studio → Service Studio → Registry → Operations & Evidence`

- A **Workspace** gives a builder a governed development environment.
- **MCP Studio** creates or discovers the capabilities that can act on systems.
- **Agent Studio** gives a reasoning role the minimum approved capability set.
- **Workflow Studio** turns those roles and tools into durable controlled work.
- **Service Studio** packages the complete outcome behind a stable business
  contract and pins exact immutable dependencies.
- The **Registry** makes approved versions discoverable and resolvable.
- **Operations & Evidence** prove what ran, who authorized it, what information
  was used, which side effects occurred, and whether the outcome met policy and
  SLOs.

## 4. Product and runtime boundaries

The Studio is the **authoring and operating experience**. It is not itself the
runtime:

- Studio drafts are mutable; published Registry versions are immutable.
- Studio validation does not replace runtime authorization.
- Studio rehearsal does not imply production qualification.
- The runtime reauthorizes protected actions immediately before execution.
- Agents never receive raw provider or user credentials.
- Workflows persist accepted work outside replaceable worker processes.
- Services retain exact Workflow, Agent, MCP, model, retrieval, configuration,
  policy, and evidence references required for reconstruction.

## 5. Service capability versus business Service

The current application service catalog contains reusable **service engines**:
shared MCP capability providers such as communication or payment services.
These are building blocks available to Service Studio.

A higher-level **business Service** is the governed intent-to-outcome contract
that packages exact Workflow versions and their required Agents, MCPs, models,
RAG profiles, approvals, SLOs, and deployment metadata.

Service Studio must preserve this distinction:

- a service engine exposes reusable tools;
- a Workflow coordinates work;
- a business Service packages the complete reusable outcome.

## 6. Current implementation truth

The existing application provides the foundation for the four-Studio model:

- **MCP Studio foundation:** the Visual Designer, Plugin Library, engine
  registration, service categories, dependency declarations, and tool proxy;
- **Agent Studio foundation:** AI Hub chat, MCP engine selection, RAG access,
  conversation history, and provider/model selection;
- **Workflow Studio foundation:** definitions, runs, templates, a visual
  designer, manual/webhook/scheduled triggers, approvals, conditions, parallel
  branches, delays, notifications, and persisted run state;
- **Service Studio foundation:** service-engine catalog, categories, dependency
  metadata, reusable Workflow definitions, and navigation across the other
  Studios.

This branding and composition layer does **not** claim that every NextGen
business Service contract, arbitrary Agent/MCP dispatch path, immutable
promotion control, or production qualification requirement is complete.

## 7. Required cross-Studio invariants

Every published artifact must have:

- a stable identity, owner, version, origin, and lifecycle state;
- typed inputs, outputs, dependencies, and compatibility declarations;
- least-privilege capability and credential references;
- policy, evaluation, and rehearsal evidence;
- immutable publication provenance;
- health, metrics, logs, traces, dashboards, SLOs, and runbooks;
- deprecation, rollback, drain, and retirement behavior; and
- an auditable connection from user intent to final outcome and evidence.

