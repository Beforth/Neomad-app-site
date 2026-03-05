import 'dart:async';
import '../models/models.dart';

class MockApi {
  static final List<User> _users = [
    User(id: '1', username: 'staff', name: 'John Doe', avatar: 'JD', role: UserRole.staff),
    User(id: '2', username: 'delivery', name: 'Mike Ross', avatar: 'MR', role: UserRole.deliveryBoy),
  ];

  static List<Invoice> _invoices = [
    Invoice(id: 'INV-001', hospitalName: 'City Hospital', amount: 5000.0, distance: '2.5 km', eta: '15 mins'),
    Invoice(id: 'INV-002', hospitalName: 'Metro Clinic', amount: 1200.0, distance: '1.2 km', eta: '8 mins'),
    Invoice(id: 'INV-003', hospitalName: 'Sunrise Medical Center', amount: 8500.0, distance: '4.8 km', eta: '25 mins'),
    Invoice(id: 'INV-004', hospitalName: 'Global Health', amount: 3200.0, distance: '3.1 km', eta: '18 mins'),
    Invoice(id: 'INV-005', hospitalName: 'Lifeline Clinic', amount: 950.0, distance: '0.8 km', eta: '5 mins'),
  ];

  static List<AppNotification> _notifications = [
    AppNotification(
      id: '1',
      title: 'New Task',
      message: 'You have a new delivery task assigned.',
      timestamp: DateTime.now().subtract(const Duration(minutes: 10)),
      priority: 'Important',
    ),
    AppNotification(
      id: '2',
      title: 'Urgent Alert',
      message: 'Please complete the pending POD for INV-001.',
      timestamp: DateTime.now().subtract(const Duration(hours: 1)),
      priority: 'Urgent',
    ),
  ];

  Future<User?> login(String username, String password) async {
    await Future.delayed(const Duration(seconds: 1));
    try {
      return _users.firstWhere((u) => u.username == username);
    } catch (_) {
      return null;
    }
  }

  Future<List<Invoice>> getInvoices() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return _invoices;
  }

  Future<void> updateInvoice(Invoice invoice) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final index = _invoices.indexWhere((i) => i.id == invoice.id);
    if (index != -1) {
      _invoices[index] = invoice;
    }
  }

  Future<List<AppNotification>> getNotifications() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return _notifications;
  }

  Future<void> sendAlert(String message) async {
    print('BACKEND ALERT: $message');
    await Future.delayed(const Duration(milliseconds: 200));
  }
}
