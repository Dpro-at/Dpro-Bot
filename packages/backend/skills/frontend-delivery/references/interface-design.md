# Interface design and handoff mode

## Establish the requested outcome

Identify the user, task, current product structure, platform, actual content/data and requested scope. A UI design task can deliver a flow/specification without automatically implementing app code. A request for implementation still needs a working flow, not only a mockup. Preserve existing approved navigation, design tokens, components and user choices unless a scoped change is justified.

Inspect the current system before adding another pattern. Reuse a component whose semantics and states fit the task. If a new pattern is necessary, explain the missing behavior and define how it fits the existing system. Do not create a parallel style or control solely because it is visually fashionable.

## Design the full state model

Map entry, primary action, feedback, cancellation, recovery and completion. Define loading, empty, error, partial, offline/reconnecting and permission states where relevant. Distinguish a proposed action, pending submission and durable success. A successful visual transition does not prove a backend effect.

Specify the actual information hierarchy and controls with real content lengths. Test narrow/large contexts, relevant text direction/language, keyboard route and long or missing values. A screenshot at one ideal size cannot establish a robust interface. Keep essential actions discoverable without relying on hover alone.

## Interaction and accessibility

Use semantic controls and the existing design system's behavior. Define focus movement, dismissal/return, error association, validation timing and what assistive technology should perceive. Avoid adding ARIA to disguise an incorrect control. A design handoff can specify expectations, but actual implementation requires inspection and relevant checks.

Honor reduced-motion preferences and preserve immediate feedback for frequent interactions. Motion can explain state without delaying a repeated action; do not force an elaborate reveal into every control. Numeric contrast checks or a component library's existence do not establish full accessibility.

## Components and evidence

Document purpose, variants, states, inputs/outputs, tokens, interaction and failure handling for the component/pattern actually changed. Keep unavailable backend/tool capabilities explicit. Do not present fake statistics, invented users or simulated save feedback as real product state. Sample data can support a labeled demonstration; the final integration still needs its actual contract.

## Handoff and validation

Deliver the actual flow/specification or implementation requested, with state transitions, real-content examples, reusable components, relevant data contract and acceptance scenarios. A proposed visual direction, approved design, source implementation, tested build and deployed app are different states. Identify what was actually inspected or executed.

For a change to an existing pattern, assess consumers and migration needs rather than silently breaking old behavior. Preserve unrelated app flows and user data. A design-system audit should report concrete issues and coverage; an invented aggregate score does not prove completeness.

Acceptance cases: existing approved components are reused where suitable; a failed save remains recoverable and does not show durable success; keyboard/focus and narrow/long-content states are specified or actually tested; a design-only request does not trigger app deployment; a source implementation is not declared live without evidence. Record real artifacts and checks when exercising them.
