import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'auth_provider.dart';
import '../../common/theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 60),
              const Icon(LucideIcons.truck, size: 64, color: AppColors.primary),
              const SizedBox(height: 32),
              const Text(
                'Welcome back!',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const Text(
                'Sign in to your account',
                style: TextStyle(color: AppColors.neutral),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              TextField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: 'Username',
                  hintText: 'staff or delivery',
                  prefixIcon: const Icon(LucideIcons.user, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(LucideIcons.lock, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              if (authState.error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Text(
                    authState.error!,
                    style: const TextStyle(color: AppColors.danger),
                    textAlign: TextAlign.center,
                  ),
                ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _testCredentialButton('Staff', 'staff'),
                  const SizedBox(width: 8),
                  _testCredentialButton('Delivery', 'delivery'),
                ],
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: authState.isLoading
                    ? null
                    : () => ref.read(authProvider.notifier).login(
                          _usernameController.text,
                          _passwordController.text,
                        ),
                child: authState.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Login'),
              ),
              const SizedBox(height: 16),
              Text(
                '© 2026 Neomad App',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.neutral.withValues(alpha: 0.5),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _testCredentialButton(String label, String username) {
    return OutlinedButton(
      onPressed: () {
        _usernameController.text = username;
        _passwordController.text = 'password';
      },
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: const BorderSide(color: AppColors.primary),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.primary)),
    );
  }
}
