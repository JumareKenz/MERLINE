# Merline User Journeys

## Journey 1: Researcher — Creating a Study from Scratch

### Persona
Dr. Amara Osei — Senior Research Scientist

### Trigger
Donor requires a baseline evaluation for a newly funded health program. Amara needs to design the study, configure methodology, define indicators, and prepare for data collection.

### Preconditions
- Account exists, verified, assigned to organization
- Has "Create Project" and "Design Study" permissions
- Organization has default study types configured
- At least one team member available to assign

### Journey Steps

| # | Screen | Action | System Response | Decision Point |
|---|--------|--------|----------------|----------------|
| 1 | Dashboard | Clicks "Projects" in sidebar | Shows project list with search/filter | — |
| 2 | Project List | Clicks "Create Project" | Opens creation form (name, description, donor, dates) | — |
| 3 | Create Project | Fills name "Health Program Baseline 2026", selects dates | Validates fields; enables Create button | — |
| 4 | Create Project | Clicks "Create" | Project created; navigates to project overview | — |
| 5 | Project Overview | Clicks "New Study" | Opens study creation wizard | — |
| 6 | Step 1: Type | Selects "Baseline Study" as type, "Mixed Methods" as methodology | System adjusts available options | Choose methodology |
| 7 | Step 2: Purpose | Enters title, purpose, 3 objectives, 4 research questions | Saves as draft | — |
| 8 | Step 3: Population | Enters target population, estimated sample size (n=1200), geographic scope | Validates; shows sample size guidance | — |
| 9 | Step 4: Timeline | Sets field dates (Sept-Nov 2026) | Validates end > start | — |
| 10 | Step 5: Confirmation | Reviews configuration summary | Shows complete summary | Submit for approval or edit |
| 11 | Step 5 | Clicks "Submit for Approval" | Status → "Pending Approval"; notifies Program Manager | — |
| 12 | (Wait) | Receives email notification: study approved | Status → "Approved" | — |
| 13 | Study Overview | Navigates to study; opens "Indicators" tab | Shows indicator list (empty) | — |
| 14 | Indicators | Clicks "Link Indicator" → selects from library; creates 2 new ones | Indicators linked to study | Create or reuse? |
| 15 | Indicators | Sets baseline values and targets for each indicator | Saves indicator configuration | — |
| 16 | Study Overview | Opens "Questionnaires" tab | Shows empty questionnaire list | — |
| 17 | Questionnaires | Clicks "Create Questionnaire" | Opens form builder (see Journey 2) | — |
| 18 | Form Builder | Designs 45-question survey with skip logic, validation, translations | Auto-saves every 30 seconds | — |
| 19 | Form Builder | Clicks "Preview" → tests mobile and web views | Opens preview panel | Logic correct? |
| 20 | Form Builder | Clicks "Submit for Review" | Status → "Under Review"; notifies M&E Officer | — |
| 21 | (Wait) | M&E Officer approves form | Status → "Approved" | — |
| 22 | Study Overview | Sees green checkmark: all prerequisites ready | Study ready for deployment | — |

### Success State
Study is created, approved, has 8 defined indicators with baselines, a 45-question approved questionnaire, and is ready for field deployment.

### Error States

| Error | System Behavior | Recovery |
|-------|----------------|----------|
| Required field missing | Field highlighted in red; form cannot submit | Fill required field |
| End date before start | Validation error message | Correct dates |
| Duplicate study code | Warning; suggests unique code | Accept suggestion or modify |
| Approval rejected | Study reverts to "Draft" with manager comments | Address comments; resubmit |
| Network failure during save | Draft preserved locally; auto-retry | No action needed |
| Concurrent edit conflict | Warning shown; changes merged or rejected | Review and reapply changes |

### Post-conditions
- Study in "Approved" status
- Indicators defined with baselines and targets
- Questionnaire designed and approved
- Study ready for enumerator assignment

---

## Journey 2: Enumerator — Collecting Data in the Field (Offline)

### Persona
Jean-Paul Mugisha — Field Enumerator

### Trigger
Jean-Paul receives an assignment notification on his phone for a household health survey. He is in a rural area with no internet connectivity.

### Preconditions
- Mobile app installed on Android device
- Logged in previously (credentials cached)
- Assignment pushed to device during last sync
- Device has sufficient battery (>30%) and storage (>500MB free)
- GPS hardware functional

### Journey Steps

| # | Screen | Action | System Response | Decision Point |
|---|--------|--------|----------------|----------------|
| 1 | Home | Opens Merline mobile app (offline) | Shows dashboard with "3 Assigned Surveys" badge | — |
| 2 | Surveys | Taps "Health Baseline Survey" card | Shows assignment detail: target 20, completed 0, deadline Oct 15 | — |
| 3 | Survey Detail | Reads instructions at top; taps "Start New Submission" | Creates new submission; shows first question | — |
| 4 | Form | Reads question 1 (consent); selects "Yes" | Advances to question 2 | Consent given? |
| 5 | Form | Answers question 2 (GPS); taps GPS icon | GPS indicator spins; acquires coordinates (accuracy 5m) | Accept GPS or retry |
| 6 | Form | Answers question 3-10 (demographics) using text/select inputs | Inline validation: required fields must be filled | — |
| 7 | Form | Question 11: "Take photo of dwelling"; taps camera icon | Opens device camera; captures photo | Retake or accept |
| 8 | Form | Question 18-25: skip logic triggers based on Q17 answer | Dependent questions auto-shown/hidden | — |
| 9 | Form | Phone battery low warning (15%) | System auto-saves current state | Continue or pause |
| 10 | Form | Phone dies at question 30 of 45 | Form state saved to local DB | — |
| 11 | Home | Reopens app after charging; sees "Resume Incomplete Submission" | Shows 1 draft, 0 synced | Resume, discard, or save draft later |
| 12 | Form | Taps "Resume" | Continues from question 30; no data lost | — |
| 13 | Form | Completes question 45 (final); taps "Review" | Shows all 45 answers in read-only scrollable list | Edit or submit |
| 14 | Review | Taps "Submit" (no network) | Saves locally; status → "Pending Sync"; green arrow icon | — |
| 15 | Home | Continues to next household; repeats steps 3-14 | Submissions accumulate: 3 done → 7 done → 12 done | — |
| 16 | Home | End of day; returns to town with connectivity | App detects WiFi; shows "Sync Available" banner | — |
| 17 | Sync | Opens Sync tab; sees "12 submissions pending" | Sync progress bar; uploads one by one | — |
| 18 | Sync | System syncs submissions + photos | Green checkmarks appear per submission | — |
| 19 | Sync | Sync completes | "All synced" status; submission count confirmed on server | — |
| 20 | Home | Sees updated stats: "Today: 12 completed, All synced" | Satisfaction: visible confirmation of work | — |

### Success State
12 household surveys completed and synced. Jean-Paul can see confirmed submission count. Supervisor can review submissions. Payment tracking updated.

### Error States

| Error | System Behavior | Recovery |
|-------|----------------|----------|
| No GPS fix after 30s | Captures last known location; flags submission | Can continue; flag reviewed by supervisor |
| Camera unavailable | Warns "Camera not available"; allows skip | Add photo later if needed |
| Sync interrupted mid-upload | Partial upload resumes from checkpoint | Automatic retry on reconnect |
| Storage <100MB | Warning before starting new submission | Clear cached media; stop collecting |
| Form version outdated | Blocks submission; prompts "Update Required" | Download latest version; resume |
| Duplicate respondent ID | Warning; prevents duplicate | Check ID; correct if mistaken |
| Max submissions reached | Blocks new submission; shows "Quota reached" | Contact supervisor for overage |
| App crash during form | State restored on reopen from last saved position | Resume; no data loss |

### Post-conditions
- 12 submissions fully synced to server
- Enumerator dashboard updated with daily count
- Supervisor can see submissions in real-time
- Device storage cleared of synced media cache

---

## Journey 3: Supervisor — Monitoring Data Quality in Real-Time

### Persona
Carlos Mendez — Field Supervisor

### Trigger
Carlos receives an in-app notification: "5 submissions flagged for review." He opens the platform to investigate data quality issues across his team of 25 enumerators.

### Preconditions
- Study in "Data Collection" phase
- Minimum 50 submissions already synced
- Carlos has "Supervisor" role with "Review Submissions" permission
- Data quality rules configured for the study

### Journey Steps

| # | Screen | Action | System Response | Decision Point |
|---|--------|--------|----------------|----------------|
| 1 | Dashboard | Logs into web app; sees notification badge (5) | Dashboard shows: 342 total submissions, 92% quality score, 5 flagged | — |
| 2 | Dashboard | Clicks "5 Flags" alert | Opens Data Collection → Submissions with flag filter active | — |
| 3 | Submissions | Sees flagged list: 3 duration anomalies, 1 GPS outlier, 1 straight-lining | Each row: enumerator name, flag type, time, score | — |
| 4 | Submission Detail | Clicks first flag (duration 4min for 45-question survey — expected 20min) | Shows submission responses, timer log, GPS trail | Investigate further? |
| 5 | Submission Detail | Notes all answers are default/empty; likely falsified | Marks as "Rejected"; adds comment "Suspected falsification — re-assign" | Accept, Reject, or Flag for back-check |
| 6 | Submissions | Reviews GPS outlier flag: coordinates 50km from study area | Opens map view showing submission GPS vs study boundary | — |
| 7 | Map | Confirms GPS outside study area; enumerator claims "respondent moved" | Marks as "Flag for Back-check" | — |
| 8 | Submissions | Reviews straight-lining flag: same "Agree" for all 20 Likert questions | Statistical evidence of straight-lining | — |
| 9 | Submission Detail | Marks as "Rejected with feedback"; types instruction for enumerator | System sends in-app notification to enumerator | — |
| 10 | Enumerator View | Clicks on enumerator name to see their overall performance | Shows: 45 submissions, 87% quality score, 3 flags this week | — |
| 11 | Enumerator View | Reviews trend: quality declining over past 3 days | System shows quality score trend chart | — |
| 12 | Enumerator View | Clicks "Send Message" to enumerator | Opens chat interface within platform | — |
| 13 | Messaging | Types: "Please ensure each interview takes at least 15 minutes. Short interviews are being flagged." | Message sent; logged in audit trail | — |
| 14 | Assignments | Navigates to Assignments tab | Shows all 25 enumerators with progress bars | — |
| 15 | Assignments | Sees 3 enumerators at <50% target with 5 days remaining | System shows risk indicator (yellow) | Reassign or extend? |
| 16 | Assignments | Creates new assignment for a nearby enumerator to cover remaining households | System allocates; notifies both enumerators | — |
| 17 | Dashboard | Returns to dashboard; 2 flags remaining resolved in queue | Dashboard updates: now 2 flags (others actioned) | — |
| 18 | Data Collection | Generates daily progress report; clicks "Export" | Downloads PDF summary for program manager | — |

### Success State
Carlos resolved 3 of 5 flags within 30 minutes. Rejected 1 fraudulent submission, flagged 1 for back-check, sent feedback to 1 enumerator. Progress report generated and shared. Quality score trend visible.

### Error States

| Error | System Behavior | Recovery |
|-------|----------------|----------|
| Submission detail fails to load | Retry button; fallback to raw JSON | Retry or export data |
| Bulk reject accidentally triggered | Confirmation dialog required; undo within 30s | Click "Undo" in toast |
| Map fails to render offline areas | Fallback to coordinate text display | Download offline map tiles |
| Message fails to send | Queued for retry; shows "pending" | Auto-sends when enumerator online |
| Report generation times out | Async generation; notifies when ready | Wait; download from notifications |

### Post-conditions
- Quality flags reviewed and actioned
- Fraudulent submission rejected; back-check initiated
- Enumerator notified of performance issue
- Daily progress report generated
- Assignment adjusted for completion

---

## Journey 4: Program Manager — Viewing Dashboard and Generating Insights

### Persona
Dr. Fatima Al-Rashid — Country Program Manager

### Trigger
Monthly program review meeting in 2 hours. Fatima needs to review progress across all 3 active studies in her health program.

### Preconditions
- 3 studies in "Data Collection" or "Analysis" phase
- Minimum 200 submissions across all studies
- Role has "View Dashboard" and "View Reports" permissions

### Journey Steps

| # | Screen | Action | System Response | Decision Point |
|---|--------|--------|----------------|----------------|
| 1 | Dashboard | Logs in; sees Executive Dashboard | Shows: 3 active studies, 1,247 total submissions, 88% quality, 5 alerts | — |
| 2 | Dashboard | Reviews KPI row: each study has RAG status | Baseline study = Green; Midline = Amber; Endline = Red (behind target) | — |
| 3 | Dashboard | Clicks on "Endline" amber indicator | Expands detail: target 500 submissions, actual 210, 15 days remaining | — |
| 4 | Dashboard | Clicks "View Study Dashboard" | Opens Endline study dashboard | — |
| 5 | Study Dashboard | Scans indicator tracking section | 12 indicators; 2 red (below target), 3 amber, 7 green | — |
| 6 | Study Dashboard | Clicks red indicator "Vaccination Coverage" | Detail view: current 62% vs target 85%, by district breakdown | Drill into district? |
| 7 | Indicator Detail | Filters by district (selects "Northern Region") | Chart updates: Northern Region at 45% — lowest | — |
| 8 | Indicator Detail | Further filters by gender | Female vaccination rate in North: 38% — critical disparity | — |
| 9 | Study Dashboard | Returns to dashboard; opens map widget | Heatmap shows geographic coverage gaps | — |
| 10 | Map | Notes 3 districts with <30% sample completion | Map shows red zones for low coverage | — |
| 11 | Dashboard | Clicks "Export Current View" | Downloads PNG of dashboard state with applied filters | — |
| 12 | Dashboard | Clicks "Generate Report" | Opens report generation (see Journey 5) | — |
| 13 | Reports | Selects "Monthly Program Brief" template | Pre-populates with current data | — |
| 14 | Reports | Clicks "Generate" | AI (Phase 2) or system generates draft report | — |
| 15 | Reports | Reviews generated executive summary in preview | Key findings highlighted automatically | Accept or edit? |
| 16 | Reports | Edits recommendations section | Manual override saves to report | — |
| 17 | Reports | Clicks "Finalize" | Report locked; ready for export | — |
| 18 | Reports | Clicks "Share with Team" | Generates shareable link; permissions enforced | — |
| 19 | Dashboard | Returns to main dashboard; sends link to Country Director | Country Director can view same filtered view | — |

### Success State
Fatima identified the underperforming endline study, drilled to root cause (vaccination coverage in Northern Region), generated a monthly brief report, and shared insights with the Country Director — all within 45 minutes.

### Error States

| Error | System Behavior | Recovery |
|-------|----------------|----------|
| Dashboard too slow with 1,247 submissions | Initial page load shows aggregates; details load async | Wait for background load |
| Filter returns empty set | Shows "No data matches filters"; suggests reset | Reset filters to default |
| Export fails (timeout) | Offers async export; notifies when ready | Download from notifications |
| Report generation stalls | Shows progress indicator at stuck step | Regenerate with fewer indicators |
| Shared link returns 403 | Permissions enforced; link only works for authorized users | Share with correct role |

### Post-conditions
- Dashboard state shared with Country Director
- Underperforming indicators identified with drill-down to gender disparity
- Monthly brief report generated and finalized
- Action items noted for team follow-up

---

## Journey 5: M&E Officer — Designing Indicators and Questionnaires

### Persona
Grace Okonkwo — M&E Officer

### Trigger
Grace needs to create the M&E framework for a new agricultural extension program, including 15 indicators and a corresponding farmer survey questionnaire.

### Preconditions
- Project created by Program Manager
- Grace has "Design Questionnaire" and "Manage Indicators" permissions
- Organization has indicator library with existing indicators

### Journey Steps

| # | Screen | Action | System Response | Decision Point |
|---|--------|--------|----------------|----------------|
| 1 | Projects | Opens project "Agri-Extension Program 2026" | Shows project overview with empty indicators section | — |
| 2 | Indicators Tab | Clicks "Indicators" tab | Shows project-level indicator list (empty) | — |
| 3 | Indicators | Clicks "Add from Library" | Opens indicator library browser with search/filter | — |
| 4 | Library | Reuses 3 existing indicators (modified targets); clicks "Import" | Indicators linked to project; targets editable | — |
| 5 | Indicators | Clicks "Create New Indicator" | Opens indicator creation form | — |
| 6 | New Indicator | Fills name, definition, selects type "Quantitative", level "Outcome" | Auto-generates code IND-004 | — |
| 7 | New Indicator | Enters numerator, denominator, unit (percentage), direction (positive) | Validates formula completeness | — |
| 8 | New Indicator | Sets baseline (25%), target (60%), data source (survey) | Indicator complete; Saves as "Draft" | — |
| 9 | Indicators | Repeats steps 5-8 for 12 more indicators | All 15 indicators listed (3 library + 12 new) | — |
| 10 | Indicators | Submits all for approval | Status → "Under Review"; notifies Research Director | — |
| 11 | (Wait) | Research Director approves; Grace notified | All indicators → "Active" | — |
| 12 | Questionnaires | Navigates to "Questionnaires" tab; clicks "Create" | Opens form builder | — |
| 13 | Form Builder | Creates section "Farmer Demographics" with 8 questions | Questions added; auto-saves | — |
| 14 | Form Builder | Creates section "Crop Production" with 15 questions | Each question gets code (Q01-Q23) | — |
| 15 | Form Builder | For Q12 "Crop types grown": selects "Multiple Select", adds options with "Other (specify)" | Options appear in preview | — |
| 16 | Form Builder | For Q15 "Area cultivated": selects "Numeric Decimal", sets validation range 0-100 | Validation rule configured | — |
| 17 | Form Builder | Links Q15 to indicator "Cultivation Area" | Question now traces to indicator | Which indicator? |
| 18 | Form Builder | Configures skip logic: if Q10 "Engages in farming" = No, skip section B | Visual logic flow shown; validated (no cycles) | — |
| 19 | Form Builder | Adds translations for 3 questions in local language (Luo) | Both language versions stored | — |
| 20 | Form Builder | Clicks "Preview" → tests mobile view | Preview shows all 23 questions, logic working | — |
| 21 | Form Builder | Clicks "Save & Submit for Review" | Status → "Under Review"; notifies PI | — |

### Success State
15 indicators created/imported and approved. 23-question questionnaire designed with skip logic, validation, translations, and indicator linking. Questionnaire submitted for peer review.

### Error States

| Error | System Behavior | Recovery |
|-------|----------------|----------|
| Indicator code conflict | Suggests next available code | Accept suggestion |
| Invalid formula (numerator/denominator) | Highlights error; prevents save | Fix numerator or denominator |
| Indicator name too long (>300 chars) | Character counter shows -N; prevents save | Shorten name |
| Circular skip logic in form | Detects cycle; highlights conflicting questions | Restructure logic |
| Missing required question field | Field border turns red; tooltip explains | Fill required field |
| Translation not complete for all languages | Warning on submit; still allows submission | Complete later or mark incomplete |

### Post-conditions
- 15 indicators in "Active" status with full metadata
- Questionnaire in "Under Review" with indicator mappings
- Skip logic validated; translations partially complete
- Audit trail of all indicator changes

---

## Journey 6: Country Director — Reviewing Program-Level Reports

### Persona
Ambassador David Thornton — Country Director

### Trigger
Monthly portfolio review meeting. David needs to quickly assess performance across 4 programs (12 studies) and identify where to intervene.

### Preconditions
- All 4 programs have active studies with data collection in progress or complete
- David has "Executive View" role — read-only across all programs
- At least 500 submissions across portfolio

### Journey Steps

| # | Screen | Action | System Response | Decision Point |
|---|--------|--------|----------------|----------------|
| 1 | Dashboard | Opens Merline; sees Executive Dashboard | Portfolio view: 4 programs with RAG summary | — |
| 2 | Dashboard | Scans: Health (Green), Education (Amber), Livelihoods (Red), WASH (Green) | Each program card shows: active studies, submissions, quality score | — |
| 3 | Dashboard | Clicks "Livelihoods" (Red) program card | Expands: 3 studies, 2 behind target, quality score 72% | — |
| 4 | Dashboard | Reviews AI-generated executive brief (Phase 2) — or manually scans key metrics | Key finding: "Low female participation rates in Northern region" | — |
| 5 | Program View | Clicks indicator tab; sorts by "Most Off-Track" | 5 indicators in red; 3 in amber | — |
| 6 | Program View | Clicks "Female Participation Rate" (red: target 50%, actual 28%) | Detail: trend shows declining since baseline; district breakdown shows disparity | — |
| 7 | Program View | Clicks "Generate Executive Brief" | System generates one-page PDF with key findings and recommendations | — |
| 8 | Program View | Reviews brief; highlights 2 key actions | Actions: "Increase female outreach" and "Re-train enumerators on gender-sensitive interviewing" | — |
| 9 | Program View | Clicks "Share" → enters email of Program Manager | Brief sent with note requesting action plan | — |
| 10 | Dashboard | Returns to executive view; exports portfolio snapshot as PDF | PDF downloaded with all 4 program summaries | — |

### Success State
David assessed portfolio health in 10 minutes. Identified Livelihoods program as underperforming. Drilled to root cause (female participation). Generated and shared executive brief with actionable recommendations.

### Error States

| Error | System Behavior | Recovery |
|-------|----------------|----------|
| Dashboard shows incomplete data | Badge: "Data from [date] — last sync" | Data is live; badge informs timeliness |
| PDF generation slow for portfolio | Async generation; email notification | Wait for email |
| Indicator data insufficient for trend | Shows single data point; "Insufficient data for trend" note | Check back when more data collected |
| Shared link doesn't work for recipient | Permission check: recipient must have access | Grant access or use email attachment |

### Post-conditions
- Portfolio health assessed; Livelihoods program flagged
- Executive brief shared with Program Manager
- Action items requested for female participation gap
- Portfolio snapshot PDF exported

---

## Journey 7: Donor — Accessing Results and Evidence

### Persona
Ms. Elena Vasquez — Senior Program Officer, Philanthropic Foundation

### Trigger
Quarterly grant reporting deadline approaching. Elena needs to access real-time data from 3 grantees using Merline, without waiting for emailed reports.

### Preconditions
- Elena has "Donor" role with access granted to 3 specific grantees' studies
- Grantees have studies in "Data Collection" or "Analysis" phase
- Organization has shared dashboard configured for donor view

### Journey Steps

| # | Screen | Action | System Response | Decision Point |
|---|--------|--------|----------------|----------------|
| 1 | Login | Receives magic link email; clicks to authenticate | Logged in with donor role; sees limited dashboard | — |
| 2 | Dashboard | Sees portfolio view: 3 grantees with RAG status | Grantee A: Green (on track), Grantee B: Amber (slight delays), Grantee C: Red (quality issues) | — |
| 3 | Dashboard | Reviews indicator tracking across all grantees | Standardized indicators shown with targets and actuals | — |
| 4 | Grantee View | Clicks Grantee C (Red) | Dashboard shows: 45% quality score, 3 quality flags, 60% of target submissions | — |
| 5 | Grantee View | Reviews data quality summary | AI-generated quality report (Phase 2) or manual quality dashboard | — |
| 6 | Grantee View | Clicks "View Raw Data (Anonymized)" | Table of aggregated, anonymized responses | — |
| 7 | Data View | Applies filter: "By region" | Shows geographic breakdown of responses | — |
| 8 | Data View | Exports filtered data as CSV | Download begins; audit logged | — |
| 9 | Dashboard | Clicks "Generate Donor Brief" | System generates standardized donor report with portfolio summary | — |
| 10 | Report | Reviews auto-generated brief; sees narrative summary (Phase 2) | Highlights: "Grantee A exceeded enrollment targets; Grantee C needs technical support" | — |
| 11 | Report | Downloads PDF for board meeting | Report added to portfolio | — |
| 12 | Dashboard | Sets up recurring monthly email of dashboard snapshot | Scheduled: 1st of each month | — |

### Success State
Elena accessed real-time data from all 3 grantees without requesting a single report. Identified Grantee C needs support. Downloaded portfolio summary for board. Scheduled ongoing visibility.

### Error States

| Error | System Behavior | Recovery |
|-------|----------------|----------|
| Grantee hasn't shared data yet | Shows "No data shared" empty state with guidance | Contact grantee admin to grant access |
| Donor permission insufficient for raw data | Request access dialog; sends notification to grantee admin | Wait for approval |
| Report generation with limited data | Warning: "Data collection at 60% — results preliminary" | Note in report header |
| Scheduled report delivery fails | Retry logic; notification to user | Regenerate manually |

### Post-conditions
- Portfolio health assessed for all 3 grantees
- Grantee C flagged for technical support outreach
- Donor brief generated and downloaded
- Monthly dashboard report scheduled

---

## Journey 8: Administrator — Setting Up Organization and Users

### Persona
Kenji Tanaka — IT Systems Manager

### Trigger
New country office onboarding. Kenji needs to set up the organization in Merline, configure settings, and invite 25 users with appropriate roles.

### Preconditions
- Kenji has "System Admin" or "Org Admin" role
- Organization registration completed
- Email system configured for invitations
- User list (names, emails, roles) prepared in spreadsheet

### Journey Steps

| # | Screen | Action | System Response | Decision Point |
|---|--------|--------|----------------|----------------|
| 1 | Administration | Logs in; opens Administration from sidebar | Shows admin dashboard with user count, storage, activity | — |
| 2 | Organization Settings | Clicks "Settings" → updates org name, uploads logo, sets timezone (Nairobi) | Organization profile saved; branding applied | — |
| 3 | Organization Settings | Sets default language (English), enables MFA for all users | Security policies saved | — |
| 4 | User Management | Clicks "Users" → "Invite Users" | Opens bulk invite dialog: paste emails or upload CSV | — |
| 5 | Invite Users | Pastes 25 emails from spreadsheet; assigns roles (5 Researchers, 15 Enumerators, 3 Supervisors, 2 Managers) | System validates emails; shows summary | — |
| 6 | Invite Users | Clicks "Send Invitations" | 25 emails sent with magic link; user records created "Invited" | — |
| 7 | User Management | Sees user list: 25 Invited, 0 Active | Filters pending invitiations | — |
| 8 | User Detail | Clicks one user to pre-configure: assigns to "Health Team" | User linked to team | — |
| 9 | Team Management | Navigates to "Teams"; creates 3 teams: "North Region", "Central Region", "South Region" | Teams created; 0 members | — |
| 10 | Team Management | Bulk assigns users to teams from user list | 5 enumerators per team; 1 supervisor per team | — |
| 11 | Roles & Permissions | Clicks "Roles" → reviews default permissions | Default roles: Researcher, Enumerator, Supervisor, Manager, Viewer | — |
| 12 | Roles & Permissions | Customizes "Researcher" role: enables "Create Study", "Design Form", disables "Delete Study" | Permission policy updated | — |
| 13 | Roles & Permissions | Saves role as "Custom Researcher"; assigns to a specific user | User now has tailored permissions | — |
| 14 | Activity Log | Navigates to "Activity Log" to verify setup | All actions logged: user creation, role assignment, team creation | — |
| 15 | User Management | Sees 10 users have accepted invitations (now "Active") | Dashboard shows 10/25 activated; 15 pending | Follow up on pending? |
| 16 | User Management | Selects pending users → clicks "Resend Invitation" | System resends invites; logs action | — |
| 17 | Organization Settings | Reviews data retention policy: sets auto-archive after 2 years | Policy saved | — |
| 18 | Settings | Exports user list as CSV for records | Download started | — |

### Success State
Organization configured with branding and security policies. 25 users invited with correct roles. 3 teams created with supervisors assigned. Roles customized. 10 users activated within session. Activity log confirms all changes.

### Error States

| Error | System Behavior | Recovery |
|-------|----------------|----------|
| Invalid email in bulk import | Highlights invalid rows; imports valid ones | Fix invalid emails; re-invite |
| Role name conflict | Error: "Role already exists" | Use different name or edit existing |
| User limit exceeded for plan | Shows upgrade prompt | Contact sales or reduce invites |
| Invitation email bounces | Flagged in user list; delivery status shown | Verify email address; resend |
| Maximum team size exceeded | Warning; prevent adding more members | Create additional team |
| Cannot delete role assigned to users | Warn: "N users have this role"; reassign first | Reassign users; then delete role |

### Post-conditions
- Organization fully configured (branding, timezone, security)
- 25 users invited with role-appropriate permissions
- 3 operational teams created
- 10 users activated; reminder sent to 15 pending
- Custom role "Custom Researcher" created and assigned
- Full audit trail of setup actions
