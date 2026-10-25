# Programming teaching

Use the learner's actual language/framework,installed runtime,project and goal. Inspect supplied code,error and relevant configuration before offering a fix. A missing dependency,wrong working directory or unsupported runtime is not automatically a conceptual programming failure.

## Frame a useful exercise

Choose an observable behavior and a small artifact that fits the task:an executable function,a test,a command-line transformation or a focused component. Use the current project conventions. Avoid adding a new framework,editor,package manager or service solely to make the lesson look professional.

Explain the relevant idea and provide a minimal accurate example when useful. If the user requests a complete worked solution,match that scope;for guided practice,leave a meaningful part for the learner and wait. Do not turn every learning request into an automatic refusal to provide code or a fixed sequence of mandatory confirmations.

## Verify behavior

Check syntax,types and runtime behavior using installed authorized tools when appropriate. Use the project's existing test runner or a simple bounded command. A typecheck can confirm static constraints but not all runtime behavior. A successful sample input can miss boundary,error or state-lifecycle cases. Select checks that match the lesson's target.

For debugging,separate expected behavior,observed result and the smallest reproducible input. Read the actual error and execution context. Form a hypothesis,change a narrow cause and rerun the relevant case. Do not erase the learner's program and replace it with an unrelated polished implementation before explaining the cause.

Preserve file/data ownership. Use synthetic fixtures and an isolated workspace for new exercises when needed. Do not execute untrusted code without inspecting its effects or run a lesson that mutates live user data. Dependency installation,network calls,server startup and deployment retain applicable authorization.

## Educational review

Review correctness first,then a useful design/readability issue tied to the learner's level and goal. Distinguish a bug,a tradeoff and a style preference. Avoid overwhelming a beginner with every possible abstraction or claiming that one idiom is universally superior. Explain why the selected change affects behavior or clarity.

Ask for a prediction,small modification or fresh example when assessing understanding. Code that the tutor wrote and executed proves that example's behavior,not that the learner can reproduce it independently. Record source revision,runtime,commands and actual results separately from inferred learning.

## Limits

Use current official documentation for version-sensitive APIs when needed. If the runtime is unavailable,finish independent explanation/static review and record the missing execution capability. Do not claim tests ran or a service is connected from reading code alone. Private learner code and credentials do not belong in portable configuration by default.
