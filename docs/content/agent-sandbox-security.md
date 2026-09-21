# Agent Sandbox Security Intent

## Executive summary

The intent is not to claim that an AI Agent can **never** escape a sandbox.
No container runtime, virtual machine, kernel, network control, message broker,
or policy engine can provide an absolute guarantee against every future
vulnerability.

The intent is to make an Agent escape both **materially harder** and **far less
valuable** to an attacker.

Every Agent is treated as untrusted workload code. It runs in a hardened,
ephemeral Kubernetes sandbox with only two permitted network destinations:

1. RabbitMQ, for typed asynchronous platform communication.
2. An internal LLM Gateway, for governed model inference.

The Agent has no direct route to MCP services, databases, object storage,
Redis, the Kubernetes API, cloud metadata services, other pods, model
providers, developer workstations, privileged local daemons, or the public
internet.

This creates a narrow and measurable security boundary:

```text
                  ONLY TWO ALLOWED NETWORK PATHS

          +-------------------------------------------+
          |       HARDENED AGENT SANDBOX              |
          |                                           |
          |  non-root        read-only filesystem     |
          |  no Kube token   no Linux capabilities    |
          |  seccomp         gVisor or Kata runtime   |
          |  no host mounts  bounded CPU/memory/time  |
          +---------------------+---------------------+
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
             +-------------+         +-------------+
             |  RabbitMQ   |         | Internal    |
             |  AMQPS/mTLS |         | LLM Gateway |
             +-------------+         +-------------+

        DENIED: MCP endpoints, data stores, Kubernetes API,
        metadata services, other pods, host, and public internet
```

All useful effects must cross a policy enforcement point. RabbitMQ messages can
be authenticated, authorized, schema-validated, rate-limited, size-limited,
expired, quarantined, audited, and replayed. LLM requests can be identity
checked, model restricted, DLP scanned, quota controlled, logged, and stopped.
There is no broad, ambient network authority for the Agent to inherit.

The design therefore changes the question from:

> "Can we prove that an Agent will never escape?"

to:

> "If an Agent or sandbox is compromised, what authority can it actually
> obtain, how quickly will we see it, and how quickly can we remove it?"

That is the correct security model for a reusable enterprise Agent platform.

## Why recent Agent sandbox research matters

Recent research against AI coding Agents has shown two distinct classes of
failure:

1. **Direct boundary failure.** A flaw in sandbox policy, path validation,
   local API authorization, container runtime, or operating-system isolation
   allows the Agent to obtain authority outside its intended environment.
2. **Trust handoff failure.** The Agent stays inside the sandbox but writes a
   hook, task, interpreter, Git configuration, workspace file, or other
   artifact that a trusted process outside the sandbox later executes.

The second class is especially important. The Cloud Security Alliance's July
2026 analysis of Pillar Security's research states that none of the seven
disclosed issues had to break the process sandbox itself. Instead, they
exploited the point where an unsandboxed IDE, hook engine, Python extension,
Git integration, task runner, or Docker daemon trusted an Agent-influenced
artifact.

OX Research's September 2026 disclosure for DeepSeek Harness,
CVE-2026-82533, demonstrates the other danger: a sandbox left loopback
networking open, while an unauthenticated local control API trusted a
client-supplied `Host` header. A sandboxed Agent could call that API and change
its own session to unrestricted execution.

These findings produce several architectural lessons:

- A filesystem boundary alone is not enough.
- Loopback and local control APIs are network attack surfaces.
- Anything the Agent can write must remain untrusted after it leaves the
  sandbox.
- Docker sockets, host mounts, editor extensions, task runners, and local
  daemons can silently transfer host authority into a sandbox.
- Command-name allowlists are weaker than full invocation and effect policy.
- Approval prompts are not a security boundary if another path can disable or
  bypass them.
- The Agent's blast radius includes everything that consumes its output.

This Kubernetes design explicitly addresses those lessons.

## The intended security boundary

### 1. The Agent is not deployed on a developer endpoint

The Agent runs as a dedicated Kubernetes workload, not inside an IDE, a user
shell, or a workstation containing SSH keys, browser sessions, package
credentials, cloud CLIs, or production access.

It does not share a workspace with unsandboxed host tools. It cannot write a
`.vscode` task for an editor to execute, replace a local virtual environment
interpreter, install a Git hook for a desktop client, or reach a developer's
Docker socket.

This removes much of the ambient authority and downstream trust surface that
made recent coding-Agent findings exploitable.

### 2. The Agent pod is hardened as hostile code

Every Agent workload must satisfy a Restricted Pod Security profile and
additional admission policy:

- Run as a dedicated non-root UID and GID.
- Require a read-only root filesystem.
- Disable privilege escalation.
- Drop every Linux capability.
- Use `seccompProfile: RuntimeDefault` or a more restrictive tested profile.
- Do not mount `hostPath`, device, Docker/containerd socket, host process,
  host network, host PID, or host IPC resources.
- Do not mount writable persistent volumes into the Agent.
- Disable automatic Kubernetes service-account token mounting.
- Do not inject cloud, database, object-store, or plugin credentials.
- Use bounded ephemeral storage, process count, CPU, memory, concurrency, and
  wall-clock execution time.
- Run only signed images pinned by digest and admitted from approved
  registries.

These controls reduce both escape primitives and post-compromise persistence.
The Agent pod is disposable. Completion, timeout, policy violation, or
quarantine destroys it.

### 3. A stronger runtime separates the Agent from the node kernel

Standard Linux containers share the host kernel. Namespaces, capabilities,
seccomp, AppArmor, or SELinux are important, but they should not be the only
boundary for untrusted Agent execution.

The platform should use a sandboxed Kubernetes `RuntimeClass`:

- **gVisor** moves the system-call interface into a per-sandbox userspace
  application kernel, reducing direct exposure to the host kernel.
- **Kata Containers** runs the workload inside a lightweight virtual machine,
  adding hardware-virtualized separation.

The choice can be policy driven. A high-density, lower-risk Agent may use
gVisor. A high-risk, regulated, third-party, or code-executing Agent may require
Kata or another VM-isolated runtime.

Agent workloads should also run on dedicated, tainted node pools. This does not
replace the sandbox, but it prevents unrelated trusted workloads from sharing
the same node and limits the blast radius of a node-level failure.

### 4. Network access is denied by default

Kubernetes pods are normally open to outbound traffic unless a network policy
isolates them. The design therefore requires:

- Default-deny ingress and egress policies in every Agent namespace.
- A CNI that actually enforces NetworkPolicy; merely creating policy objects
  is not enough.
- Explicit egress rules only for the RabbitMQ listener and internal LLM
  Gateway.
- Matching ingress restrictions on those destinations.
- DNS restrictions so the Agent cannot use arbitrary name resolution as an
  egress path.
- Explicit blocking of cloud instance-metadata endpoints.
- No general NAT or internet route from Agent node pools.
- Service-mesh mTLS and workload identity in addition to IP/port policy.

No local management API is present in the Agent pod or reachable over
loopback. The Agent cannot change its own RuntimeClass, NetworkPolicy,
deployment, approval mode, or security context. Those controls live in
separate namespaces behind separate identities.

### 5. RabbitMQ is a controlled capability boundary

All Agent-to-Agent and Agent-to-MCP communication is asynchronous through
RabbitMQ. The broker is not merely transport; it is a narrow policy and
containment boundary.

Each Agent version receives its own workload identity and least-privilege
RabbitMQ permissions:

- Publish only to approved result or request exchanges.
- Consume only from its assigned command queues.
- No configuration, management, user, vhost, policy, binding, or queue
  creation permission.
- No wildcard access to every Agent or MCP routing key.
- TLS/mTLS and short-lived credentials.
- Versioned envelope and payload schemas.
- Message size, rate, TTL, priority, and delivery limits.
- Publisher confirms and manual consumer acknowledgements.
- Bounded retry exchanges and dead-letter quarantine.
- Idempotency keys, replay protection, and inbox/outbox records.
- Content classification and artifact-reference policy.

A compromised Agent may try to publish malicious or excessive messages, but it
cannot silently open a direct socket to another service. The attempted effect
is visible at the broker boundary and can be rejected, throttled, expired,
dead-lettered, or quarantined.

RabbitMQ policing is not sufficient by itself. Consumers must continue to
treat every message as untrusted, even when it came from an authenticated
Agent. Authentication says which workload sent a message; it does not make the
message safe.

### Credential non-possession is mandatory

An Agent receives a narrow workload identity and opaque references, never a
user credential, refresh token, provider key, cloud key, database password,
connection string, object-store credential, private key, connector secret, or
model-provider credential.

Plans and messages may carry `identityRef`, `delegationRef`,
`policyDecisionRef`, and `credentialRef`. A trusted MCP, model, data, or
connector gateway resolves the reference only after validating the exact
tenant, principal, purpose, workflow, run, node, operation, resource,
audience, policy version, consent state, and revocation epoch. The short-lived
credential remains inside that trusted workload and is never returned to the
Agent or written to a message, artifact, log, trace, metric, audit record, or
dead-letter queue.

The canonical executable requirements and current implementation status are
defined in [Credential Non-Possession and Delegated Authority](credential-non-possession.md).

### 6. The LLM Gateway is the only inference boundary

Agents do not receive model-provider credentials and do not call external LLM
endpoints directly. They call an internal LLM Gateway that enforces:

- Workload identity and Agent version.
- Tenant, user, purpose, and run binding.
- Approved model and region allowlists.
- Input and output size limits.
- Token, cost, request-rate, concurrency, and timeout budgets.
- Prompt-injection and data-loss-prevention controls.
- Data classification, residency, retention, and provider policy.
- Redaction or tokenization where required.
- Complete request/result metadata and decision audit without placing secrets,
  prompts, PII, or PHI in Prometheus labels.

Only the LLM Gateway has controlled external provider egress. Revoking an
Agent's LLM authorization immediately removes its model access without
changing the Agent image.

### 7. MCP services are separate sandboxes

An Agent never connects directly to an MCP endpoint. It publishes a typed tool
request to RabbitMQ.

Each MCP worker is separately deployed and separately isolated. It may access:

1. Its assigned RabbitMQ queues.
2. Exactly one approved plugin or external-system domain.

For example, a Gmail MCP can reach approved Gmail APIs but not a payment
processor, another MCP, a database, or the Kubernetes API. A payment MCP can
reach the approved payment gateway but not Gmail.

This preserves the platform's cardinality while limiting authority:

```text
Agent -> 0..N MCP capabilities through RabbitMQ
MCP   -> exactly one plugin/configuration domain
Plugin domain -> 1..N versioned operations
```

Credentials remain in a secrets broker or workload identity system and are
issued just in time. They are not sent to the Agent in a message.

### 8. Agent-created artifacts never become trusted executable input

This is the most important defense against trust handoff attacks.

The Agent cannot access object storage directly. Trusted Context Workers
hydrate source artifacts, apply authorization and minimum-necessary field
projection, and publish a bounded, signed ContextPack to the Agent queue.

The Agent returns typed outputs through RabbitMQ. Trusted Artifact Workers then:

- Parse against the exact pinned output or error schema.
- Reject unknown fields and malformed structures.
- Apply policy, classification, redaction, and provenance checks.
- Verify expected producer, run, node, operation, and idempotency identity.
- Persist the result as an immutable artifact.
- Never execute Agent-authored scripts, hooks, binaries, templates, build
  files, interpreter paths, Git configuration, or task definitions.
- Render content in a separate constrained renderer when presentation is
  required.

No host-side IDE, task runner, shell, package manager, Git client, Docker
daemon, or extension automatically consumes Agent-authored workspace content.
An Agent output remains data until an explicitly authorized and type-specific
consumer validates it.

## Does the design harden the security boundary?

Yes. It materially hardens the boundary in five ways:

| Security property | Conventional Agent harness | This design |
| --- | --- | --- |
| Runtime location | Developer machine or shared application pod | Ephemeral isolated pod on dedicated sandbox nodes |
| Kernel boundary | Native process/container controls | Restricted container plus gVisor or Kata |
| Network authority | Loopback, local services, internet, inherited host routes | Only RabbitMQ and internal LLM Gateway |
| Credentials | Ambient user, cloud, filesystem, or provider credentials | No Agent credentials except narrow workload identities |
| Tool access | Direct local shell/API/plugin calls | Typed asynchronous MCP commands through RabbitMQ |
| Artifact trust | Workspace files may be executed by host helpers | Outputs remain untrusted data; trusted workers validate but never execute |
| State access | Agent may read/write local or shared state | No direct PostgreSQL, object-store, or Redis access |
| Control plane | Agent and harness management can share a process/API | Orchestrator, admission, registry, and policy are separate trust domains |
| Detection | Endpoint logs and optional prompts | Broker, CNI, runtime, identity, policy, Kubernetes, LLM, and workflow telemetry |
| Revocation | Stop a local process or update a client | Revoke identity, queue ACL, model authorization, image digest, and deployment centrally |

The greatest improvement is not any single control. It is that the controls are
independent:

- A prompt-injection failure does not grant network access.
- A NetworkPolicy mistake does not grant credentials.
- A stolen RabbitMQ identity does not grant Kubernetes or database authority.
- A malformed message does not pass schema and policy validation.
- A container escape still lands on a dedicated node without cloud credentials
  or a general internet route.
- An Agent-authored artifact is not automatically executed outside the
  sandbox.

An attacker must defeat several different technologies and trust domains
rather than find one permissive handoff.

## Rapid mitigation when an issue arises

The platform must assume that new model behaviors, prompt-injection techniques,
dependency vulnerabilities, runtime CVEs, and configuration mistakes will
continue to appear. The response mechanism should therefore be part of the
architecture, not an improvised operational procedure.

### Phase 1: Detect

Detection signals should be correlated by Agent ID, immutable version, image
digest, run ID, Workflow node, queue identity, and policy snapshot in protected
telemetry:

- Denied egress or unexpected DNS requests.
- Connections attempted to the Kubernetes API, metadata service, node
  addresses, other pods, or unapproved internet destinations.
- Unexpected process creation, shell execution, syscall profile, file write,
  privilege action, or namespace behavior.
- RabbitMQ authorization failures, routing-key violations, message floods,
  size violations, schema rejection, redelivery spikes, or DLQ growth.
- LLM Gateway model-policy denials, unusual token volume, DLP triggers, prompt
  attack indicators, or rapid request bursts.
- Invalid Agent output schemas, forbidden artifact types, executable content,
  provenance mismatch, or repeated policy failures.
- Unusual Agent duration, memory, CPU, process count, crash loop, or restart
  pattern.
- Attempts to obtain credentials, enumerate environment data, or reach local
  control endpoints.

Prometheus and Grafana provide aggregate health and alerting. High-cardinality
investigation data belongs in protected OpenTelemetry traces, security events,
Kubernetes audit logs, CNI flow logs, RabbitMQ logs, and immutable audit
records.

### Phase 2: Contain

Containment should be executable centrally without waiting for every
application team:

1. Mark the Agent Card/version `quarantined` in the capability registry.
2. Stop new Workflow compilation from selecting that version.
3. Revoke its workload identity and LLM Gateway authorization.
4. Disable or remove its RabbitMQ user/permission and stop its consumers.
5. Route outstanding messages to a quarantine queue without discarding them.
6. Apply an emergency zero-egress NetworkPolicy to the selected pods.
7. Scale the affected deployment to zero or delete the precisely identified
   pods.
8. Deny the affected image digest through admission policy.
9. Cordon and isolate the dedicated node if runtime or node compromise is
   suspected.
10. Pause affected Workflow runs at durable checkpoints.

These controls operate at different layers. If a compromised Agent blocks its
own process shutdown, identity revocation and network policy still remove its
useful authority. If network policy is suspected, RabbitMQ and LLM Gateway
revocation still close the two allowed endpoints. If the image is
compromised, admission policy prevents redeployment.

### Phase 3: Preserve evidence

Before destructive cleanup removes volatile evidence, the response automation
should preserve:

- Agent image digest, SBOM, signature, and admission decision.
- Pod specification, RuntimeClass, node, namespace, security context, and
  NetworkPolicies.
- Protected runtime, CNI, DNS, identity, LLM Gateway, RabbitMQ, and Kubernetes
  audit events.
- Exact immutable run plan, policy snapshot, Agent Card, MCP manifest, schema
  versions, ContextPack hashes, message IDs, idempotency keys, and artifact
  lineage.
- Container memory or node evidence when policy and tooling permit.
- All related dead-letter and quarantine messages.

Evidence is stored immutably with access control and retention policy. It is
not copied into general dashboards or ticket comments if it contains sensitive
content.

### Phase 4: Assess blast radius

The platform can answer bounded questions because authority is explicit:

- Which exact Agent version and image digest ran?
- Which queues could its RabbitMQ identity publish to or consume from?
- Which LLM models, tenants, scopes, and budgets were permitted?
- Which ContextPacks were delivered?
- Which MCP operations were requested?
- Which side effects committed, and which receipts prove them?
- Did any message pass validation and reach a downstream consumer?
- Did any egress attempt succeed?
- Which runs used the affected immutable version?

This is substantially faster than investigating a local Agent running with a
developer's ambient credentials and unrestricted network access.

### Phase 5: Recover safely

Recovery follows controlled promotion:

1. Patch the Agent, dependency, sandbox profile, gateway, policy, or platform
   component that caused the issue.
2. Build a new immutable image and Agent Card version.
3. Generate an updated SBOM, run security and contract tests, and sign the
   artifact.
4. Validate the exact escape or abuse path as a regression test.
5. Rotate any potentially exposed workload, RabbitMQ, model, plugin, or
   platform credentials.
6. Deploy to an isolated security-test environment.
7. Canary the new version under tighter quotas and enhanced telemetry.
8. Promote through the governed lifecycle only after policy and health gates
   pass.
9. Resume safe runs from durable checkpoints or replay commands from the
   transactional outbox.
10. Use the Orchestrated Saga to compensate committed reversible actions.
11. Route irreversible or partially compensated cases to manual remediation.

Runs remain pinned to their original versions. They do not silently switch to
a new Agent in the middle of a transaction. A governed migration or restart
decision is recorded explicitly.

## Suggested response objectives

These are engineering targets, not guarantees. They should be tested through
regular exercises:

| Objective | Suggested target |
| --- | --- |
| Detect a high-confidence sandbox or policy violation | Under 1 minute |
| Stop new selection of a quarantined Agent version | Under 1 minute |
| Revoke RabbitMQ and LLM Gateway authority | Under 2 minutes |
| Pause affected Workflow runs and isolate pods | Under 5 minutes |
| Identify all runs using an affected immutable version | Under 10 minutes |
| Preserve minimum investigation evidence | Under 15 minutes |
| Produce a first bounded blast-radius report | Under 30 minutes |
| Deploy a policy-only emergency mitigation | Under 1 hour |

The platform should continuously test these objectives by simulating denied
egress, stolen queue credentials, malformed messages, compromised Agent
images, model abuse, registry quarantine, node isolation, and rollback.

## RabbitMQ as a rapid control point

The decision to route all Agent and MCP communication through RabbitMQ creates
a particularly useful emergency control plane:

- Revoke one Agent without disrupting unrelated Agents.
- Disable one routing key or exchange binding.
- Stop consumption while preserving durable commands.
- Quarantine suspicious messages for investigation.
- Lower per-user or per-vhost connection, channel, publish, and delivery
  limits.
- Expire stale commands by TTL.
- Enforce delivery limits and prevent infinite poison-message loops.
- Pause one MCP capability without changing every Agent.
- Replay safe messages after remediation using idempotency records.
- Observe queue depth, unacknowledged messages, redelivery, consumer
  utilization, publish confirms, and DLQ volume.

The broker does not decide business authorization and must not become
authoritative workflow state. The Policy Plane authorizes, PostgreSQL records
truth, and RabbitMQ enforces narrow transport permissions and durable
delivery.

## Residual risks

This architecture reduces risk; it does not eliminate it.

Residual risks include:

- A vulnerability in gVisor, Kata, the hypervisor, container runtime, kernel,
  CNI, service mesh, or Kubernetes control plane.
- A compromised base image, dependency, build pipeline, registry, or signing
  authority.
- Misconfigured NetworkPolicy, workload identity, RabbitMQ ACL, LLM Gateway,
  or admission rule.
- A compromised RabbitMQ or LLM Gateway control plane.
- A valid but malicious message that satisfies structural schema while
  exploiting downstream business logic.
- Prompt injection that causes harmful but still authorized behavior.
- An overly broad Agent or MCP capability definition.
- Excessive data included in an otherwise authorized ContextPack.
- A trusted Artifact Worker, renderer, Orchestrator, MCP, or policy service
  executing or trusting Agent-controlled content incorrectly.
- Insider abuse or compromise of administrative identities.
- Availability attacks through allowed endpoints.
- Cross-tenant defects in platform control or state services.

These risks require patch management, least privilege, multi-party
administration, separation of duties, independent penetration testing, threat
modeling, fuzzing, policy tests, chaos engineering, incident exercises, and
continuous review of new Agent escape research.

## Security claims the platform should and should not make

### Appropriate claims

- Agents are treated as untrusted workloads.
- Agent network access is deny by default.
- Agents have only two explicitly permitted service destinations.
- Agents cannot directly access MCPs, platform state, object storage, Redis,
  Kubernetes, provider endpoints, or the internet under the approved
  configuration.
- Agent outputs remain untrusted and are never automatically executed by
  trusted host components.
- Every useful interaction crosses an authenticated, authorized, monitored,
  and revocable enforcement point.
- A compromised Agent's authority and blast radius are deliberately bounded.
- The platform can centrally quarantine a version and revoke its useful
  authority within defined response objectives.

### Claims to avoid

- "An Agent can never escape."
- "Kubernetes containers are a complete sandbox."
- "NetworkPolicy alone prevents all egress."
- "Messages from an authenticated Agent are trusted."
- "Schema validation proves business safety."
- "Human approval prevents every harmful action."
- "A message queue makes Agent behavior safe."
- "No sensitive information can ever leak."

Security confidence comes from tested layers, evidence, and response
capability, not absolute language.

## Final intent

The platform assumes that Agents will process untrusted instructions, models
will sometimes behave unexpectedly, software vulnerabilities will continue to
be discovered, and a preventive control may eventually fail.

The answer is not to give an Agent broad authority and hope its sandbox holds.
The answer is to make the Agent a small, disposable, untrusted compute unit
inside several independent boundaries:

```text
Untrusted input
      |
      v
Schema + policy + context projection
      |
      v
Ephemeral Agent sandbox
      |
      +----> RabbitMQ ----> typed, policed, revocable effects
      |
      +----> LLM Gateway -> governed, budgeted inference
      |
      X----> everything else is denied
```

If the Agent is manipulated, the sandbox limits execution.

If the sandbox is bypassed, network policy limits reach.

If network policy is bypassed, the Agent still lacks broad credentials.

If a permitted endpoint is abused, RabbitMQ and the LLM Gateway enforce
identity, scope, rate, schema, and audit controls.

If a malicious output is produced, trusted workers validate it as data and do
not execute it.

If suspicious behavior is detected, the platform can quarantine the version,
revoke both allowed endpoints, stop deployment, preserve evidence, identify
affected runs, compensate safe side effects, and recover from durable state.

That is the core security intent: **not an unbreakable box, but a narrow,
layered, observable, rapidly revocable system in which one Agent failure does
not become a platform, tenant, cloud, or enterprise compromise.**

## Companion architecture

- [Browser deployment view](agent-service-isolation-kubernetes.html)
- [Editable Draw.io diagram](agent-service-isolation-kubernetes.drawio)

## References

1. Pillar Security, [The Week of Sandbox Escapes](https://www.pillar.security/blog/the-week-of-sandbox-escapes), 2026.
2. Cloud Security Alliance AI Safety Initiative, [AI Coding Agent Sandbox Escapes: The Trust Handoff Flaw](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-coding-agent-sandbox-escapes-20260722-c/), July 22, 2026.
3. OX Research, [CVE-2026-82533: DeepSeek Harness AI Agent Sandbox Escape](https://www.ox.security/blog/cve-2026-82533-deepseek-harness-ai-agent-sandbox-escape/), September 2026.
4. Kubernetes, [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/).
5. Kubernetes, [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/).
6. gVisor, [What is gVisor?](https://gvisor.dev/docs/).
7. Kata Containers, [Kata Containers](https://katacontainers.io/).
