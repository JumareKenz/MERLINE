# Questionnaire Design

## 1. Question Types Catalogue

### 1.1 Single Select (SINGLE_SELECT)

**Description:** One choice from a predefined list of options. Use when categories are mutually exclusive.

**UI Pattern:** Radio buttons (≤6 options), otherwise dropdown picker.

**Validation Rules:**
- Value must be exactly one of the defined option values
- Null not allowed if required
- Options must be unique
- "Other (specify)" option must have a companion text field

**Example:**
```
Q1. What is your sex?
  [ ] Male
  [ ] Female
```

**Best Practices:**
- Options must be exhaustive (include "Other" or "None of the above" when applicable)
- Options must be mutually exclusive
- Order options logically (natural order, frequency order, or alphabetical)
- Avoid too many options (break into hierarchical selection if >8)

### 1.2 Multiple Select (MULTIPLE_SELECT)

**Description:** Multiple choices from a predefined list. Use when categories are not mutually exclusive.

**UI Pattern:** Checkboxes.

**Validation Rules:**
- All selected values must be in the option list
- Minimum selections (if specified): count(selected) ≥ minSelections
- Maximum selections (if specified): count(selected) ≤ maxSelections
- Null allowed if not required

**Example:**
```
Q2. Which of the following services have you used in the last 12 months? (Select all that apply)
  [ ] Antenatal care
  [ ] Delivery services
  [ ] Immunization
  [ ] Family planning
  [ ] HIV testing
  [ ] None of the above
```

**Best Practices:**
- Always include "None" or "None of the above" as exclusive option
- Exclusive options should be listed last
- Label as "Select all that apply" clearly
- Limit to ≤15 options for usability

### 1.3 Dropdown (DROPDOWN)

**Description:** Compact single select for longer option lists.

**UI Pattern:** Dropdown/picker.

**Validation Rules:** Same as SINGLE_SELECT.

**Best Practices:**
- Use when ≥7 options
- Pre-sort logically
- Include search/filter for long lists (>20 options)
- Show selected value clearly after selection

### 1.4 Text Short (TEXT_SHORT)

**Description:** Short text response (≤255 characters).

**Validation Rules:**
- maxLength ≤ 255 (default)
- minLength ≥ 0
- Regex pattern matching for structured data (email, phone, national ID, etc.)
- Trim whitespace

**Common Regex Patterns:**
| Type | Pattern | Example |
|------|---------|---------|
| Email | ^[\w\.-]+@[\w\.-]+\.\w{2,}$ | user@example.com |
| Phone | ^\+?[\d\s\-\(\)]{7,20}$ | +254 712 345 678 |
| National ID | ^[A-Z0-9]{6,20}$ | ID123456 |
| Alphanumeric | ^[A-Za-z0-9]+$ | AB123 |

### 1.5 Text Long (TEXT_LONG)

**Description:** Long text / paragraph response.

**Validation Rules:**
- maxLength ≤ 10000 (configurable)
- minLength ≥ 0
- Rich text or plain text option

### 1.6 Numeric Integer (NUMERIC_INT)

**Description:** Whole number value.

**Validation Rules:**
- Must be integer (no decimal places)
- minValue ≤ value ≤ maxValue
- Must not be negative unless explicitly allowed
- Check constraints: e.g., age 0-120, household size 1-50

**Examples:**
```
Q3. How old are you? (in completed years)
  [___] years  [range: 0-120]

Q4. How many people live in your household?
  [___]  [range: 1-50]
```

### 1.7 Numeric Decimal (NUMERIC_DECIMAL)

**Description:** Decimal number value.

**Validation Rules:**
- decimalPlaces precision enforced
- minValue ≤ value ≤ maxValue
- Rounding rule defined (not default, not truncate)

### 1.8 Percentage (PERCENTAGE)

**Description:** Percentage value (0-100).

**Validation Rules:**
- 0 ≤ value ≤ 100
- Up to 2 decimal places
- Display with % symbol

### 1.9 Date (DATE)

**Description:** Calendar date.

**Validation Rules:**
- ISO 8601 format (YYYY-MM-DD)
- minDate ≤ value ≤ maxDate
- Logical constraints: date_of_birth < interview_date
- Cannot be in future unless study requires it
- Date components valid (month 1-12, day valid for month)

### 1.10 Time (TIME)

**Description:** Time of day.

**Validation Rules:**
- HH:MM:SS 24-hour format
- 00:00:00 ≤ value ≤ 23:59:59
- Duration patterns: if collecting start and end times, end > start

### 1.11 DateTime (DATETIME)

**Description:** Combined date and time.

**Validation Rules:**
- ISO 8601: YYYY-MM-DDTHH:MM:SS
- Timezone must be captured (UTC + offset)
- Cannot be in future for retrospective data

### 1.12 GPS (GPS)

**Description:** Geographic coordinate capture.

**Data Collected:**
- Latitude (-90 to 90)
- Longitude (-180 to 180)
- Altitude (meters)
- Accuracy (meters)
- Timestamp

**Validation Rules:**
- Valid lat/lon ranges
- Accuracy ≤ threshold (default ≤ 10m for outdoor, ≤ 50m for general)
- Altitude within plausible range (-500m to 9000m)
- Geofence: point must be within study area (plus configurable buffer)
- GPS must be enabled on device; cannot be manually entered

**Accuracy Standards:**
| Context | Acceptable Accuracy | Target Accuracy |
|---------|-------------------|-----------------|
| Outdoor, open sky | ≤10m | ≤5m |
| Outdoor, urban canyon | ≤30m | ≤10m |
| Indoor | ≤50m | ≤25m |
| Remote/rural | ≤15m | ≤5m |

### 1.13 Photo (PHOTO)

**Description:** Single photograph capture.

**Validation Rules:**
- File format: JPEG, PNG (configurable)
- Max file size: 10MB (configurable)
- Min resolution: 1920×1080 (configurable)
- Must be captured in-app (not from gallery unless verified)
- Timestamp and GPS metadata must be preserved
- SHA-256 hash computed for integrity

### 1.14 Video (VIDEO)

**Description:** Video recording.

**Validation Rules:**
- File format: MP4, AVI (configurable)
- Max file size: 100MB (configurable)
- Max duration: 10 minutes (configurable)
- Min resolution: 720p
- Must be captured in-app

### 1.15 Audio (AUDIO)

**Description:** Audio recording.

**Validation Rules:**
- File format: MP3, WAV, M4A (configurable)
- Max file size: 50MB (configurable)
- Max duration: 30 minutes (configurable)
- Bitrate: ≥128kbps for clarity
- Must be captured in-app

### 1.16 Signature (SIGNATURE)

**Description:** Digital signature capture.

**Validation Rules:**
- Format: PNG with transparency
- Must be captured on device screen
- Must include timestamp
- Include pen stroke data for verification

### 1.17 Barcode / QR Code (BARCODE)

**Description:** Scan barcode or QR code.

**Validation Rules:**
- Must decode to valid format (EAN-13, Code 128, QR, etc.)
- Checksum validation where applicable
- Timestamp of scan recorded
- Fallback to manual entry if scan fails

### 1.18 Ranking (RANKING)

**Description:** Ordered ranking of options.

**UI Pattern:** Drag-and-drop list or numbered inputs.

**Validation Rules:**
- All options must be ranked exactly once (no ties)
- Minimum 3 options required
- No duplicate ranks

**Example:**
```
Q5. Rank the following problems in your community from most (1) to least (5) serious:
  [ ] Unemployment
  [ ] Access to water
  [ ] Healthcare
  [ ] Education
  [ ] Security
```

### 1.19 Likert Scale (LIKERT)

**Description:** Agreement or evaluation scale with balanced options.

**Standard Scales:**

| Scale Type | Options |
|------------|---------|
| 5-point Agreement | Strongly Agree, Agree, Neutral, Disagree, Strongly Disagree |
| 5-point Frequency | Always, Often, Sometimes, Rarely, Never |
| 5-point Quality | Very Good, Good, Acceptable, Poor, Very Poor |
| 5-point Satisfaction | Very Satisfied, Satisfied, Neutral, Dissatisfied, Very Dissatisfied |
| 7-point Agreement | Strongly Agree, Agree, Somewhat Agree, Neutral, Somewhat Disagree, Disagree, Strongly Disagree |
| 4-point (forced) | Strongly Agree, Agree, Disagree, Strongly Disagree (no neutral) |

**Validation Rules:**
- Response must be exactly one option
- Scale must be balanced (equal positive and negative)
- Direction must be consistent within a scale
- Neutral option optional but must be intentional (not default)

**Best Practices:**
- Label all scale points (not just endpoints)
- Consistent direction across all items in a battery
- Use 5-point as default; 7-point for finer discrimination
- Avoid 3-point (too coarse) unless for specific tracking
- Randomize item order where possible to reduce order effects

### 1.20 Slider (SLIDER)

**Description:** Continuous scale on a visual slider.

**Validation Rules:**
- minValue ≤ value ≤ maxValue
- Step size defined (1, 0.1, 0.01, etc.)
- Initial position at midpoint or leftmost
- Display value label on interaction

### 1.21 Matrix (MATRIX)

**Description:** Grid of sub-questions sharing the same response options.

**Validation Rules:**
- Each row must have a response
- Column options consistent across rows
- Header labels for both rows and columns

**Example:**
```
Q6. How satisfied are you with the following services?

                           Very Satisfied  Satisfied  Neutral  Dissatisfied  Very Dissatisfied
Antenatal care                  [ ]            [ ]       [ ]        [ ]            [ ]
Delivery services               [ ]            [ ]       [ ]        [ ]            [ ]
Immunization                    [ ]            [ ]       [ ]        [ ]            [ ]
Family planning                 [ ]            [ ]       [ ]        [ ]            [ ]
```

**Best Practices:**
- Limit to ≤12 rows (respondent fatigue)
- Limit to ≤7 columns
- Avoid matrix-within-matrix
- Use for grouped items with shared scale

### 1.22 Note (NOTE)

**Description:** Display-only text. Does not collect data.

**Use Cases:** Section headers, instructions, consent statements, information text.

**Validation Rules:** None (display only).

### 1.23 Calculated (CALCULATED)

**Description:** Auto-computed value based on other questions. Does not require user input.

**Examples:**
- Body Mass Index = weight(kg) / height(m)²
- Age from date of birth and interview date
- Total score from sub-scores
- Duration = end_time - start_time

**Validation Rules:**
- Formula must be valid (audited at design time)
- Formula references must be stable (by question code)
- Circular references prohibited
- Null propagation: if any referenced question is null, calculated value is null

### 1.24 Composite (COMPOSITE)

**Description:** Multiple sub-fields grouped as one logical unit.

**Examples:**
- Full name (first, middle, last)
- Address (street, city, state, ZIP, country)
- Geo-point (lat, lon, altitude, accuracy)

**Validation Rules:**
- All required sub-fields must have non-null values
- Sub-field validation per their individual types
- Group-level validation (e.g., address must have at least city or GPS)

---

## 2. Questionnaire Structure

### 2.1 Structural Hierarchy

```
Questionnaire
├── Metadata (study_id, version, language, etc.)
├── Consent Section
├── Section A: [Title]
│   ├── Question A1 (type, validation)
│   ├── Question A2 (type, validation)
│   │   └── Sub-section A2a: [Title] (conditional)
│   │       ├── Question A2a_1
│   │       └── Question A2a_2
│   └── Repeat Group A3 (loop over list)
│       ├── Question A3_1
│       └── Question A3_2
├── Section B: [Title]
│   └── ...
└── End Section (completion message, thank you)
```

### 2.2 Consent Section

**Required Position:** Always first.

**Content:**
1. Study introduction (purpose, duration, risks, benefits, confidentiality)
2. Contact information for ethics committee
3. Consent question: "Do you agree to participate?"
   - If NO → Thank and end (skip all other sections)
   - If YES → Continue
4. Signature / verbal consent witness confirmation
5. For children: parent/guardian consent + child assent

### 2.3 Section Design Rules

| Rule | Description |
|------|-------------|
| Logical grouping | Questions on same topic in one section |
| Order | General → Specific (funnel approach) |
| Sensitive topics | Later in questionnaire (after rapport) |
| Demographics | Typically early (but sensitive demographics later) |
| Section transitions | Brief transition text between sections |
| Progress indicator | Show section x of y |
| Break points | Long questionnaires: suggest natural break points |
| Section codes | Unique codes (SEC-A, SEC-B, etc.) |

### 2.4 Repeat Groups

**Description:** A block of questions that repeats for each item in a list (e.g., each child in household, each visit to health facility).

**Configuration:**
- repeatSource: List of items (from previous question or external list)
- repeatLabel: How each repeat is labeled ("Child 1", "Child 2", etc.)
- maxRepetitions: Upper limit (prevent infinite loop)
- minRepetitions: Lower limit

**Validation:**
- Each completed repeat must pass its own validation
- Partial repeats allowed? (configurable)

### 2.5 Questionnaire Sections by Study Type

| Study Type | Typical Sections |
|-------------|------------------|
| Household Survey | Consent → Household Roster → Housing → Water/Sanitation → Health → Education → Nutrition → Wealth → Anthropometry |
| KAP Study | Consent → Demographics → Knowledge → Attitudes → Practices → Exposure → Self-efficacy |
| Facility Assessment | Facility ID → Infrastructure → Equipment → Staffing → Services → Quality → Management → Finance |
| FGD Guide | Introduction → Warm-up → Key topic 1 → Key topic 2 → Summary → Closing |
| KII Guide | Introduction → Background → Topic 1 → Topic 2 → Challenges → Recommendations → Closing |
| Market Assessment | Location → Market Characteristics → Supply Chain → Prices → Demand → Constraints |

---

## 3. Skip Logic / Conditional Logic Patterns

### 3.1 Simple Skip

```
IF [condition] THEN [skip to question/section]
     ELSE [continue normally]

Pattern:
  Q1: Have you attended ANC in the last 12 months?
      [ ] Yes
      [ ] No

  IF Q1 = "No" → SKIP to Q6 (next section)
  IF Q1 = "Yes" → CONTINUE to Q2

  Q2: How many times did you attend?
      [___]
```

### 3.2 Show / Hide

```
SHOW [question/section] IF [condition]
     ELSE HIDE

Pattern:
  Q5: Are you currently pregnant?
      [ ] Yes
      [ ] No
      [ ] Don't know / Prefer not to say

  SHOW Q5a IF Q5 = "Yes"
  Q5a: How many months pregnant are you?
       [___] months
```

### 3.3 Complex Conditions

```
Multiple conditions using AND/OR:

  SHOW Q10 IF (Q1 = "Yes" AND Q2 ≥ 3) OR Q7 = "Yes"
  
  Limitation: Maximum 5 conditions per skip rule (usability limit)
  Evaluation: Left-to-right with parentheses support
```

### 3.4 Calculation-based Skip

```
IF [calculated value meets criteria] THEN [...]

  Example:
  calc_age = interview_date - date_of_birth
  IF calc_age < 18 THEN SHOW child_assent_section
```

### 3.5 Loop / Repeat Condition

```
REPEAT [block] FOR EACH [item in list]

  Example:
  Q7: List all children under 5 in this household
      [Child Name 1]
      [Child Name 2]
      [...]
  
  FOR EACH child in Q7:
      REPEAT module_child_health
```

### 3.6 Skip Logic Rules

| Rule | Description |
|------|-------------|
| No infinite loops | System must detect and prevent circular skip logic |
| Reachability | Every question must be reachable through at least one path |
| Dead ends | Every path must end at questionnaire completion (unless consent=no) |
| Source before target | Target question must appear after source in flow order |
| Version validation | Skip logic validated at design time and at submission time |
| Null safety | If source question is null, default behavior = CONTINUE (if =) or follow ELSE path |

### 3.7 Skip Logic Testing

| Test | Description |
|------|-------------|
| Happy path | All questions answered, no skips triggered |
| Skip path each branch | Test every conditional branch individually |
| All skips triggered | Path where every possible skip is activated |
| Null/missing source | What happens if source question was skipped or null |
| Edge values | Boundary values for numeric conditions (=, <, >, ≤, ≥) |
| Performance test | Deep nesting (3+ levels), complex conditions (5+ terms) |

---

## 4. Validation Rule Patterns

### 4.1 Built-in Type Validation (by question type)

See Section 1 above for per-type validation.

### 4.2 Cross-field Validation

| Pattern | Implementation | Example |
|---------|---------------|---------|
| Consistency | Compare two or more responses | age = calculated_age ± 1 year |
| Sum check | Sum of parts = total | Total_children = boys_count + girls_count |
| Sequence | Ordered values respect chronology | start_date < end_date |
| Dependency | If A = X then B must be Y | IF pregnancy = "No" THEN months_pregnant must be null |
| Range composite | Combined value in valid range | BMI 12-60 |
| Lookup | Value must exist in reference data | Village code matches village name lookup |

### 4.3 Custom Validation Expressions

Support a validation expression language with:

| Operator | Supported | Example |
|----------|-----------|---------|
| Arithmetic | +, -, ×, / | Q1 + Q2 = Q3 |
| Comparison | =, ≠, <, >, ≤, ≥ | Q1 > 18 |
| Logical | AND, OR, NOT | (Q1 = "Yes") AND (Q2 ≥ 5) |
| String | length, contains, matches | length(Q1) > 0 |
| Set | in, not in | Q1 in {1, 2, 3} |
| Null | is null, is not null | Q1 is not null |
| Date | days_between, months_between, years_between | days_between(Q1, Q2) ≤ 30 |

### 4.4 Validation Timing

| Timing | Scope | Example |
|--------|-------|---------|
| On question | Immediately after answer | Range check on numeric input |
| On section | After section completed | Section-level consistency check |
| On submission | After entire questionnaire | Cross-section validation |
| On server | After sync to server | Duplicate detection, geofence |
| On analysis | During data cleaning | Outlier detection, pattern analysis |

---

## 5. Translation and Localization Requirements

### 5.1 Multi-language Questionnaire Structure

```
Questionnaire (primary language: en)
├── Translation (fr)
│   └── Question Q1:
│       Primary (en): "What is your age?"
│       Translation (fr): "Quel âge avez-vous?"
├── Translation (sw)
│   └── Question Q1:
│       Primary (en): "What is your age?"
│       Translation (sw): "Una na umri gani?"
└── ...
```

### 5.2 Translation Rules

| Rule | Description |
|------|-------------|
| Question IDs preserved | Same question ID across all languages |
| Complete translation | All questions, options, help text, and validation messages must be translated |
| Back-translation | Verify translation accuracy by translating back to source language |
| Reviewer | Translation must be reviewed by a subject matter expert fluent in both languages |
| Context preserved | Translated text must preserve original meaning (not literal translation) |
| Format preservation | Placeholders, variables, and skip logic references must remain un-translated |
| Option order | Option order should be the same across languages (or culturally appropriate if order changes) |
| Consent text | Consent language must be in respondent's preferred language |
| Illiteracy support | Audio recording of consent and key questions for low-literacy respondents |

### 5.3 Localization Beyond Translation

| Element | Requirement |
|---------|-------------|
| Units | Local units (kg vs lb, km vs miles, currency) |
| Date formats | DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD |
| Number format | 1,234.56 vs 1.234,56 (decimal and thousand separators) |
| Cultural sensitivity | Avoid offensive imagery, colors, symbols |
| Calendar | Gregorian plus local calendar support |
| Names | Local name order (family first vs given first) |
| Address format | Country-specific address structure |
| Phone format | Country code prefix, local formatting |
| Time format | 12-hour vs 24-hour |

### 5.4 Audio Support

- Question text can be recorded as audio for each language
- Options can have audio recordings
- Consent form must have audio recording
- Audio files linked to question/option IDs (not text)

---

## 6. Media Integration Patterns

### 6.1 Photo Capture

```
Q1: Take a photo of the water source
    [Camera Button] → Capture → Preview → Accept/Retake
    Captured: photo.jpg
    Metadata: lat, lon, timestamp, device_id, hash
```

**Requirements:**
- In-app camera (no external camera app)
- Preview before finalizing
- Geotagging enabled
- Integrity hash computed on capture
- Timestamp from server-synced time (not device)

### 6.2 Audio Recording

```
Q2: Tell us about your experience with this health facility
    [Record Button] → Record → Stop → Playback → Accept/Retake
    Captured: audio.mp3
    Metadata: duration, file_size, timestamp, hash
```

**Requirements:**
- Waveform visualization during recording
- Automatic silence detection (optional)
- Pause/resume support
- Background noise warning

### 6.3 Video Recording

```
Q3: Show us how you prepare the ORS solution
    [Record Button] → Record → Stop → Playback → Accept/Retake
    Captured: video.mp4
    Metadata: duration, resolution, file_size, timestamp, hash
```

**Requirements:**
- Max duration enforcement
- Resolution setting (low/medium/high)
- Storage warning before recording
- Compression on sync (optional)

### 6.4 GPS Capture

```
Q4: Mark the location of the facility
    [Capture GPS Button]
    Captured: {lat: -1.2834, lon: 36.8156, accuracy: 5m, alt: 1540m}

    [Show on Map] option to verify
```

**Requirements:**
- GPS accuracy indicator (colored dot: green=good, yellow=ok, red=poor)
- Map verification option
- Satellite count display
- Manual override only with supervisor approval

### 6.5 Signature Capture

```
Q5: Signature of respondent (or witness for verbal consent)
    [Signature Pad]
    Captured: signature.png + timestamp
```

### 6.6 Barcode / QR Scan

```
Q6: Scan the household QR code
    [Scan Button] → Camera → Decode → Verify
    Captured: "HH-2024-001529"
```

### 6.7 Media Storage Rules

| Media Type | Max Size | Format | Compression |
|------------|----------|--------|-------------|
| Photo | 10MB | JPEG/PNG | Optional on sync |
| Audio | 50MB | MP3/M4A | Optional on sync |
| Video | 100MB | MP4 | Required on sync |
| Signature | 1MB | PNG | None |

---

## 7. Best Practices for Question Wording

### 7.1 Golden Rules

| Rule | Description |
|------|-------------|
| Simple language | Use everyday words, not technical jargon |
| Short sentences | Aim for ≤20 words per question |
| One concept per question | Avoid double-barreled questions |
| Specific and concrete | Not abstract or vague |
| No leading questions | Do not suggest an answer |
| No loaded language | Avoid emotionally charged words |
| Complete sentences | Full question, not fragments |
| Clear timeframe | Specify the reference period |
| Neutral tone | No implied judgment |

### 7.2 Question Wording Examples

| Poor | Good | Issue |
|------|------|-------|
| "Don't you agree that immunization is important?" | "How important do you think immunization is for children's health?" | Leading question (assumes agreement) |
| "How many times did you visit the health facility and how satisfied were you?" | "How many times did you visit a health facility in the last 12 months?" — "Overall, how satisfied were you with your last visit?" | Double-barreled |
| "Did you use family planning methods?" | "Have you or your partner used any method to delay or avoid pregnancy in the last 12 months?" | Vague, unclear reference period |
| "What is your income?" | "What was your total household income from all sources in the last month?" | Too broad, no timeframe |
| "Do you have good sanitation?" | "What type of toilet facility does your household use?" | Subjective vs objective |

### 7.3 Response Option Design

| Principle | Example |
|-----------|---------|
| Exhaustive | Include all possible options (+ "Other") |
| Mutually exclusive | No overlapping categories |
| Balanced | Equal positive and negative options (for Likert) |
| Ordered logically | Low to high, negative to positive |
| Consistent scale | Same number of options across related questions |
| "Don't know" option | Include for knowledge questions; avoid for behavioral questions |
| "Prefer not to answer" | Include for sensitive questions |

### 7.4 Sensitive Question Strategies

| Strategy | Description | Example |
|----------|-------------|---------|
| Normalization | Precede with statement that behavior is common | "Many people have experienced..." |
| Self-administered | Let respondent answer privately (CASI) | Tablet handed to respondent |
| Indirect questioning | Ask about others' behavior | "How do most people in your community feel about..." |
| Randomized response | Known probability of answering sensitive question | Statistical adjustment applied |
| Empathetic framing | Express understanding | "This can be difficult to talk about..." |

---

## 8. Common Questionnaire Design Errors to Prevent

### 8.1 Design-time Detection (Platform-enforced)

| Error ID | Error | Description | Detection |
|----------|-------|-------------|-----------|
| QDE-001 | Double-barreled question | Question asks two things simultaneously | AI review suggests splitting |
| QDE-002 | Leading question | Question suggests a "correct" answer | AI review flags biased language |
| QDE-003 | Missing "Other" option | Closed question with non-exhaustive options | Validation: if options < real categories |
| QDE-004 | Overlapping options | Options not mutually exclusive | Cross-option validation |
| QDE-005 | Unbalanced scale | Likert with unequal positive/negative | Count options each side |
| QDE-006 | Unclear timeframe | No reference period in question | Keyword check: "last 12 months", "ever", etc. |
| QDE-007 | Missing consent section | Questionnaire without consent | Structural validation |
| QDE-008 | No indicator mapping | Questions not linked to any indicator | Indicator mapping check |
| QDE-009 | Idle question | Question that doesn't serve an objective | Mapping to objective/research question |
| QDE-010 | Circular skip logic | Skip logic creates a loop | Graph cycle detection |
| QDE-011 | Dead-end section | Section with no path to completion | Reachability analysis |
| QDE-012 | Translation missing | Not all questions translated | Translation completeness check |
| QDE-013 | Excessive length | >100 questions or >60 minutes | Duration estimation |
| QDE-014 | Jargon/unclear language | Technical terms not explained | Readability score (Flesch-Kincaid) |
| QDE-015 | Sensitive question first | Personal information before rapport | Section order validation |

### 8.2 Pre-test Detection (Field-identified)

| Error | Detection Method | Fix |
|-------|-----------------|-----|
| Question misunderstood | Respondents ask for clarification | Reword question |
| Skip logic not working as intended | Wrong path followed | Fix logic |
| Too long | Test duration exceeds planned | Remove questions |
| Culturally inappropriate | Participant discomfort | Modify wording |
| Translation issues | Different interpretation | Review translation |
| Missing options | "Other" frequently selected | Add common options |
| Options not balanced | All responses cluster one end | Adjust scale |

### 8.3 Post-collection Detection (Data-driven)

| Error | Signal | Impact | Fix |
|-------|--------|--------|-----|
| High missing rate on question | >10% missing on required question | Biased estimates | Review wording, place in form |
| Low variance on question | All respondents give same answer | No information | Remove or reword |
| High "Other" rate | >20% select "Other" | Missing categories | Add categories |
| High "Don't know" rate | >15% select "Don't know" | Low data quality | Review question clarity |
| Systematic pattern | All responses in one column of matrix | Straight-lining | Reduce matrix size, add reverse-coded items |

### 8.4 Quality Gate for Questionnaire Release

**Before a questionnaire can be published for data collection, it MUST pass these gates:**

| Gate | Criteria | Method |
|------|----------|--------|
| Structural | All required metadata present; consent section present; at least 1 section with ≥1 question | Automated |
| Mapping | Every question mapped to ≥1 indicator or research question | Automated |
| Logic | All skip logic paths verified, no cycles, all questions reachable | Automated |
| Type validation | All validation rules are valid for their question types | Automated |
| Translation | 100% of questions and options translated into all target languages | Automated |
| Pre-test | Pre-test completed with ≥10 submissions; issues documented and addressed | Manual |
| Technical review | Methodology, wording, and flow reviewed by ≥2 subject matter experts | Manual |
| Ethics review | Ethics officer has reviewed sensitive questions and consent | Manual |
| Approval | Research Director or designee has signed off | Manual |
