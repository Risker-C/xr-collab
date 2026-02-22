import 'package:flutter/material.dart';

class LinearProgressCustom extends StatelessWidget {
  final double? value;
  final String? label;

  const LinearProgressCustom({
    super.key,
    this.value,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(label!, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
        ],
        LinearProgressIndicator(value: value),
        if (value != null) ...[
          const SizedBox(height: 4),
          Text(
            '${(value! * 100).toInt()}%',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ],
    );
  }
}

class CircularProgressCustom extends StatelessWidget {
  final double? value;
  final double size;
  final String? label;

  const CircularProgressCustom({
    super.key,
    this.value,
    this.size = 48,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: CircularProgressIndicator(value: value),
        ),
        if (label != null) ...[
          const SizedBox(height: 8),
          Text(label!, style: Theme.of(context).textTheme.bodySmall),
        ],
      ],
    );
  }
}
