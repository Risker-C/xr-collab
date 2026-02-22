import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../screens/home_screen.dart';
import '../../screens/component_demo_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/demo',
      name: 'demo',
      builder: (context, state) => const ComponentDemoScreen(),
    ),
  ],
);
