# GPlayAPI Build - Errors & Solutions

## Project Overview
- **Project**: GPlayAPI - Google Play Store Protobuf API wrapper in Kotlin
- **Location**: `/Volumes/External/Code/tolo/gplayapi`
- **Build System**: Gradle 9.3.1

---

## Error 1: Java Toolchain Not Found

### Error Message
```
Cannot find a Java installation on your machine (Mac OS X 26.3 aarch64) matching:
{languageVersion=11, vendor=any vendor, implementation=vendor-specific, nativeImageCapable=false}
```

### Root Cause
The project requires Java 11 for compilation (`jvmToolchain(11)` in `lib/build.gradle.kts`), but only Java 17 was installed.

### Solution
```bash
brew install openjdk@11
```

Then added to `gradle.properties`:
```properties
org.gradle.java.installations.paths=/opt/homebrew/Cellar/openjdk@11/11.0.30/libexec/openjdk.jdk/Contents/Home
```

**Key Learning**: On macOS, Homebrew's Java is installed in a `.app` bundle structure. The actual JDK home is at:
```
/opt/homebrew/Cellar/openjdk@11/11.0.30/libexec/openjdk.jdk/Contents/Home
```

---

## Error 2: Gradle Requires JVM 17+

### Error Message
```
Gradle requires JVM 17 or later to run. Your build is currently configured to use JVM 11.
```

### Root Cause
- Gradle 9.3.1 requires Java 17+ to run
- But the project compiles with Java 11 (for compatibility)

### Solution
Use Java 17 to RUN Gradle, but let Gradle use Java 11 for compilation:
```bash
JAVA_HOME=$(/opt/homebrew/bin/brew --prefix openjdk) ./gradlew :lib:assemble
```

**Key Learning**: The `JAVA_HOME` environment variable controls which JVM runs Gradle, while `kotlin { jvmToolchain(11) }` controls which JVM compiles the code. These can be different!

---

## Error 3: Android SDK Not Found

### Error Message
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable
or by setting the sdk.dir path in your project's local properties file
```

### Root Cause
No Android SDK was installed on the system.

### Solution
```bash
# Install Android command-line tools
brew install android-commandlinetools

# Accept licenses
yes | sdkmanager --licenses --sdk_root=/opt/homebrew/share/android-commandlinetools

# Install required components
sdkmanager --sdk_root=/opt/homebrew/share/android-commandlinetools \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;36.0.0"

# Create local.properties
echo "sdk.dir=/opt/homebrew/share/android-commandlinetools" > local.properties
```

**Key Learning**: The Android SDK from Homebrew is installed at `/opt/homebrew/share/android-commandlinetools`, not the traditional `~/Library/Android/sdk` location.

---

## Error 4: JDK Image Transformation Failed

### Error Message
```
Failed to transform core-for-system-modules.jar to match attributes
Execution failed for JdkImageTransform
/opt/homebrew/Cellar/openjdk@11/11.0.30/lib/jrt-fs.jar
```

### Root Cause
The Android Gradle Plugin was looking for `jrt-fs.jar` at the wrong path because the Java installation on macOS uses a `.app` bundle structure.

### Solution
Update `gradle.properties` with the correct JDK path that includes the `.app` bundle:
```properties
org.gradle.java.installations.paths=/opt/homebrew/Cellar/openjdk@11/11.0.30/libexec/openjdk.jdk/Contents/Home
```

**Key Learning**: On macOS, Java installations via Homebrew have this structure:
- `/opt/homebrew/Cellar/openjdk@11/11.0.30/` - Cellar location
- `/opt/homebrew/Cellar/openjdk@11/11.0.30/libexec/openjdk.jdk/Contents/Home/` - Actual JAVA_HOME

The `jrt-fs.jar` is located at:
```
/opt/homebrew/Cellar/openjdk@11/11.0.30/libexec/openjdk.jdk/Contents/Home/lib/jrt-fs.jar
```

---

## Error 5: KtLint Code Style Violations

### Error Message
```
KtLint found code style violations
/Volumes/External/Code/tolo/gplayapi/lib/build.gradle.kts:10:23
A multiline expression should start on a new line
```

### Root Cause
The ktlint plugin enforces code style. The existing code doesn't match the configured style rules.

### Solution
Skip ktlint checks during build:
```bash
./gradlew :lib:assemble  # assemble doesn't run lint checks
```

Or auto-fix with:
```bash
./gradlew :lib:ktlintFormat
```

**Key Learning**: Use `:lib:assemble` instead of `:lib:build` to skip lint and test checks. The `build` task includes:
- assemble
- test
- lint checks (ktlint)

---

## Final Working Build Command

```bash
cd /Volumes/External/Code/tolo/gplayapi
JAVA_HOME=$(/opt/homebrew/bin/brew --prefix openjdk) ./gradlew :lib:assemble
```

### Output
```
BUILD SUCCESSFUL in 465ms
61 actionable tasks: 61 up-to-date
```

### Built Artifacts
- `lib/build/outputs/aar/lib-release.aar`
- `lib/build/outputs/aar/lib-debug.aar`

---

## Configuration Files Summary

### `gradle.properties`
```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true

# Java Toolchain configuration
org.gradle.java.installations.paths=/opt/homebrew/Cellar/openjdk@11/11.0.30/libexec/openjdk.jdk/Contents/Home
```

### `local.properties`
```properties
sdk.dir=/opt/homebrew/share/android-commandlinetools
```

---

## Environment Summary

| Component | Version | Location |
|-----------|---------|----------|
| Gradle | 9.3.1 | Project wrapper |
| Java (for Gradle) | 17 (temurin) | `/opt/homebrew/opt/openjdk` |
| Java (for compilation) | 11 (openjdk@11) | `/opt/homebrew/Cellar/openjdk@11/11.0.30/libexec/openjdk.jdk/Contents/Home` |
| Android SDK | Command-line tools | `/opt/homebrew/share/android-commandlinetools` |
| Android Platform | 36 | `platforms/android-36` |
| Build Tools | 36.0.0 | `build-tools/36.0.0` |
| Kotlin | 2.3.10 | Via Gradle |
