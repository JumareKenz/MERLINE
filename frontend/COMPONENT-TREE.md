# Merline Component Tree

## Layout Components

```
DashboardLayout
├── Sidebar
│   ├── Logo
│   ├── NavItem (repeated per module)
│   │   ├── Icon (Lucide)
│   │   ├── Label
│   │   └── Badge (count, e.g., pending flags)
│   ├── NavSectionDivider
│   ├── RecentStudies
│   │   └── StudyLink (repeated)
│   ├── GlobalSearch (Ctrl+K trigger)
│   └── UserMenu
│       ├── Avatar
│       ├── UserName
│       ├── ProfileLink
│       ├── SettingsLink
│       └── LogoutButton
├── TopBar
│   ├── Breadcrumb
│   │   └── BreadcrumbSegment (repeated, clickable)
│   ├── ModuleTabs
│   │   └── Tab (repeated, with optional badge)
│   ├── ActionBar
│   │   ├── FilterButton
│   │   ├── ExportButton
│   │   ├── ShareButton
│   │   └── MoreMenu (kebab menu)
│   └── NotificationBell
│       ├── BellIcon (with unread count badge)
│       └── NotificationDrawer
│           └── NotificationGroup (Today, Yesterday, Earlier)
│               └── NotificationItem (icon, title, timestamp, action)
└── MainContent
    ├── PageHeader
    │   ├── PageTitle
    │   ├── PageDescription
    │   └── PageActions
    └── PageContent
```

---

## Module: Authentication

```
LoginPage
├── LoginForm
│   ├── EmailInput (with validation)
│   ├── PasswordInput (with show/hide toggle)
│   ├── RememberMeCheckbox
│   ├── SubmitButton
│   ├── ForgotPasswordLink
│   ├── RegisterLink
│   ├── SSOButton (Phase 2)
│   └── MFAInput (conditional)
│       ├── CodeInput (6 digits)
│       └── VerifyButton
├── AuthLayout
│   ├── Logo
│   └── LanguageSelector
└── SocialProof (logos, trust signals)

RegisterPage
└── RegisterForm
    ├── NameInput
    ├── EmailInput
    ├── PasswordInput (with strength meter)
    ├── ConfirmPasswordInput
    ├── OrgCodeInput
    ├── TermsCheckbox
    └── SubmitButton

ForgotPasswordPage
├── Step1EmailForm (email input + submit)
└── Step2ResetForm
    ├── TokenInput
    ├── NewPasswordInput
    └── ConfirmPasswordInput
```

---

## Module: Projects

```
ProjectListPage
├── SearchBar
├── FilterChips (status, date range)
├── ViewToggle (card/table)
├── ProjectGrid
│   └── ProjectCard (repeated)
│       ├── StatusBadge
│       ├── ProjectName
│       ├── DonorLabel
│       ├── DateRange
│       ├── StudyCount
│       └── QuickActions (3-dot menu)
├── ProjectTable (alternative view)
│   └── DataTable (TanStack Table)
│       ├── ColumnHeader (sortable)
│       └── Row (clickable → detail)
├── Paginator
└── CreateProjectFAB

CreateProjectPage
└── ProjectCreateForm
    ├── NameInput
    ├── DescriptionTextarea
    ├── DonorInput
    ├── GrantRefInput
    ├── BudgetInput + CurrencySelect
    ├── DateRangePicker
    ├── CountrySelect
    ├── SectorSelect
    ├── TagsInput
    └── SubmitButtonGroup (Save, Cancel)

ProjectDetailPage
├── ProjectInfoCard
│   ├── StatusBadge
│   ├── Name, Donor, Dates, Budget
│   └── EditButton
├── KpiRow
│   └── KpiCard (repeated: studies, submissions, indicators, team)
│       ├── Icon
│       ├── Value
│       └── Label
├── StudiesMiniList
│   └── StudyCard (repeated, links to study detail)
├── RecentActivityFeed
│   └── ActivityItem (repeated: user, action, timestamp)
├── ProjectTabs
│   ├── OverviewTab (default, above content)
│   ├── StudiesTab → StudiesList (embedded)
│   ├── IndicatorsTab → IndicatorList (embedded)
│   ├── TeamTab → TeamMemberList
│   └── SettingsTab → ProjectSettingsForm
└── QuickActions (Edit, Add Study, Share)
```

---

## Module: Studies

```
StudyListPage
├── SearchBar + FilterChips (status, type, date)
├── StudyGrid
│   └── StudyCard (repeated)
│       ├── StatusBadge (color-coded)
│       ├── Title
│       ├── TypeLabel
│       ├── DateRange
│       ├── ProgressBar (submissions target)
│       └── KpiMini (indicators, questionnaires count)
└── CreateStudyFAB

CreateStudyPage (Wizard)
├── StepIndicator (5 steps, numbered + checkmarks)
├── Step1StudyType
│   ├── TypeCardGrid (Baseline, Midline, Endline, etc.)
│   └── MethodologySelector (Quant, Qual, Mixed)
├── Step2Purpose
│   ├── TitleInput
│   ├── PurposeTextarea
│   ├── ObjectivesList
│   │   └── ObjectiveItem (repeated, add/remove)
│   └── ResearchQuestionsList
├── Step3Population
│   ├── PopulationTextarea
│   ├── SampleSizeInput
│   └── LocationInput (map or text)
├── Step4Timeline
│   └── DateRangePicker (start/end)
├── Step5Confirmation
│   └── StudySummaryPanel (read-only, all inputs)
├── WizardNavigation (Back, Next, Save Draft, Submit)
└── WizardGuide (side panel, contextual help)

StudyDetailPage
├── StatusBadge (large, color-coded)
├── LifecycleProgressBar (Draft → Approved → Field → Complete)
├── StudyInfoCard
│   ├── Type, Methodology, Dates, Population
│   └── EditButton
├── IndicatorSummary (count, quick status)
├── TeamMemberAvatars (overflow count)
├── QuickActions (Edit, Clone, Archive)
├── StudyTabs
│   ├── OverviewTab
│   ├── IndicatorsTab → StudyIndicatorList
│   ├── QuestionnairesTab → QuestionnaireLinkList
│   ├── DataCollectionTab
│   │   ├── AssignmentsPanel
│   │   ├── SubmissionsPanel
│   │   └── SyncStatusPanel
│   ├── DashboardTab → StudyDashboard (embedded)
│   ├── ReportsTab → ReportList (embedded)
│   └── SettingsTab
└── StudySettingsForm
    ├── EditableFields
    ├── PermissionMatrix
    └── ArchiveButton (with confirmation dialog)
```

---

## Module: Indicators

```
IndicatorLibraryPage
├── SearchBar
├── FilterChips (type, level, status)
├── IndicatorTable (TanStack Table)
│   ├── ColumnHeader: Code, Name, Type, Level, Status
│   └── Row: click → detail, checkbox → bulk
├── Paginator
└── CreateIndicatorButton

IndicatorDetailPage (also Create)
├── IndicatorForm (collapsible sections)
│   ├── BasicInfoSection
│   │   ├── CodeInput
│   │   ├── NameInput (max 300)
│   │   ├── DefinitionTextarea
│   │   ├── TypeSelect (Quant/Qual/Proxy/Composite)
│   │   └── LevelSelect (Impact/Outcome/Output/Process/Input)
│   ├── CalculationSection
│   │   ├── UnitInput
│   │   ├── NumeratorInput
│   │   ├── DenominatorInput
│   │   ├── FormulaInput
│   │   └── DirectionSelect (Positive/Negative/Neutral)
│   ├── DataSourceSection
│   │   ├── FrequencySelect
│   │   ├── DataSourceTextarea
│   │   └── CollectionMethodSelect
│   ├── TargetsSection
│   │   ├── BaselineValue + BaselineYear
│   │   ├── TargetValue + TargetYear
│   │   └── ThresholdMin + ThresholdMax
│   ├── DisaggregationsEditor
│   │   └── DisaggregationRow (dimension + categories)
│   └── QualitySection (data quality rules)
├── ButtonGroup (Save Draft, Submit, Cancel)
└── VersionHistoryPanel

StudyIndicatorListPage
├── LinkedIndicatorTable
│   └── Row: Code, Name, Target, Baseline, Current, RAG, ProgressBar
├── LinkFromLibraryButton (opens indicator browser modal)
├── CreateNewButton (direct create in study context)
└── BulkActions (Set Targets, Remove)
```

---

## Module: Questionnaires (Form Builder)

```
QuestionnaireLibraryPage
├── SearchBar + FilterChips (status, study, type)
├── QuestionnaireTable
│   ├── Column: Title, Study, Status, Version, Last Modified
│   └── Row: click → library, or open → deploy
└── CreateQuestionnaireButton

FormBuilderPage (full-screen, 3-panel)
├── Toolbar (top bar, always visible)
│   ├── BackButton (←)
│   ├── QuestionnaireTitle (editable)
│   ├── UndoButton / RedoButton (Ctrl+Z/Ctrl+Shift+Z)
│   ├── SaveIndicator ("Saved" / "Saving..." / "Unsaved")
│   ├── PreviewButton
│   ├── SettingsButton
│   ├── QuestionCounter ("23 questions | ~15 min")
│   └── SubmitForReviewButton
├── QuestionPalette (left panel, scrollable)
│   ├── PaletteSection (Basic)
│   │   ├── DraggableItem: Text (short)
│   │   ├── DraggableItem: Text (long)
│   │   ├── DraggableItem: Number
│   │   ├── DraggableItem: Date
│   │   └── DraggableItem: Time
│   ├── PaletteSection (Choice)
│   │   ├── DraggableItem: Single Select
│   │   ├── DraggableItem: Multiple Select
│   │   ├── DraggableItem: Dropdown
│   │   ├── DraggableItem: Ranking
│   │   ├── DraggableItem: Likert Scale
│   │   └── DraggableItem: Matrix
│   ├── PaletteSection (Media)
│   │   ├── DraggableItem: GPS
│   │   ├── DraggableItem: Photo
│   │   ├── DraggableItem: Audio
│   │   ├── DraggableItem: Video
│   │   ├── DraggableItem: Signature
│   │   └── DraggableItem: Barcode
│   └── PaletteSection (Advanced)
│       ├── DraggableItem: Slider
│       ├── DraggableItem: Calculated
│       ├── DraggableItem: Note (display text)
│       └── DraggableItem: Composite
├── FormCanvas (center panel, scrollable)
│   ├── CanvasEmptyState ("Drag questions here...")
│   ├── SectionBlock (repeated)
│   │   ├── SectionHeader (title, description, collapse toggle)
│   │   ├── QuestionItem (repeated, draggable ≡)
│   │   │   ├── DragHandle (≡)
│   │   │   ├── QuestionNumber
│   │   │   ├── QuestionText (preview)
│   │   │   ├── QuestionTypeIcon
│   │   │   ├── RequiredIndicator (*)
│   │   │   ├── ValidationBadge (min/max, pattern, etc.)
│   │   │   ├── SkipLogicBadge (if has rules: "→ Q15")
│   │   │   ├── TranslationIndicator (flag icons for languages)
│   │   │   └── Click → select (opens properties panel)
│   │   └── SectionDropZone (between sections)
│   └── QuestionDropZone (between questions)
├── PropertiesPanel (right panel, dynamic)
│   ├── PanelHeader ("Question Properties")
│   ├── BasicTab
│   │   ├── QuestionCode (auto, editable)
│   │   ├── QuestionTextInput (rich text toolbar)
│   │   ├── HelpTextInput
│   │   ├── RequiredToggle
│   │   └── QuestionTypeDisplay (read-only badge)
│   ├── OptionsTab (for choice types)
│   │   ├── OptionListEditor
│   │   │   └── OptionRow (value, label, image, +add, ×delete)
│   │   └── OptionSettings (randomize, "other" toggle)
│   ├── ValidationTab
│   │   ├── MinValueInput / MaxValueInput (number)
│   │   ├── MinLengthInput / MaxLengthInput (text)
│   │   ├── PatternInput (regex, with common patterns dropdown)
│   │   ├── DecimalPlacesInput
│   │   └── CustomValidationBuilder
│   ├── SkipLogicTab
│   │   ├── WhenQuestionSelect (source)
│   │   ├── OperatorSelect (equals, not equals, >, <, etc.)
│   │   ├── ValueInput
│   │   ├── ActionSelect (Show/Hide/Skip to)
│   │   ├── TargetSelect (question or section)
│   │   ├── AddConditionButton (AND/OR)
│   │   └── AddActionButton
│   ├── IndicatorLinkTab
│   │   └── IndicatorMultiSelect (search + link)
│   └── TranslationTab
│       ├── LanguageTabs (fr, sw, es...)
│       └── TranslationInputs (question text, help text, options)
├── SkipLogicOverlay (canvas visual layer)
│   └── LogicLine (SVG path source → target, color-coded)
└── AutosaveIndicator (bottom-right, "Saved at 14:30")

FormPreviewPage
├── DeviceToggle (Mobile / Tablet / Desktop)
├── LanguageSwitcher
├── FormRenderer (interactive, live logic execution)
│   ├── ProgressBar
│   ├── QuestionWidget (type-specific renderer)
│   │   ├── TextWidget
│   │   ├── NumberWidget
│   │   ├── SelectOneWidget (radio)
│   │   ├── SelectMultipleWidget (checkbox)
│   │   ├── DropdownWidget
│   │   ├── LikertWidget
│   │   ├── MatrixWidget
│   │   ├── RankingWidget
│   │   ├── GpsWidget (map + capture)
│   │   ├── PhotoWidget (camera preview)
│   │   ├── AudioWidget (record/playback)
│   │   ├── VideoWidget (record/playback)
│   │   ├── SignatureWidget (canvas pad)
│   │   ├── BarcodeWidget (scanner)
│   │   ├── SliderWidget
│   │   ├── DateWidget (calendar)
│   │   ├── TimeWidget
│   │   ├── NoteWidget (display text)
│   │   └── CompositeWidget (sub-field group)
│   ├── NavigationButtons (Previous, Next, Submit)
│   └── ValidationMessage (inline error display)

FormReviewPage
├── ReadOnlyQuestionList
│   └── ReviewQuestionItem (question text + answer display)
├── CommentThread (per question, inline)
│   ├── CommentItem (author, text, timestamp)
│   └── CommentInput
├── VersionDiffPanel (if version > 1: what changed)
└── ReviewActions (Approve, Request Changes, Reject)

FormDeployPage
├── VersionSelector (dropdown, with version history)
├── EnumeratorTeamPicker
│   ├── TeamMultiSelect
│   └── EnumeratorMultiSelect (searchable)
├── TargetCountInput (per enumerator or team)
├── DueDatePicker
└── DeployButton (with confirmation dialog)
```

---

## Module: Data Collection

```
AssignmentsOverviewPage
├── SearchBar + FilterChips (enumerator, status, study)
├── AssignmentTable (TanStack Table)
│   ├── Column: Enumerator, Survey, Target, Completed, Due, Status
│   └── Row: expandable progress, actions menu
├── CreateAssignmentButton
├── BulkActionBar
│   ├── ExtendDeadline
│   ├── Reassign
│   └── Cancel
└── AssignmentProgressBar (per row)

CreateAssignmentPage
├── QuestionnaireSelect
├── EnumeratorSelect (team picker)
├── TargetCountInput
├── DueDatePicker
├── AreaInput (text/map)
├── NotesTextarea
└── SubmitButton

SubmissionViewerPage
├── FilterBar
│   ├── DateRangePicker
│   ├── EnumeratorSelect
│   ├── StatusSelect (All, Pending, Approved, Rejected)
│   ├── FlagFilter (All, Flagged, Clean)
│   └── SearchInput (respondent ID)
├── SubmissionTable (TanStack Table, virtualized)
│   ├── Column: ID, Enumerator, Date, Duration, Status, Flags
│   ├── CheckboxColumn (multi-select)
│   └── Row: click → submission detail
├── BulkActionBar
│   ├── ApproveSelected
│   ├── RejectSelected
│   ├── FlagSelected
│   └── ExportSelected
└── Paginator (cursor-based)

SubmissionDetailPage
├── ResponseList (scrollable)
│   └── ResponseItem (question text + answer value)
│       ├── TextResponse
│       ├── NumberResponse
│       ├── SelectResponse (selected options chips)
│       ├── GpsResponse (mini map)
│       ├── PhotoResponse (thumbnail, click to expand)
│       ├── AudioResponse (play button)
│       ├── SignatureResponse (image)
│       ├── BarcodeResponse (decoded value)
│       └── FileResponse (download link)
├── MetadataPanel
│   ├── EnumeratorInfo
│   ├── DeviceInfo
│   ├── GpsLocation (mini map)
│   ├── Duration
│   ├── FormVersion
│   ├── SyncStatus
│   └── AuditTrail (review actions)
├── QualityFlagsPanel
│   └── FlagBadge (type, severity, description)
├── ReviewActions
│   ├── ApproveButton (green)
│   ├── RejectButton (red)
│   ├── FlagForBackCheckButton (yellow)
│   └── AddNoteButton
└── NotesSection (read-only previous + new input)

EnumeratorPerformancePage
├── EnumeratorSelector (searchable dropdown)
├── KpiRow
│   ├── KpiCard (Submissions)
│   ├── KpiCard (Quality Score)
│   ├── KpiCard (Flags)
│   └── KpiCard (Avg Duration)
├── TrendChart (submissions over time, line chart)
├── QualityBreakdownChart (flag types, pie/donut chart)
├── RecentSubmissionsMiniList
│   └── MiniSubmissionRow (click → detail)
└── SendMessageButton

SyncMonitorPage
├── DeviceStatusTable
│   ├── Column: Enumerator, Device, Last Sync, Pending Up, Pending Down, Errors
│   └── Row: status badge, last sync time, force sync button
├── ErrorLogTable
│   └── Row: device, error type, timestamp, retry button
└── SyncSummaryBar (total devices, online, offline, errors)
```

---

## Module: Dashboards

```
ExecutiveDashboardPage
├── DateRangeSelector (top bar)
├── KpiRow
│   └── KpiCard (repeated)
│       ├── TrendIcon (up/down/flat)
│       ├── Value (large number)
│       ├── Label
│       └── Sparkline (mini line chart)
├── DashboardGrid (responsive CSS grid)
│   ├── MapWidget (geographic distribution)
│   ├── IndicatorTrackingWidget (top 10 RAG status cards)
│   ├── ActivityFeedWidget (recent actions)
│   ├── AlertsWidget (flags needing attention)
│   ├── StudyProgressWidget (progress bars per study)
│   └── QualityScoreWidget (gauge chart)
└── CustomizeButton (Phase 2: toggle widgets)

StudyDashboardPage
├── FilterBar
│   ├── DateRangePicker
│   ├── DisaggregationSelectors
│   └── DimensionFilters
├── KpiRow
│   ├── SubmissionCounter (target vs actual, progress bar)
│   ├── QualityScoreGauge (circular gauge, color-coded)
│   ├── EnumeratorCount
│   └── CompletionPercentage
├── DashboardGrid
│   ├── SubmissionTrendChart (line/bar, daily submissions)
│   ├── IndicatorTrackingSection
│   │   └── IndicatorCard (repeated, RAG + progress + sparkline)
│   │       ├── RAGStatusDot
│   │       ├── IndicatorName
│   │       ├── CurrentValue vs TargetValue
│   │       ├── ProgressBar
│   │       ├── SparklineChart
│   │       └── Click → indicator detail
│   ├── EnumeratorPerformanceMiniTable
│   ├── MapWidget (submission locations)
│   └── QualityFlagsWidget (flag count, top issues)
└── ExportButton (current view as PNG/PDF)

IndicatorDetailDashboardPage
├── Breadcrumb (Dashboard > Study > Indicator)
├── KpiCard (current value vs target, RAG, % change)
├── TrendChart (line, value over time, target line overlay)
├── BarChart (by district/region)
├── DisaggregationSelector (gender, age group, etc.)
├── DisaggregationChartGroup
│   └── BarChart (repeated per dimension)
├── DataTable (raw values below charts)
├── ExportButton (chart as PNG, data as CSV)
└── BackButton (return to study dashboard)

DashboardWidgetComponents
├── KpiCardWidget
│   ├── Icon
│   ├── Value (formatted number)
│   ├── Label
│   ├── TrendIndicator (arrow + percentage)
│   └── Sparkline (mini ECharts sparkline)
├── BarChartWidget
│   ├── ECharts (bar, horizontal, stacked, grouped)
│   ├── Legend
│   └── DrillDownHandler (click bar → detail)
├── LineChartWidget
│   ├── ECharts (line, area, smooth, stepped)
│   ├── Legend (toggle series)
│   ├── Zoom (drag to zoom)
│   └── Tooltip (hover data point)
├── PieChartWidget
│   ├── ECharts (pie, donut, rose)
│   ├── Legend (click to toggle)
│   └── Tooltip
├── ScatterChartWidget
├── HeatmapWidget
├── GaugeWidget (quality score gauge)
├── MapWidget
│   ├── MapLibre GL (base map)
│   ├── MarkerLayer (submission points)
│   ├── HeatmapLayer
│   ├── ChoroplethLayer (by region)
│   ├── GeofenceOverlay (study area boundary)
│   └── Popup (click feature → info)
├── DataTableWidget (embedded mini table)
├── ActivityFeedWidget (scrollable list)
├── AlertsWidget (flag list with severity)
└── ProgressBarWidget (target vs achieved)
```

---

## Module: Reports

```
ReportLibraryPage
├── SearchBar + FilterChips (study, type, status)
├── Tabs: Reports | Templates
├── ReportTable
│   ├── Column: Title, Study, Type, Status, Generated, Actions
│   └── Row: click → viewer, more menu (export, share, delete)
└── GenerateReportButton

GenerateReportPage (Wizard)
├── Step1TemplateSelect
│   └── TemplateCardGrid (repeated, with preview)
├── Step2DataSource
│   ├── StudySelect
│   └── DateRangePicker
├── Step3ContentSelect
│   └── IndicatorCheckboxList (all linked indicators)
├── Step4Branding
│   ├── LogoPreview
│   └── ColorPicker
├── Step5Generate
│   └── GenerationProgress (stepped status: "Querying data...", "Generating charts...", "Compiling report...")
└── WizardNavigation

ReportEditorPage
├── SectionSidebar (table of contents)
│   └── SectionLink (repeated, click → scroll)
├── ContentArea
│   ├── EditableSection (repeated)
│   │   ├── SectionTitle (editable)
│   │   ├── RichTextEditor (tiptap or lexical)
│   │   ├── EmbeddedChart (from study data)
│   │   ├── EmbeddedTable (indicator values)
│   │   └── AIGeneratedBlock (Phase 2, with regenerate button)
│   └── SectionControls (add, remove, reorder)
├── Toolbar
│   ├── SaveDraftButton
│   ├── FinalizeButton
│   └── RegenerateDataButton
└── VersionIndicator (v1, last saved timestamp)

ReportViewerPage
├── TableOfContentsSidebar
├── ReportContent (pagination or scroll)
│   ├── CoverPage (title, date, org logo)
│   ├── ExecutiveSummary
│   ├── MethodologySection
│   ├── FindingsSection
│   │   ├── ChartBlocks
│   │   └── TableBlocks
│   ├── IndicatorStatusSection (RAG table)
│   ├── ConclusionsSection
│   └── AnnexesSection
├── ExportButtons (PDF, Word, HTML)
├── ShareButton (email or link)
└── DownloadProgress

TemplateGalleryPage
├── TemplateCardGrid
│   └── TemplateCard
│       ├── ThumbnailPreview
│       ├── Title
│       ├── Description
│       ├── UseTemplateButton
│       └── PreviewOverlay (click to expand)
├── SearchBar
└── FilterChips (type)
```

---

## Shared / Reusable Components

```
┌─────────────────────────────────────────────────┐
│                  SHARED COMPONENTS               │
├─────────────────────────────────────────────────┤
│ StatusBadge         → color + icon + text       │
│ KpiCard             → icon + value + label +    │
│                        trend + sparkline        │
│ ProgressBar         → value + max + label +     │
│                        color (RAG)              │
│ EmptyState          → illustration + title +    │
│                        subtitle + CTA           │
│ ErrorFallback       → illustration + message +  │
│                        retry + error code       │
│ LoadingSkeleton     → shape-matching pulse      │
│                        placeholder              │
│ ConfirmDialog       → title + body + cancel +   │
│                        confirm (destructive:    │
│                        red)                     │
│ SlideInPanel        → right-slide + backdrop +  │
│                        close + esc              │
│ FilterChip          → label + remove (×)        │
│ SearchInput         → icon + debounced input    │
│ DateRangePicker     → calendar + preset options │
│ Avatar              → image + initials +        │
│                        status dot               │
│ UserBadge           → avatar + name + role      │
│ Breadcrumb          → segments + "..." +        │
│                        truncation               │
│ TabList             → underline tabs + badge +  │
│                        scrollable               │
│ Paginator           → page numbers + prev/next  │
│                        + page size selector     │
│ Toast               → icon + message + action   │
│                        (success/error/warning/  │
│                         info/offline)           │
│ Tooltip             → hover/focus content       │
│ SkeletonText        → pulsing text line         │
│ SkeletonCard        → pulsing card shape        │
│ SkeletonTable       → pulsing table rows        │
│ DataTable           → TanStack Table wrapper    │
│                        sortable, filterable,    │
│                        resizable, selectable,   │
│                        paginated, virtualized   │
│ FilterBar           → chips + date + search     │
│ ActionMenu          → kebab dropdown menu       │
│ AnnouncementBanner  → persistent site-wide msg  │
│ OfflineBanner       → "You're offline" bar      │
│ KeyboardShortcuts   → "?" overlay help dialog   │
└─────────────────────────────────────────────────┘
```

---

## Component State Ownership

| Component | Render | State Source |
|-----------|--------|-------------|
| Sidebar | Server | Zustand (ui-store: collapsed/open) |
| TopBar | Server | TanStack Query (user, notifications) |
| Breadcrumb | Server | URL path segments |
| DataTable | Client | TanStack Query (data) + URL params (sort/filter/page) |
| Form Canvas | Client | Zustand (form-builder-store) + TanStack Query (save) |
| Properties Panel | Client | Zustand (selected question) |
| Dashboard Grid | Client | TanStack Query (widget data) + Zustand (layout) |
| Charts | Client | TanStack Query (aggregated data) |
| Map | Client | TanStack Query (geo data) |
| Report Content | Client | TanStack Query (report data) |
| Wizard Steps | Client | React Hook Form (form state) |
| Modals | Client | Zustand (modal stack) |
| Notification Center | Client | TanStack Query (notifications) |
| Search | Client | TanStack Query (search results, debounced) |
| Empty States | Server | Conditional render based on data length |
| Error Boundaries | Client | React error boundary state |
| Loading Skeletons | Server | React Suspense fallback |
