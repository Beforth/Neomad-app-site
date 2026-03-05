enum UserRole { staff, deliveryBoy }

class User {
  final String id;
  final String username;
  final String name;
  final String avatar;
  final UserRole role;

  User({
    required this.id,
    required this.username,
    required this.name,
    required this.avatar,
    required this.role,
  });
}

enum InvoiceStatus { pending, assigned, moving, waiting, arrived, delivered, cancelled }

class Invoice {
  final String id;
  final String hospitalName;
  final double amount;
  final String distance;
  final String eta;
  final InvoiceStatus status;
  final String? assignedTo;
  final String? signaturePath;
  final String? photoPath;
  final String? paymentType; // 'Cash' or 'Cheque'
  final String? chequeNumber;
  final String? bankName;
  final double? collectedAmount;
  final String? cancelReason;

  Invoice({
    required this.id,
    required this.hospitalName,
    required this.amount,
    required this.distance,
    required this.eta,
    this.status = InvoiceStatus.pending,
    this.assignedTo,
    this.signaturePath,
    this.photoPath,
    this.paymentType,
    this.chequeNumber,
    this.bankName,
    this.collectedAmount,
    this.cancelReason,
  });

  Invoice copyWith({
    InvoiceStatus? status,
    String? assignedTo,
    String? signaturePath,
    String? photoPath,
    String? paymentType,
    String? chequeNumber,
    String? bankName,
    double? collectedAmount,
    String? cancelReason,
  }) {
    return Invoice(
      id: id,
      hospitalName: hospitalName,
      amount: amount,
      distance: distance,
      eta: eta,
      status: status ?? this.status,
      assignedTo: assignedTo ?? this.assignedTo,
      signaturePath: signaturePath ?? this.signaturePath,
      photoPath: photoPath ?? this.photoPath,
      paymentType: paymentType ?? this.paymentType,
      chequeNumber: chequeNumber ?? this.chequeNumber,
      bankName: bankName ?? this.bankName,
      collectedAmount: collectedAmount ?? this.collectedAmount,
      cancelReason: cancelReason ?? this.cancelReason,
    );
  }
}

class AppNotification {
  final String id;
  final String title;
  final String message;
  final DateTime timestamp;
  bool isRead;
  final String priority; // 'Urgent', 'Important', 'Normal'

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    this.isRead = false,
    required this.priority,
  });
}
