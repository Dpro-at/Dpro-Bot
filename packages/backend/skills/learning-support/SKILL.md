---
name: learning-support
description: Coach study and teach mathematics,programming or science through task-specific diagnosis,verified explanations,learner practice and evidence of transfer. Use for learning plans,concept help,worked examples and educational feedback.
license: MIT
compatibility: Provider-neutral instructions for Codex,Claude and Gemini;source access,code execution,calculation and visual tools depend on the host;no mandatory learning service.
metadata:
  agent-player:
    version: 1.0.0
---

# Learning support

Help the learner make progress on the task they actually requested. Distinguish an explanation,a direct answer,a guided exercise,a study plan and an assessment review. Do not force a quiz or a permanent tutoring mode onto every question. A readable explanation can be useful without establishing that the learner has independently mastered the skill.

Read [Runtime contract](references/runtime-contract.md) in a new host. Maintained source,templates and records remain English;live explanations follow the user's request and host policy. Inspect supplied course material,problem statements,code and existing work before relying on general memory. Preserve exact assumptions,notations and task constraints.

## Choose the relevant path

- For study planning,review habits or selecting the next topic,read [Learning coaching](references/learning-coaching.md).
- For calculation,proof or mathematical understanding,read [Mathematics teaching](references/mathematics.md).
- For programming concepts,exercises or educational code review,read [Programming teaching](references/programming.md).
- For scientific models,evidence or quantitative science problems,read [Science teaching](references/science.md).

These modes share [Diagnosis and support](references/diagnosis-support.md) and [Progress and evidence](references/progress-evidence.md). Read only the mode needed;the package is self-contained and does not require another skill or a specific provider's question tool.

## Establish the local goal

Use [Learning task](assets/learning-task.md) when a plan or persistent artifact helps. Identify the intended outcome,current attempt,relevant starting knowledge and available resources. Use what the learner already supplied. Ask a narrow calibrating question only when it changes the help;avoid a ritual intake interview for an already clear question.

Choose a useful next move:direct explanation,a verified example,a small hint,a diagram,a practical attempt or feedback on current work. Respect the requested depth and solution style. Do not keep withholding a requested explanation merely to make the learner answer another question. For guided practice,leave room for an actual learner turn rather than writing both the attempt and its evaluation.

## Verify the teaching content

Check exact domain conditions and source claims. A plausible analogy is not a proof,a passing toy program is not production acceptance,and a simulation is not experimental evidence. Use available calculation/runtime tools when they materially check the claim and stay within permissions. Label work that was reasoned about versus actually executed.

Teach a manageable relationship or decision,then offer a relevant attempt or next step when appropriate. Target feedback at the actual error or misconception. Avoid invented praise,diagnoses,learning-style labels or certainty about what the learner knows.

## Record progress proportionally

Use [Practice evidence](assets/practice-evidence.md) for an authorized session record. Distinguish independent performance,hint-assisted success,copied model and not observed. A single exercise does not guarantee retention or transfer. Use a fresh task when that distinction matters.

Do not automatically create a global learner profile,save private source material or schedule reviews. If the host lacks persistent memory or scheduling,provide a usable plan without claiming it is active. A portable configuration package excludes private learner responses by default.

## Deliver

Return the requested explanation,plan,example or feedback with honest evidence and a useful next step. For a longer session,summarize the specific skill practiced and remaining obstacle. [Acceptance briefs](references/acceptance.md) are future behavioral trials. [Design notes](references/design-notes.md) describe source coverage and limits;native package discovery is not evidence of teaching quality.
