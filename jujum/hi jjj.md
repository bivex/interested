Let me explore the repository first to understand the current structure before making any suggestions.I now have a thorough understanding of your repo. Here's my plan and a proposed PR to add DAW/JUCE/VST parameter tools.

---

## Plan: Add JUCE/VST DAW Parameter Tools to `calc-mcp`

Your repo is a **TypeScript MCP server** using `@modelcontextprotocol/sdk`. Each tool lives in `src/tools/*.ts` exporting a `ToolDefinition`, then registered in `src/index.ts`.

I'll create a PR that adds **`src/tools/daw_juce.ts`** — a new tool named `daw_juce` covering:

| Action | Description |
|--------|-------------|
| `normalize_param` | Convert a raw VST parameter value (0.0–1.0 normalized) to a human-readable value given min/max/skew |
| `denormalize_param` | Convert a human-readable value back to normalized (0.0–1.0) |
| `skew_factor` | Calculate the JUCE skew factor for a mid-point (for log/exp faders) |
| `db_to_gain` | Convert dB → linear gain (float) |
| `gain_to_db` | Convert linear gain → dB |
| `hz_to_midi` | Convert frequency (Hz) → MIDI note number |
| `midi_to_hz` | Convert MIDI note number → frequency (Hz) |
| `param_info` | Generate C++ JUCE `AudioParameterFloat` / `AudioProcessorValueTreeState` parameter declaration code snippet |
| `bpm_to_ms` | Convert BPM + note division → milliseconds (useful for delay/LFO sync) |
| `semitones_to_ratio` | Convert semitone count → pitch ratio |

Would you like me to **open a Pull Request** with this new tool added to `bivex/calc-mcp`? 

Or do you have adjustments to the planned actions — e.g., adding MIDI CC mapping, VST3 parameter flags, or specific parameter types from JUCE (`AudioParameterBool`, `AudioParameterChoice`)?