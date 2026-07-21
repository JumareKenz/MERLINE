# Merline User Journeys — Top 5 Workflows

---

## Workflow 1: Creating and Managing a Research Study

### Trigger
A researcher (Dr. Amara Osei) needs to design and launch a new evaluation study for a donor-funded health program.

### Actors
- **Primary**: Researcher / Evaluator (workflow initiator)
- **Secondary**: Program Manager (approver), System Administrator (org setup)

### Preconditions
- Researcher has an active account in the organization
- Organization is configured with appropriate study types and defaults
- Researcher has the "Create Project" permission

### Steps

| Step | Actor | Action | System Response | Decision Point |
|------|-------|--------|-----------------|----------------|
| 1 | Researcher | Navigates to Projects from main navigation | Shows project list with "Create Project" button | — |
| 2 | Researcher | Clicks "Create Project" | Opens project creation form (name, description, organization) | — |
| 3 | Researcher | Fills project name and description, selects organization | Validates required fields; enables "Create" button | — |
| 4 | Researcher | Clicks "Create" | Creates project with status "Active"; navigates to project dashboard | — |
| 5 | Researcher | Clicks "New Study" within project | Opens study creation wizard | — |
| 6 | Researcher | Selects study type (Baseline / Midline / Endline / Cross-sectional / Program Evaluation / Research) | Updates available options based on type | **Decision**: Select study type |
| 7 | Researcher | Sets study name, description, target population, geographic scope, start/end dates | Validates dates (end > start); saves study as "Draft" | — |
| 8 | Researcher | Defines methodology (Quantitative / Qualitative / Mixed Methods) | System updates available questionnaire templates | **Decision**: Select methodology |
| 9 | Researcher | Clicks "Save & Continue" | Study created with status "Draft"; navigates to study configuration view | — |
| 10 | Researcher | Defines indicators using Indicator Library (create new or select from existing) | Indicator linked to study with target values and baselines | — |
| 11 | Researcher | Attaches existing questionnaire or creates new one (see Workflow 2) | Questionnaire linked to study | **Decision**: Create or use existing form |
| 12 | Researcher | Reviews study configuration summary | Displays full study summary for verification | — |
| 13 | Researcher | Submits study for approval | Study status changes to "Pending Approval"; notification sent to approver | **Decision**: Submit for approval or continue editing |
| 14 | Program Manager | Reviews study in approval queue | Shows study summary with accept/reject options | — |
| 15 | Program Manager | Approves study | Study status changes to "Approved"; notification sent to researcher | **Decision**: Approve, reject with comments, or request changes |
| 16 | Researcher | Receives approval notification | Study now available for questionnaire deployment and data collection | — |

### Success State
Study is created, approved, has linked indicators and questionnaire, and is ready for data collection deployment.

### Error / Failure States
- **Validation error**: Required fields missing (name, dates) — system highlights missing fields; cannot proceed
- **Date logic error**: End date before start date — system rejects and prompts correction
- **Duplicate name**: Study name already exists in project — system warns and suggests unique name
- **Approval rejection**: Study rejected by manager — status reverts to "Draft" with manager comments; researcher revises and resubmits
- **Save failure**: Network error during save — form state preserved; auto-retry on reconnection; no data lost
- **Indicator not found**: Attempting to link nonexistent indicator — system shows error; returns to indicator selection

---

## Workflow 2: Designing a Questionnaire

### Trigger
Researcher (Dr. Amara Osei) needs to create a structured questionnaire for a health survey that includes skip logic, validation, and multi-language support.

### Actors
- **Primary**: Researcher / Evaluator (designer)
- **Secondary**: M&E Officer (reviewer), Field Supervisor (field-test feedback)

### Preconditions
- Study exists with status "Draft" or "Approved"
- Indicators are defined and linked to the study
- Researcher has "Design Forms" permission

### Steps

| Step | Actor | Action | System Response | Decision Point |
|------|-------|--------|-----------------|----------------|
| 1 | Researcher | Opens study configuration, clicks "Questionnaire" tab | Shows questionnaire list; "Create New" button | — |
| 2 | Researcher | Clicks "Create New Questionnaire" | Opens form builder with empty canvas and question palette | — |
| 3 | Researcher | Enters questionnaire title and description | Saves form metadata | — |
| 4 | Researcher | Drags question from palette onto canvas | Question appears on canvas with default settings | **Decision**: Select question type |
| 5 | Researcher | Configures question properties: label, hint, required, validation rules | System validates configuration; shows preview | — |
| 6 | Researcher | Adds answer options for select-type questions | Options appear in preview | **Decision**: Single or multiple selection? |
| 7 | Researcher | Configures skip logic: "If answer = X, show question Y" | System validates logic (no circular references, target exists) | **Decision**: Define skip conditions |
| 8 | Researcher | Adds validation rule: range (18-99) for age question | System validates rule syntax | — |
| 9 | Researcher | Adds translation for question label (French) | System stores both language versions; English is fallback | **Decision**: Add translations now or later |
| 10 | Researcher | Links question to indicator from study indicator library | Question now traceable to indicator | **Decision**: Which indicator does this measure? |
| 11 | Researcher | Repeats steps 4-10 for all questions (n=50) | Form grows; system maintains responsiveness | — |
| 12 | Researcher | Clicks "Preview" | Opens mobile and web preview simultaneously | — |
| 13 | Researcher | Tests skip logic in preview by selecting different answers | Skip logic executes correctly in preview | **Decision**: Logic works correctly? |
| 14 | Researcher | Validates multi-language display by switching language in preview | Form displays in selected language | — |
| 15 | Researcher | Clicks "Save" | Form saved as version 1; status "Draft" | — |
| 16 | Researcher | Clicks "Submit for Review" | Form status "Under Review"; notification sent to M&E Officer | — |
| 17 | M&E Officer | Reviews form; adds comments on specific questions | Comments appear inline in form builder for researcher | **Decision**: Approve, reject, or request changes |
| 18 | Researcher | Addresses comments; re-submits | Iterative review loop continues | — |
| 19 | M&E Officer | Approves form | Form status changes to "Approved"; ready to deploy | — |
| 20 | Researcher | Deploys form to field (set active version, assign to enumerators) | Form available in mobile app for assigned enumerators | — |

### Success State
Questionnaire is fully designed, reviewed, approved, and deployed to enumerators for data collection.

### Error / Failure States
- **Circular skip logic**: Question A points to B, B points to A — system detects cycle and rejects
- **Orphan question**: Question referenced in skip logic has been deleted — system warns and invalidates rule
- **Invalid translation**: Required language field left empty — system uses fallback language
- **Unlinked indicator**: Questionnaire saved with unanswered indicator links — system warns but allows (can be fixed later)
- **Concurrent edit conflict**: Two users editing same form — second editor warned; changes merged or rejected
- **Missing required fields**: Question saved without required label — system prevents save
- **Duplicate question text**: Similar question text detected — system optionally warns

---

## Workflow 3: Collecting Data in the Field (Mobile)

### Trigger
Field enumerator (Jean-Paul Mugisha) has been assigned a survey and is ready to conduct household interviews in a rural area with no internet.

### Actors
- **Primary**: Field Enumerator (data collector)
- **Secondary**: Field Supervisor (monitoring progress)

### Preconditions
- Enumerator has the mobile app installed on an Android device
- Enumerator is logged in and assigned to the survey
- Enumerator has downloaded the form (while previously connected)
- Enumerator has sufficient battery and storage

### Steps

| Step | Actor | Action | System Response | Decision Point |
|------|-------|--------|-----------------|----------------|
| 1 | Enumerator | Opens Merline mobile app | Shows dashboard with assigned surveys | — |
| 2 | Enumerator | Taps assigned survey | Shows survey details: target number, deadline, instructions | — |
| 3 | Enumerator | Taps "Start New Submission" | Creates new submission record; opens first question | — |
| 4 | Enumerator | Reads question and selects/provides answer | System validates answer (required, range, format); shows next question | — |
| 5 | Enumerator | Encounters skip logic question | System automatically shows/hides dependent questions based on answer | — |
| 6 | Enumerator | Captures GPS location | System acquires GPS coordinates; shows accuracy indicator | **Decision**: Accept GPS or re-capture |
| 7 | Enumerator | Takes photo of household | System captures photo with device camera; compresses for upload | **Decision**: Retake or accept photo |
| 8 | Enumerator | App crashes or battery dies mid-survey | System has auto-saved last answer; state preserved | — |
| 9 | Enumerator | Reopens app after restart | System shows "Resume Incomplete Submission" prompt | **Decision**: Resume, discard, or save draft |
| 10 | Enumerator | Taps "Resume" | Form opens at last answered question; no data lost | — |
| 11 | Enumerator | Completes all questions | System validates all required answers; shows "Review" screen | — |
| 12 | Enumerator | Reviews responses (swipe through) | System displays all answers in read-only mode | **Decision**: Submit or edit? |
| 13 | Enumerator | Taps "Submit" (no network) | System saves submission locally with status "Pending Sync" | — |
| 14 | Enumerator | Continues collecting; completes 15 surveys | All submissions stored locally | — |
| 15 | Enumerator | Returns to area with network connectivity | System detects connectivity (background) | — |
| 16 | Enumerator | (Automatic) Opens app or app auto-syncs | System begins syncing pending submissions | — |
| 17 | Enumerator | (Automatic) System uploads each submission | System shows sync progress bar; uploads media files | — |
| 18 | Enumerator | (Automatic) Sync completes | Status changes to "Synced" for all submissions; green checkmark shown | — |
| 19 | Enumerator | Views sync confirmation | Dashboard shows submission count and "All Synced" status | — |
| 20 | Enumerator | Closes app for the day | App ready for next day; assignments persist | — |

### Success State
All 15 household surveys completed and synced. Enumerator can see confirmed submission count. Supervisor can see completed submissions in real-time (once synced).

### Error / Failure States
- **No GPS fix**: Unable to acquire GPS — system continues without GPS or uses last known location; flags submission for review
- **Media capture failure**: Camera not available or storage full — system warns and allows continuation without media
- **Sync failure**: Upload interrupted (connectivity lost mid-sync) — system automatically retries; partial uploads resumed from checkpoint
- **Storage full**: No space for new submissions — system warns and prevents new submissions until space freed
- **Form version mismatch**: Enumerator has outdated form version — system prompts update; refuses submission until updated
- **Device not registered**: Unauthorized device attempts to download forms — system blocks access
- **Duplicate submission**: Same household ID already submitted — system warns and prevents duplicate
- **Max submissions reached**: Enumerator exceeds assigned quota — system blocks new submissions with explanation

---

## Workflow 4: Viewing Results on a Dashboard

### Trigger
Program Manager (Dr. Fatima Al-Rashid) needs to review data collection progress and preliminary findings for an ongoing study.

### Actors
- **Primary**: Program Manager (primary viewer)
- **Secondary**: Researcher, M&E Officer, Country Director, Donor (all may view)

### Preconditions
- Study is in "Data Collection" or "Analysis" phase
- Minimum 100 submissions have been synced
- User has "View Data" permission for the study

### Steps

| Step | Actor | Action | System Response | Decision Point |
|------|-------|--------|-----------------|----------------|
| 1 | Manager | Navigates to Project from dashboard | Shows project list with status indicators (RAG) | — |
| 2 | Manager | Clicks on the health program project | Shows project dashboard with study summary cards | — |
| 3 | Manager | Clicks on the baseline study card | Opens study dashboard — auto-generated from study data | — |
| 4 | Manager | Views top section: KPI summary cards | Shows: Total submissions, completion rate, enumerator count, quality score | — |
| 5 | Manager | Views indicator tracking section | Shows each indicator with target, current value, progress bar, RAG status | — |
| 6 | Manager | Notices "Vaccination Rate" indicator is red (below target) | Indicator shows red status with percentage | **Decision**: Drill into indicator? |
| 7 | Manager | Clicks on "Vaccination Rate" indicator | Opens detail view: trend line, distribution by district, disaggregation by gender | — |
| 8 | Manager | Filters by district (selects "Northern Region") | Dashboard updates to show only Northern Region data | **Decision**: Filter further? |
| 9 | Manager | Further filters by gender (selects "Female") | Dashboard updates; vaccination rate for females in Northern Region shown | — |
| 10 | Manager | Views map showing geographic distribution of responses | Interactive map with heatmap overlay of vaccination rates | — |
| 11 | Manager | Notices some districts have very low response counts | System shows data quality indicator: "Low sample size — results may not be representative" | **Decision**: Investigate low response areas? |
| 12 | Manager | Exports current view as PDF | System generates PDF snapshot of current dashboard state with filters applied | — |
| 13 | Manager | Copies dashboard shareable link | System generates link with current filter state; permissions enforced | — |
| 14 | Manager | Sends link to Country Director | Country Director can view same view (with their permissions) | — |
| 15 | Manager | Schedules weekly dashboard email | System will send dashboard snapshot every Monday at 9 AM | — |
| 16 | Manager | Returns to project overview | Dashboard state preserved; can return later | — |

### Success State
Manager has real-time visibility into study progress, indicator performance, and geographic distribution. Can identify underperforming areas and make data-informed decisions.

### Error / Failure States
- **No data yet**: Study has no submissions — dashboard shows empty state with guidance to deploy forms
- **Filter returns no results**: No data matches filter criteria — dashboard shows empty state with filter reset option
- **Large dataset slow to load**: >10,000 submissions — system shows loading indicator; aggregates data for initial view
- **Permission denied**: User tries to view data they don't have access to — system shows "Access Denied" with contact admin message
- **Export fails**: PDF generation fails due to timeout — system shows error with retry option
- **Chart render error**: Unsupported data combination — system shows fallback table view

---

## Workflow 5: Generating a Report

### Trigger
Program Manager (Dr. Fatima Al-Rashid) needs to generate a quarterly donor progress report showing study findings, indicator achievement, and recommendations.

### Actors
- **Primary**: Program Manager (report initiator)
- **Secondary**: Researcher (content reviewer), Donor (report recipient)

### Preconditions
- Study is in "Analysis" or "Complete" phase
- Sufficient data collected for meaningful analysis
- Report template exists or user can use default template
- User has "Generate Reports" permission

### Steps

| Step | Actor | Action | System Response | Decision Point |
|------|-------|--------|-----------------|----------------|
| 1 | Manager | Navigates to study, clicks "Reports" tab | Shows list of existing reports | — |
| 2 | Manager | Clicks "Generate New Report" | Opens report generation wizard | — |
| 3 | Manager | Selects report type: "Donor Progress Report" | System filters available templates for donor report | — |
| 4 | Manager | Selects template: "Quarterly Donor Report - Standard" | Template preview shows report structure | **Decision**: Use this template or customize? |
| 5 | Manager | Confirms template selection | System loads template with sections: Executive Summary, Methodology, Findings, Indicator Status, Conclusion, Recommendations | — |
| 6 | Manager | Selects data timeframe (last quarter) | System filters data to selected period | — |
| 7 | Manager | Selects indicators to include | System shows indicator selection from study library; pre-selects all | **Decision**: Include all indicators or subset? |
| 8 | Manager | Clicks "Generate Report" | System begins report generation; shows progress | — |
| 9 | System | (Background) Queries data for all selected indicators | Aggregates data by indicator, by time period, by disaggregation | — |
| 10 | System | (Background) Populates charts and tables | Generates chart images and data tables for each indicator | — |
| 11 | System | (Background) Generates methodology section from study configuration | Pulls study type, sample size, collection dates, geographic scope | — |
| 12 | System | (Background) Generates indicator status tables | Creates RAG status table with targets, actuals, variance | — |
| 13 | System | (Background) Generates executive summary | Synthesizes key findings, highlights top-performing and underperforming areas | — |
| 14 | System | (Background) Generates recommendations | Based on data patterns (if AI enabled in Phase 2) | — |
| 15 | Manager | Report generation complete | System displays completed report in preview mode | — |
| 16 | Manager | Reviews report content | Scans through each section; verifies accuracy | **Decision**: Accept, edit, or regenerate? |
| 17 | Manager | Clicks "Edit" on executive summary | Opens text editor for manual adjustments | — |
| 18 | Manager | Modifies executive summary text | Changes saved to report | — |
| 19 | Manager | Clicks "Regenerate Data Section" for indicator that has updated data | System re-queries and updates that section only | — |
| 20 | Manager | Clicks "Save Draft" | Report saved as draft; can return later | — |
| 21 | Manager | Clicks "Finalize" | Report status changes to "Final"; locked from further edits | **Decision**: Finalize or keep as draft? |
| 22 | Manager | Clicks "Export" | Shows export format options | — |
| 23 | Manager | Selects PDF format | System generates PDF with organization branding, cover page, headers | — |
| 24 | Manager | Clicks "Download" | PDF downloads to local machine | — |
| 25 | Manager | Clicks "Share" | Shows share options: email, shareable link, add to evidence repository | **Decision**: How to distribute? |
| 26 | Manager | Enters donor email, adds message, clicks "Send" | System emails report to donor with download link (permission-protected) | — |
| 27 | Manager | Report added to study evidence repository | Report available for future reference and cross-study search | — |

### Success State
Professional, branded, donor-ready PDF report generated in under 5 minutes. Report contains accurate live data, methodology description, indicator tracking, and key findings. Shared with donor through secure link.

### Error / Failure States
- **Insufficient data**: Not enough submissions to generate meaningful report — system warns and suggests collecting more data
- **Template not found**: Selected template deleted or corrupted — system falls back to default template
- **Chart generation failure**: Specific chart type fails — system uses alternative visualization or table
- **Export timeout**: Large report (50+ pages) takes too long — system generates asynchronously and notifies when ready
- **Permission error**: User tries to share report with someone without access — system shows access settings prompt
- **Concurrent generation**: Two users generating reports simultaneously on same study — both generate independently; no conflict
- **Data changed after generation**: New data submitted after report finalized — system notes "Report generated on [date]" stamp; user can regenerate
- **AI content inaccuracies**: (Phase 2) AI-generated text contains factual errors — user can manually edit all AI content; system logs corrections for model improvement

---

## Workflow Dependency Map

```
Workflow 1 (Create Study) ─────────────────┐
                                           │
                                           ▼
                                Workflow 2 (Design Questionnaire) ────┐
                                                                      │
                                                                      ▼
                                                           Workflow 3 (Field Collection)
                                                                      │
                                                                      ▼
                                                           Workflow 4 (View Dashboard)
                                                                      │
                                                                      ▼
                                                           Workflow 5 (Generate Report)
```

All five workflows form a linear lifecycle. Workflows 1-3 must be complete before Workflow 4 is meaningful. Workflow 5 depends on Workflow 4 data being available. The system must support parallel execution (e.g., Workflow 3 can continue while Workflow 4 is viewed).
