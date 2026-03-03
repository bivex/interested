To get parameter names and values from a VST in C++, you generally have to build a **VST Host** application (like a mini-DAW). You cannot easily do this from *inside* another VST plugin due to sandboxing restrictions.

The industry standard for doing this in C++ is to use the **JUCE Framework**. It abstracts the complex Steinberg SDK and handles VST2, VST3, AU, and LV2 uniformly.

Here is a complete, functional example using **JUCE** to scan a folder, load a VST3 plugin, and print all parameter names and values.

### Prerequisites
1.  Install the **JUCE Framework**.
2.  Create a new **GUI Application** or **Console Application** project in the Projucer or CMake.
3.  In your project settings, enable **`JUCE_MODULE_AVAILABLE_juce_audio_processors`**.
4.  **Note:** For VST3 support, you need the Steinberg VST3 SDK (free). For VST2, the SDK is deprecated and hard to get legally. This example focuses on **VST3**.

### C++ Code (JUCE Host Example)

```cpp
#include <JuceHeader.h>

class VstScanner
{
public:
    VstScanner()
    {
        // 1. Setup the Plugin Format Manager
        // This manages different plugin types (VST, VST3, AU, etc.)
        formatManager.addDefaultFormats();
        
        // Optional: Clear VST2 if you don't have the SDK license
        // formatManager.clearFormats(); 
        // formatManager.addFormat(new juce::VST3PluginFormat());
    }

    // Function to scan a specific plugin file and print its parameters
    void scanAndPrintParameters(const juce::File& pluginFile)
    {
        if (!pluginFile.exists())
        {
            DBG("File not found: " + pluginFile.getFullPathName());
            return;
        }

        juce::PluginDescription description;
        
        // 2. Scan the file to get its description
        // This verifies it is a valid plugin
        if (!formatManager.scanFileForPlugins(pluginFile, description, false, true))
        {
            DBG("Failed to scan plugin: " + pluginFile.getFullPathName());
            return;
        }

        DBG("--------------------------------------------------");
        DBG("Loaded Plugin: " + description.name);
        DBG("Manufacturer: " + description.manufacturerName);
        DBG("--------------------------------------------------");

        // 3. Create the Plugin Instance
        // We need an 'audio callback' and 'message thread' for some plugins to load correctly
        juce::AudioPluginInstance* instance = nullptr;
        juce::String error;
        
        // createPluginInstance is asynchronous usually, but we force sync here for demo
        // In a real app, do this on a background thread.
        instance = formatManager.createPluginInstance(description, 
                                                      44100.0, // Sample Rate
                                                      512,     // Buffer Size
                                                      error);

        if (instance == nullptr)
        {
            DBG("Failed to create instance: " + error);
            return;
        }

        // 4. Iterate through all parameters
        const auto& params = instance->getParameters();
        
        for (int i = 0; i < params.size(); ++i)
        {
            auto* param = params[i];
            
            // Get Parameter Name
            // The integer argument is the max string length
            juce::String paramName = param->getName(64); 
            
            // Get Normalized Value (0.0 to 1.0)
            float normalizedValue = param->getValue(); 
            
            // Get Human Readable Value (e.g., "1200 Hz", "-6 dB", "On")
            juce::String displayValue = param->getCurrentValueAsText();
            
            // Get Parameter ID (Index)
            int paramIndex = param->getIndex();

            DBG("[" << paramIndex << "] " 
                << paramName 
                << " = " << displayValue 
                << " (Norm: " << normalizedValue << ")");
        }

        DBG("--------------------------------------------------");

        // 5. Cleanup
        delete instance;
    }

private:
    juce::AudioPluginFormatManager formatManager;
};

// =============================================================================
// MAIN ENTRY POINT (For Console App)
// =============================================================================
int main (int argc, char* argv[])
{
    // Initialize JUCE
    juce::JUCEApplicationBase::setInstanceName("VstParamScanner");
    
    // Create a temporary app instance to allow audio device initialization if needed
    class SimpleApp : public juce::JUCEApplication
    {
    public:
        void initialise(const juce::String&) override {}
        void shutdown() override {}
        const juce::String getApplicationName() override { return "VstParamScanner"; }
        const juce::String getApplicationVersion() override { return "1.0"; }
    };

    // In a real scenario, you'd run the JUCE message loop. 
    // For this snippet, we assume you call this logic from within a JUCE Component.
    
    VstScanner scanner;
    
    // REPLACE THIS PATH with a path to a real .vst3 file on your computer
    juce::File targetPlugin("/Library/Audio/Plug-Ins/VST3/SynthOne.vst3"); 
    
    // If running on Windows, path might look like: "C:/Program Files/Common Files/VST3/SynthOne.vst3"
    
    if (targetPlugin.exists())
    {
        scanner.scanAndPrintParameters(targetPlugin);
    }
    else
    {
        DBG("Please update the code with a valid path to a VST3 file on your system.");
    }

    return 0;
}
```

### Key Functions Explained

1.  **`AudioPluginFormatManager`**: This is the JUCE class that knows how to talk to VST, AU, LV2, etc. `addDefaultFormats()` registers all the formats your OS supports.
2.  **`scanFileForPlugins`**: Before loading, you must scan the file to ensure it's valid and get its `PluginDescription` (UID, name, etc.).
3.  **`createPluginInstance`**: This actually loads the binary (`.dll` or `.vst3`) into memory.
4.  **`getParameters()`**: Returns an array of `AudioProcessorParameter*` objects. This is the universal interface JUCE creates for *any* plugin parameter.
5.  **`getCurrentValueAsText()`**: This is crucial. VST parameters are normalized (0.0 to 1.0). This function asks the plugin to convert that 0.5 into "1000 Hz" or "50%".

### If You Are NOT Using JUCE (Raw Steinberg SDK)

If you cannot use JUCE and must use the raw Steinberg VST3 SDK, the logic is significantly more verbose. You must implement the `IEditController` interface.

**Conceptual Logic (Raw VST3 SDK):**

```cpp
// Pseudo-code using Steinberg VST3 SDK interfaces
// Requires linking against vst3sdk

void getParams(Steinberg::VST::IEditController* controller)
{
    int32 paramCount = controller->getParameterCount();

    for (int32 i = 0; i < paramCount; i++)
    {
        Steinberg::VST::ParameterInfo info;
        
        // 1. Get Info (Name, ID, Units)
        if (controller->getParameterInfo(i, info) == Steinberg::kResultOk)
        {
            // info.name is UChar128 string, needs conversion to std::string
            // info.id is the ParameterID
            
            // 2. Get Value
            Steinberg::VST::ParamValue normValue;
            controller->getParamNormalized(info.id, normValue);
            
            // 3. Get Display String
            Steinberg::VST::String128 displayString;
            controller->getParamStringByValue(info.id, normValue, displayString);
            
            // Print info.name, displayString, normValue
        }
    }
}
```

### Important Limitations & Warnings

1.  **Host vs. Plugin:** This code creates a **Host**. You cannot compile this code *into* a VST plugin to scan *other* VST plugins. Operating systems and DAWs sandbox plugins to prevent them from scanning your hard drive or loading other binaries.
2.  **32-bit vs 64-bit:** Your C++ application must match the architecture of the VST. If the VST is 64-bit, your app must be 64-bit.
3.  **UI Thread:** Some plugins crash if loaded without a message loop or audio device running. JUCE handles this, but raw SDK requires you to set up the `Steinberg::VST::HostApplication` correctly.
4.  **VST2 License:** Steinberg discontinued the VST2 SDK. You cannot legally distribute a host that loads VST2 unless you have an old license. VST3 is the modern standard.
5.  **DAW Specifics:** If you are trying to do this **inside** a specific DAW (e.g., writing a C++ extension for Reaper), do not use the VST SDK. Use the **DAW's SDK** (e.g., Reaper's `ReaScript` C++ API or `IPlug` framework).

### Recommendation
If you want to build a tool to manage or read VSTs, **use JUCE**. It saves you weeks of work handling the differences between Windows DLLs, macOS Bundles, and parameter normalization.

To set parameter values on a VST plugin in C++, you interact with the `AudioProcessorParameter` object (in JUCE) or the `IEditController` interface (in raw VST3 SDK).

**Crucial Rule:** VST parameters expect **normalized values** between `0.0` and `1.0`. You cannot directly set "1000 Hz"; you must calculate what `0.0–1.0` value represents 1000 Hz for that specific plugin.

Here are the methods for **JUCE** (Recommended) and **Raw VST3 SDK**.

---

### Method 1: Using JUCE Framework (Recommended)

JUCE handles the communication with the plugin binary. You primarily use the `setValueNotifyingHost` method to ensure the plugin's UI updates correctly.

#### Basic Example: Setting a Parameter

```cpp
// Assuming 'instance' is your loaded AudioPluginInstance*
// and you want to set parameter at index 0 to 50% (0.5f)

auto* param = instance->getParameters()[0];

// 1. Set the value (0.0f to 1.0f)
// This notifies the host and updates the plugin UI
param->setValueNotifyingHost(0.5f); 

// 2. Verify the change
float currentValue = param->getValue();
juce::String display = param->getCurrentValueAsText();

DBG("New Value: " << display);
```

#### Advanced: Setting by Parameter Name
Since parameter indices can change between presets, it is safer to find parameters by name.

```cpp
void setParameterByName(juce::AudioPluginInstance* instance, 
                        const juce::String& paramName, 
                        float normalizedValue)
{
    const auto& params = instance->getParameters();
    
    for (auto* param : params)
    {
        // Get name (max 64 chars)
        if (param->getName(64).equalsIgnoreCase(paramName))
        {
            // Clamp value between 0.0 and 1.0
            float safeValue = juce::jlimit(0.0f, 1.0f, normalizedValue);
            
            // Set value
            param->setValueNotifyingHost(safeValue);
            
            DBG("Set " << paramName << " to " << safeValue);
            return;
        }
    }
    
    DBG("Parameter not found: " << paramName);
}

// Usage:
// setParameterByName(instance, "Cutoff", 0.75f);
```

#### Setting by Parameter ID (Most Robust)
Parameter IDs are unique identifiers that do not change, unlike indices or sometimes even names.

```cpp
void setParameterByID(juce::AudioPluginInstance* instance,
                      int parameterID,
                      float normalizedValue)
{
    const auto& params = instance->getParameters();
    
    for (auto* param : params)
    {
        if (param->getIndex() == parameterID)
        {
            param->setValueNotifyingHost(juce::jlimit(0.0f, 1.0f, normalizedValue));
            return;
        }
    }
}
```

---

### Method 2: Raw VST3 SDK

If you are not using JUCE, you must use the `IEditController` interface. You need the Parameter ID, not just the index.

```cpp
#include "public.sdk/source/vst/vsteditor.h"
#include "public.sdk/source/vst/vstparameters.h"

using namespace Steinberg::VST;

void setVST3Parameter(IEditController* controller, ParamID paramID, float normalizedValue)
{
    // 1. Clamp value
    ParamValue safeValue = std::max(0.0, std::min(1.0, (double)normalizedValue));
    
    // 2. Set the parameter
    // This updates the internal state
    controller->setParamNormalized(paramID, safeValue);
    
    // 3. Notify the plugin UI (Important!)
    // This tells the plugin to redraw its knobs/displays
    controller->performEdit(paramID, safeValue);
}

// Example Usage:
// setVST3Parameter(controller, 1001, 0.5f); // 1001 is the Parameter ID
```

---

### Method 3: Converting Real Values to Normalized (0–1)

Plugins rarely accept "Hz" or "dB" directly. You must convert real-world values to the 0–1 range the plugin expects.

**Option A: Ask the Plugin (JUCE)**
Some parameters support converting from text strings.
```cpp
// Attempt to convert "1000 Hz" string to normalized value
float value = parameter->getValueForText("1000 Hz"); 
parameter->setValueNotifyingHost(value);
```

**Option B: Manual Mapping (Linear)**
If you know the range (e.g., 20Hz to 20000Hz):
```cpp
float minHz = 20.0f;
float maxHz = 20000.0f;
float targetHz = 1000.0f;

// Linear interpolation
float normalized = (targetHz - minHz) / (maxHz - minHz);
parameter->setValueNotifyingHost(normalized);
```

**Option C: Manual Mapping (Logarithmic/Audio)**
Audio parameters (like frequency) are often logarithmic. Linear mapping will feel wrong.
```cpp
float minHz = 20.0f;
float maxHz = 20000.0f;
float targetHz = 1000.0f;

// Logarithmic interpolation
float normalized = (std::log(targetHz) - std::log(minHz)) / 
                   (std::log(maxHz) - std::log(minHz));
                   
parameter->setValueNotifyingHost(normalized);
```

---

### Critical Best Practices

#### 1. Thread Safety
**Never** set parameters from the **Audio Processing Thread**. It can cause clicks, pops, or crashes.
*   **GUI Thread:** Safe to use `setValueNotifyingHost`.
*   **Audio Thread:** Use a lock-free queue to send messages to the GUI thread, or use `AudioProcessorParameter::setValue` (which does not notify the host/UI, safer for audio thread but UI won't update).

#### 2. Smoothing / Ramping
Jumping instantly from 0 to 1 causes clicks. Smooth the change over time.
```cpp
// Simple smoothing example
float currentValue = param->getValue();
float targetValue = 0.8f;
float smoothing = 0.1f; // Adjust for speed

// In a timer or render loop:
currentValue += (targetValue - currentValue) * smoothing;
param->setValueNotifyingHost(currentValue);
```

#### 3. Host Notification
Always use `setValueNotifyingHost(value)` instead of `setValue(value)` when changing parameters from user input.
*   `setValue`: Changes internal state only.
*   `setValueNotifyingHost`: Changes state **AND** tells the DAW to record automation/update the UI.

### Summary Checklist

| Task | JUCE Method | Raw VST3 Method |
| :--- | :--- | :--- |
| **Set Value** | `param->setValueNotifyingHost(0.5f)` | `controller->setParamNormalized(id, 0.5f)` |
| **Get Value** | `param->getValue()` | `controller->getParamNormalized(id)` |
| **Get Name** | `param->getName(64)` | `controller->getParameterInfo(id, info)` |
| **Notify UI** | Automatic with `setValueNotifyingHost` | `controller->performEdit(id, value)` |
| **Thread** | GUI / Message Thread | GUI / Main Thread |

### Recommendation
Use **JUCE**. It handles the complex thread safety and host notification logic for you. Use `setValueNotifyingHost` for all user-driven changes to ensure the DAW and Plugin UI stay in sync.