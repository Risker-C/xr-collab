# Flutter UI 项目结构

```
flutter-ui/
├── .github/
│   └── workflows/
│       └── flutter-ci.yml          # CI/CD自动构建配置
├── android/                         # Android壳工程
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── kotlin/com/xrcollab/ui/
│   │   │       └── MainActivity.kt
│   │   └── build.gradle
│   ├── gradle/wrapper/
│   │   └── gradle-wrapper.properties
│   ├── build.gradle
│   ├── gradle.properties
│   └── settings.gradle
├── ios/                             # iOS壳工程
│   └── Runner/
│       ├── AppDelegate.swift
│       └── Info.plist
├── lib/                             # 主要代码
│   ├── core/
│   │   ├── routes/
│   │   │   └── app_router.dart     # 路由系统
│   │   └── theme/
│   │       ├── app_colors.dart     # 颜色系统
│   │       ├── app_text_styles.dart # 文本样式
│   │       └── app_theme.dart      # 主题配置
│   ├── screens/
│   │   ├── home_screen.dart        # 主页
│   │   └── component_demo_screen.dart # 组件演示页
│   ├── widgets/                     # UI组件库
│   │   ├── buttons/
│   │   │   └── custom_buttons.dart # 4种按钮
│   │   ├── cards/
│   │   │   └── custom_cards.dart   # 2种卡片
│   │   ├── indicators/
│   │   │   └── progress_indicators.dart # 2种进度条
│   │   └── inputs/
│   │       └── custom_inputs.dart  # 2种输入框
│   └── main.dart                    # 应用入口
├── test/
│   └── widget_test.dart             # 测试文件
├── assets/                          # 资源目录
│   ├── images/
│   └── icons/
├── .gitignore
├── .metadata
├── analysis_options.yaml
├── pubspec.yaml                     # 项目配置
├── DELIVERABLES.md                  # 交付物清单
└── README.md                        # 项目文档
```

## 统计

- **总文件数**: 28个
- **Dart源文件**: 12个
- **UI组件**: 13个（超过要求的10个）
- **配置文件**: 10个
- **文档**: 3个

## 技术栈

- Flutter 3.16+
- Material Design 3
- go_router (路由)
- provider (状态管理)
- Google Fonts (字体)
