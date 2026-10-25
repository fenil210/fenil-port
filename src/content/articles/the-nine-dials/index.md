---
title: "The Nine Dials"
description: "Nine decisions define most AI systems before you write a single line of model interaction code."
date: 2026-05-01
x: https://x.com/fenillramoliya/status/2050197954863255892
cover: ./cover.jpg
coverAlt: "Series card: Field Notes: AI Engineering, 1.3, Design Tradeoffs."
series: "1.3"
---
Nine decisions define most AI systems before you write a single line of model interaction code. Not features. Not prompts. Architectural like how much autonomy to grant, whether memory persists, when to use agents at all and that propagate through everything built after them. Get them wrong early and you're not debugging logic. You're dismantling walls.

These decisions look like switches. RAG or fine-tuning. Hosted or self-hosted. One agent or five. They're not. They're dials with a range, and the right setting on each one depends on your product constraints, your scale, and what failure actually costs you. A setting that's right at launch might be wrong at 10x traffic. That's not a mistake. That's just what building with incomplete information looks like.

Here are the nine you'll hit constantly.

**The first**: do you even need an agent? A deterministic with fixed steps, no model guessing what to do next is cheaper, faster to debug, and considerably more predictable. If you can sketch the full logic as a decision tree before writing code, that's what you should build. Agents earn their complexity when the task is genuinely open-ended and the next step can't be known in advance. Most tasks are not that. I've seen teams wire up ReAct loops for something that could have been a three-step Python function. (The architecture diagram looked great, though.) More can be read from [here](/articles/workflow-agent-or-multi-agent/)

Once you decide you need an agent, the **next dial** is how many. A well-designed single agent handles more than people expect. Multi-agent makes sense when work is genuinely parallelizable, when you want role like one agent researches, another drafts, a third or when you need adversarial structure to catch errors before they surface to users. It does not make sense because the system feels more capable in theory. Multi-agent amplifies whatever your single-agent design already is. If it's fragile, multi-agent makes it fragile faster. And if you go multi-agent, start with a centralized orchestrator: one agent routing all others. It's simpler to reason about and simpler to fix when something breaks.

**Third dial:** where does knowledge come from? Long context, RAG, and fine-tuning are three different tools for three different problems. Long context works when the corpus is small, stable, and fits in the window without degrading coherence. RAG works when the knowledge base is large, changes frequently, or needs source attribution. Fine-tuning works when you want to change how the model behaves, not what it knows. That last point trips up a lot of builds. Fine-tuning is not a knowledge update. Think of it as a few days of role-specific training for someone who already spent years in school: it shapes their working style, not their memory. If you want the model to know current data, give it the document. If you want it to always write in a specific format or voice, train on examples. A lot of production systems use all three in combination. Not one as a substitute for the others.

**Fourth:** hosted APIs or self-hosted models? Hosted is the right default. Low setup cost, managed infrastructure, access to strong models without a GPU bill before you've validated anything. Self-hosted becomes worth the investment when volume makes per-token pricing unsustainable, when your data legally or contractually cannot leave your infrastructure, or when you need an open-weight model the providers don't offer. Run the numbers before you move. The crossover point is higher than most teams expect.

**Fifth** is prompting architecture. Packing a complex multi step task into one big prompt is quick to set up, but a nightmare to debug. When it starts breaking at scale, which complex prompts usually do, you end up digging through thousands of tokens just to figure out where things went off track. Decomposing the task into steps, each with a clean focused prompt, makes the system slower to build initially and much faster to fix afterward. A related choice: where does logic live? Prompt logic is flexible but not auditable. Code logic is deterministic and testable. Symbolic logic, like formal rules or schema validation, is verifiable but rigid. Most production systems use all three. Code handles orchestration, the model handles generation and judgment, and rules handle validation. Use the model for what only models can do.

**Sixth:** how does execution flow? Synchronous calls block until the response returns. That's fine for tasks that complete in under a few seconds. For anything longer, blocking the user is a UX decision you made by default rather than on purpose. Async execution makes sense for long running agent work. You fire off the task and come back to it when it is done. A related question: do you generate once or refine iteratively? Single-shot is cheap. Iterative refinement (generate, critique, revise) produces better output at higher cost. The right choice depends on whether your quality bar actually requires that loop. Not every task does.

**Seventh:** memory. Context stuffing is just dumping everything the agent needs into the prompt. It works fine for short lived, one off tasks.. It degrades at scale: window limits, cost-per-call, coherence loss as the context fills. Durable memory means persisting information externally and retrieving what's relevant per call. Harder to build, but it's the only architecture that holds up over long-running agents, multi-session workflows, or anything that needs to remember what happened three days ago. We covered a brief on context windows in [article 02](/articles/vocabulary-as-a-design-primitive/). Memory architecture is where that constraint becomes a design decision you can't defer.

**Eighth** is the most consequential dial: autonomy. How much can the agent do without a human reviewing the action first? Full autonomy is fast. It's also how an agent ends up sending an unreviewed customer-facing message, making an irreversible API call, or deleting a record you needed. The right frame isn't how much can be automated. It's: is this action reversible, and what happens when it goes wrong? Low reversibility or high failure cost means a human approval gate. High reversibility and low failure cost means the agent can run freely. Start with gates on every irreversible action. Remove them incrementally as you accumulate evidence the system handles them correctly. Full autonomy is earned through observation, not assumed from confidence.

**Ninth**, and split across two sub-dials: validation and observability. Deterministic guardrails like rule based checks, schema validation, and regex filters are fast, cheap, and you can trust them. They catch the failure modes you know about. Model-based evaluation catches novel failures that rules can't anticipate but costs more per call and runs slower. Run both: rules as the first layer, model evaluation for what slips through. On observability: more logging means better debugging, better auditing, and better optimization. It also means more storage, more latency, and more code to maintain. The minimum is simple. Log every LLM call, every tool call, every final output. No shortcuts there. How far you go beyond that depends on how expensive a production incident is for you.

Nine dials. None of them have a fixed correct position. They shift as your system grows, as your users show you failure modes you didn't anticipate, and as the cost of a bad decision compounds. The teams that revisit these dials periodically tend to ship more reliable systems than the ones that set them at launch and treat them as resolved.

Which of these nine are you least confident about in what you're building right now?

*Previously in the Field-notes AI Engineering series:* [1.2 — Core Vocabulary: The Words That Define the Field](/articles/vocabulary-as-a-design-primitive/)



*Up next in 1.4: Tokens are the unit of cost, speed, and limit in every LLM system. They're also weirder than you'd expect.*
