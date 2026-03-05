import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../models/models.dart';
import '../../../common/theme.dart';

class TaskCard extends StatefulWidget {
  final Invoice invoice;
  final VoidCallback onAccept;

  const TaskCard({super.key, required this.invoice, required this.onAccept});

  @override
  State<TaskCard> createState() => _TaskCardState();
}

class _TaskCardState extends State<TaskCard> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    widget.invoice.id,
                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
                Text(
                  '₹${widget.invoice.amount.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              widget.invoice.hospitalName,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(LucideIcons.mapPin, size: 14, color: AppColors.neutral),
                const SizedBox(width: 4),
                Text(widget.invoice.distance, style: const TextStyle(color: AppColors.neutral)),
                const SizedBox(width: 16),
                const Icon(LucideIcons.clock, size: 14, color: AppColors.neutral),
                const SizedBox(width: 4),
                Text('ETA: ${widget.invoice.eta}', style: const TextStyle(color: AppColors.neutral)),
              ],
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isLoading ? null : () async {
                setState(() => _isLoading = true);
                widget.onAccept();
              },
              child: _isLoading 
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Accept Task'),
            ),
          ],
        ),
      ),
    );
  }
}
