import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../../../models/models.dart';
import '../../../common/theme.dart';
import '../delivery_provider.dart';

class PODForm extends ConsumerStatefulWidget {
  final Invoice invoice;

  const PODForm({super.key, required this.invoice});

  @override
  ConsumerState<PODForm> createState() => _PODFormState();
}

class _PODFormState extends ConsumerState<PODForm> {
  String _paymentType = 'Cash';
  final _amountController = TextEditingController();
  final _chequeNoController = TextEditingController();
  final _bankNameController = TextEditingController();
  XFile? _photo;

  @override
  void initState() {
    super.initState();
    _amountController.text = widget.invoice.amount.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Proof of Delivery', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          _buildPhotoCapture(),
          const SizedBox(height: 24),
          _buildPaymentToggles(),
          const SizedBox(height: 24),
          _buildInputs(),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _validateAndSubmit,
            child: const Text('Complete Delivery'),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoCapture() {
    return GestureDetector(
      onTap: () async {
        final picker = ImagePicker();
        final img = await picker.pickImage(source: ImageSource.camera);
        setState(() => _photo = img);
      },
      child: Container(
        height: 150,
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.primary, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(16),
          color: AppColors.primary.withOpacity(0.05),
        ),
        child: _photo != null
            ? Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.file(File(_photo!.path), width: double.infinity, height: 150, fit: BoxFit.cover),
                  ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: IconButton(
                      icon: const Icon(LucideIcons.xCircle, color: Colors.white),
                      onPressed: () => setState(() => _photo = null),
                    ),
                  ),
                ],
              )
            : const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.camera, size: 32, color: AppColors.primary),
                  SizedBox(height: 8),
                  Text('Capture Signature/Photo', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                ],
              ),
      ),
    );
  }

  Widget _buildPaymentToggles() {
    return Row(
      children: [
        _paymentToggle('Cash'),
        const SizedBox(width: 16),
        _paymentToggle('Cheque'),
      ],
    );
  }

  Widget _paymentToggle(String type) {
    final isActive = _paymentType == type;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _paymentType = type),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isActive ? AppColors.primary : Colors.white,
            border: Border.all(color: isActive ? AppColors.primary : Colors.grey[200]!),
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
          child: Text(
            type,
            style: TextStyle(color: isActive ? Colors.white : AppColors.neutral, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }

  Widget _buildInputs() {
    return Column(
      children: [
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Amount (₹)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        if (_paymentType == 'Cheque') ...[
          const SizedBox(height: 16),
          TextField(
            controller: _chequeNoController,
            decoration: InputDecoration(
              labelText: 'Cheque Number',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _bankNameController,
            decoration: InputDecoration(
              labelText: 'Bank Name',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ],
    );
  }

  void _validateAndSubmit() {
    if (_photo == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo is mandatory')));
      return;
    }
    if (_paymentType == 'Cheque' && (_chequeNoController.text.isEmpty || _bankNameController.text.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cheque details are mandatory')));
      return;
    }

    ref.read(deliveryProvider.notifier).submitPOD(
          widget.invoice.id,
          paymentType: _paymentType,
          amount: double.tryParse(_amountController.text) ?? 0,
          chequeNumber: _chequeNoController.text,
          bankName: _bankNameController.text,
          photoPath: _photo?.path,
        );

    Navigator.pop(context);
    _showPostDeliveryModals();
  }

  void _showPostDeliveryModals() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const FeedbackModal(),
    );
  }
}

class FeedbackModal extends StatefulWidget {
  const FeedbackModal({super.key});

  @override
  State<FeedbackModal> createState() => _FeedbackModalState();
}

class _FeedbackModalState extends State<FeedbackModal> {
  String? _experience;
  final _reasonController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Delivery Experience'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              _expButton('Properly'),
              const SizedBox(width: 8),
              _expButton('Improperly'),
            ],
          ),
          if (_experience == 'Improperly') ...[
            const SizedBox(height: 16),
            TextField(
              controller: _reasonController,
              decoration: const InputDecoration(hintText: 'Why was it improper?'),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.pop(context);
            _showShiftCompletionModal();
          },
          child: const Text('Finish'),
        ),
      ],
    );
  }

  Widget _expButton(String label) {
    final isActive = _experience == label;
    return Expanded(
      child: OutlinedButton(
        onPressed: () => setState(() => _experience = label),
        style: OutlinedButton.styleFrom(
          backgroundColor: isActive ? AppColors.primary : Colors.white,
          foregroundColor: isActive ? Colors.white : AppColors.primary,
        ),
        child: Text(label),
      ),
    );
  }

  void _showShiftCompletionModal() {
     showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Task Completed!'),
        content: const Text('What would you like to do next?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Return to Neomad (Available)'),
          ),
          TextButton(
            onPressed: () {
              // Online -> Offline is handled in provider toggle but here we just pop
              Navigator.pop(context);
            },
            child: const Text('Complete Shift (Offline)', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }
}
