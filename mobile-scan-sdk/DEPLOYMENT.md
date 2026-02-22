# Deployment Guide

## Overview

This document describes the CI/CD pipeline and deployment process for the Mobile Scan SDK project.

## Architecture

The project uses GitHub Actions for CI/CD with three main workflows:

1. **Flutter Build & Deploy** (`flutter-build.yml`) - Builds and deploys mobile apps
2. **C++ Unit Tests** (`cpp-test.yml`) - Tests C++ core library
3. **Code Quality** (`code-quality.yml`) - Linting and security checks

## Prerequisites

### Required Secrets

Configure these in GitHub Settings → Secrets and variables → Actions:

#### iOS Deployment (TestFlight)
- `BUILD_CERTIFICATE_BASE64` - Base64-encoded .p12 certificate
- `P12_PASSWORD` - Certificate password
- `BUILD_PROVISION_PROFILE_BASE64` - Base64-encoded provisioning profile
- `KEYCHAIN_PASSWORD` - Temporary keychain password
- `APP_STORE_CONNECT_API_KEY_ID` - App Store Connect API Key ID
- `APP_STORE_CONNECT_API_ISSUER_ID` - Issuer ID
- `APP_STORE_CONNECT_API_KEY_CONTENT` - API Key content (.p8 file)

#### Android Deployment (Google Play)
- `PLAY_STORE_CONFIG_JSON` - Google Play service account JSON

#### Notifications
- `SLACK_WEBHOOK` - Slack webhook URL (optional)
- `DISCORD_WEBHOOK` - Discord webhook URL (optional)

### Setup Instructions

#### 1. iOS Certificates

```bash
# Export certificate to base64
base64 -i Certificates.p12 | pbcopy

# Export provisioning profile to base64
base64 -i profile.mobileprovision | pbcopy
```

Add to GitHub secrets as `BUILD_CERTIFICATE_BASE64` and `BUILD_PROVISION_PROFILE_BASE64`.

#### 2. App Store Connect API Key

1. Go to App Store Connect → Users and Access → Keys
2. Create new API key with App Manager role
3. Download the .p8 file
4. Copy Key ID and Issuer ID
5. Add to GitHub secrets:
   - Key ID → `APP_STORE_CONNECT_API_KEY_ID`
   - Issuer ID → `APP_STORE_CONNECT_API_ISSUER_ID`
   - .p8 content → `APP_STORE_CONNECT_API_KEY_CONTENT`

#### 3. Google Play Service Account

1. Go to Google Play Console → Setup → API access
2. Create service account with Release Manager role
3. Download JSON key file
4. Add entire JSON content to `PLAY_STORE_CONFIG_JSON` secret

#### 4. Fastlane Setup

Create `flutter-ui/ios/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  desc "Deploy to TestFlight"
  lane :deploy_testflight do
    api_key = app_store_connect_api_key(
      key_id: ENV["APP_STORE_CONNECT_API_KEY_ID"],
      issuer_id: ENV["APP_STORE_CONNECT_API_ISSUER_ID"],
      key_content: ENV["APP_STORE_CONNECT_API_KEY_CONTENT"],
      is_key_content_base64: false
    )
    
    upload_to_testflight(
      api_key: api_key,
      skip_waiting_for_build_processing: true,
      ipa: "../build/ios/iphoneos/Runner.ipa"
    )
  end
end
```

Create `flutter-ui/android/fastlane/Fastfile`:

```ruby
default_platform(:android)

platform :android do
  desc "Deploy to Internal Testing"
  lane :deploy_internal do
    upload_to_play_store(
      track: 'internal',
      aab: '../build/app/outputs/bundle/release/app-release.aab',
      json_key_data: ENV['PLAY_STORE_CONFIG_JSON'],
      skip_upload_apk: true,
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
end
```

## Workflows

### Flutter Build & Deploy

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual dispatch

**Jobs:**
1. **build-android** - Builds APK and AAB, deploys to Google Play Internal Testing (main branch only)
2. **build-ios** - Builds IPA, deploys to TestFlight (main branch only)
3. **notify** - Sends build status notifications

**Artifacts:**
- `android-apk-{sha}` - Release APK
- `android-bundle-{sha}` - Release AAB
- `ios-ipa-{sha}` - Signed IPA

### C++ Unit Tests

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual dispatch

**Jobs:**
1. **test-linux** - Runs tests on Ubuntu with Clang
2. **test-macos** - Runs tests on macOS, includes iOS build
3. **test-android** - Builds for Android NDK
4. **coverage** - Generates code coverage report
5. **notify** - Sends test status notifications

**Artifacts:**
- `test-results-linux` - JUnit XML test results
- `test-results-macos` - JUnit XML test results
- `libmobile_scan_android` - Android .so library
- `coverage-report` - Code coverage report

### Code Quality

**Triggers:**
- Push to any branch
- Pull requests to `main`
- Manual dispatch

**Jobs:**
1. **flutter-lint** - Dart formatting and analysis
2. **cpp-lint** - C++ formatting (clang-format) and static analysis (clang-tidy)
3. **yaml-lint** - YAML file validation
4. **markdown-lint** - Markdown file validation
5. **security-scan** - Trivy vulnerability scanner and secret detection
6. **dependency-check** - Checks for vulnerable dependencies
7. **quality-gate** - Aggregates results and enforces quality standards

**Quality Gate Rules:**
- Flutter lint must pass
- C++ lint must pass
- Security scan must pass
- Other checks are informational

## Local Development

### Build Script

Use the provided `build.sh` script:

```bash
# Build everything (release)
./build.sh all release

# Build Flutter only
./build.sh flutter

# Build C++ only (debug)
./build.sh cpp debug

# Build C++ for Android
./build.sh cpp-android

# Build C++ for iOS (macOS only)
./build.sh cpp-ios

# Clean all build artifacts
./build.sh clean
```

### Manual Testing

#### Flutter
```bash
cd flutter-ui
flutter pub get
flutter test
flutter analyze
dart format --set-exit-if-changed .
```

#### C++
```bash
cd cpp-core
mkdir build && cd build
cmake .. -DBUILD_TESTS=ON
cmake --build .
ctest --output-on-failure
```

## Deployment Process

### Automatic Deployment

Deployments happen automatically on push to `main` branch:

1. Code is pushed to `main`
2. All tests and quality checks run
3. If successful, builds are created
4. iOS app is uploaded to TestFlight
5. Android app is uploaded to Google Play Internal Testing
6. Notifications are sent

### Manual Deployment

Trigger manual deployment via GitHub Actions UI:

1. Go to Actions tab
2. Select "Flutter Build & Deploy" workflow
3. Click "Run workflow"
4. Select branch and check "Deploy to stores"
5. Click "Run workflow"

### Release Process

1. **Development** - Work on `develop` branch
2. **Testing** - Create PR to `main`, CI runs all checks
3. **Review** - Code review and approval
4. **Merge** - Merge to `main`, automatic deployment
5. **Verify** - Check TestFlight/Internal Testing
6. **Promote** - Manually promote to production in store consoles

## Monitoring

### Build Status

Check build status:
- GitHub Actions tab
- Slack/Discord notifications (if configured)
- PR comments with quality reports

### Artifacts

Download build artifacts:
1. Go to Actions tab
2. Select workflow run
3. Scroll to "Artifacts" section
4. Download desired artifact

### Logs

View detailed logs:
1. Go to Actions tab
2. Select workflow run
3. Click on job name
4. Expand step to view logs

## Troubleshooting

### iOS Build Fails

**Certificate issues:**
- Verify certificate is not expired
- Check provisioning profile matches bundle ID
- Ensure certificate is in base64 format

**Xcode version:**
- Update `xcode-version` in workflow if needed
- Check Xcode compatibility with Flutter version

### Android Build Fails

**Signing issues:**
- Verify service account has correct permissions
- Check JSON key is valid and not expired

**NDK issues:**
- Update NDK version in workflow
- Check CMake compatibility

### Tests Fail

**C++ tests:**
- Check for platform-specific issues
- Verify Google Test version compatibility
- Review test logs for specific failures

**Flutter tests:**
- Check for missing dependencies
- Verify Flutter version compatibility
- Review widget test failures

### Quality Gate Fails

**Linting errors:**
- Run `dart format .` locally
- Run `clang-format` on C++ files
- Fix analysis warnings

**Security issues:**
- Review Trivy scan results
- Update vulnerable dependencies
- Remove any exposed secrets

## Configuration Files

### Required Files

Create these configuration files:

**`.clang-format`** (C++ formatting):
```yaml
BasedOnStyle: Google
IndentWidth: 4
ColumnLimit: 100
```

**`.markdownlint.json`** (Markdown linting):
```json
{
  "default": true,
  "MD013": false,
  "MD033": false
}
```

**`flutter-ui/ios/ExportOptions.plist`** (iOS export):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

## Best Practices

1. **Always test locally** before pushing
2. **Use feature branches** for development
3. **Keep secrets secure** - never commit credentials
4. **Monitor build times** - optimize slow jobs
5. **Review artifacts** before promoting to production
6. **Update dependencies** regularly
7. **Document changes** in commit messages
8. **Use semantic versioning** for releases

## Support

For issues or questions:
- Check GitHub Actions logs
- Review this documentation
- Contact DevOps team
- Create issue in repository
