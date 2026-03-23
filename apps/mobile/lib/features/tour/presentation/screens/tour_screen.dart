import 'package:flutter/material.dart';

class TourScreen extends StatelessWidget {
  const TourScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tour'),
      ),
      body: const Center(
        child: Text('Tour Screen — placeholder'),
      ),
    );
  }
}
