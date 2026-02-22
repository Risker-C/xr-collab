import 'package:flutter/material.dart';
import '../widgets/buttons/custom_buttons.dart';
import '../widgets/inputs/custom_inputs.dart';
import '../widgets/cards/custom_cards.dart';
import '../widgets/indicators/progress_indicators.dart';

class ComponentDemoScreen extends StatefulWidget {
  const ComponentDemoScreen({super.key});

  @override
  State<ComponentDemoScreen> createState() => _ComponentDemoScreenState();
}

class _ComponentDemoScreenState extends State<ComponentDemoScreen> {
  bool _isLoading = false;
  double _progressValue = 0.65;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Component Demo'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Buttons Section
          _SectionHeader(title: 'Buttons'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              PrimaryButton(
                label: 'Primary Button',
                onPressed: () {},
              ),
              PrimaryButton(
                label: 'With Icon',
                icon: Icons.add,
                onPressed: () {},
              ),
              PrimaryButton(
                label: 'Loading',
                isLoading: _isLoading,
                onPressed: () {
                  setState(() => _isLoading = !_isLoading);
                },
              ),
              SecondaryButton(
                label: 'Secondary',
                onPressed: () {},
              ),
              SecondaryButton(
                label: 'With Icon',
                icon: Icons.edit,
                onPressed: () {},
              ),
              TextButtonCustom(
                label: 'Text Button',
                onPressed: () {},
              ),
              IconButtonCustom(
                icon: Icons.favorite,
                tooltip: 'Favorite',
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Input Fields Section
          _SectionHeader(title: 'Input Fields'),
          const TextFieldCustom(
            label: 'Username',
            hint: 'Enter your username',
            prefixIcon: Icons.person,
          ),
          const SizedBox(height: 16),
          const TextFieldCustom(
            label: 'Password',
            hint: 'Enter your password',
            obscureText: true,
            prefixIcon: Icons.lock,
          ),
          const SizedBox(height: 16),
          const SearchField(
            hint: 'Search components...',
          ),
          const SizedBox(height: 16),
          const TextFieldCustom(
            label: 'Description',
            hint: 'Enter description',
            maxLines: 3,
          ),
          const SizedBox(height: 32),

          // Cards Section
          _SectionHeader(title: 'Cards'),
          InfoCard(
            title: 'Info Card',
            subtitle: 'This is a subtitle',
            icon: Icons.info,
            onTap: () {},
          ),
          const SizedBox(height: 16),
          InfoCard(
            title: 'Clickable Card',
            subtitle: 'Tap to navigate',
            icon: Icons.arrow_forward,
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Card tapped!')),
              );
            },
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ActionCard(
                  title: 'Scan',
                  description: 'Scan QR Code',
                  icon: Icons.qr_code_scanner,
                  onPressed: () {},
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ActionCard(
                  title: 'Upload',
                  description: 'Upload Image',
                  icon: Icons.upload,
                  onPressed: () {},
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Progress Indicators Section
          _SectionHeader(title: 'Progress Indicators'),
          const CircularProgressCustom(
            label: 'Loading...',
          ),
          const SizedBox(height: 24),
          CircularProgressCustom(
            value: _progressValue,
            size: 60,
            label: '${(_progressValue * 100).toInt()}%',
          ),
          const SizedBox(height: 24),
          const LinearProgressCustom(
            label: 'Indeterminate Progress',
          ),
          const SizedBox(height: 24),
          LinearProgressCustom(
            value: _progressValue,
            label: 'Determinate Progress',
          ),
          const SizedBox(height: 16),
          Slider(
            value: _progressValue,
            onChanged: (value) {
              setState(() => _progressValue = value);
            },
          ),
          const SizedBox(height: 32),

          // Additional Components
          _SectionHeader(title: 'Additional Components'),
          Chip(
            avatar: const Icon(Icons.star, size: 18),
            label: const Text('Chip Component'),
            onDeleted: () {},
          ),
          const SizedBox(height: 16),
          SwitchListTile(
            title: const Text('Enable notifications'),
            subtitle: const Text('Receive updates'),
            value: true,
            onChanged: (value) {},
          ),
          CheckboxListTile(
            title: const Text('Accept terms'),
            subtitle: const Text('I agree to the terms'),
            value: false,
            onChanged: (value) {},
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: Theme.of(context).textTheme.headlineSmall,
      ),
    );
  }
}
