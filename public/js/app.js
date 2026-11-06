import {activeDemoUser,chooseDemoUser,loginDemoEmail,logoutDemoUser,demoSessionHTML,renderDemoLoginAccounts,demoUsers,demoNavigation,demoSelectorHTML,scopedDemoCalls,canViewPage,canEvaluate,createDemoUser,setDemoUserActive,renderDemoAdmin} from "./presentation-personas.js";
import {renderDirectorPortfolio} from "./presentation-portfolio.js";
import {readUsage} from "./presentation-usage-ledger.js";
/**
 * QA-APP-001 | Qualis v2.2.0
 *
 * Application controller.
 *
 * Rubric edits change runtime configuration,
 * not app.js source code.
 *
 * Interaction data/results: browser memory.
 * Rubric settings: browser localStorage.
 */

import {
  loadRubric,
  saveRubric,
  linkedRules,
  setCriterionEnabled
} from "./config.js";

import {
  parseExport,
  mapSpeakers,
  SAMPLE
} from "./parser.js";

import {
  assess
} from "./engine.js";
import { loadHistory, saveHistory, mergeImported, clearHistory } from "./history.js";
import { applyPeriod } from "./reporting.js";
import {loadReferenceLibrary, saveReferenceLibrary, importReferenceDataset, toggleReferenceDataset, deleteReferenceDataset, csvTemplate, activeReferenceEntries, normalizeReferenceLibrary} from "./reference.js";
import {configShell, referenceLibraryView} from "./reference-ui.js";
import { scrollPageToTop } from "./navigation.js";
import { progressLabels, readProgress, saveProgress, clearProgress } from "./progress.js";
import { renderUsagePage } from "./presentation-usage.js";
import { saveUsage, exportUsageCsv } from "./presentation-usage-ledger.js";
import { normalizeTranscriptText, readDocxTranscript } from "./presentation-docx.js";
import { normalizeClipboardPlain,normalizeClipboardHTML } from "./presentation-paste.js";

import {
  overview,
  studio,
  agentsView,
  configuration
} from "./ui.js";

const root = document.querySelector("#view");

const $ = selector =>
  document.querySelector(selector);

const state = {
  page: "overview",
  calls: [],
  selected: null,
  agentFilter: "",
  overviewAgent: "",
  period: { mode: "all", from: "", to: "" },
  search: "",
  importFeedback: "",
  pasteDraft: "",
  resultTab: "scorecard",
  findingFilter: "all",
  evidenceView: "all",

  rubric: loadRubric(),
  references: loadReferenceLibrary(),
  configTab: "rubric",

  criterion: "greet7",
  stopAfterCurrent: false,
  running: false,
  phase: "idle",
  evalProgress: readProgress(typeof localStorage === "undefined" ? null : localStorage),

  message:
    "Upload a Genesys file or load the synthetic example",

  controller: null
};

const titles = {
  overview: [
    "QA Overview",
    "Quality intelligence across interactions and agents."
  ],

  studio: [
    "AI Evaluation Studio",
    "Upload one multi-agent export; evaluate one call or the full batch."
  ],

  agents: [
    "Agent Performance",
    "Trace each QA score to evaluated interactions."
  ],

  usage: ["AI Usage & Diagnostics", "Gemini request volumes, daily token usage and rate limits."],

  portfolio: ["BU Performance", "Cross-business-unit quality, volume and coverage."],
  admin: ["Platform Administration", "Demo user lifecycle, platform status and governance."],
  config: [
    "Config",
    "Manage QA scoring parameters and approved evaluation reference materials."
  ]
};

/**
 * QA-APP-RENDER
 * Render the selected application page.
 */
function render() {
  const preserveScroll = state.page === "config";
  const previousY = preserveScroll ? window.scrollY : 0;
  const previousPanel = preserveScroll && state.configTab === "rubric" ? root.querySelector(".configuration .index") : null;
  const previousPanelY = previousPanel?.scrollTop || 0;
  const user=activeDemoUser();
  // A fresh tab begins at the simulated persona login. This is never
  // an identity or security boundary; password is intentionally ignored.
  if(!user){
    document.body?.classList?.add?.("qa-demo-login-open");
    const nav=document.querySelector("#nav");if(nav){nav.innerHTML="";nav.dataset.persona="logged-out";}
    const holder=document.querySelector("#qa-demo-persona");if(holder)holder.innerHTML="";
    $("#page-title").textContent="Persona Login";
    $("#page-sub").textContent="Select a presentation user and access their workspace.";
    root.innerHTML='<section class="qa-login"><div class="qa-login-art"><div class="qa-login-symbol">QA<span>✦</span></div><div class="kicker">MAF / QUALITY INTELLIGENCE</div><h2>One quality platform.<br>Every service perspective.</h2><p>Explore the QA.MAFer.AI experience for agents, business-unit leaders, customer care leadership and platform administrators.</p><small>Cloudflare + Gemini · Personal presentation environment</small></div><div class="qa-login-panel"><div class="kicker">PERSONA</div><h2>Welcome to QA.MAFer.AI</h2><p>Enter the email of a demo persona to open its workspace.</p><form id="qa-demo-login"><label>Email address<input type="email" name="email" id="qa-login-email" placeholder="name@demo.mafer.ai" autocomplete="username" required></label><label>Password <span class="qa-optional">(optional)</span><input type="password" name="password" id="qa-login-password" autocomplete="off" placeholder="Leave blank for demo"></label><button type="submit" class="primary qa-login-submit">Login</button></form><div class="qa-login-options"><small>Choose a presentation persona</small>'+renderDemoLoginAccounts()+'</div><p class="qa-demo-note">Demonstration login only. Email selects a predefined persona; the password field is not checked and provides no account security. Do not enter real passwords.</p></div></section>';
    return;
  }
  document.body?.classList?.remove?.("qa-demo-login-open");
  if(!canViewPage(user,state.page))state.page=user.role==="cc_lead"?"portfolio":user.role==="admin"?"admin":"overview";
  const scopedCalls=scopedDemoCalls(user,state.calls);
  if(state.selected&&!scopedCalls.some(c=>c.key===state.selected))state.selected=null;
  if(state.agentFilter&&!scopedCalls.some(c=>c.agent===state.agentFilter))state.agentFilter="";
  const nav=document.querySelector("#nav");
  const navHTML=demoNavigation(user);
  if(nav.dataset.persona!==user.id){nav.innerHTML=navHTML;nav.dataset.persona=user.id;}
  const holder=document.querySelector("#qa-demo-persona");
  if(holder)holder.innerHTML=demoSessionHTML(user);
  document.querySelector(".sidebar-bottom")?.setAttribute?.("data-demo-role",user.role);
  const [title, sub] = titles[state.page];

  $("#page-title").textContent = title;
  $("#page-sub").textContent = sub;

  document.querySelectorAll(
    "#nav [data-page]"
  ).forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === state.page
    );
  });

  root.innerHTML =
    state.page === "usage" ? renderUsagePage()
      : state.page === "portfolio" ? renderDirectorPortfolio(state.calls,state.directorBU||"all",state.directorBrand||"all")
      : state.page === "admin" ? renderDemoAdmin(demoUsers(),readUsage(),scopedCalls,state.apiStatus||"Not checked")
      : state.page === "overview"
        ? overview(applyPeriod(scopedCalls,state.period).calls,state.rubric,user.role==="agent"?user.agent:state.overviewAgent,state.period,applyPeriod(scopedCalls,state.period))
      : state.page === "studio" ? studio({...state,calls:scopedCalls,selected:scopedCalls.some(c=>c.key===state.selected)?state.selected:null})
      : state.page === "agents" ? agentsView({...state,calls:scopedCalls})
      : configShell(state.configTab,
              state.configTab === "rubric"
                ? configuration(state.rubric,state.criterion)
                : referenceLibraryView(state.references)
            );

  // Import corporate-format configuration backups locally without publishing
  // reference-library datasets or rubric data to public GitHub.
  if (state.page==="config") {
    const bar=document.createElement("div");
    bar.className="qa-local-config-restore";
    bar.innerHTML=state.configTab==="rubric"
      ? '<div><b>Load QA rubric backup</b><small>Import a saved rubric JSON. Its GPT-4o model selection will be mapped to Gemini for this personal demo. Existing rubric settings are replaced.</small></div><label class="secondary qa-local-file-btn">Import rubric JSON<input type="file" id="qa-import-rubric" accept=".json,application/json" hidden></label>'
      : '<div><b>Load reference library backup</b><small>Import your versioned library JSON into this browser only. Files are not committed to GitHub or uploaded to Cloudflare until selected entries are sent for a Gemini assessment.</small></div><label class="secondary qa-local-file-btn">Import library JSON<input type="file" id="qa-import-reference-library" accept=".json,application/json" hidden></label>';
    root.prepend(bar);
  }

  filterRows();
  if (state.page === "config" && state.configTab === "rubric") {
    for (const criterion of state.rubric.criteria) updateParentSelectionIndicator(criterion.id);
  }
  if (state.page === "studio") paintProgress();
  if (preserveScroll) {
    const panel = root.querySelector(".configuration .index");
    if (panel) panel.scrollTop = previousPanelY;
    window.scrollTo(0, previousY);
  }
}

/** Sync the visible master checkbox with enabled child checks, including a
 * mixed state when a business user deliberately selects only some checks. */
function updateParentSelectionIndicator(id) {
  const criterion = state.rubric.criteria.find(c => c.id === id);
  const input = [...root.querySelectorAll("[data-enabled]")].find(x => x.dataset.enabled === id);
  if (!criterion || !input) return;
  const owned = linkedRules(id);
  const rules = (state.rubric.rules?.deterministic || []).filter(r => owned.includes(r.id));
  const checks = [...(criterion.checkpoints || []), ...rules];
  const selected = checks.filter(a => a.enabled === true).length;
  input.checked = criterion.enabled === true;
  input.indeterminate = criterion.enabled === true && selected > 0 && selected < checks.length;
  input.setAttribute("aria-checked", input.indeterminate ? "mixed" : String(input.checked));

  // Keep the active-child count accurate without re-rendering draft text fields.
  const button = input.closest(".rubric-row")?.querySelector("[data-criterion]");
  if (!button) return;
  let badge = button.querySelector(".qa-child-active-badge");
  if (!input.indeterminate) {
    badge?.remove();
  } else {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "qa-child-active-badge";
      badge.title = "Only selected child checks will be assessed";
      button.querySelector(".qa-expand-indicator")?.before(badge);
    }
    badge.textContent = selected + "/" + checks.length + " active";
  }
}

/**
 * QA-APP-NOTICE
 * Display non-blocking status and errors.
 */
async function persist() {
  try { await saveHistory(state.calls.filter(c => c.status !== "RUNNING")); }
  catch(e) { notify("History could not be saved: " + e.message, true); }
}

function notify(message, error = false) {
  const el = $("#notice");

  el.textContent = message;

  el.className = error
    ? "notice error-note"
    : "notice";
}

function navigate(page) {
  if (state.running) return;
  if(!canViewPage(activeDemoUser(),page)){notify("This page is outside the selected demo role.",true);return;}
  if (state.page === "config" && page !== "config" && !captureCriterionDraft()) return;


  state.page = page;
  render();
  // A page change should never inherit the scroll position of the Studio.
  // This applies to top navigation, Agents & Reports and Inspect assessment.
  scrollPageToTop(window, document);
}

// When Inspect is chosen, bring the in-page assessment into view without
// removing the Performance Intelligence overview above it.
function revealAgentInspection() {
  root.querySelector("#agent-inspection")?.scrollIntoView?.({
    behavior: "smooth",
    block: "nearest"
  });
}

/**
 * QA-APP-FILTER
 * Filter the queue without recreating
 * the search input on every keystroke.
 */
function filterRows() {
  const q = state.search.trim().toLowerCase();

  root.querySelectorAll(
    "[data-call]"
  ).forEach(row => {
    const matchesSearch =
      row.dataset.search.includes(q);

    const matchesAgent =
      !state.agentFilter ||
      row.dataset.agentname === state.agentFilter;

    row.hidden = !(
      matchesSearch &&
      matchesAgent
    );
  });
}

/**
 * QA-APP-IMPORT
 *
 * Parse one transcript export.
 * Require mapping when named speakers have unknown roles.
 */
function load(text, filename) {
  if(!canEvaluate(activeDemoUser())){notify("This demo persona cannot import or evaluate interactions.",true);return;}
  if (state.running) {
    notify("Wait for the current evaluation to finish before importing.", true);
    return;
  }

  const incoming = parseExport(normalizeTranscriptText(normalizeClipboardPlain(text)), filename);
  // Keep the original pasted transcript visible even if mapping or evaluation is blocked.
  if (filename === "paste.txt") state.pasteDraft = text;
  const merged = mergeImported(state.calls, incoming);
  if (!merged.calls.length) {
    throw Error("No usable interactions found. Check speaker labels and transcript format.");
  }
  state.calls = merged.calls;
  if (merged.added > 0) {
    // A changed interaction set is a new batch; older run timing is no
    // longer representative of the current queue.
    state.evalProgress = null;
    clearProgress(typeof localStorage === "undefined" ? null : localStorage);
  }

  // Transcript import never interrupts the user with a browser prompt.
  // Clearly labelled speakers are resolved automatically by the parser.
  // Truly ambiguous roles remain flagged instead of being guessed.

  state.page = "studio";

  // Focus on the transcript just imported, including one assessed previously.
  const firstImported = incoming.find(c => c.status !== "DUPLICATE");
  // Imported parser keys are temporary. Resolve the stable merged key instead.
  const importedId = firstImported?.id;
  const matchingMerged = state.calls.find(c => c.id === importedId && c.status !== "DUPLICATE");
  state.selected = matchingMerged?.key ||
    state.calls.find(c => c.status === "READY")?.key ||
    state.calls[0]?.key || null;

  state.agentFilter = "";
  state.overviewAgent = "";
  state.search = "";
  state.phase = "idle";

  // Import counts already appear in the queue and progress tiles.
  // Keep successful intake silent to avoid a redundant full-width banner
  // and long status text inside the AI evaluator animation.
  state.message = "";
  state.importFeedback = "";
  const notice = $("#notice");
  if (notice) {
    notice.textContent = "";
    notice.className = "notice";
  }

  // Save only after any manual speaker mapping has completed.
  void persist();
  render();
}

const clone = value =>
  JSON.parse(JSON.stringify(value));

/**
 * QA-APP-STAGE
 * Update the animation with actual evaluation stages.
 */
function stage(phase, call) {
  state.phase = phase;

  state.message = ({
    rules:
      "Applying deterministic rules",

    ai:
      "Gemini identifying evidence checkpoints",

    validating:
      "Verifying evidence and calculating scores",

    complete:
      "Call assessment complete"
  })[phase] || phase;

  if (call) {
    state.message +=
      ` · ${call.agent}`;
  }

  if (state.page === "studio") {
    render();
  }
}

/**
 * QA-APP-BATCH
 *
 * Run selected call or all pending calls.
 *
 * Sequential execution prevents uncontrolled
 * parallel Gemini requests.
 *
 * Quota errors stop subsequent requests.
 */
// QA-PROGRESS-ETA | Real elapsed wall time and completed-call average.
// Do not fabricate percentage completion for an in-flight Gemini request.
let progressClock = null;
function paintProgress() {
  const elapsed=root.querySelector("#qa-elapsed");
  const eta=root.querySelector("#qa-eta");
  const count=root.querySelector("#qa-batch-count");
  if (!elapsed||!eta||!count) return;
  const handled=state.calls.filter(c =>
    ["COMPLETE","ERROR","NO_TRANSCRIPT","DUPLICATE"].includes(c.status)).length;
  const labels=progressLabels(state.evalProgress,{
    callCount:state.calls.length,handled
  });
  elapsed.textContent=labels.elapsed;
  eta.textContent=labels.eta;
  count.textContent=labels.count;
}
async function run(scope = "ready") {
  if (state.running) return;
  const demoUser=activeDemoUser();
  if(!canEvaluate(demoUser)){notify("Only the demo BU Lead and Admin can run evaluations.",true);return;}

  const evaluable = c => c && ["READY", "ERROR", "COMPLETE"].includes(c.status)&&scopedDemoCalls(demoUser,[c]).length===1;
  const target = scope === "all"
    ? state.calls.filter(evaluable)
    : scope === "agent"
      ? state.calls.filter(c => c.agent === state.agentFilter && evaluable(c))
      : scope === "selected"
        ? [state.calls.find(c => c.key === state.selected)].filter(evaluable)
        : state.calls.filter(c => c.status === "READY");

  if (!target.length) {
    notify("No evaluable interaction selected. Check the import status and speaker mapping.", true);
    return;
  }

  /**
   * Lock the rubric during this batch.
   */
  const snapshot = clone(state.rubric);
  const referenceSnapshot = clone(state.references);

  state.stopAfterCurrent = false;
  state.running = true;
  state.evalProgress = {started:Date.now(),total:target.length,completed:0,callCount:state.calls.length};
  // Never display an older completed cycle as the timing of a new one.
  clearProgress(typeof localStorage === "undefined" ? null : localStorage);
  if (progressClock) clearInterval(progressClock);
  progressClock = setInterval(paintProgress,1000);
  state.controller = new AbortController();

  let quota = false;
  let stopped = false;

  try {
    for (const call of target) {
      if (state.controller.signal.aborted || state.stopAfterCurrent) {
        stopped = true;
        break;
      }

      // Capture the pre-run assessment so an aborted re-evaluation can be
      // rolled back without discarding a previously completed result.
      const before = clone({
        status: call.status, error: call.error || "",
        findings: call.findings || [], score: call.score ?? null,
        meta: call.meta ?? null, evaluatedAt: call.evaluatedAt ?? null,
        assessmentHistory: call.assessmentHistory || []
      });
      const previous = before.status === "COMPLETE" && before.findings.length
        ? { evaluatedAt: before.evaluatedAt, score: before.score,
            findings: before.findings, meta: before.meta,
            rubricRevision: before.meta?.rubricRevision ?? null }
        : null;
      call.status = "READY";
      call.error = "";
      call.findings = [];
      call.score = null;

      state.selected = call.key;
      const startedAt = new Date().toISOString();
      const attemptId = "gemini-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,9);
      const activeCriteria = snapshot.criteria.filter(c => c.enabled === true);
      const contextCall = { ...call, businessUnit: call.businessUnit || "SHARE" };
      const selectedReferences = activeReferenceEntries(referenceSnapshot, contextCall, activeCriteria);
      const byReference = new Map();
      for (const entry of selectedReferences) {
        const key = String(entry.source||"") + "|" + String(entry.version||"");
        if (!byReference.has(key)) byReference.set(key, {name:entry.source||"Reference",type:entry.type||"",version:entry.version||"—",entries:0});
        byReference.get(key).entries++;
      }
      call.referenceAudit = {revision:referenceSnapshot.revision,files:[...byReference.values()],selectedEntries:selectedReferences.length,at:startedAt};
      call.assessmentCriteria = clone(activeCriteria);
      call.aiTelemetry = {inputTokens:null,outputTokens:null,totalTokens:null,requests:[],failedStage:null};
      stage("rules", call);

      try {
        await assess(
          call,
          snapshot,
          state.controller.signal,
          stage,
          {
            revision: referenceSnapshot.revision,
            entries: selectedReferences,
          }
        );

      } catch (err) {
        if (state.controller.signal.aborted) {
          // Hard stop must not destroy the old score during a reassessment.
          Object.assign(call, before);
          stopped = true;
          break;
        }

        call.status = "ERROR";
        call.error = String(
          err.message || err
        );

        call.score = null;

        state.phase = "error";
        state.message =
          `Evaluation failed: ${call.error}`;

        if (err.status === 429) {
          quota = true;
          render();
          break;
        }
      }

      if (call.status === "COMPLETE") {
        call.evaluatedAt = new Date().toISOString();
        // Only append comparison history once the new evaluation succeeds.
        if (previous) {
          call.assessmentHistory = [...before.assessmentHistory, previous].slice(-20);
        }
      }
      saveUsage({id:attemptId,startedAt,endedAt:new Date().toISOString(),interactionId:call.id||call.key,model:snapshot.model,status:call.status,aiTelemetry:call.aiTelemetry||null});
      state.evalProgress.completed++;
      await persist();
      render();
      paintProgress();
      if (state.stopAfterCurrent) { stopped = true; break; }
    }

  } finally {
    if (progressClock) clearInterval(progressClock);
    progressClock = null;
    state.running = false;
    state.stopAfterCurrent = false;
    state.controller = null;
    state.evalProgress.ended=Date.now();
    state.evalProgress.outcome=quota?"quota":stopped?"stopped":"complete";
    saveProgress(typeof localStorage === "undefined" ? null : localStorage,state.evalProgress);

    state.phase = quota
      ? "error"
      : "idle";

    state.message = quota
      ? "Gemini quota reached; pending calls remain ready"
      : stopped
        ? "Stopped — completed results retained; pending interactions can be resumed with Evaluate all"
        : "Evaluation cycle finished — inspect results";

    // Persist the stopped state as well as completed items, including
    // restoration of any assessment interrupted during a reassessment.
    await persist();
    render();
    paintProgress();
  }
}

/**
 * QA-APP-CSV
 * Escape CSV and guard against spreadsheet formulas.
 */
function csv(rows) {
  const safe = value => {
    const s = String(value ?? "");

    const protectedValue =
      /^[=+@-]/.test(s)
        ? "'" + s
        : s;

    return '"' +
      protectedValue.replaceAll('"', '""') +
      '"';
  };

  return rows
    .map(row =>
      row.map(safe).join(",")
    )
    .join("\r\n");
}

/**
 * QA-APP-EXPORT
 * JSON: complete call-level findings and transcripts.
 * CSV: summarized interaction scores.
 */
function download(kind) {
  let content;
  let name;
  let type;

  if (kind === "json") {
    content = JSON.stringify({
      version: "2.2.0",
      exportedAt: new Date().toISOString(),
      calls: state.calls
    }, null, 2);

    name = "QA.MAFer.AI-full-assessments.json";
    type = "application/json";

  } else {
    const rows = [[
      "Interaction ID",
      "Agent",
      "Status",
      "QA Score",
      "Coverage",
      "Rubric revision",
      "Model"
    ]];

    for (const c of state.calls) {
      rows.push([
        c.id,
        c.agent,
        c.status,
        c.score?.score ?? "",
        c.score?.coverage ?? "",
        c.meta?.rubricRevision ?? "",
        c.meta?.model ?? ""
      ]);
    }

    content = csv(rows);
    name = "QA.MAFer.AI-call-summary.csv";
    type = "text/csv";
  }

  const url = URL.createObjectURL(
    new Blob(
      [content],
      { type }
    )
  );

  const a = document.createElement("a");

  a.href = url;
  a.download = name;
  a.click();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1500
  );
}

/**
 * QA-APP-SAVE
 * Increase rubric revision when settings change.
 */
function save(message) {
  state.rubric.revision++;

  saveRubric(state.rubric);

  render();
  notify(message);
}


/** Capture editable rubric fields without committing until Save all. */
function captureCriterionDraft() {
  if (state.page !== "config" || !root.querySelector("#cName")) return true;
  const c = state.rubric.criteria.find(
    x => x.id === state.criterion
  );

  const weight = Number(
    $("#cWeight").value
  );

  if (
    !c ||
    !$("#cName").value.trim() ||
    !Number.isFinite(weight) ||
    weight < 0 ||
    weight > 100
  ) {
    notify(
      "Parameter name and weight 0–100 are required",
      true
    );
    return false;
  }

  const name = $("#cName").value.trim();
  const definition =
    $("#cDefinition").value.trim();

  const instructions =
    $("#cInstruction").value.trim();

  let newCheckpoints = c.checkpoints;

  if (c.checkpoints.length) {
    const inputs = [...root.querySelectorAll("[data-anchor-text]")];
    const items = inputs.map(input => ({
      id: c.id + "-" + (Number(input.dataset.anchorText) + 1),
      text: input.value.trim(),
      enabled: c.enabled !== false && !!root.querySelector('[data-anchor-enabled="' + input.dataset.anchorText + '"]')?.checked,
      points: Number(root.querySelector('[data-anchor-points="' + input.dataset.anchorText + '"]')?.value)
    }));
    if (!items.length || items.length > 12 || items.some(x=>!x.text || x.text.length>250 || !Number.isFinite(x.points) || x.points<0 || x.points>100)) {
      notify("Each evaluation check requires a description (maximum 250 characters).",true);
      return false;
  }
    newCheckpoints = items;
  }

  // Persist nested quantitative rules with the same rubric revision.
  const editedRules = [...root.querySelectorAll("[data-rule-value]")].map(input => ({
    id: input.dataset.ruleValue,
    enabled: c.enabled !== false && !!root.querySelector('[data-rule-enabled="' + input.dataset.ruleValue + '"]')?.checked,
    operator: root.querySelector('[data-rule-operator="' + input.dataset.ruleValue + '"]')?.value || "<=",
    value: input.value.trim() === "" ? NaN : Number(input.value)
  }));
  if (editedRules.some(x => !Number.isFinite(x.value) || x.value < 0 || x.value > 1000000)) {
    notify("Rule thresholds must be valid non-negative numbers.", true);
    return false;
  }
  const ruleWeights = { ...(c.ruleWeights || {}) };
  for (const input of root.querySelectorAll("[data-rule-points]")) {
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      notify("Each evaluation check needs points between 0 and 100.", true);
      return false;
  }
    ruleWeights[input.dataset.rulePoints] = value;
  }
  const currentRules = state.rubric.rules.deterministic || [];
  state.rubric.rules.deterministic = currentRules.map(rule =>
    editedRules.find(x => x.id === rule.id) || rule
  );
  const greeting = state.rubric.rules.deterministic.find(x => x.id === "greeting_time");
  const fallback = state.rubric.rules.deterministic.find(x => x.id === "fallback_greeting");
  if (greeting) state.rubric.rules.greet7 = greeting.value;
  if (fallback) state.rubric.rules.greet10 = fallback.value;
  Object.assign(c, {
    name,
    definition,
    instructions,
    weight,
    checkpoints: newCheckpoints,
    ruleWeights
  });

  return true;
}
/**
 * Sidebar navigation.
 */
document.querySelector("#nav")
  .addEventListener("click", event => {
    const button = event.target.closest(
      "button[data-page]"
    );

    if (button) {
      navigate(button.dataset.page);
    }
  });

/**
 * The persona picker lives in the fixed sidebar, outside #view.
 * Demo switching is UI behavior only, never a security boundary.
 */

/**
 * Dynamic button and row actions.
 */
root.addEventListener("click", async event => {
  const button = event.target.closest(
    "button,[data-call]"
  );

  if (!button) return;
  if(button.dataset.fillDemoEmail){
    const el=root.querySelector("#qa-login-email");
    if(el)el.value=button.dataset.fillDemoEmail;
    return;
  }
  if(button.id==="qa-demo-logout"){
    if(state.running){notify("Finish the current evaluation before logging out.",true);return;}
    logoutDemoUser();state.selected=null;state.agentFilter="";state.overviewAgent="";render();return;
  }
  if(button.dataset.directorShare!==undefined){
    state.agentFilter="";state.selected=null;navigate("agents");return;
  }
  if(button.dataset.demoUserToggle){
    if(activeDemoUser().role!=="admin")return;
    try{const existing=demoUsers().find(x=>x.id===button.dataset.demoUserToggle);
      setDemoUserActive(button.dataset.demoUserToggle,!existing?.active);render();notify("Demo user status updated.");
    }catch(e){notify(e.message,true);}return;
  }
  if(button.id==="qa-check-health"){
    if(activeDemoUser().role!=="admin")return;
    state.apiStatus="Checking";render();
    try{const response=await fetch("/api/health",{cache:"no-store"});const data=await response.json();
       state.apiStatus=response.ok&&data.apiReady?"Gemini ready":"Not ready";
    }catch{state.apiStatus="Unavailable";}
    render();return;
  }
  if(button.dataset.configTab) {
    if (state.configTab === button.dataset.configTab) return;
    if (state.configTab === "rubric" && !captureCriterionDraft()) return;
    state.configTab = button.dataset.configTab;
    render();
    return;
  }

  if (button.dataset.refTemplate) {
    const type = button.dataset.refTemplate;
    const content = csvTemplate(type);
    const blob = new Blob([content], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "qaai-"+type+"-reference-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  if (button.dataset.refDelete !== undefined) {
    if (!confirm("Delete this stored reference version from this browser?")) return;
    try {
      state.references = saveReferenceLibrary(deleteReferenceDataset(state.references,button.dataset.refDelete));
      render();
      notify("Reference version deleted. Future assessments use active files only.");
    } catch(e) { notify(e.message,true); }
    return;
  }

  if (button.dataset.findingFilter) {
    state.findingFilter = button.dataset.findingFilter;
    render();
    return;
  }
  if (button.dataset.evidenceView) {
    state.evidenceView = button.dataset.evidenceView;
    render();
    return;
  }
  if (button.id === "pb-export-usage") {
    const blob = new Blob([exportUsageCsv()],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "qaai-personal-gemini-usage.csv"; anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    return;
  }
  if (button.dataset.resultTab) {
    state.resultTab = button.dataset.resultTab;
    render();
    return;
  }

  if (button.dataset.pageGo) {
    navigate(button.dataset.pageGo);
    return;
  }

  if (button.id === "clearHistory") {
    if(activeDemoUser().role!=="admin"){notify("Only the demo administrator can clear the shared browser history.",true);return;}
    if (state.running || !confirm("Permanently delete saved QA.MAFer.AI interaction history from this browser?")) return;
    void clearHistory().then(() => { state.calls = []; state.selected = null; state.evalProgress = null; clearProgress(typeof localStorage === "undefined" ? null : localStorage); render(); notify("Saved history cleared."); }).catch(e => notify(e.message, true));
    return;
  }

  if (button.dataset.dashboardAgent !== undefined) {
    state.overviewAgent = button.dataset.dashboardAgent;
    render();
    return;
  }

  if (button.dataset.agent !== undefined) {
    const agent = button.dataset.agent;
    const matches = scopedDemoCalls(activeDemoUser(),state.calls).filter(c=>c.agent===agent);
    if(!matches.length){notify("This agent is not available to this demo role.",true);return;}
    // Open the most recently imported completed interaction by default.
    // A selector inside Inspection makes other interactions accessible.
    const preferred = [...matches].reverse().find(c => c.status === "COMPLETE") || matches.at(-1);
    state.agentFilter = agent;
    state.selected = preferred?.key || null;
    state.resultTab = "scorecard";
    navigate("agents");
    revealAgentInspection();
    return;
  }

  if (button.dataset.call) {
    if(!scopedDemoCalls(activeDemoUser(),state.calls).some(c=>c.key===button.dataset.call))return;
    state.selected = button.dataset.call;
    render();
    return;
  }

  if (button.dataset.open) {
    if(!scopedDemoCalls(activeDemoUser(),state.calls).some(c=>c.key===button.dataset.open))return;
    state.selected = button.dataset.open;
    state.agentFilter = state.calls.find(c => c.key === state.selected)?.agent || "";
    state.resultTab = "scorecard";
    navigate("agents");
    revealAgentInspection();
    return;
  }
  if (button.id === "closeInspection") {
    state.selected = null;
    state.agentFilter = "";
    render();
    return;
  }

  if (button.id === "clearAgent") {
    state.agentFilter = "";
    render();
    return;
  }

  if (button.id === "clearBatch") {
    if(!canEvaluate(activeDemoUser()))return;
    if (state.running || !state.calls.length) return;
    if (!confirm("Remove all interactions, transcripts and saved QA assessments from this browser? This cannot be undone.")) return;
    void clearHistory().then(() => {
      state.calls = [];
      state.evalProgress = null;
      clearProgress(typeof localStorage === "undefined" ? null : localStorage);
      state.selected = null;
      state.agentFilter = "";
      state.search = "";
      state.overviewAgent = "";
      state.importFeedback = "";
      state.pasteDraft = "";
      state.message = "Batch removed";
      state.phase = "idle";
      render();
      notify("Batch removed. All browser-saved interactions and assessments have been cleared.");
    }).catch(e => notify("Could not remove batch: " + e.message, true));
    return;
  }

  if (button.id === "demo") {
    load(SAMPLE, "demo.txt");
    return;
  }

  if (button.id === "pasteLoad") {
    try {
      const pasted = $("#paste").value;
      state.pasteDraft = pasted;
      load(pasted, "paste.txt");
    } catch (err) {
      state.importFeedback = "Import failed: " + String(err.message || err);
      const label = root.querySelector("#import-feedback");
      if (label) label.textContent = state.importFeedback;
      notify(state.importFeedback, true);
    }
    return;
  }

  if (button.id === "all") {
    run("ready");
    return;
  }

  if (button.id === "one") {
    run("selected");
    return;
  }

  if (button.id === "rerunAll") {
    if (confirm("Reassess every evaluable interaction? Previous completed assessments will be retained for comparison.")) run("all");
    return;
  }
  if (button.id === "rerunAgent") {
    if (state.agentFilter && confirm("Reassess all evaluable interactions for " + state.agentFilter + "? Previous completed assessments will be retained.")) run("agent");
    return;
  }

  if (button.id === "stopAfter") {
    if (!state.running) return;
    state.stopAfterCurrent = true;
    state.message = "Stop requested — finishing the current interaction; pending calls will not start";
    // Update the button and progress area immediately so the request is visible
    // while the in-flight Gemini request is still processing.
    render();
    paintProgress();
    notify("Stop requested. The current assessment will finish; pending calls stay ready.");
    return;
  }

  if (button.id === "stop") {
    state.controller?.abort();
    return;
  }

  if (
    button.id === "json" ||
    button.id === "csv"
  ) {
    download(button.id);
    return;
  }

  if (button.dataset.criterion) {
    if (!captureCriterionDraft()) return;
    // Re-selecting the open parameter collapses its editor.
    state.criterion = state.criterion === button.dataset.criterion
      ? null : button.dataset.criterion;
    render();
    return;
  }

  if (button.id === "saveRubricAll") {
    if (!captureCriterionDraft()) return;
    const model = root.querySelector("#model");
    const globalInstructions = root.querySelector("#global");
    if (model) state.rubric.model = model.value;
    if (globalInstructions) state.rubric.instructions = globalInstructions.value;
    for (const input of root.querySelectorAll("[data-phrase-list]")) {
      state.rubric.rules[input.dataset.phraseList] = input.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    }
    save("All rubric changes saved. New assessments use this revision.");
    return;
  }

  /**
   * Save deterministic rules.
   */
  if (button.id === "saveRules") {
    const entries = [...root.querySelectorAll("[data-rule-value]")];
    const deterministic = entries.map(input => ({
      id: input.dataset.ruleValue,
      value: input.value.trim() === "" ? NaN : Number(input.value),
      enabled: !!root.querySelector('[data-rule-enabled="' + input.dataset.ruleValue + '"]')?.checked,
      operator: root.querySelector('[data-rule-operator="' + input.dataset.ruleValue + '"]')?.value || "<="
    }));
    if (deterministic.some(x => !Number.isFinite(x.value) || x.value < 0 || x.value > 1000000)) {
      notify("Enter a valid non-negative numeric threshold for every rule.", true);
      return;
    }
    const first = deterministic.find(x => x.id === "greeting_time");
    const fallback = deterministic.find(x => x.id === "fallback_greeting");
    if (!Number.isInteger(first.value) || !Number.isInteger(fallback.value) ||
        first.value > 60 || fallback.value > 60 || fallback.value < first.value) {
      notify("Greeting thresholds must be whole seconds between 0 and 60; fallback cannot be shorter.", true);
      return;
    }
    state.rubric.rules.deterministic = deterministic;
    state.rubric.rules.greet7 = first.value;
    state.rubric.rules.greet10 = fallback.value;
    state.rubric.rules.greetingTerms = $("#rTerms").value
      .split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    save("Deterministic rules saved. Only connected rules are executed; pending rules do not change scoring.");
    return;
  }

  /**
   * Save evaluator instructions and model.
   */
  if (button.id === "saveModel") {
    const value = $("#global").value.trim();

    if (
      !value ||
      value.length > 5000
    ) {
      notify(
        "Instructions must be 1–5000 characters.",
        true
      );
      return;
    }

    state.rubric.instructions = value;
    state.rubric.model =
      $("#model").value;

    save(
      "Evaluator model and instructions saved."
    );
  }
});

/**
 * File upload and criterion enable/disable.
 */
root.addEventListener(
  "change",
  async event => {
    const target = event.target;
    if(target.id==="qa-demo-user"){
      if(state.running){notify("Switch personas after evaluation completes.",true);render();return;}
      try{chooseDemoUser(target.value);const user=activeDemoUser();
        state.selected=null;state.agentFilter=user.role==="agent"?user.agent:"";state.overviewAgent=user.role==="agent"?user.agent:"";
        state.page=user.role==="cc_lead"?"portfolio":user.role==="admin"?"admin":"overview";
        state.resultTab="scorecard";render();
      }catch(e){notify(e.message,true);}return;
    }
    if(target.id==="qa-director-bu"){
      state.directorBU=target.value;state.directorBrand="all";render();return;
    }
    if(target.id==="qa-director-brand"){
      state.directorBrand=target.value;render();return;
    }
    if (target.hasAttribute("data-ref-upload")) {
      const file = target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 500000) throw Error("CSV file exceeds 500 KB");
        if (!/\.csv$/i.test(file.name)) throw Error("Upload a .csv file");
        state.references = saveReferenceLibrary(importReferenceDataset(
          state.references,target.dataset.refUpload,file.name,await file.text()
        ));
        render();
        notify(file.name+" imported and activated. New assessments use the updated references.");
      } catch(e) {
        notify("Reference import failed: "+String(e.message||e),true);
        target.value="";
      }
      return;
    }

    if (target.hasAttribute("data-ref-enabled")) {
      try {
        state.references=saveReferenceLibrary(toggleReferenceDataset(
          state.references,target.dataset.refEnabled,target.checked
        ));
        render();
        notify("Active references saved. New assessments use the updated library.");
      } catch(e) { notify(e.message,true); }
      return;
    }

    if (target.id==="qa-import-rubric") {
      const file=target.files?.[0];if(!file)return;
      try {
        if(file.size>750000)throw Error("Rubric JSON exceeds 750 KB");
        const obj=JSON.parse(await file.text());
        const rubric=obj?.rubric || obj;
        if(!rubric || !Array.isArray(rubric.criteria) || !rubric.criteria.length ||
            rubric.criteria.length>27 || !rubric.rules ||
            !Array.isArray(rubric.rules.deterministic) ||
            rubric.criteria.some(c=>!c || typeof c.id!=="string" ||
              !Array.isArray(c.checkpoints)||c.checkpoints.length>12))
          throw Error("Not a supported QA rubric JSON");
        if(!confirm("Replace the personal demo rubric with this backup? Existing rubric settings in this browser will be overwritten."))return;
        saveRubric(rubric);
        state.rubric=loadRubric();
        state.criterion=state.rubric.criteria[0]?.id||"greet7";
        render();notify("Rubric imported. Gemini remains the evaluation provider; check enabled criteria and save before assessing.");
      } catch(e) {notify("Rubric import failed: "+String(e.message||e),true);}
      return;
    }
    if (target.id==="qa-import-reference-library") {
      const file=target.files?.[0];if(!file)return;
      try {
        if(file.size>3000000)throw Error("Reference JSON exceeds 3 MB");
        const obj=JSON.parse(await file.text());
        const library=obj?.library || obj;
        if(!library || !Array.isArray(library.datasets) || library.datasets.length>30 ||
          library.datasets.some(d=>!d || !Array.isArray(d.rows) || typeof d.type!=="string"))
          throw Error("Not a versioned reference library JSON");
        const normalized=normalizeReferenceLibrary(library);
        if(normalized.datasets.length!==library.datasets.length)
          throw Error("One or more library datasets have invalid structure");
        if(!confirm("Replace the personal demo reference library with this backup? The imported data will remain in this browser."))return;
        state.references=saveReferenceLibrary(normalized);
        render();notify(state.references.datasets.length+" reference dataset versions imported locally.");
      }catch(e){notify("Reference library import failed: "+String(e.message||e),true);}
      return;
    }
    if (target.id === "file") {
      const file = target.files?.[0];

      if (!file) return;

      if (file.size > 8 * 1024 * 1024) {
        notify(
          "Maximum file size is 8 MB.",
          true
        );
        return;
      }

      try {
        load(
          /\.docx$/i.test(file.name) ? await readDocxTranscript(file) : await file.text(),
          file.name
        );
      } catch (err) {
        state.importFeedback = "Import failed: " + String(err.message || err);
        const label = root.querySelector("#import-feedback");
        if (label) label.textContent = state.importFeedback;
        notify(state.importFeedback, true);
      }

      return;
    }

    if (target.id === "inspection-interaction") {
      const chosen = state.calls.find(c => c.key === target.value && c.agent === state.agentFilter);
      if (!chosen) return;
      state.selected = chosen.key;
      state.resultTab = "scorecard";
      render();
      return;
    }

    if (target.id === "report-period") { state.period.mode = target.value; render(); return; }
    if (target.id === "period-from" || target.id === "period-to") {
      state.period[target.id === "period-from" ? "from" : "to"] = target.value; render(); return;
    }
    if (target.id === "overview-agent-filter") {
      state.overviewAgent = target.value;
      render();
      return;
    }

    if (target.id === "filter") {
      state.agentFilter = target.value;
      filterRows();
      return;
    }

    if (target.hasAttribute("data-enabled")) {
      const id = target.dataset.enabled;
      if (!setCriterionEnabled(state.rubric, id, target.checked)) return;

      // Make both qualitative and linked numeric checkboxes respond immediately.
      // Do not re-render: the user might have unsaved instruction/weight edits.
      const criterion = state.rubric.criteria.find(c => c.id === id);
      if (id === state.criterion) {
        root.querySelectorAll("[data-anchor-enabled]").forEach(input => {
          const child = criterion.checkpoints?.[Number(input.dataset.anchorEnabled)];
          input.checked = !!child?.enabled;
        });
        root.querySelectorAll("[data-rule-enabled]").forEach(input => {
          const child = state.rubric.rules.deterministic?.find(r => r.id === input.dataset.ruleEnabled);
          input.checked = !!child?.enabled;
        });
      }
      target.indeterminate = false;
      updateParentSelectionIndicator(id);
      return;
    }

    if (target.hasAttribute("data-anchor-enabled") || target.hasAttribute("data-rule-enabled")) {
      const criterion = state.rubric.criteria.find(c => c.id === state.criterion);
      if (!criterion) return;
      if (target.hasAttribute("data-anchor-enabled")) {
        const child = criterion.checkpoints?.[Number(target.dataset.anchorEnabled)];
        if (child) child.enabled = target.checked;
      } else {
        const child = state.rubric.rules.deterministic?.find(r => r.id === target.dataset.ruleEnabled);
        if (child && linkedRules(criterion.id).includes(child.id)) child.enabled = target.checked;
      }
      const activeQualitative = criterion.checkpoints?.some(a => a.enabled === true);
      const activeNumeric = linkedRules(criterion.id).some(id =>
        state.rubric.rules.deterministic?.some(r => r.id === id && r.enabled === true)
      );
      // A partial selection keeps the parent active, but only chosen checks run.
      criterion.enabled = !!(activeQualitative || activeNumeric);
      updateParentSelectionIndicator(criterion.id);
      return;
    }
  }
);

/**
 * Live queue search.
 */
// QA-PASTE-AUTO | Debounce transcript paste; do not auto-run AI or disrupt typing.
let pasteImportTimer = null;
root.addEventListener("paste",event=>{
  if(event.target.id!=="paste"||state.running||!canEvaluate(activeDemoUser()))return;
  const plain=event.clipboardData?.getData("text/plain")||"";
  const html=event.clipboardData?.getData("text/html")||"";
  if(!plain&&!html)return;
  const converted=normalizeClipboardHTML(plain,html);
  // For a regular paste, let native text input and debounced parsing operate.
  if(!html && converted===plain)return;
  event.preventDefault();
  state.pasteDraft=converted;
  try{load(converted,"paste.txt");}
  catch(e){state.importFeedback="Could not parse pasted transcript: "+String(e?.message||e);
    const feedback=root.querySelector("#import-feedback");
    if(feedback)feedback.textContent=state.importFeedback;
    notify(state.importFeedback,true);}
});

root.addEventListener("input", event => {
  if (event.target.id === "paste") {
    if(!canEvaluate(activeDemoUser()))return;
    state.pasteDraft = event.target.value;
    const characterCount = root.querySelector("#paste-count");
    if (characterCount) characterCount.textContent = state.pasteDraft.length.toLocaleString("en-US");
    if (pasteImportTimer) clearTimeout(pasteImportTimer);
    const snapshot = state.pasteDraft;
    if (state.running || !snapshot.trim()) return;
    pasteImportTimer = setTimeout(() => {
      if (state.running || state.pasteDraft !== snapshot) return;
      try {
        const parsed = parseExport(normalizeTranscriptText(normalizeClipboardPlain(snapshot)), "paste.txt");
        if (!parsed.some(c=>c.status==="READY")) return;
        load(snapshot,"paste.txt");
      } catch (err) {
        const feedback = root.querySelector("#import-feedback");
        if (feedback) feedback.textContent = "Waiting for a valid speaker-labelled transcript.";
      }
    }, 650);
  }
  if (event.target.id === "search") {
    state.search = event.target.value;
    filterRows();
  }
});

root.addEventListener("submit",event=>{
  if(event.target.id==="qa-demo-login"){
    event.preventDefault();
    const form=new FormData(event.target);
    try{
      const user=loginDemoEmail(form.get("email"));
      state.page=user.role==="admin"?"admin":user.role==="cc_lead"?"portfolio":"overview";
      state.selected=null;state.agentFilter=user.role==="agent"?user.agent:"";
      state.overviewAgent=user.role==="agent"?user.agent:"";
      render();scrollPageToTop(window,document);
    }catch(e){notify(String(e?.message||e),true);}
    return;
  }
  if(event.target.id!=="qa-demo-user-form")return;
  event.preventDefault();
  if(activeDemoUser().role!=="admin")return;
  const fields=new FormData(event.target);
  try{createDemoUser({name:fields.get("name"),email:fields.get("email"),role:fields.get("role"),businessUnit:fields.get("businessUnit"),agent:fields.get("agent")});
    render();notify("Demo user onboarded.");}catch(e){notify(String(e.message||e),true);}
});
render();

// First-run fixtures are explicitly synthetic. Do not replace user imports or
// real local history. Records never leave the browser until the user evaluates.
const DEMO_SEED_KEY = "qaai-synthetic-seed-v1";
void loadHistory().then(async calls => {
  const restored = calls.map(c => c.status === "RUNNING" ? { ...c, status: "READY" } : c);
  // A fresh import wins over late IndexedDB hydration.
  state.calls = state.calls.length ? mergeImported(restored, state.calls).calls : restored;

  if(!state.calls.length && localStorage.getItem(DEMO_SEED_KEY)!=="done") {
    try {
      const response=await fetch("/demo/share-synthetic-transcripts.json",{cache:"no-store"});
      if(response.ok) {
        const data=await response.json();
        const fixtureCalls=parseExport(JSON.stringify(data),"share-synthetic-transcripts.json");
        if(Array.isArray(fixtureCalls) && fixtureCalls.some(c=>c.status==="READY")){
          state.calls=mergeImported(state.calls,fixtureCalls).calls;
          await persist();
        }
      }
    } catch(e) { console.warn("Synthetic demo transcripts were not seeded",String(e?.message||e)); }
    localStorage.setItem(DEMO_SEED_KEY,"done");
  }

  if(!state.references?.datasets?.length && localStorage.getItem("qaai-synthetic-library-seed-v1")!=="done") {
    try {
      const response=await fetch("/demo/share-reference-library.json",{cache:"no-store"});
      if(response.ok){
        const library=normalizeReferenceLibrary(await response.json());
        if(library.datasets.length)state.references=saveReferenceLibrary(library);
      }
    } catch(e) { console.warn("Synthetic demo references were not seeded",String(e?.message||e)); }
    localStorage.setItem("qaai-synthetic-library-seed-v1","done");
  }

  state.selected = state.selected && state.calls.some(c => c.key === state.selected)
    ? state.selected : state.calls[0]?.key || null;
  render();
}).catch(e => notify("Local history unavailable: " + e.message, true));
