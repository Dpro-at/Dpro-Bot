# Lifecycle and restoration

Identify the actual lifecycle owner: process, scene/activity, screen/component, foreground task or background job. These scopes overlap but are not interchangeable. Follow the installed framework and platform version; an observed navigation unmount may not mean the operating system terminated the process.

## State classification

Separate short-lived presentation state, a recoverable draft, authoritative persisted data and secrets. Use small restoration references where supported, then rehydrate under the current account and permission. A retained in-memory view model does not establish survival after process death. A disk record survives different events than a saved-state bundle; choose storage by the required recovery contract.

Persist important draft progress through the existing mechanism at appropriate boundaries, rather than relying on a final shutdown callback. The OS may terminate a background process without that callback. Define what the user can recover after background, process death, explicit logout, app upgrade and unsupported schema. Avoid restoring privileged content before current identity/access is established.

## Asynchronous work

Give requests, subscriptions, sensors and playback an owner. Cancel or suspend work when its owner no longer needs it, while preserving domain operations that the application intentionally continues. Do not universally close every resource on every inactive transition: navigation, media and platform-specific background behavior require the real feature contract.

Prevent a late callback from writing to a new screen/account. Revalidate session and object identity before applying a result. Track a durable operation reference when an external write can outlive the screen. Closing the view does not prove the remote effect was canceled.

## Background work

Use the platform-supported mechanism only when the requested feature needs background execution and the project already authorizes the capability. Verify current restrictions, entitlements, task types and scheduling semantics. Do not promise exact recurring execution when the OS can defer or omit work. Provide an appropriate foreground reconciliation path for pending work.

Battery, network, power mode, app restrictions and OS version can change behavior. Record which conditions were exercised. A foreground timer cannot demonstrate background reliability, and a local task registration does not prove the OS later ran it.

## Verification

Use a disposable draft and named account. Change content, navigate/background/resume, then separately simulate or observe process death with the intended platform tooling. Reopen and confirm the required state rather than only the current route. Test logout/account switch so restored state does not expose the prior account's data. Record tool commands, OS/runtime and what kind of termination actually occurred.

Official Android process lifecycle reference: https://developer.android.com/guide/components/activities/process-lifecycle . The package does not prescribe that API for other platforms.
