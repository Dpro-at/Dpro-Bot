# Design notes and comparison

Complete selected entrypoints reviewed:

- [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/small-business/skills/inventory-planner/SKILL.md),commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`.
- [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/operations/skills/process-doc/SKILL.md),commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`.
- [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/operations/skills/status-report/SKILL.md),commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`.

Private pins/file hashes retained. Linked reference/connector trees were not exhaustively reviewed. Original formulas/default windows,templates,examples,text and integration recipes are not redistributed.

The inventory source provides concrete demand/cover/reorder reporting. Our independently authored mode adds allocation/location/unit and movement reconciliation,eligible inbound timing,critical/intermittent-item judgment and declared policy constraints. It avoids universal fixed velocity/cover windows,never-buy zero-velocity rules and false precise dates. It has less prewired purchasing automation and no claim of better forecasting or purchasing outcomes.

The process source is a concise SOP/RACI scaffold. Our full mode adds observed-versus-documented state,metric/population definitions,bottleneck hypotheses,control tradeoffs and bounded pilot/closure evidence. The project source is a readable status scaffold. Our mode adds stable IDs,baseline/dependency/current-state reconciliation,estimate versus commitment and deliverable acceptance. It does not automatically publish wiki pages,assign staff,order stock or contact stakeholders.

No generic counting/keyword helper was added:it would not prove actual inventory demand,process adoption or project acceptance. Use existing data/spreadsheet/document workflows for the requested task and native system readback when authorized. English/resource checks,native parsing/discovery and isolated library trials are preparation evidence;actual model/domain/live-operation outcomes remain separate. No measured upstream superiority is claimed.

## Purchasing/scheduling extension1.1.0

Complete selected entrypoints reviewed:

- [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/small-business/skills/restock/SKILL.md),commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`.
- [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/sales/skills/schedule-meeting/SKILL.md),commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`.

Purchasing source links a buy decision to later bill matching. Our independent extension reuses inventory policy and adds sourcing,total terms,order lifecycle and receiving exceptions without copying fixed velocity defaults or repeated approval rituals. Scheduling source offers calendar/CRM closure. Our general mode adds timezone/DST,recurrence edit scope,notification/readback and unknown-calendar semantics without automatic CRM logging or vendor-specific limitations. No source text/templates/recipes copied;less connector automation is a tradeoff,no actual purchase/calendar acceptance claim.

[Google Calendar concepts](https://developers.google.com/workspace/calendar/api/concepts/events-calendars) informed timed/all-day and recurrence identity distinctions. Exact host/provider schema still governs. No calendar/order/supplier/ledger action ran.

## Additional specialty workflows

Original project-authored extensions: Business analysis, Project management, Executive assistance. Reuse the existing package source, authority and verification contract. Each branch adds a distinct decision/work product, row-based output record and three future task briefs. No external skill text or licensed adaptation was copied; no domain/model/live acceptance is claimed from resource authoring.
