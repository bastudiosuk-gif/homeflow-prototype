"""Add narration-synchronised camera moves and steady highlights to live footage.

The narration is unchanged: this is a visual revision, not a claim of human audio.
All rectangles are measured against the reviewed 1920x1080 film frames.
"""
import json
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'.codex-tmp'/'homeflow-story'
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
FONT='C\\:/Windows/Fonts/segoeui.ttf'
BOLD='C\\:/Windows/Fonts/seguisb.ttf'

# Start times follow the measured spoken word boundaries in speech.json.
# Each camera holds across a complete thought, while highlights follow its words.
CAMERAS=[
 (14,24.5,1080,500,1.35), (26.21,38.6,1080,550,1.42),
 (41.96,46.8,1080,510,1.45), (52.94,60,1090,420,1.33),
 (61.9,66.9,870,800,1.45), (70.81,81.05,565,470,1.4),
 (81.88,90.85,565,470,1.5), (95.55,97.55,1290,600,1.4),
 (97.64,102.2,630,695,1.75), (103.42,112.05,1280,420,1.35),
 (113.04,115.85,752,850,1.6), (117.8,123,752,440,1.55),
 (123.54,126.85,945,746,1.75), (130.12,136.25,1080,550,1.42),
]
HIGHLIGHTS=[
 ('Overview',12.96,13.8,178,141,180,35),
 ('18 expected',14,17.8,452,389,165,130),
 ('6 ready',18.06,19.6,1110,389,270,130),
 ('workload',20.21,24.3,438,362,1288,410),
 ('Margaret / bed 12',26.21,27.8,499,529,106,47),
 ('14:00',27.96,29.5,624,532,80,45),
 ('Amber',29.81,30.8,771,532,82,39),
 ('medicine barrier',30.95,33.4,878,531,181,45),
 ('12:30 / Pharmacy',33.90,36.7,1081,532,96,43),
 ('expected discharge',37.26,38.65,624,532,80,45),
 ('Journey',39.52,41.4,178,248,180,45),
 ('acknowledge request',41.96,44.45,462,450,557,67),
 ('collection dependency',44.69,46.8,463,522,530,26),
 ('deadline and owner',52.94,56.35,524,381,615,87),
 ('overdue detection',56.9,60.15,467,182,922,90),
 ('Escalation',60.86,61.8,178,418,183,43),
 ('escalate to Pharmacy',62.35,64.0,465,862,191,49),
 ('escalated status',64.28,66.9,468,918,385,60),
 ('Pharmacy workspace',69.05,70.5,374,39,191,29),
 ('pharmacy acknowledgement',71.4875,73.05,278,361,430,45),
 ('preparation',74.625,77.3,278,445,445,54),
 ('approved prescribing systems',77.72,80.95,230,158,1252,26),
 ('ready medicines',82.0,84.65,278,445,445,54),
 ('delivered to ward',85.0125,90.8,278,445,445,54),
 ('Family',92.28,95.1,178,363,178,43),
 ('alert family',96.06,97.55,1538,572,169,58),
 ('likely time / delay',97.64,102.2,495,606,280,172),
 ('family response',103.425,105.1,867,810,371,64),
 ('confirmed collection',105.21,112.0,865,324,839,183),
 ('diabetes plan change',113.04,115.85,473,810,567,123),
 ('Handover',116.47,117.6,178,307,184,44),
 ('Community Diabetes Team',118.35,119.95,474,260,565,50),
 ('verified changes',120.72,121.7,475,461,562,109),
 ('follow-up request',121.91,123.0,475,628,565,64),
 ('receiving-team acknowledgement',123.5375,126.85,856,708,198,56),
 ('medicines / family ready',130.29,133.4,875,529,489,45),
 ('Margaret is Green',135.04,136.25,772,529,83,42),
]

def smooth(u):
    return f'(({u})*({u})*(3-2*({u})))'

def envelope(a,b):
    enter=f'min(1,max(0,(on/30-{a})/0.55))'
    leave=f'min(1,max(0,({b}-on/30)/0.55))'
    return f'({smooth(enter)}*{smooth(leave)})'

z='1'
cx='960'
cy='540'
for a,b,x,y,zoom in CAMERAS:
    env=envelope(a,b)
    z+=f'+({zoom-1})*{env}'
    cx+=f'+({x-960})*{env}'
    cy+=f'+({y-540})*{env}'

filters=[]
for label,a,b,x,y,w,h in HIGHLIGHTS:
    for spread,thickness,alpha in [(9,9,0.08),(5,5,0.16),(0,3,0.95)]:
        filters.append(f"drawbox=x={x-spread}:y={y-spread}:w={w+spread*2}:h={h+spread*2}:color=0x18bbeb@{alpha}:t={thickness}:enable='between(t,{a},{b})'")
    filters.append(f"drawbox=x={x}:y={y}:w={w}:h={h}:color=0x18bbeb@0.035:t=fill:enable='between(t,{a},{b})'")
filters += [
 'scale=3840:2160:flags=lanczos',
 f"zoompan=z='{z}':x='max(0,min(iw-iw/zoom,2*({cx})-iw/zoom/2))':y='max(0,min(ih-ih/zoom,2*({cy})-ih/zoom/2))':d=1:s=1920x1080:fps=30",
 "drawbox=x=0:y=1001:w=1920:h=79:color=0x052f43:t=fill:enable='between(t,11.75,136.575)'",
 f"drawtext=fontfile='{FONT}':text='Margaret’s journey home':fontsize=22:fontcolor=0xb9d5df:x=830:y=1027:enable='between(t,11.75,136.575)'",
 f"drawtext=fontfile='{FONT}':text='Prototype / Demo Data Only':fontsize=19:fontcolor=0x6ed9ce:x=1480:y=1030:enable='between(t,11.75,136.575)'",
]
audit=json.loads((WORK/'live-edit-audit.json').read_text())
for scene in audit['scenes'][1:-1]:
    filters.append(f"drawtext=fontfile='{BOLD}':text='{scene['label']}':fontsize=25:fontcolor=white:x=160:y=1025:enable='between(t,{scene['start']},{scene['end']})'")
filters.append('format=yuv420p')
filter_file=WORK/'narration-focus.ffscript'
filter_file.write_text(',\n'.join(filters),encoding='utf-8')
target=ROOT/'public'/'homeflow-focused-journey.mp4'
command=[FFMPEG,'-hide_banner','-loglevel','error','-y','-i',str(ROOT/'public'/'homeflow-live-journey.mp4'),
 '-filter_script:v',str(filter_file),'-c:v','libx264','-preset','fast','-crf','17','-threads','4',
 '-c:a','copy','-t','150','-movflags','+faststart',str(target)]
result=subprocess.run(command,capture_output=True,text=True)
if result.returncode:
    raise RuntimeError(result.stderr[-6000:])
(WORK/'narration-focus-audit.json').write_text(json.dumps({'camera_moves':CAMERAS,'spoken_highlights':HIGHLIGHTS,
 'voice_replaced':False,'highlight_style':'Steady light, no pulsing','duration':150},indent=2))
print(json.dumps({'video':str(target),'bytes':target.stat().st_size,'voice_replaced':False}),flush=True)
