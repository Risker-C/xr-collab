import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTextStyles {
  static final _baseTextStyle = GoogleFonts.inter();

  // Display
  static final displayLarge = _baseTextStyle.copyWith(
    fontSize: 57,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.25,
  );

  static final displayMedium = _baseTextStyle.copyWith(
    fontSize: 45,
    fontWeight: FontWeight.w400,
  );

  static final displaySmall = _baseTextStyle.copyWith(
    fontSize: 36,
    fontWeight: FontWeight.w400,
  );

  // Headline
  static final headlineLarge = _baseTextStyle.copyWith(
    fontSize: 32,
    fontWeight: FontWeight.w400,
  );

  static final headlineMedium = _baseTextStyle.copyWith(
    fontSize: 28,
    fontWeight: FontWeight.w400,
  );

  static final headlineSmall = _baseTextStyle.copyWith(
    fontSize: 24,
    fontWeight: FontWeight.w400,
  );

  // Title
  static final titleLarge = _baseTextStyle.copyWith(
    fontSize: 22,
    fontWeight: FontWeight.w500,
  );

  static final titleMedium = _baseTextStyle.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.15,
  );

  static final titleSmall = _baseTextStyle.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
  );

  // Body
  static final bodyLarge = _baseTextStyle.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.5,
  );

  static final bodyMedium = _baseTextStyle.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.25,
  );

  static final bodySmall = _baseTextStyle.copyWith(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.4,
  );

  // Label
  static final labelLarge = _baseTextStyle.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
  );

  static final labelMedium = _baseTextStyle.copyWith(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
  );

  static final labelSmall = _baseTextStyle.copyWith(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
  );
}
