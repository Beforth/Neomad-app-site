import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'delivery_provider.dart';
import '../../common/widgets/top_bar.dart';
import '../../common/theme.dart';
import 'widgets/task_card.dart';
import '../../models/models.dart';
import 'widgets/active_task_flow.dart';

class DeliveryDashboard extends ConsumerStatefulWidget {
  const DeliveryDashboard({super.key});

  @override
  ConsumerState<DeliveryDashboard> createState() => _DeliveryDashboardState();
}

class _DeliveryDashboardState extends ConsumerState<DeliveryDashboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(deliveryProvider);
    final notifier = ref.read(deliveryProvider.notifier);

    return Scaffold(
      appBar: TopBar(
        actions: [
          _buildOnlineToggle(state, notifier),
          _buildNotificationBell(state, notifier),
        ],
      ),
      body: Column(
        children: [
          _buildActiveTimer(state),
          TabBar(
            controller: _tabController,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.neutral,
            indicatorColor: AppColors.primary,
            tabs: const [
              Tab(text: 'Available'),
              Tab(text: 'Active'),
              Tab(text: 'Completed'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildAvailableTasks(state),
                _buildActiveTasks(state),
                _buildCompletedTasks(state),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOnlineToggle(DeliveryState state, DeliveryNotifier notifier) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: GestureDetector(
        onTap: () => notifier.toggleOnline(),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: state.isOnline ? AppColors.primary : Colors.grey[200],
            borderRadius: BorderRadius.circular(20),
          ),
          alignment: Alignment.center,
          child: Text(
            state.isOnline ? 'Online' : 'Offline',
            style: TextStyle(
              color: state.isOnline ? Colors.white : AppColors.neutral,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationBell(DeliveryState state, DeliveryNotifier notifier) {
    final unreadCount = state.notifications.where((n) => !n.isRead).length;

    return Stack(
      children: [
        IconButton(
          icon: const Icon(LucideIcons.bell, color: AppColors.neutral),
          onPressed: () => _showNotifications(context, state, notifier),
        ),
        if (unreadCount > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                '$unreadCount',
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildActiveTimer(DeliveryState state) {
    if (!state.isOnline) return const SizedBox.shrink();

    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = twoDigits(state.onlineTime.inHours);
    final minutes = twoDigits(state.onlineTime.inMinutes.remainder(60));
    final seconds = twoDigits(state.onlineTime.inSeconds.remainder(60));

    return Container(
      width: double.infinity,
      color: AppColors.primary.withValues(alpha: 0.05),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.clock, size: 16, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(
            'Online: $hours:$minutes:$seconds',
            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildAvailableTasks(DeliveryState state) {
    final available = state.invoices.where((i) => i.status == InvoiceStatus.pending).toList();
    if (available.isEmpty) return _buildEmptyState('No available tasks');

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: available.length,
      itemBuilder: (context, index) => TaskCard(
        invoice: available[index],
        onAccept: () => ref.read(deliveryProvider.notifier).acceptTask(available[index].id),
      ),
    );
  }

  Widget _buildActiveTasks(DeliveryState state) {
    final active = state.invoices.where((i) => 
      i.status != InvoiceStatus.pending && 
      i.status != InvoiceStatus.delivered && 
      i.status != InvoiceStatus.cancelled
    ).toList();

    if (active.isEmpty) return _buildEmptyState('No active deliveries');

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: active.length,
      itemBuilder: (context, index) => ActiveTaskFlow(invoice: active[index]),
    );
  }

  Widget _buildCompletedTasks(DeliveryState state) {
    final completed = state.invoices.where((i) => 
      i.status == InvoiceStatus.delivered || i.status == InvoiceStatus.cancelled
    ).toList();

    if (completed.isEmpty) return _buildEmptyState('No history for today');

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: completed.length,
      itemBuilder: (context, index) {
        final inv = completed[index];
        return Card(
          child: ListTile(
            leading: Icon(
              inv.status == InvoiceStatus.delivered ? LucideIcons.checkCircle2 : LucideIcons.xCircle,
              color: inv.status == InvoiceStatus.delivered ? AppColors.primary : AppColors.danger,
            ),
            title: Text(inv.hospitalName, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('ID: ${inv.id} • ₹${inv.amount.toStringAsFixed(2)}'),
            trailing: Text(
              inv.status.toString().split('.').last.toUpperCase(),
              style: TextStyle(
                color: inv.status == InvoiceStatus.delivered ? AppColors.primary : AppColors.danger,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.clipboardList, size: 64, color: AppColors.neutral.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text(message, style: TextStyle(color: AppColors.neutral.withOpacity(0.5))),
        ],
      ),
    );
  }

  void _showNotifications(BuildContext context, DeliveryState state, DeliveryNotifier notifier) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Text('Notifications', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Expanded(
              child: state.notifications.isEmpty 
                ? const Center(child: Text('No notifications'))
                : ListView.builder(
                    itemCount: state.notifications.length,
                    itemBuilder: (context, index) {
                      final n = state.notifications[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getPriorityColor(n.priority).withValues(alpha: 0.1),
                          child: Icon(LucideIcons.info, color: _getPriorityColor(n.priority), size: 16),
                        ),
                        title: Text(n.title, style: TextStyle(fontWeight: n.isRead ? FontWeight.normal : FontWeight.bold)),
                        subtitle: Text(n.message),
                        onTap: () {
                          notifier.markNotificationRead(n.id);
                          Navigator.pop(context);
                        },
                      );
                    },
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getPriorityColor(String p) {
    switch (p) {
      case 'Urgent': return AppColors.danger;
      case 'Important': return AppColors.warning;
      default: return AppColors.info;
    }
  }
}
