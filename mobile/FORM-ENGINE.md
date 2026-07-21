# Form Engine Architecture

## 1. Overview

The form engine is a custom questionnaire rendering system that operates 100% client-side. It loads questionnaire definitions from the local Drift database, renders each question according to its type, evaluates skip logic and validation rules, computes calculated fields, and manages form submission state.

**Key design decisions:**
- No web views — native Flutter widgets for all 24 question types
- Questionnaire definition is a JSON structure stored locally
- All logic evaluated on-device (skip, validation, calculation)
- Autosave every 15 seconds + crash recovery
- Offline submission queuing integrated

---

## 2. Questionnaire Definition JSON Structure

```json
{
  "id": "qnr_001",
  "code": "SURV-001",
  "title": "Household Health Survey",
  "version": 2,
  "language": "en",
  "translations": ["fr", "sw"],
  "estimated_duration": 30,
  "consent_section": {
    "required": true,
    "introduction_text": "This survey collects health data...",
    "contact_info": "Ethics committee: +254...",
    "consent_question_id": "Q0"
  },
  "sections": [
    {
      "id": "sec_1",
      "code": "SEC-A",
      "title": "Household Demographics",
      "description": "Basic household information",
      "order_index": 1,
      "repeatable": true,
      "repeat_label": "Household Member {n}",
      "max_repetitions": 15,
      "questions": [
        {
          "id": "Q1",
          "code": "Q1",
          "text": "What is the name of the household head?",
          "help_text": "Enter full name",
          "question_type": "text_short",
          "is_required": true,
          "order_index": 1,
          "validation_rules": {
            "min_length": 2,
            "max_length": 100,
            "pattern": null
          },
          "translations": {
            "fr": "Quel est le nom du chef de ménage?",
            "sw": "Jina la mkuu wa kaya ni nani?"
          }
        },
        {
          "id": "Q2",
          "code": "Q2",
          "text": "How many people live in this household?",
          "question_type": "numeric_int",
          "is_required": true,
          "order_index": 2,
          "validation_rules": {
            "min": 1,
            "max": 50
          }
        },
        {
          "id": "Q3",
          "code": "Q3",
          "text": "What is the main source of drinking water?",
          "question_type": "select_one",
          "is_required": true,
          "order_index": 3,
          "options": [
            {"value": "piped", "label": "Piped into dwelling", "label_translations": {"fr": "Canalisé dans le logement", "sw": "Bomba ndani ya nyumba"}},
            {"value": "borehole", "label": "Protected borehole", "label_translations": {"fr": "Forage protégé", "sw": "Kisima cha maji"}},
            {"value": "well", "label": "Protected well", "label_translations": {"fr": "Puits protégé", "sw": "Kisima"}},
            {"value": "surface", "label": "Surface water (river, lake)", "label_translations": {"fr": "Eau de surface", "sw": "Maji ya uso"}},
            {"value": "other", "label": "Other", "has_specify": true}
          ],
          "skip_logic": {
            "Q4": {
              "condition": "value == 'surface'",
              "action": "show"
            },
            "Q5": {
              "condition": "value != 'piped'",
              "action": "show"
            }
          }
        },
        {
          "id": "Q4",
          "code": "Q4",
          "text": "How far is the water source from your dwelling?",
          "question_type": "select_one",
          "is_required": false,
          "order_index": 4,
          "options": [
            {"value": "less_15", "label": "Less than 15 minutes"},
            {"value": "15_30", "label": "15-30 minutes"},
            {"value": "30_60", "label": "30-60 minutes"},
            {"value": "over_60", "label": "More than 60 minutes"}
          ]
        },
        {
          "id": "Q5",
          "code": "Q5",
          "text": "Please rate the quality of your drinking water",
          "question_type": "likert",
          "is_required": false,
          "order_index": 5,
          "likert_config": {
            "scale_type": "quality",
            "options": [
              {"value": "1", "label": "Very Good"},
              {"value": "2", "label": "Good"},
              {"value": "3", "label": "Acceptable"},
              {"value": "4", "label": "Poor"},
              {"value": "5", "label": "Very Poor"}
            ]
          }
        },
        {
          "id": "Q6",
          "code": "Q6",
          "text": "Record GPS coordinates of the household",
          "question_type": "gps",
          "is_required": true,
          "order_index": 6,
          "gps_config": {
            "accuracy_threshold": 10.0,
            "auto_capture": true,
            "auto_capture_delay_seconds": 5
          }
        },
        {
          "id": "Q7",
          "code": "Q7",
          "text": "Take a photo of the dwelling entrance",
          "question_type": "photo",
          "is_required": false,
          "order_index": 7,
          "photo_config": {
            "max_file_size_mb": 10,
            "min_resolution": "1920x1080",
            "compress_quality": 75,
            "capture_in_app_only": true
          }
        },
        {
          "id": "Q8",
          "code": "Q8",
          "text": "Household monthly income (in local currency)",
          "question_type": "numeric_decimal",
          "is_required": false,
          "order_index": 8,
          "validation_rules": {
            "min": 0,
            "max": 999999.99,
            "decimal_places": 2
          }
        },
        {
          "id": "Q9",
          "code": "Q9",
          "text": "BMI Calculation",
          "question_type": "calculated",
          "order_index": 9,
          "calculation": {
            "formula": "weight / (height / 100) ^ 2",
            "references": ["Q10_weight", "Q11_height"],
            "decimal_places": 1,
            "unit": "kg/m²"
          }
        },
        {
          "id": "Q10",
          "code": "Q10_weight",
          "text": "Weight (kg)",
          "question_type": "numeric_decimal",
          "is_required": true,
          "order_index": 10,
          "validation_rules": {"min": 1, "max": 300, "decimal_places": 1}
        },
        {
          "id": "Q11",
          "code": "Q11_height",
          "text": "Height (cm)",
          "question_type": "numeric_decimal",
          "is_required": true,
          "order_index": 11,
          "validation_rules": {"min": 30, "max": 300, "decimal_places": 1}
        }
      ]
    },
    {
      "id": "sec_2",
      "code": "SEC-B",
      "title": "Child Health (for children under 5)",
      "order_index": 2,
      "repeatable": true,
      "repeat_label": "Child {n}",
      "max_repetitions": 10,
      "show_if": {
        "condition": "has_children_under_5 == 'yes'",
        "evaluate_on": "section_start"
      },
      "questions": [...]
    }
  ],
  "end_section": {
    "show_completion_message": true,
    "completion_message": "Thank you for completing this survey.",
    "auto_submit_on_complete": false
  }
}
```

---

## 3. Form Engine Core

```dart
class FormEngine {
  final Questionnaire questionnaire;
  final FormStateManager stateManager;
  final SkipLogicEvaluator skipLogic;
  final ValidationEngine validation;
  final CalculationEngine calculations;
  final AutosaveManager autosave;
  final DraftRecovery draftRecovery;

  FormEngine({
    required this.questionnaire,
    required this.stateManager,
    required this.skipLogic,
    required this.validation,
    required this.calculations,
    required this.autosave,
    required this.draftRecovery,
  });

  Future<void> initialize() async {
    // 1. Try to recover existing draft
    final draft = await draftRecovery.tryRecover(questionnaire.id);
    if (draft != null) {
      stateManager.loadState(draft);
    } else {
      stateManager.initialize(questionnaire);
    }

    // 2. Start autosave timer
    autosave.start(interval: Duration(seconds: 15));

    // 3. Evaluate initial skip logic
    skipLogic.evaluateAll(questionnaire, stateManager.currentAnswers);
  }

  List<Question> getVisibleQuestions() {
    return questionnaire.sections
      .where((s) => skipLogic.isSectionVisible(s, stateManager.currentAnswers))
      .expand((s) => s.questions)
      .where((q) => skipLogic.isQuestionVisible(q, stateManager.currentAnswers))
      .toList();
  }

  Future<ValidationResult> validateAll() async {
    final errors = <FieldError>[];
    for (final question in getVisibleQuestions()) {
      final answer = stateManager.getAnswer(question.id);
      final result = validation.validate(question, answer);
      errors.addAll(result.errors);
    }
    return ValidationResult(errors: errors);
  }

  Future<void> answerQuestion(String questionId, dynamic value) async {
    stateManager.setAnswer(questionId, value);

    // Re-evaluate skip logic for dependent questions
    skipLogic.evaluate(questionnaire, questionId, value, stateManager.currentAnswers);

    // Recompute calculated fields
    calculations.recompute(questionnaire, stateManager.currentAnswers);

    // Trigger autosave
    autosave.scheduleSave();
  }

  bool get isComplete {
    final visible = getVisibleQuestions();
    final answered = stateManager.answers.length;
    return answered >= visible.length;
  }

  Future<void> submit() async {
    stateManager.updateStatus(SubmissionStatus.completed);
    stateManager.completedAt = DateTime.now();
    stateManager.durationSeconds = stateManager.completedAt!
      .difference(stateManager.startedAt!)
      .inSeconds;
    await stateManager.persist();
    autosave.stop();
  }
}
```

---

## 4. Form State Manager

```dart
class FormStateNotifier extends StateNotifier<FormState> {
  final String questionnaireId;
  final String? existingSubmissionId;
  final SubmissionRepository _submissionRepo;
  final ResponseValueRepository _responseRepo;

  FormStateNotifier(
    this.questionnaireId,
    this.existingSubmissionId,
    this._submissionRepo,
    this._responseRepo,
  ) : super(FormState.initial());

  Future<void> initialize(Questionnaire questionnaire) async {
    if (existingSubmissionId != null) {
      // Load existing draft
      final submission = await _submissionRepo.getById(existingSubmissionId!);
      final responses = await _responseRepo.getBySubmission(existingSubmissionId!);
      state = FormState(
        submissionId: submission!.id,
        questionnaireId: questionnaire.id,
        status: submission.status,
        currentSectionIndex: 0,
        currentQuestionIndex: 0,
        answers: {for (var r in responses) r.questionCode: r.value},
        answersMeta: {for (var r in responses) r.questionCode: ResponseMeta(...)},
        startedAt: submission.startedAt,
        completedAt: submission.completedAt,
        errors: {},
        isSaving: false,
        isSubmitting: false,
        lastSavedAt: DateTime.now(),
      );
    } else {
      // New submission
      final submission = await _submissionRepo.create(
        Submission(
          id: Uuidv7.generate(),
          questionnaireId: questionnaire.id,
          status: SubmissionStatus.draft,
          startedAt: DateTime.now(),
        ),
      );
      state = state.copyWith(submissionId: submission.id, startedAt: submission.startedAt);
    }
  }

  void setAnswer(String questionId, dynamic value) {
    state = state.copyWith(
      answers: {...state.answers, questionId: value},
      answersMeta: {
        ...state.answersMeta,
        questionId: ResponseMeta(modifiedAt: DateTime.now(), isSynced: false),
      },
    );
  }

  dynamic getAnswer(String questionId) => state.answers[questionId];

  void navigateNext() { /* advance to next visible question */ }
  void navigatePrevious() { /* go to previous visible question */ }
  void goToQuestion(String questionId) { /* jump to specific question */ }

  Future<void> persist() async {
    state = state.copyWith(isSaving: true);
    await _submissionRepo.update(state.submissionId, state.toSubmission());
    await _responseRepo.bulkSave(state.submissionId, state.toResponseValues());
    state = state.copyWith(isSaving: false, lastSavedAt: DateTime.now());
  }
}

class FormState {
  final String submissionId;
  final String questionnaireId;
  final SubmissionStatus status;
  final int currentSectionIndex;
  final int currentQuestionIndex;
  final Map<String, dynamic> answers;
  final Map<String, ResponseMeta> answersMeta;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final int? durationSeconds;
  final Map<String, List<ValidationError>> errors;
  final bool isSaving;
  final bool isSubmitting;
  final DateTime lastSavedAt;
}
```

---

## 5. Question Type Renderers

### Widget Factory

```dart
class QuestionWidgetFactory {
  static Widget create(Question question, FormStateNotifier formState) {
    return switch (question.questionType) {
      QuestionType.textShort => TextQuestion(question: question, formState: formState),
      QuestionType.textLong => TextLongQuestion(question: question, formState: formState),
      QuestionType.numericInt => NumericIntQuestion(question: question, formState: formState),
      QuestionType.numericDecimal => NumericDecimalQuestion(question: question, formState: formState),
      QuestionType.percentage => PercentageQuestion(question: question, formState: formState),
      QuestionType.selectOne => SelectOneQuestion(question: question, formState: formState),
      QuestionType.selectMultiple => SelectMultipleQuestion(question: question, formState: formState),
      QuestionType.dropdown => DropdownQuestion(question: question, formState: formState),
      QuestionType.date => DateQuestion(question: question, formState: formState),
      QuestionType.time => TimeQuestion(question: question, formState: formState),
      QuestionType.dateTime => DateTimeQuestion(question: question, formState: formState),
      QuestionType.gps => GpsQuestion(question: question, formState: formState),
      QuestionType.photo => PhotoQuestion(question: question, formState: formState),
      QuestionType.audio => AudioQuestion(question: question, formState: formState),
      QuestionType.video => VideoQuestion(question: question, formState: formState),
      QuestionType.barcode => BarcodeQuestion(question: question, formState: formState),
      QuestionType.signature => SignatureQuestion(question: question, formState: formState),
      QuestionType.ranking => RankingQuestion(question: question, formState: formState),
      QuestionType.likert => LikertQuestion(question: question, formState: formState),
      QuestionType.slider => SliderQuestion(question: question, formState: formState),
      QuestionType.matrix => MatrixQuestion(question: question, formState: formState),
      QuestionType.note => NoteWidget(question: question),
      QuestionType.calculated => CalculatedValueWidget(question: question, formState: formState),
      QuestionType.composite => CompositeQuestion(question: question, formState: formState),
    };
  }
}
```

### Renderer Patterns

Each question type widget follows this pattern:

```dart
class TextQuestion extends StatelessWidget {
  const TextQuestion({required this.question, required this.formState});

  final Question question;
  final FormStateNotifier formState;

  @override
  Widget build(BuildContext context) {
    final value = formState.getAnswer(question.id) ?? '';
    final errors = formState.state.errors[question.id] ?? [];
    final translation = _getTranslation(context);

    return Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(translation, style: context.textTheme.titleMedium),
          if (question.helpText != null)
            Text(question.helpText!, style: context.textTheme.bodySmall),
          SizedBox(height: 8),
          TextField(
            initialValue: value as String? ?? '',
            maxLength: question.validationRules?.maxLength ?? 255,
            decoration: InputDecoration(
              errorText: errors.isNotEmpty ? errors.first.message : null,
              border: OutlineInputBorder(),
            ),
            onChanged: (v) => formState.setAnswer(question.id, v),
          ),
        ],
      ),
    );
  }
}
```

---

## 6. Skip Logic Engine

```dart
class SkipLogicEvaluator {
  static const _expressionParser = ExpressionParser();

  bool isQuestionVisible(Question question, Map<String, dynamic> answers) {
    if (question.skipLogic == null || question.skipLogic!.isEmpty) return true;

    for (final rule in question.skipLogic!) {
      if (rule.action == 'show') {
        if (_evaluateCondition(rule.condition, answers)) return true;
      }
      if (rule.action == 'hide') {
        if (_evaluateCondition(rule.condition, answers)) return false;
      }
    }

    return true; // Default: visible
  }

  bool isSectionVisible(Section section, Map<String, dynamic> answers) {
    if (section.showIf == null) return true;
    return _evaluateCondition(section.showIf!.condition, answers);
  }

  bool _evaluateCondition(String condition, Map<String, dynamic> answers) {
    // Supported expressions:
    // value == 'x', value != 'x', value > 5, value < 10, value >= 5,
    // value <= 10, value in ['a','b'], value not in ['a','b'],
    // value contains 'text', value empty, value not empty
    // Compound: value == 'x' && value2 == 'y', value == 'x' || value2 == 'y'

    try {
      // Replace question codes with their current values
      String resolved = condition;
      for (final entry in answers.entries) {
        resolved = resolved.replaceAll(entry.key, _toExpressionValue(entry.value));
      }

      return _expressionParser.evaluate(resolved);
    } catch (e) {
      // If evaluation fails, show the question (fail safe)
      return true;
    }
  }

  String _toExpressionValue(dynamic value) {
    if (value == null) return 'null';
    if (value is String) return "'$value'";
    if (value is num) return value.toString();
    if (value is bool) return value.toString();
    if (value is List) return '[${value.map(_toExpressionValue).join(',')}]';
    return "'$value'";
  }

  /// Evaluate all skip logic rules and return the set of visible question IDs
  Set<String> evaluateAll(Questionnaire questionnaire, Map<String, dynamic> answers) {
    final visible = <String>{};
    for (final section in questionnaire.sections) {
      if (!isSectionVisible(section, answers)) continue;
      for (final question in section.questions) {
        if (isQuestionVisible(question, answers)) {
          visible.add(question.id);
        }
      }
    }
    return visible;
  }

  /// When an answer changes, re-evaluate only dependent questions
  List<String> evaluate(
    Questionnaire questionnaire,
    String changedQuestionId,
    dynamic newValue,
    Map<String, dynamic> answers,
  ) {
    // Find questions whose skip logic references the changed question
    final affected = <String>[];
    for (final question in questionnaire.allQuestions) {
      if (question.skipLogicReferences?.contains(changedQuestionId) == true) {
        affected.add(question.id);
      }
    }
    return affected;
  }
}

class ExpressionParser {
  bool evaluate(String expression) {
    // Simple expression parser for conditions like:
    // 'value' == 'x' && 'value2' > 5
    // Supports: ==, !=, >, <, >=, <=, in, not in, contains
    // Compound: &&, ||

    // Implementation uses a recursive descent parser
    // For MVP, a simple string-based evaluator is sufficient
    return _parseOr(expression.trim());
  }
}
```

---

## 7. Validation Engine

```dart
class ValidationEngine {
  List<ValidationError> validate(Question question, dynamic value) {
    if (value == null || value == '') {
      if (question.isRequired) {
        return [ValidationError(question.id, 'This question is required.')];
      }
      return [];
    }

    return switch (question.questionType) {
      QuestionType.textShort => _validateTextShort(question, value),
      QuestionType.textLong => _validateTextLong(question, value),
      QuestionType.numericInt => _validateNumericInt(question, value),
      QuestionType.numericDecimal => _validateNumericDecimal(question, value),
      QuestionType.percentage => _validatePercentage(value),
      QuestionType.date => _validateDate(question, value),
      QuestionType.time => _validateTime(value),
      QuestionType.selectOne => _validateSelectOne(question, value),
      QuestionType.selectMultiple => _validateSelectMultiple(question, value),
      QuestionType.gps => _validateGps(question, value),
      QuestionType.photo => _validatePhoto(question, value),
      QuestionType.audio => _validateAudio(question, value),
      QuestionType.video => _validateVideo(question, value),
      QuestionType.signature => _validateSignature(value),
      QuestionType.email => _validateEmail(value),
      QuestionType.phone => _validatePhone(value),
      _ => [], // No type-specific validation
    };
  }

  List<ValidationError> _validateNumericInt(Question question, dynamic value) {
    final errors = <ValidationError>[];
    final numValue = _parseNum(value);

    if (numValue == null) {
      errors.add(ValidationError(question.id, 'Please enter a valid number.'));
      return errors;
    }

    if (!_isInteger(numValue)) {
      errors.add(ValidationError(question.id, 'Please enter a whole number.'));
    }

    final rules = question.validationRules;
    if (rules != null) {
      if (rules.min != null && numValue < rules.min!) {
        errors.add(ValidationError(question.id, 'Minimum value is ${rules.min}.'));
      }
      if (rules.max != null && numValue > rules.max!) {
        errors.add(ValidationError(question.id, 'Maximum value is ${rules.max}.'));
      }
    }

    return errors;
  }

  List<ValidationError> _validateSelectMultiple(Question question, dynamic value) {
    final errors = <ValidationError>[];
    if (value is! List) {
      errors.add(ValidationError(question.id, 'Invalid selection format.'));
      return errors;
    }

    final rules = question.validationRules;
    if (rules != null) {
      if (rules.minSelections != null && value.length < rules.minSelections!) {
        errors.add(ValidationError(question.id, 'Select at least ${rules.minSelections} options.'));
      }
      if (rules.maxSelections != null && value.length > rules.maxSelections!) {
        errors.add(ValidationError(question.id, 'Select at most ${rules.maxSelections} options.'));
      }
    }

    return errors;
  }

  List<ValidationError> _validateGps(Question question, dynamic value) {
    final errors = <ValidationError>[];
    if (value is! GpsCoordinate) {
      errors.add(ValidationError(question.id, 'GPS coordinates not captured.'));
      return errors;
    }

    if (!value.isValid) {
      errors.add(ValidationError(question.id, 'Invalid GPS coordinates.'));
    }

    final threshold = question.gpsConfig?.accuracyThreshold ?? 50.0;
    if (value.accuracy > threshold) {
      errors.add(ValidationError(question.id, 'GPS accuracy is too low (${value.accuracy}m). Required: ≤${threshold}m'));
    }

    if (value.latitude < -90 || value.latitude > 90) {
      errors.add(ValidationError(question.id, 'Invalid latitude.'));
    }
    if (value.longitude < -180 || value.longitude > 180) {
      errors.add(ValidationError(question.id, 'Invalid longitude.'));
    }

    return errors;
  }

  List<ValidationError> _validateDate(Question question, dynamic value) {
    final errors = <ValidationError>[];
    final date = _parseDate(value);

    if (date == null) {
      errors.add(ValidationError(question.id, 'Please enter a valid date.'));
      return errors;
    }

    final rules = question.validationRules;
    if (rules != null) {
      if (rules.minDate != null && date.isBefore(rules.minDate!)) {
        errors.add(ValidationError(question.id, 'Date must be after ${_formatDate(rules.minDate!)}.'));
      }
      if (rules.maxDate != null && date.isAfter(rules.maxDate!)) {
        errors.add(ValidationError(question.id, 'Date must be before ${_formatDate(rules.maxDate!)}.'));
      }
    }

    return errors;
  }
}

class ValidationError {
  final String questionId;
  final String message;
  final ValidationSeverity severity;

  ValidationError(this.questionId, this.message, {this.severity = ValidationSeverity.error});
}

enum ValidationSeverity { error, warning, info }
```

---

## 8. Calculation Engine

```dart
class CalculationEngine {
  Map<String, dynamic> recompute(Questionnaire questionnaire, Map<String, dynamic> answers) {
    final computed = <String, dynamic>{};

    for (final question in questionnaire.calculatedQuestions) {
      try {
        computed[question.id] = _evaluateFormula(question.calculation!, answers);
      } catch (e) {
        computed[question.id] = null; // Null propagation on error
      }
    }

    return computed;
  }

  dynamic _evaluateFormula(Calculation calc, Map<String, dynamic> answers) {
    // Check for null references — null propagation
    for (final ref in calc.references) {
      if (answers[ref] == null) return null;
    }

    // Build expression with resolved values
    String expression = calc.formula;
    for (final ref in calc.references) {
      final val = answers[ref];
      expression = expression.replaceAll(ref, val.toString());
    }

    // Evaluate the mathematical expression
    final result = _mathParser.evaluate(expression);

    // Apply decimal precision
    if (calc.decimalPlaces != null) {
      return (result * pow(10, calc.decimalPlaces!)).round() / pow(10, calc.decimalPlaces!);
    }

    return result;
  }
}
```

---

## 9. Repeating Groups

```dart
class RepeatGroupManager {
  final String sectionId;
  final int maxRepetitions;
  final List<Map<String, dynamic>> repeats;

  void addRepeat() {
    if (repeats.length >= maxRepetitions) return;
    repeats.add({});
  }

  void removeRepeat(int index) {
    if (repeats.length <= 1) return; // Keep at least one
    repeats.removeAt(index);
  }

  void updateRepeat(int index, String questionId, dynamic value) {
    repeats[index][questionId] = value;
  }

  bool get canAddMore => repeats.length < maxRepetitions;
  bool get canRemove => repeats.length > 1;
}
```

---

## 10. Autosave and Draft Recovery

```dart
class AutosaveManager {
  Timer? _timer;
  final SubmissionRepository _repo;
  final Duration _interval;
  DateTime _lastSave = DateTime.now();

  AutosaveManager(this._repo, {this._interval = const Duration(seconds: 15)});

  void start() {
    _timer = Timer.periodic(_interval, (_) => _save());
  }

  void scheduleSave() {
    // Debounce saves: don't save more often than every 5 seconds
    if (DateTime.now().difference(_lastSave) < Duration(seconds: 5)) return;
    _save();
  }

  Future<void> _save() async {
    _lastSave = DateTime.now();
    await _repo.saveDraft(state);
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }
}

class DraftRecovery {
  final SubmissionRepository _submissionRepo;
  final ResponseValueRepository _responseRepo;

  DraftRecovery(this._submissionRepo, this._responseRepo);

  Future<Submission?> tryRecover(String questionnaireId) async {
    final drafts = await _submissionRepo.getDrafts(questionnaireId);

    if (drafts.isEmpty) return null;

    // Return the most recent draft
    drafts.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return drafts.first;
  }

  Future<void> recoverAfterCrash() async {
    // Check for submissions with status 'draft' that were modified
    // but not properly closed (crash detection)
    final crashedDrafts = await _submissionRepo.getDraftsModifiedBefore(
      DateTime.now().subtract(Duration(minutes: 1)),
    );

    for (final draft in crashedDrafts) {
      // Verify integrity of saved responses
      final responses = await _responseRepo.getBySubmission(draft.id);
      final recovered = RecoveredDraft(
        submission: draft,
        responses: responses,
        recoveredAt: DateTime.now(),
      );
      await _submissionRepo.saveRecoveryMarker(recovered);
    }
  }

  bool hasRecoverableDraft(String questionnaireId) {
    return _submissionRepo.hasDraft(questionnaireId);
  }
}
```

---

## 11. Form Screen Layout

```dart
class FormScreen extends ConsumerWidget {
  const FormScreen({required this.questionnaireId, this.submissionId});

  final String questionnaireId;
  final String? submissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formState = ref.watch(formStateProvider(questionnaireId));
    final questionnaire = ref.watch(questionnaireProvider(questionnaireId));
    final visibleQuestions = ref.watch(visibleQuestionsProvider(questionnaireId));

    return Scaffold(
      appBar: AppBar(
        title: Text(questionnaire.title),
        actions: [
          SyncStatusBadge(),
          Text('${formState.answers.length}/${visibleQuestions.length}'),
        ],
      ),
      body: Column(
        children: [
          // Progress bar
          FormProgressBar(
            current: formState.answers.length,
            total: visibleQuestions.length,
          ),

          // Question content (swipeable PageView)
          Expanded(
            child: PageView.builder(
              controller: _pageController,
              itemCount: visibleQuestions.length,
              onPageChanged: (index) => formState.goToQuestion(visibleQuestions[index].id),
              itemBuilder: (context, index) {
                final question = visibleQuestions[index];
                return SingleChildScrollView(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    children: [
                      QuestionWidgetFactory.create(question, formState),
                      SizedBox(height: 16),
                      // Validation errors
                      ...formState.state.errors[question.id]?.map(
                        (e) => ValidationMessage(error: e),
                      ) ?? [],
                    ],
                  ),
                );
              },
            ),
          ),

          // Navigation buttons
          FormNavigation(
            onPrevious: () => _pageController.previousPage(
              duration: Duration(milliseconds: 300), curve: Curves.easeInOut,
            ),
            onNext: () => _pageController.nextPage(
              duration: Duration(milliseconds: 300), curve: Curves.easeInOut,
            ),
            onSubmit: () async {
              final result = await formState.validateAll();
              if (result.hasErrors) {
                // Show first error
                return;
              }
              // Navigate to review screen
              context.pushNamed('form-review', pathParameters: {
                'submissionId': formState.state.submissionId,
              });
            },
            currentStep: formState.state.currentQuestionIndex,
            totalSteps: visibleQuestions.length,
          ),
        ],
      ),
    );
  }
}
```

---

## 12. Media Capture Integration

```dart
class PhotoQuestion extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        // Photo preview or capture button
        if (_hasPhoto)
          Image.file(File(_photoPath), height: 200, fit: BoxFit.cover)
        else
          ElevatedButton.icon(
            icon: Icon(Icons.camera_alt),
            label: Text('Take Photo'),
            onPressed: () async {
              try {
                final camera = CameraService();
                final photo = await camera.capturePhoto(
                  maxFileSize: question.photoConfig?.maxFileSizeMb ?? 10,
                  compressQuality: question.photoConfig?.compressQuality ?? 75,
                  minResolution: question.photoConfig?.minResolution,
                );

                // Compress and encrypt
                final compressed = await MediaCompressionService.compressPhoto(File(photo.path));
                final encrypted = await FileEncryption.encryptFile(compressed.path);

                // Store locally and update form state
                final mediaFile = await ref.read(mediaRepositoryProvider).saveMedia(
                  MediaFile(
                    id: Uuidv7.generate(),
                    submissionId: formState.state.submissionId,
                    questionCode: question.code,
                    fileType: 'photo',
                    filePath: encrypted.path,
                    fileSize: await encrypted.length(),
                    mediaHash: await _computeHash(encrypted.path),
                    uploadStatus: 'pending',
                  ),
                );

                formState.setAnswer(question.id, mediaFile.id);
              } on CameraException catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Camera unavailable: ${e.message}')),
                );
              }
            },
          ),

        // Retake button
        if (_hasPhoto)
          TextButton(
            onPressed: () => formState.setAnswer(question.id, null),
            child: Text('Retake'),
          ),
      ],
    );
  }
}
```

---

## 13. GPS Capture Integration

```dart
class GpsQuestion extends StatefulWidget {
  // ...
}

class _GpsQuestionState extends State<GpsQuestion> {
  StreamSubscription? _locationSub;
  GpsCoordinate? _currentLocation;

  @override
  void initState() {
    super.initState();
    _startCapture();
  }

  void _startCapture() {
    final locationService = LocationService();

    if (widget.question.gpsConfig?.autoCapture == true) {
      // Auto-capture after delay
      Future.delayed(
        Duration(seconds: widget.question.gpsConfig?.autoCaptureDelaySeconds ?? 5),
        () async {
          final loc = await locationService.getCurrentLocation(
            accuracy: LocationAccuracy.high,
          );
          if (loc.accuracy <= (widget.question.gpsConfig?.accuracyThreshold ?? 50)) {
            widget.formState.setAnswer(widget.question.id, loc.toGpsCoordinate());
          }
        },
      );
    }

    // Show live accuracy indicator
    _locationSub = locationService.locationStream.listen((loc) {
      setState(() => _currentLocation = loc);
    });
  }

  @override
  void dispose() {
    _locationSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final captured = widget.formState.getAnswer(widget.question.id);
    final threshold = widget.question.gpsConfig?.accuracyThreshold ?? 10.0;
    final hasFix = _currentLocation != null;
    final isAccurate = hasFix && _currentLocation!.accuracy <= threshold;

    return Column(
      children: [
        // Accuracy indicator
        if (hasFix) ...[
          GpsAccuracyIndicator(
            accuracy: _currentLocation!.accuracy,
            threshold: threshold,
          ),
          Text('${_currentLocation!.latitude.toStringAsFixed(6)}, ${_currentLocation!.longitude.toStringAsFixed(6)}'),
          Text('Accuracy: ${_currentLocation!.accuracy.toStringAsFixed(1)}m'),
          if (isAccurate)
            Icon(Icons.check_circle, color: Colors.green)
          else
            Text('Move to open area for better GPS signal'),
        ] else
          CircularProgressIndicator(),

        if (captured != null) ...[
          Icon(Icons.location_on, color: Colors.green, size: 48),
          Text('GPS Captured'),
        ],

        // Manual capture button
        ElevatedButton.icon(
          icon: Icon(Icons.my_location),
          label: Text(isAccurate ? 'Accept GPS' : 'Capture GPS'),
          onPressed: () {
            if (_currentLocation != null) {
              widget.formState.setAnswer(widget.question.id, _currentLocation!.toGpsCoordinate());
            }
          },
        ),
      ],
    );
  }
}
```

---

## 14. Offline Form Submission Queuing

```dart
class SubmissionQueueService {
  Future<SubmissionResult> completeSubmission(Submission submission) async {
    // 1. Final validation
    final errors = _validateAll(submission);
    if (errors.isNotEmpty) {
      return SubmissionResult.failure('Validation errors exist.');
    }

    // 2. Compute checksum
    submission.checksum = await DataIntegrityService.computeSubmissionChecksum(submission);

    // 3. Mark as submitted locally
    submission.status = SubmissionStatus.submitted;
    submission.completedAt = DateTime.now();
    await _submissionRepo.update(submission.id, submission);

    // 4. Enqueue for sync
    await _syncQueueDao.enqueue(SyncQueueItem(
      entityType: 'submission',
      entityId: submission.id,
      operation: 'create',
      priority: SyncPriority.urgent,
      payloadJson: jsonEncode(submission.toJson()),
    ));

    // 5. Trigger sync immediately if connected
    if (await _networkInfo.isConnected) {
      _syncEngine.pushChanges();
    }

    return SubmissionResult.success(submission.id);
  }
}
```

---

## Question Type Coverage Summary

| # | Type | Renderer | Validation | Offline |
|---|------|----------|------------|---------|
| 1 | text_short | TextField | length, pattern, required | Yes |
| 2 | text_long | TextArea | length, required | Yes |
| 3 | numeric_int | NumberField | min, max, integer, required | Yes |
| 4 | numeric_decimal | NumberField (decimal) | min, max, decimal places, required | Yes |
| 5 | percentage | Slider/Input | 0-100, decimal places | Yes |
| 6 | select_one | RadioList/Modal | required, value in options | Yes |
| 7 | select_multiple | CheckboxList | min/max selections, required | Yes |
| 8 | dropdown | DropdownButton | required, value in options | Yes |
| 9 | date | DatePicker | min/max date, format, required | Yes |
| 10 | time | TimePicker | format, required | Yes |
| 11 | datetime | DateTimePicker | format, timezone, required | Yes |
| 12 | gps | Map + Accuracy | accuracy threshold, valid coords, geofence | Yes |
| 13 | photo | Camera widget | file size, resolution, hash | Yes |
| 14 | audio | Recorder widget | duration, bitrate, format | Yes |
| 15 | video | Video recorder | duration, resolution, format | Yes |
| 16 | barcode | Scanner widget | decode valid format, checksum | Yes |
| 17 | signature | Drawing canvas | dimensions, timestamp | Yes |
| 18 | ranking | ReorderableList | all ranked, no ties | Yes |
| 19 | likert | RadioList (balanced) | required, scale consistency | Yes |
| 20 | slider | Slider widget | min, max, step | Yes |
| 21 | matrix | Table of radio/check | all rows answered, consistent cols | Yes |
| 22 | note | Styled text | none | Yes |
| 23 | calculated | Display only | null propagation, circular ref check | Yes |
| 24 | composite | Sub-field group | per-field + group validation | Yes |
