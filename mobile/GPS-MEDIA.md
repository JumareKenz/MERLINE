# GPS and Media Handling

## 1. GPS Architecture

### 1.1 Location Service

```dart
class LocationService {
  final GeolocatorPlatform _geolocator;
  StreamSubscription<Position>? _positionSubscription;
  final BehaviorSubject<LocationData> _locationSubject = BehaviorSubject<LocationData>();

  Stream<LocationData> get locationStream => _locationSubject.stream;
  LocationData? get lastKnownLocation => _locationSubject.valueOrNull;

  Future<LocationData> getCurrentLocation({
    LocationAccuracy accuracy = LocationAccuracy.high,
    Duration timeout = const Duration(seconds: 30),
  }) async {
    final position = await _geolocator.getCurrentPosition(
      desiredAccuracy: accuracy == LocationAccuracy.high
          ? PositionAccuracy.best
          : accuracy == LocationAccuracy.balanced
              ? PositionAccuracy.medium
              : PositionAccuracy.low,
      timeLimit: timeout,
    );

    return _toLocationData(position);
  }

  Stream<LocationData> startTracking({
    LocationAccuracy accuracy = LocationAccuracy.balanced,
    DistanceFilter distanceFilter = const DistanceFilter(5.0), // meters
    Duration interval = const Duration(seconds: 5),
  }) {
    _positionSubscription = _geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: _toGeolocatorAccuracy(accuracy),
        distanceFilter: distanceFilter.meters,
        timeLimit: interval,
      ),
    ).map(_toLocationData).listen(_locationSubject.add);

    return _locationSubject.stream;
  }

  void stopTracking() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
  }

  LocationData _toLocationData(Position position) {
    return LocationData(
      latitude: position.latitude,
      longitude: position.longitude,
      altitude: position.altitude,
      accuracy: position.accuracy,
      speed: position.speed,
      bearing: position.heading,
      timestamp: DateTime.fromMillisecondsSinceEpoch(position.timestamp!.millisecondsSinceEpoch),
      provider: _determineProvider(position),
    );
  }
}
```

### 1.2 GPS Accuracy Modes

```dart
enum LocationAccuracyMode {
  high,      // GPS + GLONASS + Galileo, < 10m accuracy, high battery use
  balanced,  // Fused provider, < 30m accuracy, moderate battery use
  lowPower,  // Network/WiFi only, < 100m accuracy, minimal battery use
}

class GpsAccuracyManager {
  static const Map<LocationAccuracyMode, GpsConfig> configs = {
    LocationAccuracyMode.high: GpsConfig(
      accuracy: PositionAccuracy.best,
      interval: Duration(seconds: 1),
      distanceFilter: 0,          // Every movement
      timeout: Duration(seconds: 30),
      batteryImpact: BatteryImpact.high,
      useInBackground: false,
    ),
    LocationAccuracyMode.balanced: GpsConfig(
      accuracy: PositionAccuracy.medium,
      interval: Duration(seconds: 5),
      distanceFilter: 5,          // Every 5 meters
      timeout: Duration(seconds: 15),
      batteryImpact: BatteryImpact.moderate,
      useInBackground: true,
    ),
    LocationAccuracyMode.lowPower: GpsConfig(
      accuracy: PositionAccuracy.low,
      interval: Duration(seconds: 30),
      distanceFilter: 50,         // Every 50 meters
      timeout: Duration(seconds: 10),
      batteryImpact: BatteryImpact.low,
      useInBackground: true,
    ),
  };

  LocationAccuracyMode selectMode({required bool isTracking, required bool isFormActive}) {
    if (isFormActive) return LocationAccuracyMode.high;
    if (isTracking) return LocationAccuracyMode.balanced;
    return LocationAccuracyMode.lowPower;
  }
}
```

### 1.3 GPS Drift Detection and Correction

```dart
class GpsDriftDetector {
  static const double maxSpeedKmh = 60;         // Max realistic speed (vehicle)
  static const double maxSpeedMs = maxSpeedKmh / 3.6;
  static const double maxAltitudeChangePerSecond = 50; // meters
  static const int minSamplesForFilter = 3;
  static const double outlierThresholdSigma = 3.0; // Standard deviations

  final Queue<LocationData> _recentPoints = Queue<LocationData>();
  final int _windowSize = 10;

  bool isDrifted(LocationData point, {List<LocationData>? previousPoints}) {
    final points = previousPoints ?? _recentPoints.toList();
    if (points.length < minSamplesForFilter) return false;

    final lastPoint = points.last;

    // Speed check: unrealistic speed between points
    if (point.timestamp != null && lastPoint.timestamp != null) {
      final dt = point.timestamp!.difference(lastPoint.timestamp!).inSeconds;
      if (dt > 0) {
        final distance = Geolocator.distanceBetween(
          lastPoint.latitude, lastPoint.longitude,
          point.latitude, point.longitude,
        );
        final speedMs = distance / dt;
        if (speedMs > maxSpeedMs) {
          return true; // Drifted — unrealistic speed
        }
      }
    }

    // Altitude check: sudden unrealistic change
    if (point.altitude != null && lastPoint.altitude != null) {
      final altChange = (point.altitude! - lastPoint.altitude!).abs();
      final dt = point.timestamp != null && lastPoint.timestamp != null
          ? point.timestamp!.difference(lastPoint.timestamp!).inSeconds
          : 1;
      if (dt > 0 && altChange / dt > maxAltitudeChangePerSecond) {
        return true; // Drifted — impossible altitude change
      }
    }

    return false;
  }

  LocationData correctDrift(LocationData point) {
    // Simple Kalman filter implementation
    if (_recentPoints.length < minSamplesForFilter) {
      _recentPoints.add(point);
      return point;
    }

    final filtered = _applyMovingAverage(point);
    _recentPoints.add(filtered);
    if (_recentPoints.length > _windowSize) {
      _recentPoints.removeFirst();
    }

    return filtered;
  }

  LocationData _applyMovingAverage(LocationData point) {
    final recent = _recentPoints.toList();
    final latSum = recent.fold<double>(0, (s, p) => s + p.latitude) + point.latitude;
    final lonSum = recent.fold<double>(0, (s, p) => s + p.longitude) + point.longitude;
    final count = recent.length + 1;

    return point.copyWith(
      latitude: latSum / count,
      longitude: lonSum / count,
    );
  }
}
```

### 1.4 GPS Validation

```dart
class GpsValidator {
  static const double validLatitudeMin = -90.0;
  static const double validLatitudeMax = 90.0;
  static const double validLongitudeMin = -180.0;
  static const double validLongitudeMax = 180.0;
  static const double altitudeMin = -500.0;   // Dead Sea
  static const double altitudeMax = 9000.0;    // High altitude

  ValidationResult validate(GpsCoordinate coordinate, GpsValidationConfig config) {
    final errors = <String>[];
    final warnings = <String>[];

    // Range validation
    if (coordinate.latitude < validLatitudeMin || coordinate.latitude > validLatitudeMax) {
      errors.add('Latitude out of range (-90 to 90)');
    }
    if (coordinate.longitude < validLongitudeMin || coordinate.longitude > validLongitudeMax) {
      errors.add('Longitude out of range (-180 to 180)');
    }
    if (coordinate.altitude != null && (coordinate.altitude! < altitudeMin || coordinate.altitude! > altitudeMax)) {
      warnings.add('Altitude outside plausible range');
    }

    // Accuracy threshold
    if (coordinate.accuracy > config.accuracyThreshold) {
      warnings.add('Accuracy (${coordinate.accuracy}m) exceeds threshold (${config.accuracyThreshold}m)');
    }

    // Geofence validation
    if (config.geofence != null) {
      final distance = Geolocator.distanceBetween(
        coordinate.latitude, coordinate.longitude,
        config.geofence!.centerLat, config.geofence!.centerLng,
      );
      if (distance > config.geofence!.radiusMeters + config.geofence!.bufferMeters) {
        warnings.add('Location is outside the study area (${distance.toStringAsFixed(0)}m from center)');
      }
    }

    return ValidationResult(errors: errors, warnings: warnings);
  }

  /// Cluster validation: check if a group of GPS points are consistent
  ClusterValidationResult validateCluster(List<GpsCoordinate> points) {
    if (points.length < 2) {
      return ClusterValidationResult(isValid: true);
    }

    // Calculate centroid
    final centerLat = points.map((p) => p.latitude).reduce((a, b) => a + b) / points.length;
    final centerLng = points.map((p) => p.longitude).reduce((a, b) => a + b) / points.length;

    // Calculate distances from centroid
    final distances = points.map((p) => Geolocator.distanceBetween(
      centerLat, centerLng, p.latitude, p.longitude,
    )).toList();

    final maxDeviation = distances.reduce((a, b) => a > b ? a : b);
    final avgDeviation = distances.reduce((a, b) => a + b) / distances.length;

    return ClusterValidationResult(
      isValid: maxDeviation < 100, // All points within 100m of centroid
      centroidLat: centerLat,
      centroidLng: centerLng,
      maxDeviationMeters: maxDeviation,
      avgDeviationMeters: avgDeviation,
    );
  }
}
```

### 1.5 Offline Map Support

```dart
class OfflineMapService {
  Future<void> downloadTilePackage(String regionId, {required LatLngBounds bounds, int zoomMin = 5, int zoomMax = 15}) async {
    // Download map tiles from Mapbox/Google Maps for offline use
    // Store in MBTiles format (SQLite database of tiles)
    final tilePackage = await _mapApi.downloadTiles(
      bounds: bounds,
      zoomMin: zoomMin,
      zoomMax: zoomMax,
    );

    final dbPath = join(await getApplicationDocumentsDirectory(), 'maps', '$regionId.mbtiles');
    await tilePackage.saveTo(dbPath);
  }

  Future<void> preloadStudyArea(Study study) async {
    final bounds = study.bounds; // GeoJSON bounding box
    await downloadTilePackage(
      study.id,
      bounds: bounds,
      zoomMin: 8,
      zoomMax: 16,
    );
  }

  FlutterMap buildOfflineMap({
    required LatLngBounds bounds,
    required List<String> cachedTilePackages,
  }) {
    return FlutterMap(
      options: MapOptions(
        center: bounds.center,
        zoom: 12,
        minZoom: 5,
        maxZoom: 18,
      ),
      children: [
        TileLayer(
          tileProvider: CachedTileProvider(cachedTilePackages),
          urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ),
        // Overlay study area boundary
        PolygonLayer(
          polygons: [
            Polygon(
              points: bounds.toPolygonPoints(),
              color: Colors.blue.withOpacity(0.2),
              borderColor: Colors.blue,
            ),
          ],
        ),
      ],
    );
  }
}
```

---

## 2. Media Handling

### 2.1 Photo Capture and Processing

```dart
class PhotoCaptureService {
  final CameraService _cameraService;
  final MediaCompressionService _compressionService;
  final FileEncryptionService _encryptionService;

  Future<CapturedMedia> capturePhoto({
    required String submissionId,
    required String questionCode,
    PhotoConfig? config,
  }) async {
    config ??= PhotoConfig.defaults();

    // 1. Capture via native camera
    final capturedFile = await _cameraService.captureImage(
      quality: config.captureQuality, // 0-100
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
    );

    // 2. Extract EXIF metadata
    final exifData = await ExifService.extract(capturedFile.path);

    // 3. Compress
    final compressed = await _compressionService.compressPhoto(
      File(capturedFile.path),
      quality: config.compressQuality,
      minWidth: config.targetWidth,
      minHeight: config.targetHeight,
    );

    // 4. Encrypt file
    final encryptedFile = await _encryptionService.encryptFile(
      compressed.path,
    );

    // 5. Compute hash
    final hash = await _computeFileHash(encryptedFile.path);

    // 6. Create thumbnail
    final thumbnail = await _compressionService.createThumbnail(
      encryptedFile.path,
      size: 256,
    );

    // 7. Save media record
    final mediaFile = MediaFile(
      id: Uuidv7.generate(),
      submissionId: submissionId,
      questionCode: questionCode,
      fileType: 'photo',
      filePath: encryptedFile.path,
      originalFileName: capturedFile.name,
      mimeType: 'image/jpeg',
      fileSize: await encryptedFile.length(),
      compressedFilePath: compressed.path,
      compressedFileSize: await compressed.path.length(),
      thumbnailPath: thumbnail.path,
      encryptionIv: encryptedFile.iv,
      mediaHash: hash,
      metadataJson: jsonEncode({
        'exif': exifData,
        'gps': {
          'lat': exifData.gpsLatitude,
          'lng': exifData.gpsLongitude,
        },
        'capture_timestamp': capturedFile.timestamp.toIso8601String(),
      }),
      uploadStatus: 'pending',
    );

    return CapturedMedia(file: mediaFile, thumbnail: thumbnail);
  }
}
```

### 2.2 Audio Recording

```dart
class AudioCaptureService {
  final AudioRecorder _recorder;
  final MediaCompressionService _compressionService;

  Future<CapturedMedia> recordAudio({
    required String submissionId,
    required String questionCode,
    AudioConfig? config,
  }) async {
    config ??= AudioConfig.defaults();

    // 1. Start recording
    await _recorder.start(
      config: RecordConfig(
        encoder: AudioEncoder.aacLc, // AAC Low Complexity
        bitRate: config.bitrate,     // 64000 bps
        sampleRate: 44100,
        numChannels: 1,              // Mono for voice
      ),
      path: _getTempPath('audio', 'm4a'),
    );

    // 2. Stop recording (user taps stop)
    final audioFile = await _recorder.stop();

    // 3. Compress / transcode
    final compressed = await _compressionService.compressAudio(
      File(audioFile.path),
      targetBitrate: config.targetBitrate,
    );

    // 4. Encrypt
    final encrypted = await _encryptionService.encryptFile(compressed.path);

    // 5. Save
    final mediaFile = MediaFile(
      id: Uuidv7.generate(),
      submissionId: submissionId,
      questionCode: questionCode,
      fileType: 'audio',
      filePath: encrypted.path,
      originalFileName: 'recording.m4a',
      mimeType: 'audio/mp4',
      fileSize: await encrypted.length(),
      compressedFilePath: compressed.path,
      encryptionIv: encrypted.iv,
      mediaHash: await _computeFileHash(encrypted.path),
      uploadStatus: 'pending',
    );

    return CapturedMedia(file: mediaFile);
  }
}
```

### 2.3 Video Recording

```dart
class VideoCaptureService {
  Future<CapturedMedia> recordVideo({
    required String submissionId,
    required String questionCode,
    VideoConfig? config,
  }) async {
    config ??= VideoConfig.defaults();

    // 1. Capture video
    final videoFile = await _cameraService.recordVideo(
      maxDuration: config.maxDuration,
      quality: config.captureQuality,
    );

    // 2. Compress (transcode to H.264, 720p, 1Mbps)
    final compressed = await _compressionService.compressVideo(
      File(videoFile.path),
      targetWidth: 1280,
      targetHeight: 720,
      targetBitrate: 1000000, // 1 Mbps
      targetFps: 24,
    );

    // 3. Generate thumbnail
    final thumbnail = await VideoThumbnail.thumbnailFile(
      video: compressed.path,
      thumbnailPath: _getTempPath('thumb', 'jpg'),
      imageFormat: ImageFormat.JPEG,
      maxHeight: 256,
      quality: 75,
    );

    // 4. Encrypt
    final encrypted = await _encryptionService.encryptFile(compressed.path);

    final mediaFile = MediaFile(
      id: Uuidv7.generate(),
      submissionId: submissionId,
      questionCode: questionCode,
      fileType: 'video',
      filePath: encrypted.path,
      originalFileName: 'video.mp4',
      mimeType: 'video/mp4',
      fileSize: await encrypted.length(),
      compressedFilePath: compressed.path,
      thumbnailPath: thumbnail,
      encryptionIv: encrypted.iv,
      mediaHash: await _computeFileHash(encrypted.path),
      metadataJson: jsonEncode({
        'duration_seconds': config.maxDuration?.inSeconds,
        'resolution': '720p',
      }),
      uploadStatus: 'pending',
    );

    return CapturedMedia(file: mediaFile);
  }
}
```

### 2.4 Media Compression Settings

| Media Type | Default Compression | Target Size | Quality Impact |
|-----------|-------------------|-------------|---------------|
| Photo | JPEG quality 75%, max 1920x1080 | 200-500 KB | Good |
| Photo (document) | JPEG quality 85%, max 2048x1536 | 300-800 KB | High |
| Audio (voice) | AAC 64kbps, mono, 44.1kHz | ~0.5 MB/min | Good |
| Audio (interview) | AAC 128kbps, mono, 44.1kHz | ~1 MB/min | High |
| Video (short) | H.264 720p, 1Mbps, 24fps | ~7.5 MB/min | Good |
| Video (long) | H.264 480p, 500kbps, 24fps | ~3.75 MB/min | Acceptable |
| Signature | PNG, max 800x600 | 10-50 KB | Lossless |

### 2.5 Media Encryption

```dart
class FileEncryptionService {
  static const algorithm = 'aes-256-gcm';
  static const keyLength = 32; // 256 bits

  Future<EncryptedFile> encryptFile(String filePath) async {
    final file = File(filePath);
    final plaintext = await file.readAsBytes();

    // Generate random IV (Initialization Vector)
    final iv = List<int>.generate(12, (_) => Random.secure().nextInt(256));

    // Get encryption key from secure storage
    final key = await KeyManager.getMediaEncryptionKey();

    // Encrypt using AES-256-GCM
    final encryptor = Encrypter(AES(Key(key), mode: AESMode.gcm));
    final encrypted = encryptor.encryptBytes(plaintext, iv: IV(iv));

    // Write encrypted file
    final encryptedPath = '${filePath}.enc';
    await File(encryptedPath).writeAsBytes(encrypted.bytes);

    return EncryptedFile(
      path: encryptedPath,
      iv: base64Encode(iv),
      originalSize: plaintext.length,
      encryptedSize: encrypted.bytes.length,
    );
  }

  Future<File> decryptFile(MediaFile media) async {
    final encryptedFile = File(media.filePath);
    final ciphertext = await encryptedFile.readAsBytes();

    final key = await KeyManager.getMediaEncryptionKey();
    final iv = base64Decode(media.encryptionIv!);

    final decryptor = Encrypter(AES(Key(key), mode: AESMode.gcm));
    final decrypted = decryptor.decryptBytes(Encrypted(ciphertext), iv: IV(iv));

    final decryptedPath = media.filePath.replaceAll('.enc', '');
    await File(decryptedPath).writeAsBytes(decrypted);

    return File(decryptedPath);
  }

  Future<String> _computeFileHash(String filePath) async {
    final file = File(filePath);
    final bytes = await file.readAsBytes();
    return sha256.convert(bytes).toString();
  }
}
```

### 2.6 Storage Management

```dart
class StorageManager {
  static const double warningThresholdPercent = 85;  // Warn at 85% full
  static const double criticalThresholdPercent = 95; // Block at 95% full
  static const Duration cleanupInterval = Duration(hours: 24);

  Future<StorageStatus> getStatus() async {
    final directory = await getApplicationDocumentsDirectory();
    final stat = await directory.stat();

    final totalBytes = stat.size;
    final freeBytes = await _getFreeSpace();
    final usedBytes = totalBytes - freeBytes;
    final usedPercent = (usedBytes / totalBytes * 100).roundToDouble();

    final mediaSize = await _calculateMediaStorage();

    return StorageStatus(
      totalBytes: totalBytes,
      usedBytes: usedBytes,
      freeBytes: freeBytes,
      usedPercent: usedPercent,
      mediaSize: mediaSize,
      isWarning: usedPercent >= warningThresholdPercent,
      isCritical: usedPercent >= criticalThresholdPercent,
    );
  }

  Future<CleanupResult> runCleanup() async {
    int freedBytes = 0;
    int deletedFiles = 0;

    // 1. Delete old compressed thumbnails
    freedBytes += await _deleteOldThumbnails();

    // 2. Delete encrypted temp files for synced media
    final syncedMedia = await _mediaDao.getSyncedOlderThan(Duration(days: 7));
    for (final media in syncedMedia) {
      final file = File(media.filePath);
      if (await file.exists()) {
        freedBytes += await file.length();
        await file.delete();
        deletedFiles++;
      }
      // Keep the compressed version for local viewing
    }

    // 3. Evict LRU cached map tiles
    freedBytes += await _evictOldMapTiles();

    // 4. Delete old sync logs
    await _syncLogDao.deleteOlderThan(Duration(days: 30));

    return CleanupResult(freedBytes: freedBytes, deletedFiles: deletedFiles);
  }

  Future<void> checkAndWarn(BuildContext context) async {
    final status = await getStatus();
    if (status.isCritical) {
      _showStorageFullDialog(context);
    } else if (status.isWarning) {
      _showStorageWarningSnackbar(context);
    }
  }
}
```

### 2.7 Background Media Upload

```dart
class BackgroundMediaUploader {
  Future<void> uploadPendingMedia() async {
    final pending = await _mediaDao.getPendingMedia();

    for (final media in pending) {
      if (media.syncAttempts >= media.maxRetries) continue;

      await _mediaDao.updateUploadStatus(media.id, 'uploading');

      try {
        // Upload chunked
        final uploader = ChunkedUploader(
          file: File(media.filePath),
          uploadUrl: media.uploadUrl,
          chunkSize: 1024 * 1024, // 1 MB
          completedChunks: media.uploadCompletedChunks,
        );

        await for (final progress in uploader.upload()) {
          await _mediaDao.updateUploadProgress(
            media.id,
            progress.completedChunks,
            progress.percentComplete,
          );
        }

        await _mediaDao.markUploaded(media.id, uploader.remoteUrl);
      } catch (e) {
        await _mediaDao.incrementRetry(media.id, e.toString());
      }
    }
  }
}
```

---

## 3. Battery Optimization

```dart
class BatteryOptimizer {
  static const Map<BatteryMode, BatteryConfig> configs = {
    BatteryMode.performance: BatteryConfig(
      gpsAccuracy: LocationAccuracyMode.high,
      gpsInterval: Duration(seconds: 1),
      syncInterval: Duration(minutes: 5),
      mediaCompression: 'high',
      backgroundSync: true,
    ),
    BatteryMode.balanced: BatteryConfig(
      gpsAccuracy: LocationAccuracyMode.balanced,
      gpsInterval: Duration(seconds: 5),
      syncInterval: Duration(minutes: 15),
      mediaCompression: 'balanced',
      backgroundSync: true,
    ),
    BatteryMode.powerSaver: BatteryConfig(
      gpsAccuracy: LocationAccuracyMode.lowPower,
      gpsInterval: Duration(seconds: 30),
      syncInterval: Duration(minutes: 30),
      mediaCompression: 'max',
      backgroundSync: false,   // No background sync
    ),
  };

  BatteryMode determineMode() {
    final batteryLevel = _getBatteryLevel();
    final isCharging = _isCharging();
    final signalStrength = _getSignalStrength();

    if (isCharging && signalStrength == SignalStrength.strong) {
      return BatteryMode.performance;
    }
    if (batteryLevel < 20) {
      return BatteryMode.powerSaver;
    }
    if (batteryLevel < 50 || signalStrength == SignalStrength.weak) {
      return BatteryMode.balanced;
    }
    return BatteryMode.performance;
  }
}
```
