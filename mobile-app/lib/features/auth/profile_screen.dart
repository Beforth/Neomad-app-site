import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'auth_provider.dart';
import '../../common/theme.dart';
import '../../common/widgets/top_bar.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: const TopBar(title: Text('Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const SizedBox(height: 20),
            _buildProfileHeader(user),
            const SizedBox(height: 32),
            _buildInfoCard(user),
            const SizedBox(height: 40),
            _buildLogoutButton(ref),
            const SizedBox(height: 60),
            const Text(
              'Made by BeForth',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'v2.0.0 • © 2026 Neomed App',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.neutral.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(user) {
    return Column(
      children: [
        CircleAvatar(
          radius: 50,
          backgroundColor: AppColors.primary.withValues(alpha: 0.1),
          child: Text(
            user.avatar,
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          user.name,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        Text(
          '@${user.username}',
          style: const TextStyle(color: AppColors.neutral),
        ),
      ],
    );
  }

  Widget _buildInfoCard(user) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            _buildInfoRow(LucideIcons.shield, 'Role', user.role.toString().split('.').last.toUpperCase()),
            const Divider(height: 32),
            _buildInfoRow(LucideIcons.fingerprint, 'User ID', user.id),
            const Divider(height: 32),
            _buildInfoRow(LucideIcons.calendar, 'Joined', 'March 2026'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.neutral),
        const SizedBox(width: 16),
        Text(label, style: const TextStyle(color: AppColors.neutral)),
        const Spacer(),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildLogoutButton(WidgetRef ref) {
    return ElevatedButton.icon(
      onPressed: () => ref.read(authProvider.notifier).logout(),
      icon: const Icon(LucideIcons.logOut),
      label: const Text('Logout'),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.danger,
        foregroundColor: Colors.white,
      ),
    );
  }
}
