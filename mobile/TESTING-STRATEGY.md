# Mobile Testing Strategy

## 1. Testing Pyramid

```
          ╱╲
         ╱  ╲              E2E / Integration
        ╱    ╲              (Few — critical paths only)
       ╱──────╲
      ╱        ╲          Widget Tests
     ╱          ╲          (Moderate — component behavior)
    ╱────────────╲
   ╱              ╲      Unit Tests
  ╱                ╲      (Many — models, services, repositories, state)
 ╱──────────────────╲
```

---

## 2. Unit Testing

### 2.1 Framework

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  mocktail: ^1.0.0
  mockito: ^5.4.0
  build_runner: ^2.4.0
  riverpod: ^2.5.0
```

### 2.2 Test Categories

| Category | Scope | Example Tests |
|----------|-------|---------------|
| **Domain entities** | Entity factories, value objects | User creation, GPS coordinate validation, Submission status transitions |
| **Use cases** | Business logic | LoginUseCase, SubmitSubmissionUseCase, SaveResponseUseCase |
| **State notifiers** | Riverpod state management | AuthNotifier, FormStateNotifier, SyncStateNotifier |
| **Services** | Algorithms | SkipLogicEvaluator, ValidationEngine, CalculationEngine |
| **Repositories** | Data access logic | SubmissionRepositoryImpl, SyncRepositoryImpl |
| **Mappers** | DTO ↔ Entity conversion | ProjectMapper, QuestionnaireMapper, SubmissionMapper |

### 2.3 Unit Test Examples

```dart
// ─── Skip Logic Evaluator Tests ───
void main() {
  group('SkipLogicEvaluator', () {
    late SkipLogicEvaluator evaluator;

    setUp(() {
      evaluator = SkipLogicEvaluator();
    });

    group('evaluateCondition', () {
      test('should return true when condition matches equality', () {
        final result = evaluator.evaluateCondition(
          "Q3 == 'borehole'",
          {'Q3': 'borehole'},
        );
        expect(result, isTrue);
      });

      test('should return false when condition does not match', () {
        final result = evaluator.evaluateCondition(
          "Q3 == 'borehole'",
          {'Q3': 'well'},
        );
        expect(result, isFalse);
      });

      test('should evaluate numeric comparisons', () {
        final result = evaluator.evaluateCondition(
          'Q2 > 5',
          {'Q2': 10},
        );
        expect(result, isTrue);
      });

      test('should handle compound AND conditions', () {
        final result = evaluator.evaluateCondition(
          "Q3 == 'surface' && Q2 > 0",
          {'Q3': 'surface', 'Q2': 5},
        );
        expect(result, isTrue);
      });

      test('should handle null values safely', () {
        final result = evaluator.evaluateCondition(
          "Q3 == 'borehole'",
          {'Q1': 'value'}, // Q3 is not in answers
        );
        expect(result, isFalse); // Missing value fails evaluation
      });

      test('should show question when skip logic references nonexistent question', () {
        final question = Question(id: 'Q5', skipLogic: [
          SkipRule(sourceId: 'Q99', condition: "Q99 == 'x'", action: 'show'),
        ]);
        final visible = evaluator.isQuestionVisible(question, {'Q1': 'a'});
        expect(visible, isTrue);
      });
    });

    group('isQuestionVisible', () {
      test('should show question when no skip logic', () {
        final question = Question(id: 'Q1', skipLogic: null);
        expect(evaluator.isQuestionVisible(question, {}), isTrue);
      });

      test('should hide question when show condition is false', () {
        final question = Question(id: 'Q5', skipLogic: [
          SkipRule(sourceId: 'Q3', condition: "Q3 == 'surface'", action: 'show'),
        ]);
        expect(evaluator.isQuestionVisible(question, {'Q3': 'well'}), isFalse);
      });

      test('should show question when show condition is true', () {
        final question = Question(id: 'Q5', skipLogic: [
          SkipRule(sourceId: 'Q3', condition: "Q3 == 'surface'", action: 'show'),
        ]);
        expect(evaluator.isQuestionVisible(question, {'Q3': 'surface'}), isTrue);
      });
    });
  });
}

// ─── Validation Engine Tests ───
void main() {
  group('ValidationEngine', () {
    late ValidationEngine validation;

    setUp(() {
      validation = ValidationEngine();
    });

    group('numeric_int', () {
      test('should pass valid integer', () {
        final question = Question(id: 'Q2', questionType: 'numeric_int',
          validationRules: ValidationRules(min: 1, max: 50));
        expect(validation.validate(question, 25), isEmpty);
      });

      test('should fail below minimum', () {
        final question = Question(id: 'Q2', questionType: 'numeric_int',
          validationRules: ValidationRules(min: 1, max: 50));
        final errors = validation.validate(question, 0);
        expect(errors.length, greaterThan(0));
        expect(errors.first.message, contains('Minimum'));
      });

      test('should fail above maximum', () {
        final question = Question(id: 'Q2', questionType: 'numeric_int',
          validationRules: ValidationRules(min: 1, max: 50));
        final errors = validation.validate(question, 100);
        expect(errors.length, greaterThan(0));
        expect(errors.first.message, contains('Maximum'));
      });

      test('should fail for decimal input', () {
        final question = Question(id: 'Q2', questionType: 'numeric_int',
          validationRules: ValidationRules(min: 1, max: 50));
        final errors = validation.validate(question, 25.5);
        expect(errors.length, greaterThan(0));
        expect(errors.first.message, contains('whole number'));
      });

      test('should pass with null for non-required question', () {
        final question = Question(id: 'Q2', questionType: 'numeric_int',
          isRequired: false, validationRules: ValidationRules(min: 1, max: 50));
        expect(validation.validate(question, null), isEmpty);
      });

      test('should fail with null for required question', () {
        final question = Question(id: 'Q2', questionType: 'numeric_int',
          isRequired: true, validationRules: ValidationRules(min: 1, max: 50));
        expect(validation.validate(question, null), isNotEmpty);
      });
    });

    group('gps', () {
      test('should pass valid GPS within accuracy', () {
        final question = Question(id: 'Q6', questionType: 'gps',
          gpsConfig: GpsConfig(accuracyThreshold: 10));
        final gps = GpsCoordinate(lat: -1.28, lng: 36.82, accuracy: 5);
        expect(validation.validate(question, gps), isEmpty);
      });

      test('should fail GPS with poor accuracy', () {
        final question = Question(id: 'Q6', questionType: 'gps',
          gpsConfig: GpsConfig(accuracyThreshold: 10));
        final gps = GpsCoordinate(lat: -1.28, lng: 36.82, accuracy: 50);
        final errors = validation.validate(question, gps);
        expect(errors.length, greaterThan(0));
        expect(errors.first.message, contains('accuracy'));
      });

      test('should fail invalid GPS coordinates', () {
        final question = Question(id: 'Q6', questionType: 'gps',
          gpsConfig: GpsConfig(accuracyThreshold: 10));
        final gps = GpsCoordinate(lat: 100, lng: 200, accuracy: 5);
        final errors = validation.validate(question, gps);
        expect(errors.length, greaterThan(0));
      });
    });
  });
}

// ─── Sync Engine Tests ───
void main() {
  group('SyncOrchestrator', () {
    late MockSyncQueueDao mockQueueDao;
    late MockSyncCheckpointDao mockCheckpointDao;
    late MockSyncApi mockSyncApi;
    late MockNetworkInfo mockNetworkInfo;
    late SyncOrchestrator orchestrator;

    setUp(() {
      mockQueueDao = MockSyncQueueDao();
      mockCheckpointDao = MockSyncCheckpointDao();
      mockSyncApi = MockSyncApi();
      mockNetworkInfo = MockNetworkInfo();
      orchestrator = SyncOrchestrator(...);
    });

    test('should skip sync when offline', () async {
      when(() => mockNetworkInfo.isConnected).thenAnswer((_) async => false);
      final result = await orchestrator.executeSync();
      expect(result.status, SyncStatus.skipped);
    });

    test('should push changes then pull changes', () async {
      when(() => mockNetworkInfo.isConnected).thenAnswer((_) async => true);
      when(() => mockChangeTracker.getPendingChanges()).thenAnswer((_) async => [submissionChange]);
      when(() => mockSyncApi.pushChanges(any())).thenAnswer((_) async => PushResponse(accepted: [accepted], conflicts: [], rejected: []));
      when(() => mockCheckpointDao.getCheckpoint(any())).thenAnswer((_) async => Checkpoint(lastSyncedAt: DateTime(2026)));
      when(() => mockSyncApi.pullChanges(any())).thenAnswer((_) async => PullResponse(changes: [], syncToken: '2026-07-18T10:05:00Z'));

      final result = await orchestrator.executeSync();
      expect(result.status, SyncStatus.success);
      expect(result.submissionsPushed, 1);
    });

    test('should handle conflicts during push', () async {
      when(() => mockNetworkInfo.isConnected).thenAnswer((_) async => true);
      when(() => mockChangeTracker.getPendingChanges()).thenAnswer((_) async => [submissionChange]);
      when(() => mockSyncApi.pushChanges(any())).thenAnswer((_) async => PushResponse(
        accepted: [],
        conflicts: [conflict],
        rejected: [],
      ));

      final result = await orchestrator.executeSync();
      expect(result.conflicts, isNotEmpty);
    });

    test('should respect retry backoff', () async {
      final retryQueue = RetryQueue();
      final delay1 = retryQueue.computeBackoff(0);
      final delay2 = retryQueue.computeBackoff(1);
      final delay3 = retryQueue.computeBackoff(2);
      expect(delay2, greaterThan(delay1));
      expect(delay3, greaterThan(delay2));
    });
  });
}

// ─── GPS Drift Detection Tests ───
void main() {
  group('GpsDriftDetector', () {
    test('should detect unrealistic speed between points', () {
      final detector = GpsDriftDetector();
      final point1 = LocationData(lat: -1.28, lng: 36.82, timestamp: DateTime(2026, 7, 18, 10, 0, 0));
      final point2 = LocationData(lat: -1.28, lng: 36.83, timestamp: DateTime(2026, 7, 18, 10, 0, 1)); // ~111m in 1s = 400 km/h
      expect(detector.isDrifted(point2, previousPoints: [point1]), isTrue);
    });

    test('should not flag normal walking speed', () {
      final detector = GpsDriftDetector();
      final point1 = LocationData(lat: -1.28, lng: 36.82, timestamp: DateTime(2026, 7, 18, 10, 0, 0));
      final point2 = LocationData(lat: -1.2801, lng: 36.8201, timestamp: DateTime(2026, 7, 18, 10, 0, 5)); // ~15m in 5s = 3 m/s
      expect(detector.isDrifted(point2, previousPoints: [point1]), isFalse);
    });
  });
}
```

---

## 3. Widget Testing

### 3.1 Widget Test Examples

```dart
// ─── Question Widget Tests ───
void main() {
  group('TextQuestion', () {
    testWidgets('should display question text and handle input', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: TextQuestion(
            question: Question(id: 'Q1', text: 'What is your name?', questionType: 'text_short'),
            formState: MockFormStateNotifier(),
          ),
        ),
      );

      expect(find.text('What is your name?'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'John');
      expect(find.text('John'), findsOneWidget);
    });
  });

  group('SelectOneQuestion', () {
    testWidgets('should show options as radio buttons', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: SelectOneQuestion(
            question: Question(
              id: 'Q3',
              text: 'Water source?',
              questionType: 'select_one',
              options: [
                Option(value: 'piped', label: 'Piped'),
                Option(value: 'well', label: 'Well'),
                Option(value: 'borehole', label: 'Borehole'),
              ],
            ),
            formState: MockFormStateNotifier(),
          ),
        ),
      );

      expect(find.text('Piped'), findsOneWidget);
      expect(find.text('Well'), findsOneWidget);
      expect(find.text('Borehole'), findsOneWidget);

      await tester.tap(find.text('Well'));
      // Verifying the option was selected
    });
  });

  group('FormNavigation', () {
    testWidgets('should show next/previous/submit buttons', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: FormNavigation(
            onNext: () {},
            onPrevious: () {},
            onSubmit: () {},
            currentStep: 0,
            totalSteps: 5,
          ),
        ),
      );

      expect(find.byIcon(Icons.arrow_back), findsOneWidget);
      expect(find.byIcon(Icons.arrow_forward), findsOneWidget);
      expect(find.text('Submit'), findsNothing); // Not on last page
    });
  });
}

// ─── Sync Status Widget Tests ───
void main() {
  group('SyncStatusBadge', () {
    testWidgets('should show pending count badge', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            syncStateProvider.overrideWith((ref) => SyncState(pendingCount: 5)),
          ],
          child: MaterialApp(home: SyncStatusBadge()),
        ),
      );

      expect(find.text('5'), findsOneWidget);
    });
  });
}
```

---

## 4. Integration Testing

### 4.1 Key Integration Test Scenarios

| Scenario | Coverage | Test Method |
|----------|----------|-------------|
| Complete form fill and submit | Form engine + state + DB persistence | Drive through all question types, verify DB records |
| Offline sync flow | Change tracking → queue → push → pull | Mock network, verify queue, verify state changes |
| GPS capture and validation | Location service + validation + storage | Mock location, verify GPS recording and validation |
| Media capture pipeline | Camera → compression → encryption → storage | Mock camera output, verify compression + encryption |
| Authentication lifecycle | Login → token caching → offline auth → token refresh | Verify token persistence, offline capability, refresh |

### 4.2 Integration Test Example

```dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Form Submission Flow', () {
    testWidgets('complete form and submit offline', (tester) async {
      // 1. Load questionnaire from local DB
      await tester.pumpWidget(ProviderScope(
        overrides: [
          questionnaireRepositoryProvider.overrideWith((ref) => MockQuestionnaireRepository()),
        ],
        child: MaterialApp(home: FormScreen(questionnaireId: 'test_qnr')),
      ));
      await tester.pumpAndSettle();

      // 2. Answer text question
      await tester.enterText(find.byType(TextField), 'John Doe');
      await tester.tap(find.byIcon(Icons.arrow_forward));

      // 3. Answer select_one question
      await tester.tap(find.text('Borehole'));
      await tester.tap(find.byIcon(Icons.arrow_forward));

      // 4. Capture GPS
      await tester.tap(find.text('Accept GPS'));
      await tester.tap(find.byIcon(Icons.arrow_forward));

      // 5. Complete and review
      await tester.tap(find.text('Review'));
      expect(find.text('John Doe'), findsOneWidget);
      expect(find.text('Borehole'), findsOneWidget);

      // 6. Submit offline
      await tester.tap(find.text('Submit'));

      // 7. Verify submission is persisted locally
      verify(() => mockSubmissionRepository.create(any())).called(1);
      expect(find.text('Submission saved'), findsOneWidget);
    });
  });
}
```

---

## 5. Offline Testing

### 5.1 Test Matrix

| Test Case | Setup | Expected Behavior |
|-----------|-------|-------------------|
| No network at launch | Airplane mode before app start | App loads, shows offline indicator, works fully |
| Network lost mid-form | Disable WiFi during form fill | Autosave triggers, no data loss, resume on reconnect |
| Network lost mid-sync | Interrupt push/pull | Sync queue preserved, resume on reconnect |
| Weak network (2G) | Throttle to 50kbps, 500ms latency | Sync succeeds, media uploads queue for WiFi |
| Interrupted media upload | Cut connection at 50% of chunk upload | Resume from last completed chunk |
| No network for days | Offline for 72 hours | All features work, sync queue grows, no data loss |
| Server unreachable | API returns 503 | Retry with backoff, user notified |
| Conflict on sync | Server data newer than local | Conflict detected, resolved via LWW or manual |

### 5.2 Offline Test Utilities

```dart
class NetworkConditionSimulator {
  static Future<void> simulateNoNetwork() async {
    // Disable WiFi/data
    await Process.run('adb', ['shell', 'svc', 'wifi', 'disable']);
    await Process.run('adb', ['shell', 'svc', 'data', 'disable']);
  }

  static Future<void> simulateWeakNetwork() async {
    // Throttle network: 100kbps, 300ms latency
    await Process.run('adb', [
      'shell', 'echo', '100', '>', '/proc/sys/net/ipv4/tcp_congestion_control'
    ]);
  }

  static Future<void> restoreNetwork() async {
    await Process.run('adb', ['shell', 'svc', 'wifi', 'enable']);
    await Process.run('adb', ['shell', 'svc', 'data', 'enable']);
  }
}
```

---

## 6. GPS Testing

| Test Scenario | Setup | Verification |
|---------------|-------|-------------|
| GPS fix acquired | Mock location provider with valid fix | Coordinate captured, accuracy displayed |
| No GPS fix | Disable location services | Error message shown, option to continue without GPS |
| Poor accuracy | Set mock accuracy to 50m when threshold is 10m | Warning shown, GPS flagged for review |
| GPS drift | Inject sequence of implausible coordinates | Drift detected, correction applied |
| Geofence violation | Mock location outside study area | Warning shown, submission flagged |
| Background tracking | App sent to background | GPS stops (unless active tracking) |

```dart
class GpsTestHelper {
  static Future<void> injectMockLocation({
    required double latitude,
    required double longitude,
    double accuracy = 5.0,
  }) async {
    // Android emulator: telnet geo fix
    await Process.run('adb', [
      'emu', 'geo', 'fix', longitude.toString(), latitude.toString()
    ]);
  }
}
```

---

## 7. Media Testing

| Test Scenario | Setup | Verification |
|---------------|-------|-------------|
| Photo capture | Mock camera output | File stored, compressed, encrypted, hash computed |
| Photo compression | Capture 12MP image | Output < 500KB, dimensions ≤ 1920x1080 |
| Audio recording | Record 1 min | File compressed to AAC 64kbps, mono |
| Video recording | Record 30 sec | Compressed to H.264 720p, 1Mbps |
| Encryption | Capture files | Files unreadable without key, IV stored safely |
| Upload resume | Interrupt at chunk 3/10 | Upload resumes from chunk 4 |
| Storage cleanup | Fill storage to 90% | Warning shown, cleanup frees space |

---

## 8. Performance Testing

### 8.1 Performance Budgets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start | < 3 seconds | App startup to first frame |
| Warm start | < 1.5 seconds | Background to foreground |
| Form question switch | < 100ms | Time between questions |
| Form load (50 questions) | < 2 seconds | Load from local DB |
| Sync push (10 submissions) | < 30s (WiFi) | End-to-end sync |
| Media upload (1MB photo, WiFi) | < 10 seconds | Chunked upload |
| List scroll (100 items) | 60fps | Scroll jank-free |
| Battery drain (8h field day) | < 30% | Constant usage |
| Memory (peak) | < 200MB | Form with media |
| APK size | < 40MB | Release build |

### 8.2 Performance Test Tools

```dart
class PerformanceTest {
  Future<void> testFormLoadTime(Questionnaire questionnaire) async {
    final stopwatch = Stopwatch()..start();
    final engine = FormEngine(questionnaire, ...);
    await engine.initialize();
    stopwatch.stop();
    assert(stopwatch.elapsedMilliseconds < 2000,
      'Form load took ${stopwatch.elapsedMilliseconds}ms (budget: 2000ms)');
  }

  Future<void> testScrollPerformance() async {
    // Use Flutter's benchmark tools
    // flutter drive --driver=test_driver/perf.dart --target=test/scroll_perf.dart
  }

  Future<void> testMemoryUsage() async {
    // Monitor via Dart VM service
    // Ensure no memory leaks after form completion
  }
}
```

---

## 9. Device Matrix

| Category | Android | iOS |
|----------|---------|-----|
| **High-end** | Pixel 8, Samsung S24, OnePlus 12 | iPhone 15 Pro, iPhone 15 |
| **Mid-range** | Samsung A54, Redmi Note 13, Motorola G84 | iPhone 14, iPhone SE (3rd gen) |
| **Low-end** | Tecno Spark 20, Infinix Hot 40, Nokia C32 | iPhone 12, iPhone 11 |
| **Tablet** | Samsung Tab S9, Lenovo Tab P12 | iPad (10th gen), iPad Air |
| **OS versions** | Android 8.0 (API 26) → Android 15 (API 35) | iOS 15 → iOS 18 |

### Target Testing Distribution

| Segment | Percentage | Devices |
|---------|-----------|---------|
| Low-end Android | 30% | Tecno Spark, Infinix Hot, Nokia C series |
| Mid-range Android | 40% | Samsung A series, Redmi Note, Moto G |
| High-end Android | 10% | Pixel, Samsung S, OnePlus |
| iOS (all) | 20% | iPhone SE, 12, 14, 15 |

---

## 10. Test Automation in CI

```yaml
# .github/workflows/mobile-tests.yml
name: Mobile Tests
on: [pull_request, push]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.22'
      - run: flutter pub get
      - run: flutter analyze --no-fatal-infos
      - run: flutter test --coverage
      - uses: codecov/codecov-action@v3

  widget-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter test test/widget/

  integration-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter test test/integration/
```

---

## 11. Test Coverage Targets

| Layer | Target Coverage |
|-------|-----------------|
| Domain entities | 100% |
| Use cases | 100% |
| State notifiers | 100% |
| Validation engine | 100% |
| Skip logic engine | 100% |
| Calculation engine | 100% |
| Sync engine | 90% |
| Conflict resolution | 100% |
| GPS services | 80% |
| Media services | 80% |
| Repositories | 80% |
| Widgets (critical paths) | 80% |
| Integration (key flows) | 5 key flows |

---

## 12. Test Organization

```
test/
├── unit/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user_test.dart
│   │   │   ├── submission_test.dart
│   │   │   └── gps_coordinate_test.dart
│   │   └── value_objects/
│   │       └── email_test.dart
│   ├── application/
│   │   ├── auth/
│   │   │   ├── login_usecase_test.dart
│   │   │   └── auth_notifier_test.dart
│   │   ├── sync/
│   │   │   ├── sync_engine_test.dart
│   │   │   └── conflict_resolver_test.dart
│   │   └── forms/
│   │       ├── skip_logic_evaluator_test.dart
│   │       ├── validation_engine_test.dart
│   │       └── calculation_engine_test.dart
│   └── infrastructure/
│       ├── repositories/
│       │   ├── submission_repository_test.dart
│       │   └── sync_repository_test.dart
│       └── services/
│           ├── gps_drift_detector_test.dart
│           └── media_compression_test.dart
├── widget/
│   ├── question_types/
│   │   ├── text_question_test.dart
│   │   ├── select_one_question_test.dart
│   │   ├── gps_question_test.dart
│   │   └── photo_question_test.dart
│   ├── form_screen_test.dart
│   ├── sync_status_screen_test.dart
│   └── dashboard_screen_test.dart
├── integration/
│   ├── form_submission_flow_test.dart
│   ├── offline_sync_flow_test.dart
│   └── media_capture_flow_test.dart
└── mocks/
    ├── mock_repositories.dart
    ├── mock_services.dart
    └── mock_providers.dart
```
