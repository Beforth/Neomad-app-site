import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/mock_api.dart';
import '../../models/models.dart';

class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  AuthState({this.user, this.isLoading = false, this.error});

  AuthState copyWith({User? user, bool? isLoading, String? error, bool clearError = false}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final MockApi _api;

  AuthNotifier(this._api) : super(AuthState());

  Future<bool> login(String username, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    final user = await _api.login(username, password);
    if (user != null) {
      state = state.copyWith(user: user, isLoading: false);
      return true;
    } else {
      state = state.copyWith(isLoading: false, error: 'Invalid credentials');
      return false;
    }
  }

  void logout() {
    state = AuthState();
  }
}

final mockApiProvider = Provider((ref) => MockApi());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(mockApiProvider));
});
