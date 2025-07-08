# Manual Installation Guide for React Developer Tools (v3)

This guide provides step-by-step instructions for building and installing the React Developer Tools extension from the `v3` source code.

This is necessary for older versions of Node.js or when working with archived versions of the repository.

## Prerequisites

- [Node.js](https://nodejs.org/) (v17 or higher is known to cause OpenSSL issues, which this guide addresses).
- [Git](https://git-scm.com/) or the source code downloaded as a ZIP from [GitHub](https://github.com/facebook/react-devtools/tree/v3).

## Step 1: Get the Source Code

Clone the repository or download the ZIP file and extract it.

```bash
git clone --branch v3 https://github.com/facebook/react-devtools.git
cd react-devtools
```

## Step 2: Install Dependencies

Navigate to the root directory of the project and install the required `npm` packages. This command will install all dependencies listed in `package.json`.

```bash
npm install
```
> **Note:** You may see many warnings about deprecated packages. This is expected for this older version of the project and can be safely ignored.

## Step 3: Build the Chrome Extension

The build process requires a workaround for a known OpenSSL issue in recent Node.js versions.

1.  Navigate to the Chrome shell directory:
    ```bash
    cd shells/chrome
    ```

2.  Run the build script using the command appropriate for your operating system. This command sets an environment variable that allows Node.js to use legacy OpenSSL providers, which is necessary for the outdated `webpack` version used in this project.

    **For Windows (PowerShell):**
    ```powershell
    $env:NODE_OPTIONS="--openssl-legacy-provider"; node build
    ```

    **For macOS / Linux (bash/zsh):**
    ```bash
    NODE_OPTIONS=--openssl-legacy-provider node build
    ```

After a successful build, you will see a confirmation message and a new `build` directory will be created inside `shells/chrome`.

## Step 4: Load the Unpacked Extension in Chrome

1.  Open Google Chrome and navigate to the extensions page: `chrome://extensions`.

2.  Enable **Developer mode** using the toggle switch in the top-right corner.

3.  Click the **Load unpacked** button that appears on the top-left.

4.  In the file selection dialog, navigate to the build output directory:
    `.../react-devtools/shells/chrome/build/unpacked`

5.  Select the `unpacked` folder and click **"Select Folder"**.

The React Developer Tools extension should now be installed and active. You will see its card on the `chrome://extensions` page and the "⚛️ Components" and "⚛️ Profiler" tabs will appear in the Chrome DevTools when you inspect a website built with React. 
