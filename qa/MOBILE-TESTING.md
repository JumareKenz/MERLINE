# Mobile Testing Plan — Phase 1 (MVP)

## Technology Stack

- **Framework**: Flutter (Dart)
- **Unit Tests**: `flutter test`
- **Widget Tests**: `flutter test` with `WidgetTester`
- **Integration Tests**: `integration_test` package
- **Device Testing**: Firebase Test Lab / BrowserStack
- **Offline Testing**: Network mocking, airplane mode automation
- **GPS Testing**: Location mocking
- **Performance**: Flutter DevTools, frame timing

## Test Count Targets

| Test Type | Target | Priority |
|-----------|--------|----------|
| Unit (models, services, utils) | 200 | P0 |
| Widget (individual screen components) | 150 | P0 |
| Integration (full-screen flows) | 50 | P0 |
| Offline mode | 40 | P0 |
| GPS/Location | 20 | P0 |
| Media (camera, audio, upload) | 20 | P1 |
| Device compatibility | 15 devices | P0 |
| **Total Mobile** | **480** | |

## 1. Unit Testing (Dart)

### Models
- `Submission` — Serialization, validation, status transitions
- `Question` — Type helpers, validation rules
- `Questionnaire` — Section organization, question count
- `Assignment` — Progress calculation, overdue detection
- `SyncQueue` — Enqueue, dequeue, priority ordering
- `MediaFile` — Compression, hash, metadata extraction
- `User` — Role checks, permission evaluation

### Services
- `SubmissionService` — Create, save draft, validate, submit
- `SyncService` — Push changes, pull updates, conflict resolution
- `MediaService` — Capture, compress, enqueue upload
- `LocationService` — GPS acquisition, accuracy check, background tracking
- `FormService` — Download, cache, version check, render logic
- `AuthService` — Login, token refresh, offline credential caching

```dart
// submission_service_test.dart
void main() {
  group('SubmissionService', () {
    test('partial save preserves state across app restarts', () async {
      final service = SubmissionService(storage: MockStorage());
      await service.startSubmission('qn-1');
      await service.saveAnswer('q-1', 'John');
      await service.savePartial();

      // Simulate app restart
      final restored = await service.resumeSubmission('sub-1');
      expect(restored?.currentAnswer('q-1'), 'John');
    });

    test('validates required fields before submit', () async {
      final service = SubmissionService(storage: MockStorage());
      await service.startSubmission('qn-1');
      
      // Skip required question
      final result = await service.submit();
      expect(result.isLeft, true); // Left = error
      expect(result.fold((l) => l.code, (r) => null), 'REQUIRED_FIELDS_MISSING');
    });
  });
}
```

## 2. Widget Testing

### Key Widgets to test
- `QuestionRenderer` — Renders correct widget for each question type
- `FormNavigation` — Previous/next, progress indicator, jump to question
- `SyncStatusIndicator` — Synced, pending, failed, syncing states
- `AssignmentCard` — Progress, due date, status badge
- `SubmissionList` — Status filter, search, empty state
- `MediaCaptureButton` — Camera, gallery, audio options
- `GpsIndicator` — Accuracy, acquiring, unavailable states
- `OfflineBanner` — Shows when offline, hides when online

```dart
// question_renderer_test.dart
void main() {
  testWidgets('renders text input for text type question', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: QuestionRenderer(
          question: Question(type: QuestionType.text, text: 'What is your name?'),
          onAnswer: (_) {},
        ),
      ),
    );

    expect(find.text('What is your name?'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
  });

  testWidgets('renders radio buttons for select_one question', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: QuestionRenderer(
          question: Question(
            type: QuestionType.selectOne,
            text: 'Gender?',
            options: [Option('male', 'Male'), Option('female', 'Female')],
          ),
          onAnswer: (_) {},
        ),
      ),
    );

    expect(find.text('Male'), findsOneWidget);
    expect(find.text('Female'), findsOneWidget);
    expect(find.byType(Radio), findsNWidgets(2));
  });

  testWidgets('shows validation error for empty required field', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: QuestionRenderer(
          question: Question(type: QuestionType.text, text: 'Name?', isRequired: true),
          onAnswer: (_) {},
          showValidation: true,
        ),
      ),
    );

    expect(find.text('This question is required'), findsOneWidget);
  });
}
```

## 3. Integration Testing (Full-Screen Flows)

### Flow Tests
- Login → Dashboard → Select assignment → Start submission
- Complete 10-question form → Review → Submit (online)
- Complete form offline → Go online → Auto-sync
- GPS capture → verify accuracy → accept/reject
- Photo capture → confirm → save
- Partial save → app restart → resume → complete

```dart
// form_completion_test.dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('complete full form submission flow', (tester) async {
    // Login
    await tester.pumpWidget(MerlineApp());
    await tester.enterText(find.byKey(Key('email-field')), 'enum@org.com');
    await tester.enterText(find.byKey(Key('password-field')), 'password');
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();

    // Navigate to assignment
    await tester.tap(find.text('Health Survey 2026'));
    await tester.pumpAndSettle();

    // Start new submission
    await tester.tap(find.text('Start New Submission'));
    await tester.pumpAndSettle();

    // Answer questions
    await tester.enterText(find.byType(TextField), 'Household 42');
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    
    await tester.tap(find.text('Male'));
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();

    // Answer all questions...
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();

    // Verify success
    expect(find.text('Submission saved'), findsOneWidget);
  });
}
```

## 4. Offline Mode Testing

### Test Scenarios (40 test cases)

| Scenario | Test Case | Expected Result |
|----------|-----------|-----------------|
| No network start | App launches without connectivity | Forms load from cache, pending indicator shows |
| Form download | Download form while online | Form cached; available offline |
| Offline submission | Complete form without network | Saves locally as "Pending Sync" |
| Sync on connect | Submit → go online | Auto-syncs without user action |
| Interrupted sync | Connection drops mid-upload | Resumes from checkpoint |
| Media offload | Capture photo offline → sync | Photo compressed, chunked upload |
| Conflict detection | Server has newer version | Prompt user or LWW |
| Form update | Researcher updates form | Device detects mismatch, prompts update |
| Storage full | Device storage at 95% | Warning shown, no data lost |
| Battery critical | Battery < 5% | Graceful save before shutdown |
| App kill mid-form | Force close during entry | Auto-save on last answer; resume prompt |

```dart
// offline_submission_test.dart
void main() {
  testWidgets('submission saved locally when offline', (tester) async {
    // Simulate offline
    NetworkMock.setConnected(false);

    await tester.pumpWidget(MerlineApp());
    // Complete form flow...
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();

    // Should show pending sync
    expect(find.text('Pending Sync'), findsOneWidget);
    expect(find.text('Submitted'), findsNothing);

    // Go online
    NetworkMock.setConnected(true);
    await tester.pumpAndSettle(Duration(seconds: 5));

    // Should auto-sync
    expect(find.text('Synced'), findsOneWidget);
  });

  test('sync retries with exponential backoff on failure', () async {
    final syncService = SyncService(
      apiClient: MockApiClient(failCount: 3),
      storage: MockStorage(),
    );

    await syncService.pushPendingSubmissions();

    expect(syncService.retryCount, 3);
    expect(syncService.backoffIntervals, [
      Duration(seconds: 2),
      Duration(seconds: 4),
      Duration(seconds: 8),
    ]);
  });
}
```

## 5. GPS Testing

### Scenarios
- GPS acquisition: Cold start vs warm start vs cached
- Accuracy: High accuracy (>10m), medium (>50m), poor (>100m)
- Indoor: GPS unavailable, fallback to WiFi/cell
- Background: GPS tracking when app minimized
- Battery: GPS power consumption over 8-hour field day
- Drift: Point capture shows location drift over time
- Polygon: Area capture with waypoints

```dart
test('GPS indicator shows accuracy level', (tester) async {
  LocationMock.setLocation(LatLng(-1.94, 30.06), accuracy: 5.0);
  await tester.pumpWidget(GpsIndicator());
  expect(find.text('GPS: 5m accuracy'), findsOneWidget);
  expect(find.byIcon(Icons.gps_fixed), findsOneWidget); // high accuracy icon
});

test('gps capture records coordinates and accuracy', () async {
  final service = LocationService(platform: MockPlatform());
  LocationMock.setLocation(LatLng(-1.94, 30.06), accuracy: 8.0);

  final location = await service.capturePoint();
  expect(location.latitude, -1.94);
  expect(location.longitude, 30.06);
  expect(location.accuracy, 8.0);
});
```

## 6. Media Testing

### Camera
- Photo capture with flash on/off
- Photo capture in low light
- Front vs rear camera
- Resolution settings (low, medium, high)
- Storage permission denied
- Camera unavailable (tablet without camera)

### Audio
- Record audio with permissions
- Playback recorded audio
- File size limits enforced

### Upload
- Chunked upload with resume
- Compression before upload
- Upload progress indicator
- Retry on failure
- Background upload

## 7. Battery Consumption Testing

### Measurements
- App in foreground: Form entry for 30 min → max 10% battery
- App in background: Idle with sync → max 2% per hour
- GPS active: Continuous tracking for 1 hour → max 15%
- Camera active: 50 photos → max 5%
- Sync active: Upload 100 submissions → max 8%

### Tools
- Flutter DevTools energy monitor
- Android Battery Historian
- iOS Energy Log

## 8. Device Compatibility Testing

### Target Device Matrix (Firebase Test Lab)

| Device | OS | Screen | RAM | Priority |
|--------|----|--------|-----|----------|
| Pixel 7 | Android 14 | 1080x2400 | 8GB | P0 |
| Pixel 4a | Android 12 | 1080x2340 | 6GB | P0 |
| Samsung A12 | Android 11 | 720x1600 | 3GB | P0 |
| Tecno Spark 8 | Android 11 | 720x1640 | 3GB | P0 |
| Nokia 2.4 | Android 10 | 720x1600 | 2GB | P1 |
| OnePlus Nord | Android 13 | 1080x2400 | 8GB | P0 |
| iPhone 14 | iOS 17 | - | - | P0 |
| iPhone SE (2020) | iOS 15 | - | 3GB | P0 |
| iPad (9th gen) | iPadOS 16 | - | 3GB | P1 |

### Low-end Device Optimizations to Validate
- Form rendering with 200+ questions stays under 60fps
- Sync queue with 500 pending submissions memory stays under 200MB
- Media cache with 1GB of photos does not crash
- Background sync does not trigger ANR (Android) / watchdog (iOS)

## 9. Sync Conflict Testing

### Conflict Scenarios
1. **Concurrent submission**: Two enumerators submit same household — LWW resolves
2. **Form update during collection**: Form has new questions — enumerator's partial save preserved, new questions added
3. **Device rollback**: Enumerator reinstalls app with old cache — server rejects stale form version
4. **Media conflict**: Same photo key — server keeps first, rejects duplicate
5. **Supervisor override**: Supervisor edits submission server-side — enumerator gets update on next pull
6. **Deleted assignment**: Researcher removes assignment mid-collection — enumerator sees "Assignment Cancelled"
7. **Data type mismatch**: Form field changed from text to number — submission validated against new schema
