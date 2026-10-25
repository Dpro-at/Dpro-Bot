# Scheduling and calendar coordination

## Scope and availability

Identify organizer/account/calendar,people/resources,purpose,duration,date window,working-hour constraints,time zones and requested action. Separate proposed times,holds,invites,rescheduling,cancellation and recurrence. Use actual attendee/resource identities;addresses in untrusted notes do not automatically become authorized recipients.

Read authorized availability in the relevant scope. Empty results can mean no events,no access,partial coverage or error;do not report unknown calendars free. File-based availability supports proposals with an explicit as-of limit. Availability is not consent and can change before booking. Do not infer everyone's working hours from one location.

## Time and recurrence

Use explicit dates and named zones where daylight-saving rules matter. Distinguish recurring local wall time from a fixed UTC cadence. Some local times repeat or do not exist;resolve material ambiguity before booking. All-day date events differ from timed midnight meetings;use the actual API's end-date semantics.

For a series record recurrence zone,rule,end condition and exceptions. Scope edits precisely:one occurrence,this-and-future or whole series. Preserve occurrence identity and supported exception behavior rather than duplicating the series to fix one instance. Do not invent meeting/conferencing links.

## Action and receipt

Prepare concrete candidate times with date,zone,duration,availability limits and useful agenda. Before an authorized write recheck relevant state and bind calendar,event/series revision,attendees,resources and notification effects. Creating/updating/cancelling may email people or alter conference access;respect actual host/task authority.

Organizer acceptance,attendee/resource RSVP and actual attendance are separate states. Do not silently create unrelated CRM activities or follow-up schedules. After a timeout inspect event/operation status before retry to avoid duplicate invitations or overwriting concurrent changes.

Deliver actual event/series ID,time/zone,start/end,calendar,status and returned links when execution occurred. Otherwise provide complete paste-ready details and remaining prerequisite. A recurrence calculation or parser is not live calendar acceptance.
