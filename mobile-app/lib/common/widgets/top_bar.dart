import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/auth_provider.dart';
import '../theme.dart';

class TopBar extends ConsumerWidget implements PreferredSizeWidget {
  final List<Widget>? actions;
  final Widget? title;

  const TopBar({super.key, this.actions, this.title});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      title: title ?? GestureDetector(
        onTap: () => GoRouter.of(context).push('/profile'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              user?.name ?? 'Guest',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            Text(
              user?.role == null ? '' : (user!.role.toString().split('.').last.toUpperCase()),
              style: TextStyle(
                fontSize: 12,
                color: AppColors.neutral,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
      leading: Padding(
        padding: const EdgeInsets.only(left: 16),
        child: GestureDetector(
          onTap: () => GoRouter.of(context).push('/profile'),
          child: CircleAvatar(
            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
            child: Text(
              user?.avatar ?? '?',
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ),
      actions: [
        ...?actions,
        IconButton(
          icon: const Icon(LucideIcons.user, color: AppColors.neutral),
          onPressed: () => GoRouter.of(context).push('/profile'),
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 10);
}
