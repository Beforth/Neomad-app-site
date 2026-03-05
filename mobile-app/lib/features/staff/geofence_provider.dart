import 'dart:async';
import 'dart:math' show cos, sqrt, asin;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../data/mock_api.dart';
import '../../features/auth/auth_provider.dart';

class GeofenceState {
  final double distance;
  final bool isInside;
  final Position? currentPosition;
  final bool hasAlerted;

  GeofenceState({
    this.distance = 0,
    this.isInside = true,
    this.currentPosition,
    this.hasAlerted = false,
  });

  GeofenceState copyWith({
    double? distance,
    bool? isInside,
    Position? currentPosition,
    bool? hasAlerted,
  }) {
    return GeofenceState(
      distance: distance ?? this.distance,
      isInside: isInside ?? this.isInside,
      currentPosition: currentPosition ?? this.currentPosition,
      hasAlerted: hasAlerted ?? this.hasAlerted,
    );
  }
}

class GeofenceNotifier extends StateNotifier<GeofenceState> {
  final MockApi _api;
  StreamSubscription<Position>? _subscription;

  // Office Location: Lat: 19.9975, Lng: 73.7898
  static const double officeLat = 19.9975;
  static const double officeLng = 73.7898;
  static const double radiusMeters = 100.0;

  GeofenceNotifier(this._api) : super(GeofenceState()) {
    _startTracking();
  }

  void _startTracking() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    _subscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((Position position) {
      print('DEBUG: Geofence - New Position: ${position.latitude}, ${position.longitude}');
      final distance = _calculateDistance(
        position.latitude,
        position.longitude,
        officeLat,
        officeLng,
      );

      final isInside = distance <= radiusMeters;
      print('DEBUG: Geofence - Distance to Office: ${distance.toStringAsFixed(1)}m, Inside: $isInside');
      
      if (!isInside && !state.hasAlerted) {
        print('CRITICAL: Geofence - STAFF BREACH! Sending alert to backend...');
        _api.sendAlert('Staff out of bounds! Distance: ${distance.toStringAsFixed(1)}m');
        state = state.copyWith(hasAlerted: true);
      } else if (isInside && state.hasAlerted) {
        print('DEBUG: Geofence - Staff returned to premises. Resetting alert state.');
        state = state.copyWith(hasAlerted: false);
      }

      state = state.copyWith(
        distance: distance,
        isInside: isInside,
        currentPosition: position,
      );
    });
  }

  double _calculateDistance(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295;
    var c = cos;
    var a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
    return 12742 * asin(sqrt(a)) * 1000; // result in meters
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final geofenceProvider = StateNotifierProvider<GeofenceNotifier, GeofenceState>((ref) {
  return GeofenceNotifier(ref.watch(mockApiProvider));
});
