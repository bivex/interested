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