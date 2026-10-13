"""Replace the title cards without rerendering the existing focus choreography."""
import subprocess
import sys
from pathlib import Path
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
target = root / 'public/homeflow-focused-journey.mp4'
temporary = root / '.codex-tmp/homeflow-story/title-replacement.mp4'
font = 'C\\:/Windows/Fonts/segoeui.ttf'
graph = (
    '[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,'
    'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white,format=rgba,split=2[a][b];'
    '[a]fade=t=in:st=0:d=0.7,fade=t=out:st=11.30:d=0.45:alpha=1[intro];'
    '[b]fade=t=in:st=136.575:d=0.45:alpha=1[outro];'
    "[0:v][intro]overlay=0:0:enable='lt(t,11.75)'[first];"
    "[first][outro]overlay=0:0:enable='gte(t,136.575)',"
    "drawbox=x=1380:y=1020:w=510:h=45:color=0x052f43@0.75:t=fill:enable='lt(t,11.75)+gte(t,136.575)',"
    f"drawtext=fontfile='{font}':text='Prototype / Demonstration Data Only':fontsize=23:fontcolor=white:x=1396:y=1030:enable='lt(t,11.75)+gte(t,136.575)',"
    'fade=t=out:st=149:d=1,format=yuv420p[video]'
)
title_input=['-loop', '1', '-framerate', '30', '-i', str(root / 'public/homeflow-journey-title.png')]
if '--original' in sys.argv:
    title_input=['-i', str(root / 'public/homeflow-live-journey.mp4')]
    graph="[0:v][1:v]overlay=0:0:enable='lt(t,11.75)+gte(t,136.575)',format=yuv420p[video]"
subprocess.run([
    imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y',
    '-i', str(target), *title_input,
    '-filter_complex_threads', '1', '-filter_complex', graph,
    '-map', '[video]', '-map', '0:a', '-c:v', 'libx264', '-preset', 'fast',
    '-crf', '16', '-threads', '4', '-c:a', 'copy', '-t', '150',
    '-movflags', '+faststart', str(temporary)
], check=True)
temporary.replace(target)
print(f'Title cards replaced: {target.stat().st_size} bytes', flush=True)
