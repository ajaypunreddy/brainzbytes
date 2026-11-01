(() => {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem("cw-theme");
  root.dataset.theme = storedTheme === "deep" ? "deep" : "dark";

  const themeButton = document.querySelector("[data-theme-toggle]");
  const updateThemeButton = () => {
    if (!themeButton) return;
    const isDeep = root.dataset.theme === "deep";
    themeButton.textContent = isDeep ? "◐" : "◑";
    themeButton.setAttribute("aria-label", isDeep ? "Use standard dark theme" : "Use high-contrast dark theme");
  };
  themeButton?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "deep" ? "dark" : "deep";
    localStorage.setItem("cw-theme", root.dataset.theme);
    updateThemeButton();
  });
  updateThemeButton();

  const menuButton = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-primary-nav]");
  menuButton?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open") ?? false;
    menuButton.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  }));

  const scenarioTabs = [...document.querySelectorAll("[data-scenario]")];
  const selectScenario = (tab) => {
    const panelId = tab.dataset.scenario;
    scenarioTabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(".scenario-panel").forEach((panel) => {
      const selected = panel.id === panelId;
      panel.classList.toggle("active", selected);
      panel.hidden = !selected;
    });
  };
  scenarioTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectScenario(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowLeft") next = (index - 1 + scenarioTabs.length) % scenarioTabs.length;
      if (event.key === "ArrowRight") next = (index + 1) % scenarioTabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = scenarioTabs.length - 1;
      scenarioTabs[next].focus();
      selectScenario(scenarioTabs[next]);
    });
  });

  const page = document.body.dataset.page;
  document.querySelectorAll("[data-nav-page]").forEach((link) => {
    if (link.dataset.navPage === page) link.setAttribute("aria-current", "page");
  });

  if (new URLSearchParams(location.search).get("from") === "journey") {
    const returnLink = document.createElement("a");
    returnLink.className = "journey-return";
    returnLink.href = "overview.html#reading-path";
    returnLink.innerHTML = '<span aria-hidden="true">←</span><span><b>Reading path</b><small>Return to all six chapters</small></span>';
    returnLink.addEventListener("click", (event) => {
      try {
        const previous = new URL(document.referrer);
        if (previous.origin === location.origin && previous.pathname.endsWith("/overview.html")) {
          event.preventDefault();
          history.back();
        }
      } catch {
        // The normal link remains the fallback when there is no usable referrer.
      }
    });
    document.body.append(returnLink);
  }

  const reveal = document.querySelectorAll("[data-reveal]");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    reveal.forEach((item) => item.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    reveal.forEach((item) => observer.observe(item));
  }

  document.querySelectorAll("[data-copy-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.copyLink || location.href);
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = original; }, 1200);
    });
  });

  const autoHeightFrames = [...document.querySelectorAll("iframe[data-auto-height]")];
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || !event.data || typeof event.data !== "object") return;
    const frame = autoHeightFrames.find((item) => (
      item.contentWindow === event.source && item.dataset.autoHeight === event.data.type
    ));
    const height = Number(event.data.height);
    if (!frame || !Number.isFinite(height) || height < 300 || height > 5000) return;
    frame.style.height = `${Math.ceil(height)}px`;
    frame.style.minHeight = "0";
  });

  const storyLaunch = document.querySelector("[data-story-launch]");
  storyLaunch?.addEventListener("click", () => {
    const source = storyLaunch.dataset.storySrc;
    if (!source) return;
    const frame = document.createElement("iframe");
    frame.className = "landing-cinematic-frame";
    frame.title = "Interactive ContextWeaver intent-to-evidence product story";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
    frame.setAttribute("allow", "autoplay");
    storyLaunch.replaceWith(frame);
    frame.src = source;
    frame.focus();
  }, { once: true });

  const experienceDialog = document.querySelector("[data-experience-modal]");
  const experienceFrame = experienceDialog?.querySelector("[data-experience-frame]");
  let experienceTrigger = null;

  const closeExperience = () => {
    if (!experienceDialog?.open) return;
    experienceDialog.close();
  };

  document.querySelectorAll("[data-experience-open]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!experienceDialog?.showModal) return;
      event.preventDefault();
      experienceTrigger = link;
      if (experienceFrame && !experienceFrame.src) {
        experienceFrame.src = experienceFrame.dataset.src;
      }
      experienceDialog.showModal();
      document.body.classList.add("experience-open");
    });
  });

  experienceDialog?.querySelector("[data-experience-close]")?.addEventListener("click", closeExperience);
  experienceDialog?.addEventListener("click", (event) => {
    if (event.target === experienceDialog) closeExperience();
  });
  experienceDialog?.addEventListener("close", () => {
    document.body.classList.remove("experience-open");
    experienceTrigger?.focus();
  });
  experienceFrame?.addEventListener("load", () => {
    experienceFrame.contentWindow?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeExperience();
    });
  });

  const spatialDialog = document.querySelector("[data-spatial-modal]");
  const spatialDialogTitle = spatialDialog?.querySelector("[data-spatial-modal-title]");
  const spatialDialogImage = spatialDialog?.querySelector("[data-spatial-modal-image]");
  const spatialDialogFrame = spatialDialog?.querySelector("[data-spatial-modal-frame]");
  let spatialTrigger = null;

  const closeSpatialView = () => {
    if (!spatialDialog?.open) return;
    spatialDialog.close();
  };

  document.querySelectorAll("[data-spatial-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (!spatialDialog?.showModal) return;
      spatialTrigger = trigger;
      const mode = trigger.dataset.spatialType === "iframe" ? "iframe" : "image";
      const title = trigger.dataset.spatialTitle || "ContextWeaver spatial view";
      const source = trigger.dataset.spatialSrc || "";
      spatialDialog.dataset.spatialMode = mode;
      if (spatialDialogTitle) spatialDialogTitle.textContent = title;
      if (mode === "image" && spatialDialogImage) {
        spatialDialogImage.src = source;
        spatialDialogImage.alt = trigger.querySelector("img")?.alt || title;
      }
      if (mode === "iframe" && spatialDialogFrame) {
        spatialDialogFrame.src = source;
        spatialDialogFrame.title = `Expanded ${title}`;
      }
      spatialDialog.showModal();
      document.body.classList.add("spatial-modal-open");
    });
  });

  spatialDialog?.querySelector("[data-spatial-close]")?.addEventListener("click", closeSpatialView);
  spatialDialog?.addEventListener("click", (event) => {
    if (event.target === spatialDialog) closeSpatialView();
  });
  spatialDialog?.addEventListener("close", () => {
    document.body.classList.remove("spatial-modal-open");
    if (spatialDialogFrame) spatialDialogFrame.src = "";
    if (spatialDialogImage) spatialDialogImage.removeAttribute("src");
    spatialTrigger?.focus();
  });
  spatialDialogFrame?.addEventListener("load", () => {
    spatialDialogFrame.contentWindow?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSpatialView();
    });
  });

  const learningAtlas = document.querySelector("[data-learning-atlas]");
  if (learningAtlas) {
    const goals = {
      understand: {
        label: "Understand",
        title: "From AI basics to one governed result",
        copy: "Learn why language models need enterprise knowledge, bounded Agents, approved capabilities, durable Workflows, policy, and evidence before they can produce trusted business outcomes.",
        guide: "ContextWeaver essentials for a new learner",
        items: ["AI, LLM, and RAG in plain language", "Agent, MCP, Workflow, Service, and Solution", "One governed journey with evidence"],
      },
      explain: {
        label: "Explain",
        title: "Tell the ContextWeaver product story clearly",
        copy: "Move from the customer problem to the product model, differentiators, proof points, trust story, public architecture, and claims that must not be made.",
        guide: "ContextWeaver product narrative for marketing",
        items: ["Category, audience, and core customer problem", "Cerebro, Weave, Loom, and the reuse model", "Approved proof points and claim boundaries"],
      },
      sell: {
        label: "Sell",
        title: "Connect customer pain to governed outcomes",
        copy: "Use discovery questions, qualification signals, use-case patterns, business value, deployment choices, demo flows, objections, and clear non-fit guidance.",
        guide: "ContextWeaver discovery and solution guide",
        items: ["Customer pains and qualification questions", "Outcome-led use cases and demo paths", "Objections, deployment choices, and non-fit signals"],
      },
      build: {
        label: "Build",
        title: "Create, test, publish, and operate a capability",
        copy: "Follow the governed builder lifecycle across Studios, source control, typed contracts, evaluation, immutable publication, deployment, runtime evidence, and safe retirement.",
        guide: "ContextWeaver builder handbook",
        items: ["Agent, MCP, Workflow, Service, and Solution contracts", "Tests, evaluation, policy, and publication", "Deployment, observability, and lifecycle"],
      },
      architect: {
        label: "Architect",
        title: "Traverse every boundary, dependency, and tradeoff",
        copy: "Inspect product planes, identity, authorization, data ownership, synchronous and asynchronous traffic, Kubernetes trust boundaries, portability, scaling, HA, and disaster recovery.",
        guide: "ContextWeaver architecture deep dive",
        items: ["Planes, contracts, trust boundaries, and identity", "Data, queues, storage, gateways, and runtime flow", "Portability, scale, resilience, and target architecture"],
      },
      operate: {
        label: "Operate",
        title: "Run, diagnose, recover, and improve the platform",
        copy: "Learn the cluster, service startup order, dependencies, health signals, dashboards, alerts, failure modes, incident flows, backup, restore, and disaster-recovery sequence.",
        guide: "ContextWeaver operator and SRE runbook",
        items: ["Cluster, namespaces, services, and dependencies", "Logs, metrics, traces, alerts, and diagnosis", "Shutdown, startup, backup, restore, and recovery"],
      },
    };
    const depthTimes = { essentials: "15 minutes", practitioner: "60 minutes", deep: "Complete deep dive" };
    const routeTitle = learningAtlas.querySelector("[data-learning-route-title]");
    const routeCopy = learningAtlas.querySelector("[data-learning-route-copy]");
    const routeTime = learningAtlas.querySelector("[data-learning-route-time]");
    const goalLabel = learningAtlas.querySelector("[data-learning-goal-label]");
    const guideTitle = learningAtlas.querySelector("[data-learning-guide-title]");
    const guideList = learningAtlas.querySelector("[data-learning-guide-list]");
    let selectedGoal = "understand";
    let selectedDepth = "essentials";

    const renderLearningSelection = () => {
      const goal = goals[selectedGoal];
      if (!goal) return;
      if (routeTitle) routeTitle.textContent = goal.title;
      if (routeCopy) routeCopy.textContent = goal.copy;
      if (routeTime) routeTime.textContent = depthTimes[selectedDepth] || depthTimes.essentials;
      if (goalLabel) goalLabel.textContent = goal.label;
      if (guideTitle) guideTitle.textContent = goal.guide;
      if (guideList) guideList.innerHTML = goal.items.map((item) => `<li>${item}</li>`).join("");
      const url = new URL(location.href);
      url.searchParams.set("goal", selectedGoal);
      url.searchParams.set("depth", selectedDepth);
      history.replaceState({}, "", url);
    };

    const requestedGoal = new URLSearchParams(location.search).get("goal");
    const requestedDepth = new URLSearchParams(location.search).get("depth");
    if (requestedGoal && goals[requestedGoal]) selectedGoal = requestedGoal;
    if (requestedDepth && depthTimes[requestedDepth]) selectedDepth = requestedDepth;

    const goalButtons = [...learningAtlas.querySelectorAll("[data-learning-goal]")];
    goalButtons.forEach((button) => {
      const selected = button.dataset.learningGoal === selectedGoal;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.addEventListener("click", () => {
        selectedGoal = button.dataset.learningGoal;
        goalButtons.forEach((item) => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderLearningSelection();
      });
    });

    const depthButtons = [...learningAtlas.querySelectorAll("[data-learning-depth]")];
    depthButtons.forEach((button) => {
      const selected = button.dataset.learningDepth === selectedDepth;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.addEventListener("click", () => {
        selectedDepth = button.dataset.learningDepth;
        depthButtons.forEach((item) => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderLearningSelection();
      });
    });

    const jargonButton = learningAtlas.querySelector("[data-learning-jargon]");
    jargonButton?.addEventListener("click", () => {
      const active = !document.body.classList.contains("learning-jargon-on");
      document.body.classList.toggle("learning-jargon-on", active);
      jargonButton.setAttribute("aria-pressed", String(active));
      jargonButton.textContent = active ? "Jargon explanations on" : "Explain jargon inline";
    });
    learningAtlas.querySelectorAll("[data-learning-jargon-term]").forEach((button) => {
      button.addEventListener("click", () => {
        const expanded = button.dataset.expanded === "true";
        button.dataset.expanded = String(!expanded);
        button.textContent = expanded
          ? "What is a typed contract?"
          : "Typed contract: a validated input/output schema that makes expectations explicit.";
      });
    });

    const filters = [...learningAtlas.querySelectorAll("[data-component-filter]")];
    const componentCards = [...learningAtlas.querySelectorAll("[data-component-domain]")];
    filters.forEach((button) => button.addEventListener("click", () => {
      const filter = button.dataset.componentFilter;
      filters.forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      componentCards.forEach((card) => {
        const domains = (card.dataset.componentDomain || "").split(" ");
        card.hidden = filter !== "all" && !domains.includes(filter);
      });
    }));

    const lensContent = {
      business: ["Why it matters", "Turn repeatable expertise into a governed capability.", "An Agent can apply a specialist role consistently while the platform preserves ownership, limits, approvals, and evidence. It augments a process; it does not become an unaccountable digital employee.", ["Good fit", "Research, classify, compare, recommend, draft"], ["Needs control", "Side effects, sensitive data, high-risk decisions"], ["ContextWeaver adds", "Identity, policy, MCP boundaries, approval, evidence"]],
      sales: ["Customer conversation", "Lead with the process problem, not autonomous AI.", "Qualify where expertise is repetitive, information is fragmented, tools are disconnected, and accountability matters. Show one bounded journey and its evidence rather than promising a general digital employee.", ["Ask", "Where does work stall or require manual coordination?"], ["Demonstrate", "A governed result with citations, approval, and receipts"], ["Avoid", "Claims of unlimited autonomy or automatic compliance"]],
      engineering: ["Implementation model", "A typed runtime profile around a model and approved dependencies.", "The Agent receives validated state, a profile, model alias, budgets, and allowlisted MCP references. It emits typed output and evidence. It does not own credentials, deployment authority, or unrestricted network access.", ["Inputs", "Schema, identity context, task state, context pack"], ["Runtime", "Bounded loop, timeout, retries, token and cost budgets"], ["Outputs", "Typed result, citations, receipts, diagnostics"]],
      architecture: ["Boundary and tradeoff", "Separate probabilistic reasoning from deterministic authority.", "Agents optimize reasoning flexibility. Workflows own order and durable control; MCP servers own capability interfaces; gateways and policy services own authorization and credentials; the Registry owns immutable identity.", ["Boundary", "Agent is not Workflow, MCP, or policy engine"], ["Scale", "Profile-bound generic runtimes and isolated queues"], ["Tradeoff", "More contracts, but safer reuse and independent evolution"]],
      operations: ["Runtime operations", "Operate the profile, queue, and evidence—not hidden reasoning.", "Monitor queue depth, execution latency, model errors, retries, budget exhaustion, output validation, and dependency health. Roll back an immutable profile or model alias without rewriting the Workflow.", ["Health", "Readiness, queue lag, model and MCP dependencies"], ["Failure", "Timeout, invalid output, unavailable provider, budget breach"], ["Recovery", "Retry safely, requeue, pause, quarantine, or roll back"]],
    };
    const lensTabs = [...learningAtlas.querySelectorAll("[data-learning-lens]")];
    const lensPanel = learningAtlas.querySelector("[data-learning-lens-panel]");
    const renderLens = (name) => {
      const content = lensContent[name];
      if (!content || !lensPanel) return;
      lensPanel.innerHTML = `<div><span class="learning-panel-kicker">${content[0]}</span><h3>${content[1]}</h3><p>${content[2]}</p></div><div class="learning-agent-loop" aria-label="Bounded Agent loop"><span>Observe</span><i>→</i><span>Plan</span><i>→</i><span>Act</span><i>→</i><span>Inspect</span><i>→</i><b>Stop</b></div><div class="learning-panel-grid"><article><span>${content[3][0]}</span><b>${content[3][1]}</b></article><article><span>${content[4][0]}</span><b>${content[4][1]}</b></article><article><span>${content[5][0]}</span><b>${content[5][1]}</b></article></div>`;
    };
    lensTabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        lensTabs.forEach((item) => {
          const active = item === tab;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", String(active));
          item.tabIndex = active ? 0 : -1;
        });
        renderLens(tab.dataset.learningLens);
      });
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = lensTabs[(index + direction + lensTabs.length) % lensTabs.length];
        next.click();
        next.focus();
      });
    });

    const generateButton = learningAtlas.querySelector("[data-learning-generate]");
    generateButton?.addEventListener("click", () => {
      generateButton.textContent = "Guide assembled from canonical modules";
      generateButton.classList.remove("primary");
      generateButton.setAttribute("aria-live", "polite");
    });
    renderLearningSelection();
  }
})();
