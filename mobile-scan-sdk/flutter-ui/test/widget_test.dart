import 'package:flutter_test/flutter_test.dart';
import 'package:xr_collab_ui/main.dart';

void main() {
  testWidgets('App should build and display home screen', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    expect(find.text('XR Collab UI'), findsOneWidget);
    expect(find.text('XR Collab Mobile'), findsOneWidget);
  });
}
