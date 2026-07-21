# Mobile UI Framework

## 1. Design System Integration

The mobile UI follows the design tokens defined by the Visual Design System & UI Architect. All colors, typography, spacing, and component styles are derived from a shared token specification.

### 1.1 Theme Architecture

```dart
class AppTheme {
  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
        primary: AppColors.primary,
        onPrimary: AppColors.onPrimary,
        primaryContainer: AppColors.primaryContainer,
        secondary: AppColors.secondary,
        surface: AppColors.surface,
        error: AppColors.error,
      ),
      typography: Typography.material2021(
        black: _textTheme(),
      ),
      textTheme: _textTheme(),
      appBarTheme: AppBarTheme(
        centerTitle: true,
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      cardTheme: CardTheme(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: Size(double.infinity, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.dark,
      ),
      // ... similar overrides for dark mode
    );
  }

  static TextTheme _textTheme() {
    return TextTheme(
      displayLarge: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: -0.5),
      headlineLarge: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
      headlineMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.semiBold),
      titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.semiBold),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.medium),
      bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.normal),
      bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.normal),
      bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
      labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.medium, letterSpacing: 0.5),
    );
  }
}
```

### 1.2 Color Palette

```dart
class AppColors {
  // Primary
  static const Color primary = Color(0xFF1565C0);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFFD1E4FF);

  // Secondary
  static const Color secondary = Color(0xFF00897B);
  static const Color onSecondary = Color(0xFFFFFFFF);

  // Status
  static const Color success = Color(0xFF2E7D32);
  static const Color warning = Color(0xFFF9A825);
  static const Color error = Color(0xFFC62828);
  static const Color info = Color(0xFF1565C0);

  // Sync
  static const Color synced = Color(0xFF2E7D32);
  static const Color pending = Color(0xFFF9A825);
  static const Color failed = Color(0xFFC62828);
  static const Color offline = Color(0xFF757575);
  static const Color syncing = Color(0xFF1565C0);

  // Surface
  static const Color surface = Color(0xFFF5F5F5);
  static const Color surfaceDark = Color(0xFF121212);
  static const Color card = Color(0xFFFFFFFF);

  // Text
  static const Color textPrimary = Color(0xFF212121);
  static const Color textSecondary = Color(0xFF757575);
  static const Color textDisabled = Color(0xFFBDBDBD);

  // Offline indicators
  static const Color offlineBar = Color(0xFF616161);
  static const Color offlineBarText = Color(0xFFFFFFFF);
}
```

### 1.3 Spacing System

```dart
class AppSpacing {
  static const double xxs = 2.0;
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  static const double xxxl = 64.0;
}
```

---

## 2. Component Library

### 2.1 Shared Widgets

```dart
// ─── Offline Banner ───
class OfflineBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(networkStatusProvider);
    if (isOnline) return SizedBox.shrink();

    return Container(
      width: double.infinity,
      color: AppColors.offlineBar,
      padding: EdgeInsets.symmetric(vertical: AppSpacing.sm, horizontal: AppSpacing.md),
      child: Row(
        children: [
          Icon(Icons.cloud_off, color: AppColors.offlineBarText, size: 16),
          SizedBox(width: AppSpacing.sm),
          Text('You are offline. Changes will sync when connected.',
            style: TextStyle(color: AppColors.offlineBarText, fontSize: 13)),
        ],
      ),
    );
  }
}

// ─── Sync Status Badge ───
class SyncStatusBadge extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncStateProvider);

    return Badge(
      isLabelVisible: syncState.pendingCount > 0,
      label: Text('${syncState.pendingCount}'),
      child: IconButton(
        icon: Icon(
          syncState.isSyncing ? Icons.sync : Icons.cloud_done,
          color: syncState.isSyncing ? AppColors.syncing : AppColors.synced,
        ),
        onPressed: () => context.pushNamed('sync-status'),
      ),
    );
  }
}

// ─── Loading State ───
class LoadingView extends StatelessWidget {
  final String? message;
  const LoadingView({this.message = 'Loading...'});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: AppSpacing.md),
          Text(message!, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

// ─── Error State ───
class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorView({required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 64, color: AppColors.error),
            SizedBox(height: AppSpacing.md),
            Text(message, textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge),
            if (onRetry != null) ...[
              SizedBox(height: AppSpacing.lg),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: Icon(Icons.refresh),
                label: Text('Try Again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── Empty State ───
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;

  const EmptyState({
    required this.icon,
    required this.title,
    this.subtitle,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 72, color: AppColors.textDisabled),
            SizedBox(height: AppSpacing.md),
            Text(title, style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center),
            if (subtitle != null) ...[
              SizedBox(height: AppSpacing.sm),
              Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center),
            ],
            if (action != null) ...[
              SizedBox(height: AppSpacing.lg),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

// ─── Form Errors ───
class ValidationMessage extends StatelessWidget {
  final ValidationError error;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error, color: AppColors.error, size: 16),
          SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(error.message,
            style: TextStyle(color: AppColors.error, fontSize: 13))),
        ],
      ),
    );
  }
}
```

### 2.2 Screen Layout

```dart
class AppScaffold extends StatelessWidget {
  final Widget child;

  const AppScaffold({required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        OfflineBanner(),
        Expanded(child: child),
      ],
    );
  }
}

class AppBottomNav extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: _currentIndex(context),
      onDestinationSelected: (index) => _navigateToTab(context, index),
      destinations: [
        NavigationDestination(
          icon: Icon(Icons.dashboard_outlined),
          selectedIcon: Icon(Icons.dashboard),
          label: 'Dashboard',
        ),
        NavigationDestination(
          icon: Icon(Icons.assignment_outlined),
          selectedIcon: Icon(Icons.assignment),
          label: 'Surveys',
        ),
        NavigationDestination(
          icon: Icon(Icons.sync_outlined),
          selectedIcon: Icon(Icons.sync),
          label: 'Sync',
        ),
        NavigationDestination(
          icon: Icon(Icons.settings_outlined),
          selectedIcon: Icon(Icons.settings),
          label: 'Settings',
        ),
      ],
    );
  }
}
```

---

## 3. Navigation Patterns

| Pattern | Implementation | Screen |
|---------|---------------|--------|
| Bottom navigation (4 tabs) | NavigationBar + StatefulShellRoute | Main scaffold |
| Push detail | context.push() | Form, assignment detail |
| Modal bottom sheet | showModalBottomSheet | Conflict resolution, media preview |
| Dialog | AlertDialog | Confirm submit, delete draft |
| Pull-to-refresh | RefreshIndicator | Dashboard, survey list |
| Swipe | PageView | Question-by-question form navigation |
| Deep link | go_router deep links | Notification → specific form |

---

## 4. Offline Indicators

| Indicator | Location | Behavior |
|-----------|----------|----------|
| Offline banner | Top of screen (fixed) | Shows when no network; hides on reconnect |
| Sync status badge | AppBar | Icon changes: synced (green), syncing (blue spinning), pending (amber badge), failed (red) |
| Sync FAB | Bottom-right | Shows pending count; tap opens sync screen |
| Item-level badge | Each submission card | Green ✓, amber ●, red ✗, grey ◇ |
| Pull-to-refresh text | Pull indicator | "Last synced: 2 min ago" |

---

## 5. Sync Status UI

```dart
class SyncStatusScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncStateProvider);
    final syncReport = ref.watch(syncReportProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Sync Status')),
      body: ListView(
        padding: EdgeInsets.all(AppSpacing.md),
        children: [
          // Sync overview card
          Card(
            child: Padding(
              padding: EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  Icon(
                    syncState.isSyncing ? Icons.sync : Icons.cloud_done,
                    size: 48,
                    color: syncState.isSyncing ? AppColors.syncing : AppColors.synced,
                  ),
                  SizedBox(height: AppSpacing.sm),
                  Text(syncState.isSyncing ? 'Syncing...' : 'All Synced',
                    style: Theme.of(context).textTheme.titleLarge),
                  if (syncReport != null) ...[
                    Text('Last synced: ${_formatTime(syncReport.lastSyncTime)}'),
                  ],
                ],
              ),
            ),
          ),

          // Manual sync button
          ElevatedButton.icon(
            onPressed: syncState.isSyncing
              ? null
              : () => ref.read(syncStateProvider.notifier).triggerManualSync(),
            icon: Icon(Icons.sync),
            label: Text(syncState.isSyncing ? 'Syncing...' : 'Sync Now'),
          ),

          // Pending items
          ListTile(
            leading: Icon(Icons.hourglass_empty, color: AppColors.pending),
            title: Text('Pending'),
            trailing: Text('${syncReport?.pendingCount ?? 0}'),
          ),

          // Failed items
          ListTile(
            leading: Icon(Icons.error, color: AppColors.failed),
            title: Text('Failed'),
            trailing: Text('${syncReport?.failedCount ?? 0}'),
          ),

          // Conflicts
          if (syncReport?.conflictCount > 0)
            ListTile(
              leading: Icon(Icons.warning, color: AppColors.warning),
              title: Text('Conflicts'),
              subtitle: Text('Tap to resolve'),
              trailing: Text('${syncReport?.conflictCount}'),
              onTap: () => context.pushNamed('resolve-conflicts'),
            ),

          // Sync log
          Divider(),
          Text('Sync History', style: Theme.of(context).textTheme.titleMedium),
          ...syncReport?.logs.map((log) => SyncLogTile(log: log)) ?? [],
        ],
      ),
    );
  }
}
```

---

## 6. Responsive Layout

```dart
class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, ScreenSize size) builder;

  static ScreenSize getScreenSize(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width < 360) return ScreenSize.small;        // Small phone
    if (width < 600) return ScreenSize.normal;        // Phone
    if (width < 840) return ScreenSize.large;         // Large phone / small tablet
    if (width < 1200) return ScreenSize.tablet;       // Tablet
    return ScreenSize.desktop;                         // Desktop / foldable
  }

  @override
  Widget build(BuildContext context) {
    final size = getScreenSize(context);
    return builder(context, size);
  }
}

enum ScreenSize { small, normal, large, tablet, desktop }

// Usage:
class EnumeratorDashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, size) {
        if (size == ScreenSize.tablet) {
          return _buildTabletLayout(context);
        }
        return _buildPhoneLayout(context);
      },
    );
  }

  Widget _buildTabletLayout(BuildContext context) {
    // Two-column layout: assignment list + detail
    return Row(
      children: [
        Expanded(flex: 2, child: AssignmentList()),
        Expanded(flex: 3, child: AssignmentDetail()),
      ],
    );
  }

  Widget _buildPhoneLayout(BuildContext context) {
    // Single column with push navigation
    return AssignmentList();
  }
}
```

---

## 7. Accessibility

```dart
class AccessibilityConfig {
  static const double minTapTarget = 48.0;      // Minimum 48dp touch target
  static const double minFontSize = 14.0;       // Minimum readable font
  static const double contrastRatio = 4.5;      // WCAG AA contrast ratio

  static bool isLargeText(BuildContext context) {
    return MediaQuery.textScalerOf(context).scale(14) > 18;
  }

  static bool isReduceMotion(BuildContext context) {
    return MediaQuery.disableAnimationsOf(context);
  }

  static bool isHighContrast(BuildContext context) {
    return MediaQuery.highContrastOf(context);
  }
}

// Accessibility widget wrappers:
class AccessibleFormField extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: question.text,
      hint: question.helpText,
      required: question.isRequired,
      child: MergeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Large touch target (minimum 48dp)
            SizedBox(
              height: 48,
              child: TextField(
                // ... large tap target
              ),
            ),
            // Error message with semantics
            if (error != null)
              Semantics(
                liveRegion: true,
                child: Text(error!.message,
                  style: TextStyle(color: AppColors.error)),
              ),
          ],
        ),
      ),
    );
  }
}
```

### Accessibility Checklist

- [ ] All touch targets ≥ 48x48dp
- [ ] All text meets WCAG AA contrast ratio (4.5:1)
- [ ] Screen reader labels for all interactive elements
- [ ] Semantic grouping for related controls
- [ ] Form validation errors announced via live regions
- [ ] Progress indicators announced to screen readers
- [ ] Sync status changes announced
- [ ] Navigation order follows visual order
- [ ] Alternative text for all images/icons
- [ ] Reduced motion respected via MediaQuery
- [ ] Large text support (text scaling up to 200%)
- [ ] Focus indicators visible on all platforms
- [ ] Action confirmation before destructive operations

---

## 8. Dark Mode Support

```dart
class ThemeModeProvider extends StateNotifier<ThemeMode> {
  ThemeModeProvider() : super(ThemeMode.system); // Follow system default

  void setLight() => state = ThemeMode.light;
  void setDark() => state = ThemeMode.dark;
  void setSystem() => state = ThemeMode.system;
}

// In app.dart:
class MerlineApp extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,
      // ...
    );
  }
}
```

---

## 9. Screen Structure Map

```
App Launch
├── Splash Screen (loading, integrity check)
│
├── Auth Flow
│   ├── Login Screen
│   ├── Register Screen
│   ├── Forgot Password
│   └── MFA Verification
│
├── Main App (ShellRoute + BottomNav)
│   ├── Dashboard Tab
│   │   ├── Enumerator Dashboard
│   │   │   ├── AssignmentCardList
│   │   │   ├── QuickStats (completed, pending, overdue)
│   │   │   └── SyncStatusBanner
│   │   └── Supervisor Dashboard
│   │       ├── TeamProgressOverview
│   │       ├── EnumeratorPerformanceList
│   │       └── QualityAlertList
│   │
│   ├── Surveys Tab
│   │   ├── QuestionnaireListScreen
│   │   ├── QuestionnaireDetailScreen
│   │   └── → FormScreen (push)
│   │       ├── FormReviewScreen
│   │       └── FormCompleteScreen
│   │
│   ├── Sync Tab
│   │   ├── SyncStatusScreen
│   │   ├── PendingSubmissionList
│   │   └── ConflictResolutionScreen
│   │
│   └── Settings Tab
│       ├── ProfileScreen
│       ├── LanguageScreen
│       ├── StorageManagementScreen
│       ├── ThemeSettings
│       └── AboutScreen
│
└── Deep Links
    ├── Assignment notification → AssignmentDetail
    ├── Conflict notification → ConflictResolutionScreen
    └── Sync notification → SyncStatusScreen
```
