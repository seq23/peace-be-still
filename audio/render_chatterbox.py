"""Chatterbox (MIT) zero-shot clone renderer for the Hush Harbor clone lane. Runs in the Chatterbox venv
(PBS_CHATTERBOX_PY, default ~/GitHub/how-we-know/.venv-tts/bin/python); hush_clone.py drives it.

stdin: {"device": "cpu"|"mps" (optional), "items": [{"ref": wav, "text": sentence, "out": wav, "seed": n}, ...]}
Renders every item whose `out` does not exist yet (so a stopped run resumes), grouped by reference so
each voice is conditioned once. Settings are the clone test's (21_clone_chatterbox.py): exaggeration
0.5, cfg_weight 0.4, temperature 0.7. Prints one JSON line per file, then {"done": n}.
"""
import json
import os
import sys
import time
import warnings

warnings.filterwarnings("ignore")
os.environ.setdefault("HF_HUB_OFFLINE", "1")


def main():
    job = json.load(sys.stdin)
    todo = [i for i in job["items"] if not os.path.exists(i["out"])]
    if not todo:
        print(json.dumps({"done": 0}), flush=True)
        return 0
    import numpy as np
    import soundfile as sf
    import torch
    from chatterbox.tts import ChatterboxTTS
    # CPU by default: the clone test measured it (12-27 Mac-minutes per spoken minute); MPS stalled
    # when the fill was also running (18 Nov 2026). PBS_CHATTERBOX_DEVICE=mps to try it.
    dev = job.get("device") or os.environ.get("PBS_CHATTERBOX_DEVICE", "cpu")
    m = ChatterboxTTS.from_pretrained(device=dev)
    done, ref = 0, None
    for it in sorted(todo, key=lambda i: i["ref"]):
        if it["ref"] != ref:
            m.prepare_conditionals(it["ref"], exaggeration=0.5)
            ref = it["ref"]
        torch.manual_seed(int(it.get("seed", 7)))
        t = time.time()
        y = m.generate(it["text"], exaggeration=0.5, cfg_weight=0.4, temperature=0.7).squeeze(0).cpu().numpy().astype(np.float32)
        tmp = it["out"] + ".tmp.wav"
        sf.write(tmp, y, m.sr)
        os.replace(tmp, it["out"])
        done += 1
        print(json.dumps({"out": it["out"], "seconds": round(len(y) / m.sr, 2), "work_s": round(time.time() - t, 1)}), flush=True)
    print(json.dumps({"done": done, "device": dev}), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
