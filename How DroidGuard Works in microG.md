# How DroidGuard Works in microG

This document provides a technical overview of the DroidGuard implementation within the microG project, based on source code analysis. DroidGuard is a critical security component of Google Play Services responsible for device and application integrity checking, often referred to as "abuse detection."

## Overview

At a high level, DroidGuard is not a static library but a dynamic system that fetches, caches, and executes code from Google's servers. This allows Google to update its detection mechanisms on the fly without requiring a full update of the Play Services app. The executed code runs in a sandboxed environment to analyze the device state and returns a token (or "snapshot") that attests to the device's integrity.

The microG implementation faithfully reproduces this dynamic loading mechanism but contains a critical difference in how it verifies the downloaded code, which has significant security implications.

## Execution Flow

The process begins when an application requests a DroidGuard attestation and ends with the return of a security token.

1.  **Client Initiation**: An application calls [`DroidGuard.getClient().getResults(...)`](https://github.com/microg/GmsCore/blob/b9b7c06c51dac309c6bd1814ecc6f4c4e9eb5c39/play-services-droidguard/src/main/java/com/google/android/gms/droidguard/DroidGuardClient.java#L28). This is the entry point to the DroidGuard API.

2.  **API Client**: The call is delegated to [`DroidGuardApiClient`](https://github.com/microg/GmsCore/blob/b9b7c06c51dac309c6bd1814ecc6f4c4e9eb5c39/play-services-droidguard/src/main/java/org/microg/gms/droidguard/DroidGuardApiClient.java), which manages the connection to the DroidGuard service running within microG.

3.  **Service Communication**: `DroidGuardApiClient` establishes a connection with the remote [`IDroidGuardService`](https://github.com/microg/GmsCore/blob/b9b7c06c51dac309c6bd1814ecc6f4c4e9eb5c39/play-services-droidguard/src/main/aidl/com/google/android/gms/droidguard/internal/IDroidGuardService.aidl) using Android's binder IPC mechanism.

4.  **Dynamic Code Fetching**: The client requests a handle from the service. The service communicates with Google's servers to fetch the latest DroidGuard logic. This logic is packaged as a DEX file (inside an APK) and is sent back to the client via a `ParcelFileDescriptor` (PFD), which allows for efficient file transfer between processes. Along with the PFD, a `vmKey` is provided, which acts as an identifier for the downloaded code.

5.  **Caching and Loading**: The [`HandleProxyFactory`](https://github.com/microg/GmsCore/blob/b9b7c06c51dac309c6bd1814ecc6f4c4e9eb5c39/play-services-droidguard/src/main/kotlin/org/microg/gms/droidguard/HandleProxyFactory.kt) receives the PFD and `vmKey`.
    *   It saves the received APK file to a local cache directory (`cache_dg`).
    *   It then uses a `DexClassLoader` to load the main class (`com.google.ccc.abuse.droidguard.DroidGuard`) from the downloaded APK. This is the point where remote code is dynamically loaded into the client process.

6.  **Code Execution**:
    *   A [`HandleProxy`](https://github.com/microg/GmsCore/blob/b9b7c06c51dac309c6bd1814ecc6f4c4e9eb5c39/play-services-droidguard/src/main/kotlin/org/microg/gms/droidguard/HandleProxy.kt) object is created, which wraps the instance of the dynamically loaded `DroidGuard` class.
    *   Using Java reflection, methods like `init()`, `run(Map<String, String> data)`, and `close()` on the `HandleProxy` are invoked. These calls are forwarded to the actual object loaded from the remote APK.
    *   The `run` method performs the core integrity checks, analyzing the device environment, application data, and other signals.

7.  **Result**: The `run` method returns a `ByteArray` which is the attestation "snapshot" or token. This token is passed back up the call stack to the application that initiated the request.

## Security Implications in microG

The most significant aspect of microG's DroidGuard implementation is in the [`HandleProxyFactory`](https://github.com/microg/GmsCore/blob/b9b7c06c51dac309c6bd1814ecc6f4c4e9eb5c39/play-services-droidguard/src/main/kotlin/org/microg/gms/droidguard/HandleProxyFactory.kt):

*   **Signature Verification is Bypassed**: The method [`verifyApkSignature`](https://github.com/microg/GmsCore/blob/b9b7c06c51dac309c6bd1814ecc6f4c4e9eb5c39/play-services-droidguard/src/main/kotlin/org/microg/gms/droidguard/HandleProxyFactory.kt#L77) is a stub and **always returns `true`**. It does not perform any cryptographic verification on the downloaded APK.
*   **Hardcoded Certificate Hash**: The code contains a hardcoded SHA-256 hash ([`PROD_CERT_HASH`](https://github.com/microg/GmsCore/blob/b9b7c06c51dac309c6bd1814ecc6f4c4e9eb5c39/play-services-droidguard/src/main/kotlin/org/microg/gms/droidguard/HandleProxyFactory.kt#L115)) for what appears to be Google's official signing certificate for DroidGuard APKs. However, this hash is never used because the verification function is disabled.

This means that while microG correctly implements the dynamic loading and execution framework of DroidGuard, it **does not verify that the executed code actually comes from Google**. This creates a security vulnerability, as a malicious actor could potentially intercept the communication and provide a custom APK to be executed with the privileges of the application using DroidGuard. 
