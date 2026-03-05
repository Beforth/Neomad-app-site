import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/mock_api.dart';
import '../../models/models.dart';
import '../../features/auth/auth_provider.dart';

class DeliveryState {
  final List<Invoice> invoices;
  final List<AppNotification> notifications;
  final bool isOnline;
  final Duration onlineTime;
  final bool isLoading;

  DeliveryState({
    this.invoices = const [],
    this.notifications = const [],
    this.isOnline = false,
    this.onlineTime = Duration.zero,
    this.isLoading = false,
  });

  DeliveryState copyWith({
    List<Invoice>? invoices,
    List<AppNotification>? notifications,
    bool? isOnline,
    Duration? onlineTime,
    bool? isLoading,
  }) {
    return DeliveryState(
      invoices: invoices ?? this.invoices,
      notifications: notifications ?? this.notifications,
      isOnline: isOnline ?? this.isOnline,
      onlineTime: onlineTime ?? this.onlineTime,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class DeliveryNotifier extends StateNotifier<DeliveryState> {
  final MockApi _api;
  final String? _userId;
  Timer? _onlineTimer;

  DeliveryNotifier(this._api, this._userId) : super(DeliveryState()) {
    refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true);
    final invoices = await _api.getInvoices();
    final notifications = await _api.getNotifications();
    state = state.copyWith(
      invoices: invoices,
      notifications: notifications,
      isLoading: false,
    );
  }

  void toggleOnline() {
    final newStatus = !state.isOnline;
    print('DEBUG: Delivery - Shift status changed: ${newStatus ? 'ONLINE' : 'OFFLINE'}');
    state = state.copyWith(isOnline: newStatus);
    
    if (newStatus) {
      state = state.copyWith(onlineTime: Duration.zero);
      _onlineTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        state = state.copyWith(onlineTime: state.onlineTime + const Duration(seconds: 1));
      });
    } else {
      _onlineTimer?.cancel();
    }
  }

  Future<void> acceptTask(String invoiceId) async {
    print('DEBUG: Delivery - Accepting task INV: $invoiceId');
    final invoice = state.invoices.firstWhere((i) => i.id == invoiceId);
    final updated = invoice.copyWith(
      status: InvoiceStatus.assigned,
      assignedTo: _userId,
    );
    await _api.updateInvoice(updated);
    await refresh();
    print('SUCCESS: Delivery - Task $invoiceId accepted by $_userId');
  }

  Future<void> updateStatus(String invoiceId, InvoiceStatus status) async {
    print('DEBUG: Delivery - Updating task $invoiceId status to: ${status.name}');
    final invoice = state.invoices.firstWhere((i) => i.id == invoiceId);
    final updated = invoice.copyWith(status: status);
    await _api.updateInvoice(updated);
    await refresh();
    
    if (status == InvoiceStatus.waiting) {
       print('DEBUG: Delivery - Waiting threshold started (5s) for $invoiceId');
       // Mock threshold 5 seconds for alert
       Future.delayed(const Duration(seconds: 5), () {
         final current = state.invoices.firstWhere((i) => i.id == invoiceId);
         if (current.status == InvoiceStatus.waiting) {
           print('CRITICAL: Delivery - ALERT! Task $invoiceId has been in WAITING for > 5s');
           _api.sendAlert('Delivery Boy Waiting Too Long at ${current.hospitalName}');
         } else {
           print('DEBUG: Delivery - Waiting alert cancelled for $invoiceId (status changed to ${current.status.name})');
         }
       });
    }
  }

  Future<void> submitPOD(String invoiceId, {
    required String paymentType,
    String? chequeNumber,
    String? bankName,
    required double amount,
    String? photoPath,
  }) async {
    print('DEBUG: Delivery - Submitting POD for task $invoiceId');
    print('DATA: Payment: $paymentType, Amount: ₹$amount, Photo: ${photoPath ?? 'None'}');
    final invoice = state.invoices.firstWhere((i) => i.id == invoiceId);
    final updated = invoice.copyWith(
      status: InvoiceStatus.delivered,
      paymentType: paymentType,
      chequeNumber: chequeNumber,
      bankName: bankName,
      collectedAmount: amount,
      photoPath: photoPath,
    );
    await _api.updateInvoice(updated);
    await refresh();
    print('SUCCESS: Delivery - Task $invoiceId marked as DELIVERED');
  }

  Future<void> cancelTask(String invoiceId, String reason) async {
    print('WARNING: Delivery - Cancelling task $invoiceId. Reason: $reason');
    final invoice = state.invoices.firstWhere((i) => i.id == invoiceId);
    final updated = invoice.copyWith(status: InvoiceStatus.cancelled, cancelReason: reason);
    await _api.updateInvoice(updated);
    await refresh();
    print('DEBUG: Delivery - Task $invoiceId CANCELLED');
  }

  void markNotificationRead(String id) {
    state = state.copyWith(
      notifications: state.notifications.map((n) => n.id == id ? (n..isRead = true) : n).toList(),
    );
  }

  @override
  void dispose() {
    _onlineTimer?.cancel();
    super.dispose();
  }
}

final deliveryProvider = StateNotifierProvider<DeliveryNotifier, DeliveryState>((ref) {
  final user = ref.watch(authProvider).user;
  return DeliveryNotifier(ref.watch(mockApiProvider), user?.id);
});
