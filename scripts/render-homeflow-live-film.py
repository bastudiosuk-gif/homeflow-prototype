"""Edit actual Snipping Tool footage against measured female speech boundaries.

Raw desktop footage stays in ignored local storage. Only reviewed HomeFlow
intervals are exported; no screenshot slideshow is used for application scenes.
"""
import json
import re
import subprocess
import sys
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.codex-tmp' / 'homeflow-story'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FONT = 'C\\:/Windows/Fonts/segoeui.ttf'
BOLD = 'C\\:/Windows/Fonts/seguisb.ttf'
RAW = WORK / 'live-take-01.mp4'
FADE = 0.45
CAPTIONS_ONLY = '--captions-only' in sys.argv

def run(args):
    p = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *args], capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr[-7000:])

def stamp(s):
    ms = round(s * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    sec, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{sec:02}.{ms:03}'

config = json.loads((WORK / 'edit-audit.json').read_text())
words = json.loads((WORK / 'speech.json').read_text())['words']
closing_word = next(w for w in words if w['start'] > 147 and 'homeflow' in w['text'].lower())
closing_start = closing_word['start']
cut = config['scenes'][12]['start']
audio_end = words[-1]['start'] + words[-1]['duration']
if not CAPTIONS_ONLY:
    run(['-i', str(WORK / 'narration.mp3'), '-filter_complex',
     f'[0:a]atrim=0:{cut},asetpts=PTS-STARTPTS[a];[0:a]atrim={closing_start}:{audio_end},asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1[out]',
     '-map', '[out]', '-c:a', 'pcm_s16le', str(WORK / 'live-narration.wav')])

# Source timecodes are measured from the actual 30 fps Snipping Tool take.
# Short selects remove troubleshooting, overscrolls and long operational pauses.
selects = [None, [(66, 75)], [(76, 87)], [(88, 105), (121, 131)],
           [(132, 151)], [(185, 196), (256, 284.5), (284.5, 289)],
           [(290, 299.5), (299.5, 309)], [(336, 353)], [(353, 361)],
           [(363, 380), (405, 429), (430, 438)], [(448.4, 457)], [(469, 477)], None]
scenes = config['scenes'][:12] + [{'label': 'HomeFlow', 'start': cut, 'image': 'title'}]
duration = 150.0
clips = []
audit = []
for i, (scene, ranges) in enumerate(zip(scenes, selects)):
    start = scene['start']
    end = scenes[i+1]['start'] if i+1 < len(scenes) else duration
    length = end-start+(FADE if i+1 < len(scenes) else 0)
    target = WORK / f'live-scene-{i:02}.mp4'
    if CAPTIONS_ONLY:
        if not target.exists():
            raise RuntimeError('Render the film before updating captions.')
        clips.append(target)
        audit.append({'label':scene['label'],'start':start,'end':end,'source_intervals':ranges})
        continue
    if ranges is None:
        heading = 'One patient. One shared journey home.' if i == 0 else 'A clearer path home.'
        subtitle = 'Margaret’s fictional story through HomeFlow' if i == 0 else 'Less uncertainty. Better coordination. A prepared family.'
        graph = (
            '[1:v]scale=900:-2[logo];'
            '[0:v]drawbox=x=150:y=220:w=990:h=300:color=0xf6fafc:t=fill[base];'
            '[base][logo]overlay=x=195:y=220,'
            'drawbox=x=160:y=595:w=110:h=4:color=0x41cbbc:t=fill,'
            f"drawtext=fontfile='{BOLD}':text='{heading}':fontsize=58:fontcolor=white:x=160:y=650,"
            f"drawtext=fontfile='{FONT}':text='{subtitle}':fontsize=29:fontcolor=0xb9d5df:x=163:y=745,"
            f"drawtext=fontfile='{FONT}':text='Prototype / Demonstration Data Only':fontsize=22:fontcolor=0xb9d5df:x=163:y=988,"
            'fade=t=in:st=0:d=0.7,format=yuv420p[out]'
        )
        run(['-f','lavfi','-i','color=c=0x052f43:s=1920x1080:r=30',
             '-loop','1','-i',str(ROOT/'public'/'homeflow-logo.png'),'-filter_complex_threads','1',
             '-filter_complex',graph,'-map','[out]','-t',str(length),'-an','-c:v','libx264',
             '-preset','fast','-crf','18','-threads','4',str(target)])
    else:
        inputs = []
        graph = []
        total = sum(b-a for a,b in ranges)
        speech_weights = {5:[0.23,0.271,0.499],6:[0.3374,0.6626],9:[0.30,0.49,0.21]}
        weights = speech_weights.get(i, [(b-a)/total for a,b in ranges])
        for j,(a,b) in enumerate(ranges):
            inputs += ['-ss',str(a),'-t',str(b-a),'-i',str(RAW)]
            factor = length*weights[j]/(b-a)
            graph.append(f'[{j}:v]setpts={factor}*(PTS-STARTPTS),fps=30[v{j}]')
        chain = ''.join(f'[v{j}]' for j in range(len(ranges)))
        graph.append(f'{chain}concat=n={len(ranges)}:v=1:a=0,fps=30,'
                     'scale=1600:-2:flags=lanczos,pad=1920:1080:160:16:color=0x052f43,'
                     'drawbox=x=157:y=13:w=1606:h=988:color=0x54d0c5@0.35:t=1,'
                     f"drawtext=fontfile='{BOLD}':text='{scene['label']}':fontsize=25:fontcolor=white:x=160:y=1025,"
                     f"drawtext=fontfile='{FONT}':text='Margaret’s journey home':fontsize=22:fontcolor=0xb9d5df:x=840:y=1027,"
                     f"drawtext=fontfile='{FONT}':text='Prototype / Demo Data Only':fontsize=19:fontcolor=0x6ed9ce:x=1480:y=1030,"
                     'format=yuv420p[out]')
        run([*inputs,'-filter_complex_threads','1','-filter_complex',';'.join(graph),'-map','[out]',
             '-t',str(length),'-an','-c:v','libx264','-preset','fast','-crf','18','-threads','4',str(target)])
    clips.append(target)
    audit.append({'label':scene['label'],'start':start,'end':end,'source_intervals':ranges})
    print(f"Rendered {i+1}/{len(scenes)}: {scene['label']}",flush=True)

inputs = []
for clip in clips:
    inputs += ['-i',str(clip)]
graph = []
previous = '0:v'
for i in range(1,len(clips)):
    out=f'blend{i}'
    graph.append(f'[{previous}][{i}:v]xfade=transition=fade:duration={FADE}:offset={scenes[i]["start"]}[{out}]')
    previous=out
graph.append(f'[{previous}]fade=t=out:st=149:d=1,format=yuv420p[video]')
target=ROOT/'public'/'homeflow-live-journey.mp4'
if not CAPTIONS_ONLY:
    run([*inputs,'-i',str(WORK/'live-narration.wav'),'-filter_complex_threads','1',
     '-filter_complex',';'.join(graph),'-map','[video]','-map',f'{len(clips)}:a',
     '-af','apad,loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st=148.5:d=1.5',
     '-t','150','-c:v','libx264','-preset','fast','-crf','18','-threads','4',
     '-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(target)])
kept = [w for w in words if w['start'] < cut]
kept += [{**w,'start':cut+w['start']-closing_start} for w in words if w['start'] >= closing_start]
original=json.loads((ROOT/'scripts'/'homeflow-story.json').read_text())
# Restore punctuation from the authored script without changing speech timings.
spoken=' '.join(s['text'] for s in original['segments'][:12])+" HomeFlow's aim"+original['segments'][-1]['text'].split("HomeFlow's aim",1)[1]
canonical=lambda s: re.sub(r'[^a-z0-9]','',s.lower())
if ''.join(canonical(w['text']) for w in kept) != canonical(spoken):
    raise RuntimeError('Caption text no longer matches the recorded narration.')
endings={}
cursor=0
for token in spoken.split():
    cursor+=len(canonical(token))
    suffix=re.search(r'[.,;:!?]+$',token)
    if suffix:
        endings[cursor]=suffix.group()
cursor=0
for word in kept:
    cursor+=len(canonical(word['text']))
    word['text']+=endings.get(cursor,'')
captions=['WEBVTT','']
groups=[]
group=[]
for word in kept:
    group.append(word)
    if len(group)==8 or word['text'].endswith(('.','?','!')):
        groups.append(group)
        group=[]
if group:
    groups.append(group)
for i,group in enumerate(groups):
    captions += [str(i+1),f"{stamp(group[0]['start'])} --> {stamp(group[-1]['start']+group[-1]['duration'])}",
                 ' '.join(w['text'] for w in group),'']
(ROOT/'public'/'homeflow-live-journey.vtt').write_text('\n'.join(captions)+'\n',encoding='utf-8')
(WORK/'live-edit-audit.json').write_text(json.dumps({'duration':150,'fps':30,'width':1920,'height':1080,
    'source':'Actual Chrome footage recorded with Windows Snipping Tool','voice':'en-GB-SoniaNeural (synthetic)',
    'scenes':audit},indent=2))
print(json.dumps({'video':str(target),'bytes':target.stat().st_size}),flush=True)
