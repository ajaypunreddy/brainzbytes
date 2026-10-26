# ContextWeaver Studio Operating Model

**Reviewed:** October 26, 2026  
**Status:** Product operating model and implementation contract for the unified Studio experience.

ContextWeaver is **one AI capability factory with one Studio page and four
specialized artifact modes**. The canonical authoring route is `/studios`.
MCP, Agent, Workflow, and Service remain distinct definitions, but builders do
not move between disconnected pages to create them.

## 1. One page, four persistent tabs

The Studio header always keeps these tabs visible:

`MCP | Agent | Workflow | Service`

Changing tabs changes the artifact-specific compiler, canvas, form, contract,
and code projection. It does not discard the conversation, draft history,
validation findings, evidence, selected Registry references, or unsaved work.

The product rule is:

> Unify how people build; do not merge the artifact definitions.

| Studio | Primary responsibility | Produces | Consumes |
| --- | --- | --- | --- |
| **MCP Studio** | Build governed tools, connectors, schemas, permissions, and dependency boundaries | Versioned MCP capabilities and service-engine registrations | Credentials by reference, provider APIs, policy, configuration, test fixtures |
| **Agent Studio** | Build and test governed reasoning roles, prompts, memory, capability access, and guardrails | Versioned Agent definitions, skills, evaluation results, and capability requirements | MCP tools, governed RAG, models, policy, identity context |
| **Workflow Studio** | Compose durable orchestration, branching, approvals, retries, waits, parallel work, and compensation | Versioned Workflow DAGs, run definitions, and rehearsal evidence | Agents, MCP tools, human gates, events, timers, typed artifacts |
| **Service Studio** | Package an intent-to-outcome capability behind a stable reusable contract | Versioned Service contracts, exact Workflow associations, SLOs, deployment and publication metadata | Workflows, Agents, MCPs, models, RAG, policy, operational controls |

## 2. Shared AI-native authoring loop

Every tab uses the same conversation and clarification experience:

`Describe → Clarify → Resolve → Draft → Visualize → Validate → Rehearse → Review diff → Publish`

1. A builder describes the outcome in ordinary language.
2. The Studio asks focused questions when ownership, inputs, outputs, authority,
   data scope, failure behavior, or evidence requirements are missing.
3. Registry resolution prefers approved, compatible capabilities over duplicate
   connectors, prompts, or orchestration.
4. The intent compiler proposes a typed draft and records its assumptions.
5. Deterministic platform code validates and applies the proposed change set.
6. The builder reviews the visual design, fields, contract, code, policy
   findings, rehearsal results, and exact diff before publication.

The model may propose structured changes. It cannot publish, deploy, grant
permissions, retrieve credentials, bypass governance, or execute side effects.

## 3. Synchronized views

The same draft is projected into synchronized views:

- **Conversation** explains intent, asks questions, and proposes changes.
- **Visual** shows topology, dependencies, branches, gates, and data flow.
- **Form** exposes accessible fields and guided choices.
- **Contract** shows typed inputs, outputs, errors, compatibility, and versions.
- **Code** shows the source representation when the artifact supports it.

An edit in any view updates the shared draft and the other projections. A canvas
connection can update the contract; a form change can update code; a code edit
can update the visual graph; and a conversational request produces a reviewable
change set rather than silently replacing the draft.

This gives non-programmers a plain-language and visual path while preserving the
precision, schemas, source, and diffs developers need.

## 4. Shared draft record

All four tabs use the same session-level authoring services:

- autosave, checkpoints, undo, redo, and named draft history;
- assumptions, clarifying answers, and immutable Registry references;
- validation findings, policy decisions, evaluation and rehearsal evidence;
- proposed and accepted diffs with actor and timestamp attribution;
- collaboration, comments, ownership, and handoff context; and
- publication provenance and links to later operational evidence.

Switching artifact tabs or views never requires back-and-forth navigation and
never creates a second, disconnected source of truth.

## 5. Shared lifecycle

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

## 6. Factory journey

The typical platform journey is:

`Workspace → /studios → Registry → Operations & Evidence`

- A **Workspace** gives a builder a governed development environment.
- The shared **Studio conversation** captures the outcome and unresolved
  requirements once.
- The **MCP tab** creates or discovers capabilities that can act on systems.
- The **Agent tab** gives a reasoning role the minimum approved capability set.
- The **Workflow tab** turns roles and tools into durable controlled work.
- The **Service tab** packages the outcome behind a stable business contract and
  pins exact immutable dependencies.
- The **Registry** makes approved versions discoverable and resolvable.
- **Operations & Evidence** prove what ran, who authorized it, what information
  was used, which side effects occurred, and whether the outcome met policy and
  SLOs.

## 7. Product and runtime boundaries

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

## 8. Service capability versus business Service

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

## 9. Current implementation truth

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

The unified `/studios` product contract adds one persistent four-tab shell,
shared conversation and clarification, synchronized projections, and shared
draft history, validation, and evidence. Artifact-specific compilers and
renderers continue to evolve independently. This operating model does **not**
claim that every NextGen business Service contract, arbitrary Agent/MCP dispatch
path, immutable promotion control, or production qualification requirement is
complete.

## 10. Required cross-Studio invariants

Every published artifact must have:

- a stable identity, owner, version, origin, and lifecycle state;
- typed inputs, outputs, dependencies, and compatibility declarations;
- least-privilege capability and credential references;
- policy, evaluation, and rehearsal evidence;
- immutable publication provenance;
- health, metrics, logs, traces, dashboards, SLOs, and runbooks;
- deprecation, rollback, drain, and retirement behavior; and
- an auditable connection from user intent to final outcome and evidence.
