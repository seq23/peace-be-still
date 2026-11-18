# Voices (QUALITY.md A09)

Locked 18 Nov 2026 by the owner. One spoken voice per language at launch; a man's voice is later.
A voice id in `manifest.jsonl` must be listed here with a commercial-use licence.

| Voice id (manifest) | Language | What it is | Licence |
|---|---|---|---|
| `kokoro:af_nicole` | English (KJV) | Kokoro-82M stock voice `af_nicole`, as shipped, speed 0.85 | Kokoro-82M weights Apache-2.0 (https://huggingface.co/hexgrad/Kokoro-82M); runtime kokoro-onnx MIT (https://github.com/thewh1teagle/kokoro-onnx) |
| `kokoro:blend af_nicole 0.7 + ef_dora 0.3` | Spanish (RV1909) | Kokoro style-vector blend, 70% `af_nicole` + 30% `ef_dora`, Spanish pipeline, speed 0.85 (owner: "Yes approved for 70/30 blend") | Same as above (a built-in Kokoro feature on Apache-2.0 weights) |
| `gemini:hush-harbor` | English, Hush Harbor stories | Google Gemini TTS (`gemini-2.5-flash-preview-tts`, the model her picks were made on; then the free `gemini-3.1-flash-tts-preview`, `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts` with the same voices when its daily quota is out; each row names its model), four prebuilt voices with a fixed style line each (`audio/hush-harbor/voices.json`): grandmother narrator `Gacrux` (also every word Jesus or God says), elder `Charon`, young woman `Kore`, young man `Umbriel` (owner's picks 18 Nov 2026). Rendered by `audio/hush_harbor.py` on the app's own free-tier AI Studio key (vault `PBS_GEMINI_API_KEY`), never a billed one | Gemini API terms (https://ai.google.dev/gemini-api/terms, read 18 Nov 2026): Google claims no ownership of outputs, business use allowed; free-tier inputs may train Google models (story text is public, never private data); files are pre-rendered, the app never calls Gemini |

Hush Harbor voices are AI voices with no human names or bios (risk R-PRF-02); the app labels them AI.
The player says plainly that the voice is made with AI (A10, built with the player in Phase 4).
