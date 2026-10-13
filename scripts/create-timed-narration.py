"""Produce one narration clip per visual cue, avoiding cumulative timing drift."""
import asyncio
import json
import hashlib
import sys
from pathlib import Path
import edge_tts

async def main():
    manifest = Path(sys.argv[1])
    cues = json.loads(manifest.read_text(encoding="utf-8-sig"))
    output = manifest.parent
    for index, text in enumerate(cues):
        path = output / f"cue-{index + 1:02d}.mp3"
        signature = hashlib.sha256(text.encode()).hexdigest()
        marker = path.with_suffix('.sha256')
        if path.exists() and path.stat().st_size > 1000 and marker.exists() and marker.read_text() == signature:
            continue
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, "en-GB-RyanNeural", rate="+4%", pitch="-4Hz").save(str(path))
                marker.write_text(signature)
                break
            except Exception:
                if attempt == 3:
                    raise
                await asyncio.sleep(2 + attempt)
        print(f"Narration cue {index + 1}/{len(cues)} ready", flush=True)

asyncio.run(main())
