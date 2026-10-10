# ServiceNow Major Incident Auto-Detection

Automatically detects when many incidents hit the same Configuration Item in a short time, creates a single **Major Incident**, links the related incidents, keeps stakeholders updated, and opens a **Problem** record for root cause analysis once resolved.

## The problem it solves
During an outage, many users report the same issue separately. Support teams lose time triaging duplicates instead of fixing the root cause. This automation groups them instantly and starts the major incident process.

## How it works
1. **Detect:** When an incident is created, a Business Rule counts open incidents on the same CI in the last 10 minutes.
2. **Escalate:** At 5 or more, it creates a Priority 1 Major Incident and links all related incidents as child incidents.
3. **Notify:** An event-driven email alerts the *Major Incident Stakeholders* group immediately.
4. **Update:** A scheduled job sends a stakeholder update every 30 minutes until resolved.
5. **Investigate:** When the Major Incident is resolved, a Problem record is created automatically and linked through the Origin task field.

## Components
| Type | Name | Purpose |
|---|---|---|
| Field | `u_auto_major_incident` (True/False) | Flags auto-created major incidents |
| System Properties | `u_mi.threshold`, `u_mi.window_minutes` | Configurable threshold (5) and window (10 min) |
| Script Include | `MajorIncidentDetector` | Detection, linking and Problem creation logic |
| Business Rule | MI - Detect Major Incident (after insert) | Calls the detector for every new incident |
| Business Rule | MI - Create Problem on Resolve (before update) | Creates the Problem record on resolution |
| Events | `u_mi.created`, `u_mi.stakeholder_update` | Trigger the email notifications |
| Notifications | MI - Major Incident Created, MI - Stakeholder Update | Stakeholder emails |
| Scheduled Job | MI - Stakeholder Updates (every 30 min) | Periodic status updates |

## Design decisions
- **Configurable, not hardcoded:** Threshold and time window live in System Properties, so admins can tune them without code changes.
- **Reusable logic in a Script Include:** Business Rules stay thin and only call the Script Include.
- **Duplicate protection:** New incidents join an existing open major incident for the same CI instead of creating a second one, and the Problem rule checks for an existing Problem before creating one.
- **Before Business Rule for Problem creation:** Avoids calling `current.update()`, a known anti-pattern.
- **Defensive coding:** Checks `isValidField()` before setting fields that may not exist on every instance.

## Bugs found and fixed during testing
- **Race condition:** The detection rule originally ran *async*. When five incidents arrived within the same second, two background checks ran in parallel and created two major incidents. Switching to an *after* Business Rule made the checks run in sequence, which fixed it.
- **Missing field:** The first version of the Problem rule referenced the incident's `problem_id` field, which did not exist on this instance. I added log statements to trace execution, isolated the issue, and rewrote the duplicate check to query the Problem table instead.

## Setup
1. Import the update set XML (System Update Sets > Retrieved Update Sets > Import Update Set from XML), then preview and commit.
2. Create a group called **Major Incident Stakeholders** and add members (groups are data, so they are not included in the update set).
3. Test with Scripts - Background by creating 5 incidents on the same CI.

## Repository structure
- `sys_remote_update_set_*.xml`: the full update set export
- `scripts/`: readable copies of the Script Include, Business Rules and Scheduled Job

## Built with
ServiceNow (Australia release, Personal Developer Instance), JavaScript, GlideRecord, GlideAggregate, Business Rules, Script Includes, Events, Notifications, Scheduled Jobs.
