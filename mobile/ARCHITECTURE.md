# Mobile Application Architecture

## 1. Clean Architecture Layers

```
┌──────────────────────────────────────────────────┐
│                 PRESENTATION                      │
│  Widgets, Screens, Pages, Routes, Themes          │
│  Riverpod Providers (state + UI-bound)            │
├──────────────────────────────────────────────────┤
│                 APPLICATION                       │
│  Use Cases / Interactors                          │
│  Riverpod Providers (business-logic-bound)        │
│  Form State, Sync Triggers, Navigation Events     │
├──────────────────────────────────────────────────┤
│                   DOMAIN                          │
│  Entities, Value Objects                          │
│  Repository Interfaces (contracts)                 │
│  Domain Services (validation, calculation)         │
├──────────────────────────────────────────────────┤
│               INFRASTRUCTURE                      │
│  Repository Implementations                       │
│  Drift DAOs (SQLite), API Clients (Dio),          │
│  Platform Channels (GPS, Camera, Audio),          │
│  File Storage, Encryption                         │
├──────────────────────────────────────────────────┤
│                  SHARED                           │
│  Constants, Extensions, Utils, Logger,            │
│  Error Classes, Theme Tokens                      │
└──────────────────────────────────────────────────┘
```

### Layer Rules

- **Presentation** depends only on **Application** and **Shared**
- **Application** depends only on **Domain** and **Shared**
- **Domain** has zero dependencies (pure Dart)
- **Infrastructure** implements **Domain** interfaces, depends on **Shared**
- No layer imports from a layer above it
- All cross-layer communication via interfaces/contracts

---

## 2. Directory Structure

```
lib/
├── main.dart                          # App entry, provider scope, DI init
├── app.dart                           # MaterialApp.router widget
├── bootstrap.dart                     # Initialization (DB, auth, sync)
│
├── core/
│   ├── constants/
│   │   ├── api_constants.dart         # Base URL, timeout, version
│   │   ├── app_constants.dart         # App name, version, feature flags
│   │   └── storage_constants.dart     # DB name, encryption key refs
│   ├── errors/
│   │   ├── failures.dart              # Failure sealed classes
│   │   ├── exceptions.dart            # Custom exception types
│   │   └── error_handler.dart         # Global error handler
│   ├── extensions/
│   │   ├── context_extensions.dart    # BuildContext helpers
│   │   ├── datetime_extensions.dart
│   │   └── string_extensions.dart
│   ├── logger/
│   │   ├── app_logger.dart            # Logging abstraction
│   │   └── crash_reporter.dart        # Firebase Crashlytics wrapper
│   ├── network/
│   │   ├── dio_client.dart            # Dio instance factory
│   │   ├── network_info.dart          # Connectivity checker
│   │   └── interceptors/
│   │       ├── auth_interceptor.dart  # Attach JWT, handle 401
│   │       ├── logging_interceptor.dart
│   │       ├── offline_interceptor.dart  # Queue requests when offline
│   │       └── retry_interceptor.dart    # Exponential backoff
│   ├── router/
│   │   ├── app_router.dart            # GoRouter config
│   │   ├── route_names.dart           # Named route constants
│   │   └── guards/
│   │       ├── auth_guard.dart
│   │       └── sync_guard.dart
│   ├── theme/
│   │   ├── app_theme.dart             # Light & dark theme definitions
│   │   ├── colors.dart
│   │   ├── typography.dart
│   │   └── dimensions.dart
│   ├── utils/
│   │   ├── debouncer.dart
│   │   ├── validators.dart
│   │   └── uuid_generator.dart        # UUIDv7 generation
│   └── widgets/
│       ├── app_button.dart
│       ├── app_text_field.dart
│       ├── loading_indicator.dart
│       ├── error_view.dart
│       ├── empty_state.dart
│       ├── offline_indicator.dart
│       ├── sync_status_badge.dart
│       └── network_aware_widget.dart
│
├── domain/
│   ├── entities/
│   │   ├── user.dart
│   │   ├── organization.dart
│   │   ├── project.dart
│   │   ├── study.dart
│   │   ├── questionnaire.dart
│   │   ├── section.dart
│   │   ├── question.dart
│   │   ├── question_option.dart
│   │   ├── submission.dart
│   │   ├── response_value.dart
│   │   ├── assignment.dart
│   │   ├── indicator.dart
│   │   ├── media_file.dart
│   │   ├── gps_coordinate.dart
│   │   ├── sync_status.dart
│   │   └── sync_queue_item.dart
│   ├── value_objects/
│   │   ├── email.dart
│   │   ├── phone_number.dart
│   │   ├── gps_accuracy.dart
│   │   ├── file_hash.dart
│   │   └── coordinate.dart
│   └── repository_interfaces/
│       ├── auth_repository.dart
│       ├── project_repository.dart
│       ├── questionnaire_repository.dart
│       ├── submission_repository.dart
│       ├── assignment_repository.dart
│       ├── media_repository.dart
│       ├── sync_repository.dart
│       └── gps_repository.dart
│
├── application/
│   ├── auth/
│   │   ├── providers/
│   │   │   ├── auth_state_provider.dart
│   │   │   ├── auth_notifier.dart
│   │   │   └── login_form_provider.dart
│   │   ├── use_cases/
│   │   │   ├── login_usecase.dart
│   │   │   ├── logout_usecase.dart
│   │   │   ├── refresh_token_usecase.dart
│   │   │   └── check_auth_usecase.dart
│   │   └── models/
│   │       └── auth_state.dart
│   ├── projects/
│   │   ├── providers/
│   │   │   ├── project_list_provider.dart
│   │   │   └── project_detail_provider.dart
│   │   └── use_cases/
│   │       ├── get_projects_usecase.dart
│   │       └── sync_projects_usecase.dart
│   ├── questionnaires/
│   │   ├── providers/
│   │   │   ├── questionnaire_list_provider.dart
│   │   │   ├── questionnaire_detail_provider.dart
│   │   │   └── form_progress_provider.dart
│   │   └── use_cases/
│   │       ├── load_questionnaire_usecase.dart
│   │       └── sync_questionnaires_usecase.dart
│   ├── submissions/
│   │   ├── providers/
│   │   │   ├── submission_list_provider.dart
│   │   │   ├── current_submission_provider.dart
│   │   │   └── submission_sync_provider.dart
│   │   └── use_cases/
│   │       ├── create_submission_usecase.dart
│   │       ├── save_response_usecase.dart
│   │       ├── submit_submission_usecase.dart
│   │       └── get_submissions_usecase.dart
│   ├── sync/
│   │   ├── providers/
│   │   │   ├── sync_state_provider.dart
│   │   │   └── sync_progress_provider.dart
│   │   ├── use_cases/
│   │   │   ├── pull_changes_usecase.dart
│   │   │   ├── push_changes_usecase.dart
│   │   │   ├── sync_media_usecase.dart
│   │   │   └── resolve_conflict_usecase.dart
│   │   └── services/
│   │       └── sync_scheduler.dart
│   ├── media/
│   │   ├── providers/
│   │   │   ├── media_capture_provider.dart
│   │   │   ├── media_upload_provider.dart
│   │   │   └── storage_usage_provider.dart
│   │   └── use_cases/
│   │       ├── capture_photo_usecase.dart
│   │       ├── capture_audio_usecase.dart
│   │       ├── capture_video_usecase.dart
│   │       └── compress_media_usecase.dart
│   ├── gps/
│   │   ├── providers/
│   │   │   ├── location_provider.dart
│   │   │   └── gps_accuracy_provider.dart
│   │   └── use_cases/
│   │       ├── get_current_location_usecase.dart
│   │       ├── validate_gps_usecase.dart
│   │       └── start_gps_tracking_usecase.dart
│   └── dashboard/
│       ├── providers/
│       │   ├── enumerator_dashboard_provider.dart
│       │   └── supervisor_dashboard_provider.dart
│       └── use_cases/
│           ├── get_assignments_status_usecase.dart
│           └── get_team_progress_usecase.dart
│
├── infrastructure/
│   ├── database/
│   │   ├── app_database.dart          # Drift database definition
│   │   ├── app_database_helper.dart   # Migration, WAL mode, encryption
│   │   ├── daos/
│   │   │   ├── user_dao.dart
│   │   │   ├── project_dao.dart
│   │   │   ├── questionnaire_dao.dart
│   │   │   ├── submission_dao.dart
│   │   │   ├── assignment_dao.dart
│   │   │   ├── media_dao.dart
│   │   │   ├── sync_queue_dao.dart
│   │   │   └── sync_log_dao.dart
│   │   └── migrations/
│   │       └── ...                    # Drift versioned migrations
│   ├── api/
│   │   ├── data_sources/
│   │   │   ├── auth_remote_ds.dart
│   │   │   ├── project_remote_ds.dart
│   │   │   ├── questionnaire_remote_ds.dart
│   │   │   ├── submission_remote_ds.dart
│   │   │   ├── sync_remote_ds.dart
│   │   │   └── media_remote_ds.dart
│   │   ├── dto/
│   │   │   ├── auth_dto.dart
│   │   │   ├── project_dto.dart
│   │   │   ├── questionnaire_dto.dart
│   │   │   ├── submission_dto.dart
│   │   │   ├── sync_request_dto.dart
│   │   │   └── sync_response_dto.dart
│   │   └── mappers/
│   │       ├── project_mapper.dart
│   │       ├── questionnaire_mapper.dart
│   │       └── submission_mapper.dart
│   ├── repositories/
│   │   ├── auth_repository_impl.dart
│   │   ├── project_repository_impl.dart
│   │   ├── questionnaire_repository_impl.dart
│   │   ├── submission_repository_impl.dart
│   │   ├── assignment_repository_impl.dart
│   │   ├── media_repository_impl.dart
│   │   ├── sync_repository_impl.dart
│   │   └── gps_repository_impl.dart
│   ├── platform/
│   │   ├── camera_service.dart        # Camera plugin wrapper
│   │   ├── audio_service.dart         # Audio recorder wrapper
│   │   ├── location_service.dart      # Geolocator wrapper
│   │   ├── storage_service.dart       # File system helpers
│   │   └── biometric_service.dart     # Biometric auth
│   ├── encryption/
│   │   ├── file_encryption.dart       # AES-256 file encrypt/decrypt
│   │   ├── db_encryption.dart         # SQLCipher config
│   │   └── key_manager.dart           # Secure key storage
│   └── sync/
│       ├── sync_engine.dart           # Core sync orchestrator
│       ├── change_tracker.dart        # Track local DB changes
│       ├── conflict_resolver.dart     # LWW + manual resolution
│       ├── retry_queue.dart           # Persistent retry queue
│       ├── media_uploader.dart        # Chunked upload with resume
│       └── background_sync.dart       # WorkManager integration
│
├── presentation/
│   ├── auth/
│   │   ├── screens/
│   │   │   ├── login_screen.dart
│   │   │   ├── register_screen.dart
│   │   │   ├── forgot_password_screen.dart
│   │   │   └── mfa_screen.dart
│   │   └── widgets/
│   │       └── login_form.dart
│   ├── dashboard/
│   │   ├── screens/
│   │   │   ├── enumerator_dashboard_screen.dart
│   │   │   └── supervisor_dashboard_screen.dart
│   │   └── widgets/
│   │       ├── assignment_card.dart
│   │       ├── progress_chart.dart
│   │       └── quick_stats_row.dart
│   ├── projects/
│   │   ├── screens/
│   │   │   ├── project_list_screen.dart
│   │   │   └── project_detail_screen.dart
│   │   └── widgets/
│   │       └── project_card.dart
│   ├── questionnaires/
│   │   ├── screens/
│   │   │   ├── questionnaire_list_screen.dart
│   │   │   └── questionnaire_detail_screen.dart
│   │   └── widgets/
│   │       └── questionnaire_card.dart
│   ├── forms/
│   │   ├── screens/
│   │   │   ├── form_screen.dart           # Main form renderer
│   │   │   ├── form_review_screen.dart    # Pre-submission review
│   │   │   └── form_complete_screen.dart  # Post-submission
│   │   ├── widgets/
│   │   │   ├── question_renderer.dart     # Dispatches to type widgets
│   │   │   ├── question_widget_factory.dart
│   │   │   ├── question_types/
│   │   │   │   ├── text_question.dart
│   │   │   │   ├── numeric_question.dart
│   │   │   │   ├── select_one_question.dart
│   │   │   │   ├── select_multi_question.dart
│   │   │   │   ├── dropdown_question.dart
│   │   │   │   ├── date_question.dart
│   │   │   │   ├── time_question.dart
│   │   │   │   ├── gps_question.dart
│   │   │   │   ├── photo_question.dart
│   │   │   │   ├── audio_question.dart
│   │   │   │   ├── video_question.dart
│   │   │   │   ├── barcode_question.dart
│   │   │   │   ├── signature_question.dart
│   │   │   │   ├── likert_question.dart
│   │   │   │   ├── ranking_question.dart
│   │   │   │   ├── slider_question.dart
│   │   │   │   ├── matrix_question.dart
│   │   │   │   ├── note_widget.dart
│   │   │   │   ├── calculated_value.dart
│   │   │   │   └── composite_question.dart
│   │   │   ├── repeat_group_widget.dart
│   │   │   ├── section_header.dart
│   │   │   ├── form_progress_bar.dart
│   │   │   ├── form_navigation.dart
│   │   │   └── validation_message.dart
│   │   └── engine/
│   │       ├── form_engine.dart           # Core engine: state, nav, logic
│   │       ├── skip_logic_evaluator.dart  # Client-side skip logic
│   │       ├── validation_engine.dart     # Client-side validation
│   │       ├── calculation_engine.dart    # Calculated fields
│   │       ├── autosave_manager.dart      # Periodic autosave
│   │       ├── draft_recovery.dart        # Crash recovery
│   │       └── form_state_manager.dart    # Riverpod form state
│   ├── sync/
│   │   ├── screens/
│   │   │   ├── sync_status_screen.dart
│   │   │   └── conflict_resolution_screen.dart
│   │   └── widgets/
│   │       ├── sync_progress_indicator.dart
│   │       ├── pending_submissions_list.dart
│   │       └── conflict_item.dart
│   ├── settings/
│   │   ├── screens/
│   │   │   ├── settings_screen.dart
│   │   │   ├── language_settings_screen.dart
│   │   │   ├── storage_management_screen.dart
│   │   │   └── about_screen.dart
│   │   └── widgets/
│   │       └── settings_tile.dart
│   └── shared/
│       ├── screens/
│       │   └── splash_screen.dart
│       └── widgets/
│           ├── app_scaffold.dart
│           ├── bottom_nav_bar.dart
│           └── app_drawer.dart
│
└── test/
    ├── unit/
    │   ├── domain/
    │   ├── application/
    │   └── infrastructure/
    ├── widget/
    ├── integration/
    └── mocks/
        └── mock_repositories.dart
```

---

## 3. Dependency Injection

Using Riverpod's built-in DI (no external DI framework):

```dart
// Infrastructure providers (singletons)
final dioClientProvider = Provider<Dio>((ref) => createDioClient());
final databaseProvider = Provider<AppDatabase>((ref) => AppDatabase());
final locationServiceProvider = Provider<LocationService>((ref) => LocationService());
final cameraServiceProvider = Provider<CameraService>((ref) => CameraService());
final audioServiceProvider = Provider<AudioService>((ref) => AudioService());

// Repository providers (factories)
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final remoteDs = AuthRemoteDataSource(ref.read(dioClientProvider));
  final localDs = UserDao(ref.read(databaseProvider));
  return AuthRepositoryImpl(remoteDs, localDs);
});

final questionnaireRepositoryProvider = Provider<QuestionnaireRepository>((ref) {
  final remoteDs = QuestionnaireRemoteDataSource(ref.read(dioClientProvider));
  final localDs = QuestionnaireDao(ref.read(databaseProvider));
  return QuestionnaireRepositoryImpl(remoteDs, localDs);
});

final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  return SyncRepositoryImpl(
    syncRemoteDs: SyncRemoteDataSource(ref.read(dioClientProvider)),
    syncQueueDao: SyncQueueDao(ref.read(databaseProvider)),
    syncLogDao: SyncLogDao(ref.read(databaseProvider)),
  );
});

// Use case providers (transient)
final loginUseCaseProvider = Provider<LoginUseCase>((ref) {
  return LoginUseCase(ref.read(authRepositoryProvider));
});

// State notifiers
final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(loginUseCaseProvider), ref.read(logoutUseCaseProvider));
});
```

### Registration lifecycle:

| Scope | Duration | Examples |
|-------|----------|----------|
| `Provider` (singleton) | App lifetime | Dio, Database, Services |
| `ScopedProvider` | Route/screen lifetime | Current submission, form state |
| `StateNotifierProvider` | App lifetime or scoped | Auth, sync, dashboard |
| `FutureProvider` / `StreamProvider` | Auto-dispose | Location stream |

---

## 4. Routing and Navigation

Using `go_router` with declarative routing:

```dart
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isOnAuth = state.matchedLocation.startsWith('/auth');

      if (!isLoggedIn && !isOnAuth) return '/auth/login';
      if (isLoggedIn && isOnAuth) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      ShellRoute(
        builder: (_, __, child) => AppScaffold(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (_, __) => const EnumeratorDashboardScreen(),
            routes: [
              GoRoute(
                path: 'assignments/:assignmentId',
                builder: (_, state) => AssignmentDetailScreen(
                  assignmentId: state.pathParameters['assignmentId']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/supervisor-dashboard',
            builder: (_, __) => const SupervisorDashboardScreen(),
          ),
          GoRoute(path: '/projects', ...),
          GoRoute(path: '/questionnaires', ...),
          GoRoute(
            path: '/form/:questionnaireId',
            builder: (_, state) => FormScreen(
              questionnaireId: state.pathParameters['questionnaireId']!,
              submissionId: state.uri.queryParameters['submissionId'],
            ),
          ),
          GoRoute(
            path: '/sync-status',
            builder: (_, __) => const SyncStatusScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (_, __) => const SettingsScreen(),
          ),
        ],
      ),
      GoRoute(path: '/auth/login', ...),
      GoRoute(path: '/auth/register', ...),
    ],
  );
});
```

### Navigation patterns:

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| Bottom navigation (4 tabs) | ShellRoute with nested StatefulShellRoute | Dashboard, Surveys, Sync, Settings |
| Push/pop | context.pushNamed / context.pop | Detail screens, form entry |
| Modal bottom sheet | showModalBottomSheet | Quick actions, conflict resolution |
| Deep link | go_router deep link support | Notification → specific form |
| Back navigation guards | Form willPop handling | Prevent accidental exit during form entry |

---

## 5. State Management Patterns

### Provider types and usage:

```dart
// 1. Simple value provider (singleton services)
final appDatabaseProvider = Provider<AppDatabase>((ref) => AppDatabase());

// 2. Future provider (async data loading)
final projectListProvider = FutureProvider<List<Project>>((ref) async {
  return ref.read(projectRepositoryProvider).getProjects();
});

// 3. StateNotifierProvider (mutable state with logic)
class SubmissionNotifier extends StateNotifier<SubmissionState> {
  SubmissionNotifier(this._createSubmission, this._saveResponse)
      : super(SubmissionState.initial());

  Future<void> saveAnswer(String questionId, dynamic value) async {
    state = state.copyWith(isSaving: true);
    await _saveResponse(state.currentSubmissionId!, questionId, value);
    state = state.copyWith(isSaving: false, lastSavedAt: DateTime.now());
  }
}

// 4. StreamProvider (reactive streams like GPS)
final locationStreamProvider = StreamProvider<LocationData>((ref) {
  return ref.read(locationServiceProvider).locationStream;
});

// 5. Provider.autoDispose (clean up when no longer watched)
final formStateProvider = StateNotifierProvider.autoDispose<FormStateNotifier, FormState>((ref) {
  final questionnaireId = ref.watch(currentQuestionnaireIdProvider);
  return FormStateNotifier(questionnaireId);
});
```

### State categories:

| Category | Storage | Update Mechanism |
|----------|---------|-----------------|
| Server data (synced) | Drift DB → Riverpod watch | Sync pull → DB update → UI refresh |
| Local data (drafts) | Drift DB | Optimistic → DB write → UI refresh |
| Ephemeral UI state | Riverpod StateNotifier | Local mutations only |
| Cross-cutting (auth, sync) | Riverpod StateNotifier | Global listeners |

### Optimistic UI pattern:

```dart
Future<void> submitResponse(String questionId, dynamic value) async {
  // 1. Optimistic update immediately
  state = state.copyWith(
    responses: {...state.responses, questionId: value},
    syncStatus: SyncStatus.pending,
  );

  try {
    // 2. Persist locally (always succeeds)
    await ref.read(submissionRepositoryProvider).saveResponse(
      state.currentSubmissionId!,
      questionId,
      value,
    );
  } catch (e) {
    // 3. Revert on failure
    state = state.copyWith(
      responses: {...state.responses}..remove(questionId),
      syncStatus: SyncStatus.error,
    );
  }
}
```

---

## 6. Error Handling Framework

### Error hierarchy:

```dart
sealed class AppFailure {
  const AppFailure(this.message, {this.cause});
  final String message;
  final Object? cause;
}

class NetworkFailure extends AppFailure {
  const NetworkFailure(super.message, {super.cause});
}

class ServerFailure extends AppFailure {
  const ServerFailure(super.message, {this.statusCode, super.cause});
  final int? statusCode;
}

class CacheFailure extends AppFailure {
  const CacheFailure(super.message, {super.cause});
}

class ValidationFailure extends AppFailure {
  const ValidationFailure(super.message, {this.fieldErrors, super.cause});
  final Map<String, String>? fieldErrors;
}

class SyncConflictFailure extends AppFailure {
  const SyncConflictFailure(super.message, {required this.conflict, super.cause});
  final SyncConflict conflict;
}

class AuthenticationFailure extends AppFailure {
  const AuthenticationFailure(super.message, {super.cause});
}

class GpsFailure extends AppFailure {
  const GpsFailure(super.message, {super.cause});
}

class MediaFailure extends AppFailure {
  const MediaFailure(super.message, {super.cause});
}

class StorageFailure extends AppFailure {
  const StorageFailure(super.message, {super.cause});
}
```

### Global error handler:

```dart
class AppErrorHandler {
  static Failure handle(dynamic error) {
    if (error is DioException) return _handleDioError(error);
    if (error is DriftWrappedException) return _handleDatabaseError(error);
    if (error is PlatformException) return _handlePlatformError(error);
    return ServerFailure('An unexpected error occurred', cause: error);
  }

  static Failure _handleDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return NetworkFailure('Connection timed out. Please try again.');
      case DioExceptionType.connectionError:
        return NetworkFailure('No internet connection.');
      case DioExceptionType.badResponse:
        return _handleStatusCode(error.response?.statusCode, error.response?.data);
      case DioExceptionType.cancel:
        return NetworkFailure('Request was cancelled.');
      default:
        return ServerFailure('Something went wrong.', cause: error);
    }
  }
}
```

### Error display patterns:

| Error Type | User Facing Action |
|------------|-------------------|
| NetworkFailure | "No connection" banner + retry button |
| ServerFailure | Snackbar with message + "Contact support" |
| ValidationFailure | Inline field error messages |
| SyncConflictFailure | "Conflict detected" dialog with diff view |
| AuthenticationFailure | Redirect to login screen |
| GpsFailure | Toast "Unable to get location" |
| StorageFailure | "Storage full" dialog with cleanup option |
| MediaFailure | "Camera unavailable" with fallback option |

---

## 7. Logging and Crash Reporting

```dart
class AppLogger {
  static final _crashlytics = FirebaseCrashlytics.instance;

  static void init() {
    // Enable crashlytics collection
    FlutterError.onError = (details) {
      _crashlytics.recordFlutterFatalError(details);
    };
    PlatformDispatcher.instance.onError = (error, stack) {
      _crashlytics.recordError(error, stack, fatal: true);
      return true;
    };
  }

  static void d(String tag, String message) {
    debugPrint('[$tag] $message');
  }

  static void e(String tag, String message, [Object? error, StackTrace? stack]) {
    debugPrint('[$tag][ERROR] $message');
    if (error != null) {
      _crashlytics.recordError(error, stack, reason: message);
    }
  }

  static void logSync(String event, Map<String, dynamic> data) {
    _crashlytics.log('Sync: $event ${jsonEncode(data)}');
  }

  static void logFormAction(String action, String questionnaireId) {
    _crashlytics.log('Form: $action [$questionnaireId]');
  }

  static void setUserContext(String userId, String orgId, String role) {
    _crashlytics.setUserIdentifier(userId);
    _crashlytics.setCustomKey('organization_id', orgId);
    _crashlytics.setCustomKey('role', role);
  }
}
```

---

## 8. Feature Organization by Module

| Module | Description | Screens | Key Providers |
|--------|-------------|---------|---------------|
| **auth** | Login, register, MFA, session | LoginScreen, RegisterScreen, MfaScreen | AuthNotifier |
| **dashboard** | Enumerator & supervisor views | EnumeratorDashboardScreen, SupervisorDashboardScreen | enumeratorDashboardProvider, supervisorDashboardProvider |
| **projects** | Project listing & detail | ProjectListScreen, ProjectDetailScreen | projectListProvider |
| **questionnaires** | Survey list & detail | QuestionnaireListScreen, QuestionnaireDetailScreen | questionnaireListProvider |
| **forms** | Form rendering engine | FormScreen, FormReviewScreen, FormCompleteScreen | formStateProvider, formProgressProvider |
| **sync** | Sync status, conflict resolution | SyncStatusScreen, ConflictResolutionScreen | syncStateProvider, syncProgressProvider |
| **settings** | App configuration | SettingsScreen, LanguageSettingsScreen, StorageManagementScreen | — |

---

## 9. Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Riverpod | Compile-safe, testable, no BuildContext dependency, auto-dispose |
| Routing | go_router | Declarative, deep link support, redirect guards |
| HTTP client | Dio | Interceptors, retry, cancellation, upload progress |
| Local DB | Drift (SQLite) | Type-safe, reactive queries, migrations, WAL mode |
| DI | Riverpod (no external DI) | Eliminates boilerplate, consistent with state management |
| Error handling | Sealed class hierarchy | Exhaustive pattern matching, type-safe error propagation |
| UUID | UUIDv7 (client-generated) | Time-ordered, globally unique, offline-safe |
| Logging | Firebase Crashlytics | Industry standard, breadcrumbs, custom keys |
| Architecture | Clean Architecture | Testability, separation of concerns, domain purity |
| Forms | Custom engine (not third-party) | Full control over 24 question types, skip logic, validation |
| Sync | Custom delta sync | Tailored for MERL workflow, field-level conflict resolution |

---

## 10. Build Configuration

### Android (`android/app/build.gradle`):
```groovy
android {
    compileSdk 34
    defaultConfig {
        minSdk 26   // Android 8+
        targetSdk 34
        ndk.abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86_64'
    }
}
```

### iOS (`ios/Podfile`):
```ruby
platform :ios, '15.0'
```

### Dependencies (`pubspec.yaml` key packages):
```yaml
dependencies:
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  go_router: ^14.0.0
  dio: ^5.4.0
  drift: ^2.16.0
  sqlite3_flutter_libs: ^0.5.0
  sqlcipher_flutter_libs: ^0.6.0
  flutter_secure_storage: ^9.0.0
  geolocator: ^11.0.0
  geocoding: ^3.0.0
  camera: ^0.11.0
  image_picker: ^1.0.0
  flutter_image_compress: ^2.1.0
  record: ^5.1.0
  video_player: ^2.8.0
  path_provider: ^2.1.0
  flutter_local_notifications: ^17.0.0
  firebase_core: ^3.0.0
  firebase_crashlytics: ^4.0.0
  firebase_messaging: ^15.0.0
  workmanager: ^0.28.0
  connectivity_plus: ^6.0.0
  local_auth: ^2.1.0
  flutter_barcode_scanner: ^2.0.0
  signature: ^5.4.0
  flutter_map: ^6.1.0
  latlong2: ^0.9.0
  json_annotation: ^4.8.0
  freezed_annotation: ^2.4.0
  intl: ^0.19.0
  logger: ^2.0.0
  crypto: ^3.0.0

dev_dependencies:
  build_runner: ^2.4.0
  drift_dev: ^2.16.0
  freezed: ^2.5.0
  json_serializable: ^6.7.0
  riverpod_generator: ^2.4.0
  mockito: ^5.4.0
  mocktail: ^1.0.0
  flutter_test:
  integration_test:
```
