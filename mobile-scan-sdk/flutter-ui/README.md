# XR Collab Mobile UI Framework

Flutter UI 框架，为 XR Collab 移动端扫描 SDK 提供基础 UI 组件库。

## 特性

✨ **Material Design 3** - 现代化设计系统  
🎨 **主题系统** - 支持亮色/暗色主题  
🧩 **组件库** - 10+ 可复用 UI 组件  
🧭 **路由系统** - 基于 go_router 的导航  
📱 **跨平台** - 支持 iOS & Android  
🔄 **CI/CD** - GitHub Actions 自动构建  

## 快速开始

```bash
# 安装依赖
flutter pub get

# 运行应用
flutter run

# 构建 iOS
flutter build ios

# 构建 Android
flutter build apk
```

## 项目结构

```
lib/
├── core/
│   ├── theme/          # 主题系统
│   │   ├── app_theme.dart
│   │   ├── app_colors.dart
│   │   └── app_text_styles.dart
│   └── routes/         # 路由系统
│       └── app_router.dart
├── widgets/            # UI 组件库
│   ├── buttons/
│   ├── cards/
│   ├── inputs/
│   └── indicators/
├── screens/            # 页面
│   ├── home_screen.dart
│   └── component_demo_screen.dart
└── main.dart           # 应用入口
```

## UI 组件

### 按钮组件
- `PrimaryButton` - 主要按钮
- `SecondaryButton` - 次要按钮
- `TextButtonCustom` - 文本按钮
- `IconButtonCustom` - 图标按钮

### 输入组件
- `TextFieldCustom` - 文本输入框
- `SearchField` - 搜索框

### 卡片组件
- `InfoCard` - 信息卡片
- `ActionCard` - 操作卡片

### 进度指示器
- `LinearProgressCustom` - 线性进度条
- `CircularProgressCustom` - 圆形进度指示器

## 主题配置

主题系统支持亮色和暗色模式，使用 Material Design 3 色彩系统。

```dart
// 使用主题颜色
AppColors.primary
AppColors.secondary
AppColors.surface

// 使用文本样式
AppTextStyles.heading1
AppTextStyles.body
AppTextStyles.caption
```

## 开发指南

### 添加新组件

1. 在 `lib/widgets/` 创建组件文件
2. 继承或组合现有 Flutter 组件
3. 使用主题系统中的颜色和样式
4. 在 `component_demo_screen.dart` 添加示例

### 添加新页面

1. 在 `lib/screens/` 创建页面文件
2. 在 `app_router.dart` 注册路由
3. 使用 `context.go('/route')` 进行导航

## CI/CD

项目配置了 GitHub Actions 自动构建：

- **Pull Request**: 运行测试和 lint 检查
- **Push to main**: 构建 iOS 和 Android 产物

查看 `.github/workflows/` 了解详情。

## 技术栈

- Flutter 3.16+
- Dart 3.2+
- Material Design 3
- go_router (路由)
- provider (状态管理)
- Google Fonts (字体)

## License

MIT License - 仅供学习和开发使用
