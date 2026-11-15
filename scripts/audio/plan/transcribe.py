import sys, json, subprocess
import numpy as np
def load(f):
    raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-f','s16le','-ac','1','-ar','16000','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,np.int16).astype(np.float32)/32768.0
from faster_whisper import WhisperModel
m = WhisperModel('small.en', device='cpu', compute_type='int8')
for f in sys.argv[1:]:
    segs, info = m.transcribe(load(f), word_timestamps=True, vad_filter=False, beam_size=3)
    words = [{'w': w.word.strip(), 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in s.words]
    json.dump(words, open(f.replace('raw/', 'tr_').replace('.mp3', '.json'), 'w'))
    print(f, info.duration, len(words))
    print(' HEAD:', ' '.join(f"{w['w']}[{w['s']}]" for w in words[:45]))
    print(' TAIL:', ' '.join(f"{w['w']}[{w['s']}-{w['e']}]" for w in words[-30:]))
