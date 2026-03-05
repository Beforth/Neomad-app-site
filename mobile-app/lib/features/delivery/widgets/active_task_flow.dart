import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../models/models.dart';
import '../../../common/theme.dart';
import '../delivery_provider.dart';
import '../../auth/auth_provider.dart';
import 'pod_form.dart';

class ActiveTaskFlow extends ConsumerStatefulWidget {
  final Invoice invoice;

  const ActiveTaskFlow({super.key, required this.invoice});

  @override
  ConsumerState<ActiveTaskFlow> createState() => _ActiveTaskFlowState();
}

class _ActiveTaskFlowState extends ConsumerState<ActiveTaskFlow> {
  bool _isExpanded = false;
  bool _showMap = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        children: [
          _buildCollapsedHeader(),
          if (_isExpanded) _buildExpandedContent(),
        ],
      ),
    );
  }

  Widget _buildCollapsedHeader() {
    return ListTile(
      onTap: () => setState(() => _isExpanded = !_isExpanded),
      title: Text(widget.invoice.hospitalName, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text('Status: ${widget.invoice.status.toString().split('.').last.toUpperCase()}'),
      trailing: Icon(_isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown),
    );
  }

  Widget _buildExpandedContent() {
    final status = widget.invoice.status;
    final notifier = ref.read(deliveryProvider.notifier);

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildStatusOverview(status),
          const SizedBox(height: 16),
          _buildStatusToggles(status, notifier),
          const SizedBox(height: 16),
          _buildActionButtons(),
          if (_showMap) _buildInlineMap(),
          const SizedBox(height: 16),
          if (status == InvoiceStatus.arrived)
            ElevatedButton(
              onPressed: () => _showPODForm(),
              child: const Text('Submit Proof of Delivery'),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusOverview(InvoiceStatus status) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('Delivery Time:', style: TextStyle(fontWeight: FontWeight.w600)),
          const Text('00:12:45', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 18)),
        ],
      ),
    );
  }

  Widget _buildStatusToggles(InvoiceStatus current, DeliveryNotifier notifier) {
    return Row(
      children: [
        _statusToggle('Moving', InvoiceStatus.moving, current, notifier),
        _statusToggle('Waiting', InvoiceStatus.waiting, current, notifier),
        _statusToggle('Arrived', InvoiceStatus.arrived, current, notifier),
      ],
    );
  }

  Widget _statusToggle(String label, InvoiceStatus target, InvoiceStatus current, DeliveryNotifier notifier) {
    final isActive = current == target;
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: InkWell(
          onTap: () => notifier.updateStatus(widget.invoice.id, target),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: isActive ? AppColors.primary : Colors.white,
              border: Border.all(color: isActive ? AppColors.primary : Colors.grey[200]!),
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Text(
              label,
              style: TextStyle(
                color: isActive ? Colors.white : AppColors.neutral,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        _actionButton(LucideIcons.navigation, 'Nav', Colors.blue, () {}),
        _actionButton(LucideIcons.map, 'Map', Colors.orange, () => setState(() => _showMap = !_showMap)),
        _actionButton(LucideIcons.xCircle, 'Cancel', Colors.red, () => _showCancelDialog()),
      ],
    );
  }

  Widget _actionButton(IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: OutlinedButton.icon(
          onPressed: onTap,
          icon: Icon(icon, size: 16, color: color),
          label: Text(label, style: TextStyle(color: color, fontSize: 12)),
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: color.withOpacity(0.2)),
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ),
    );
  }

  Widget _buildInlineMap() {
    return Container(
      height: 300,
      margin: const EdgeInsets.only(top: 16),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: LatLng(19.9975, 73.7898),
              initialZoom: 15,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.neomad.neomad_app',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: LatLng(19.9975, 73.7898),
                    width: 40,
                    height: 40,
                    child: Icon(LucideIcons.mapPin, color: AppColors.primary, size: 40),
                  ),
                ],
              ),
            ],
          ),
          Positioned(
            bottom: 16,
            right: 16,
            child: FloatingActionButton.extended(
              onPressed: () => _addCheckpoint(),
              label: const Text('Add Checkpoint'),
              icon: const Icon(LucideIcons.plusCircle),
              backgroundColor: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  void _addCheckpoint() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Checkpoint'),
        content: const TextField(decoration: InputDecoration(hintText: 'Description')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () {
            ref.read(mockApiProvider).sendAlert('Checkpoint added at ${widget.invoice.hospitalName}');
            Navigator.pop(context);
          }, child: const Text('Add')),
        ],
      ),
    );
  }

  void _showCancelDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Order'),
        content: TextField(controller: controller, decoration: const InputDecoration(hintText: 'Reason for cancellation')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Back')),
          TextButton(
            onPressed: () {
              ref.read(deliveryProvider.notifier).cancelTask(widget.invoice.id, controller.text);
              Navigator.pop(context);
            },
            child: const Text('Confirm', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }

  void _showPODForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      builder: (context) => PODForm(invoice: widget.invoice),
    );
  }
}
