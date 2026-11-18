# Voices (QUALITY.md A09)

Locked 18 Nov 2026 by the owner. One spoken voice per language at launch; a man's voice is later.
A voice id in `manifest.jsonl` must be listed here with a commercial-use licence.

| Voice id (manifest) | Language | What it is | Licence |
|---|---|---|---|
| `kokoro:af_nicole` | English (KJV) | Kokoro-82M stock voice `af_nicole`, as shipped, speed 0.85 | Kokoro-82M weights Apache-2.0 (https://huggingface.co/hexgrad/Kokoro-82M); runtime kokoro-onnx MIT (https://github.com/thewh1teagle/kokoro-onnx) |
| `kokoro:blend af_nicole 0.7 + ef_dora 0.3` | Spanish (RV1909) | Kokoro style-vector blend, 70% `af_nicole` + 30% `ef_dora`, Spanish pipeline, speed 0.85 (owner: "Yes approved for 70/30 blend") | Same as above (a built-in Kokoro feature on Apache-2.0 weights) |

The player says plainly that the voice is made with AI (A10, built with the player in Phase 4).
