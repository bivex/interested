# Smali APK quick manual

This note documents the exact small-app workflow that was verified against the local LineageOS VM over `adb`.

## What was verified

- Device: `127.0.0.1:5555`
- OS: `LineageOS 23.1` / `Android 16`
- ABI: `arm64-v8a`
- Demo package: `com.example.smalihello`

## Files used

- project: `experiments/smali-hello/`
- manifest: `experiments/smali-hello/AndroidManifest.xml`
- Java source: `experiments/smali-hello/src/com/example/smalihello/MainActivity.java`
- build script: `experiments/smali-hello/build-smali-demo.sh`
- generated smali: `experiments/smali-hello/smali-src/smali/...`

## Required tools

The working setup used these tools:

- `java`, `javac`
- `aapt`, `d8`, `zipalign`, `apksigner`
- `apktool`
- `adb`

Expected SDK paths in this repo's environment:

- SDK root: `/Users/password9090/android-sdk`
- build-tools: `34.0.0`
- platform jar: `platforms/android-34/android.jar`

## 1. Build the demo APK

From repo root:

```bash
chmod +x experiments/smali-hello/build-smali-demo.sh
./experiments/smali-hello/build-smali-demo.sh
```

Expected output:

- final APK: `experiments/smali-hello/build/smali-signed.apk`

What the script does:

1. packages resources with `aapt`
2. compiles Java with `javac`
3. creates `classes.dex` with `d8`
4. adds `classes.dex` into the base APK
5. aligns and signs the APK
6. decompiles it with `apktool`
7. rebuilds the APK from the generated smali tree
8. aligns and signs the smali-rebuilt APK

## 2. Confirm the APK really came from smali

Check that smali files exist:

```bash
find experiments/smali-hello/smali-src -type f -name '*.smali' | head
```

Key file:

- `experiments/smali-hello/smali-src/smali/com/example/smalihello/MainActivity.smali`

Also verify the signed APK contains `classes.dex`:

```bash
unzip -l experiments/smali-hello/build/smali-signed.apk | grep classes.dex
```

## 3. Install on the Lineage VM

Make sure the VM is visible first:

```bash
adb devices -l
adb connect 127.0.0.1:5555
```

Install the smali-built APK:

```bash
adb -s 127.0.0.1:5555 install -r experiments/smali-hello/build/smali-signed.apk
```

Verify the package is installed:

```bash
adb -s 127.0.0.1:5555 shell pm list packages | grep com.example.smalihello
```

## 4. Launch the app

```bash
adb -s 127.0.0.1:5555 shell am start -W -n com.example.smalihello/.MainActivity
```

Optional runtime verification:

```bash
adb -s 127.0.0.1:5555 shell dumpsys activity activities \
  | egrep 'mResumedActivity|topResumedActivity|com.example.smalihello'
```

## 5. Edit the smali directly

After the first build, edit files under:

- `experiments/smali-hello/smali-src/smali/`

Typical target:

- `experiments/smali-hello/smali-src/smali/com/example/smalihello/MainActivity.smali`

After editing smali, rebuild/sign/install manually:

```bash
apktool b experiments/smali-hello/smali-src -o experiments/smali-hello/build/smali-unsigned.apk
/Users/password9090/android-sdk/build-tools/34.0.0/zipalign -f 4 \
  experiments/smali-hello/build/smali-unsigned.apk \
  experiments/smali-hello/build/smali-aligned.apk
/Users/password9090/android-sdk/build-tools/34.0.0/apksigner sign \
  --ks experiments/smali-hello/build/debug.keystore \
  --ks-key-alias androiddebugkey \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out experiments/smali-hello/build/smali-signed.apk \
  experiments/smali-hello/build/smali-aligned.apk
adb -s 127.0.0.1:5555 install -r experiments/smali-hello/build/smali-signed.apk
```

## 6. Uninstall

```bash
adb -s 127.0.0.1:5555 uninstall com.example.smalihello
```

## Notes

- `aapt package` needed `-m`, otherwise `R.java` was not generated.
- `aapt add` had to run from the build directory with a relative path, otherwise `classes.dex` was skipped.
- `d8` was happiest when given explicit `.class` files plus an existing output directory.
- The current manifest targets SDK 34, but the VM runs Android 16 / SDK 36 and installed the APK fine.
