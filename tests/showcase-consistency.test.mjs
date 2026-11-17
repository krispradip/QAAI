import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultRubric } from "../public/js/config.js";
import { overall } from "../public/js/engine.js";
import { themeScores } from "../public/js/presentation-themes.js";
import { makeShowcaseCalls } from "../public/js/showcase-data.js";
import { studio } from "../public/js/ui.js";

const rubric=defaultRubric();
const calls=makeShowcaseCalls(rubric);
const awad=calls.find(c=>c.agent==="Awad Osman");

test("showcase agent score is derived from displayed weighted rubric findings",()=>{
  assert.ok(awad);
  const expected=overall(awad.findings,rubric);
  assert.deepEqual(awad.score,expected);
  assert.equal(awad.score.score,96);
  assert.notEqual(awad.score.score,50);
  const closing=themeScores(awad,rubric).find(g=>g.name==="CALL CLOSING");
  assert.equal(closing.finalScore,67);
  assert.equal(closing.scored,3);
});

function exampleState(selectedCalls) {
  return {
    calls:selectedCalls,
    selected:selectedCalls[0]?.key||null,
    running:false,phase:"idle",message:"Ready",
    search:"",agentFilter:"",evalProgress:null,rubric
  };
}
test("empty and single-transcript Studio never show batch headings",()=>{
  for(const entries of [[],[awad]]) {
    const html=studio(exampleState(entries));
    assert.match(html,/LIVE EVALUATION PROGRESS/);
    assert.match(html,/INTERACTION ACTIONS/);
    assert.doesNotMatch(html,/LIVE BATCH PROGRESS|BATCH ACTIONS/);
    if(entries.length)assert.match(html,/Remove interaction/);
  }
});
test("multi-interaction Studio retains batch actions",()=>{
  const html=studio(exampleState(calls.slice(0,2)));
  assert.match(html,/LIVE BATCH PROGRESS/);
  assert.match(html,/BATCH ACTIONS/);
});
test("showcase script demonstrates one transcript and no hardcoded 50 score",()=>{
  const html=readFileSync(new URL("../public/showcase.html",import.meta.url),"utf8");
  const app=readFileSync(new URL("../public/js/app.js",import.meta.url),"utf8");
  assert.match(html,/Open the AI Evaluation Studio/);
  assert.doesNotMatch(html,/Open the actual AI Evaluation Studio|12 complete interactions|finalized 50%|run the batch/);
  assert.match(html,/a\.prepareStudio\(\)/);
  assert.match(app,/state\.calls=demoTranscript\?\[asReady\(demoTranscript\)\]:\[\]/);
});
