import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'geofence_provider.dart';
import '../../common/widgets/top_bar.dart';
import '../../common/theme.dart';

class StaffDashboard extends ConsumerWidget {
  const StaffDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final geofence = ref.watch(geofenceProvider);

    return Scaffold(
      appBar: const TopBar(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const SizedBox(height: 24),
            _buildGeofenceCard(geofence),
            const SizedBox(height: 32),
            _buildOfficeInfo(),
          ],
        ),
      ),
    );
  }

  Widget _buildGeofenceCard(GeofenceState state) {
    final isInside = state.isInside;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: isInside ? AppColors.primary : AppColors.danger,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: (isInside ? AppColors.primary : AppColors.danger).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            isInside ? LucideIcons.checkCircle2 : LucideIcons.alertTriangle,
            size: 80,
            color: Colors.white,
          ).animate(onPlay: (controller) => controller.repeat(reverse: true))
           .scale(begin: const Offset(0.9, 0.9), end: const Offset(1.1, 1.1), duration: 1.seconds),
          const SizedBox(height: 24),
          Text(
            isInside ? 'Inside Premises' : 'Outside Premises',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Distance: ${state.distance.toStringAsFixed(1)}m',
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 16,
            ),
          ),
          if (!isInside)
            Padding(
              padding: const EdgeInsets.only(top: 24),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  'An alert has been sent to the administrators. Please return to the office immediately.',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOfficeInfo() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(LucideIcons.building2, color: AppColors.primary),
                SizedBox(width: 12),
                Text(
                  'Office Location',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Neomad Corporate Office',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const Text('Industrial Area, Sector 5, Nashik'),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Allowed Radius:', style: TextStyle(color: AppColors.neutral)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    '100 Meters',
                    style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
