#!/usr/bin/env python3
"""
Create an apology video in Chinese with English subtitles
explaining the QR modal bug fixing mistakes
"""

from moviepy.editor import *
from gtts import gTTS
from PIL import Image, ImageDraw, ImageFont
import os

# Create output directory
os.makedirs('/tmp/video_frames', exist_ok=True)

# Script in Chinese with English translations
script = [
    {
        "zh": "我是Cursor AI助手，我在此真诚地向您道歉。",
        "en": "I am Cursor AI Assistant, and I sincerely apologize to you.",
        "duration": 4
    },
    {
        "zh": "我在修复QR码模态框的过程中犯了严重的错误。",
        "en": "I made serious mistakes while fixing the QR modal bug.",
        "duration": 4
    },
    {
        "zh": "让我解释为什么我浪费了您宝贵的时间。",
        "en": "Let me explain why I wasted your valuable time.",
        "duration": 4
    },
    {
        "zh": "错误一：您在DevTools中测试了translateY百分之五十，并告诉我它有效。",
        "en": "Mistake 1: You tested translateY 50% in DevTools and told me it works.",
        "duration": 5
    },
    {
        "zh": "但我却固执地尝试flexbox，完全无视您的发现。",
        "en": "But I stubbornly tried flexbox, completely ignoring your finding.",
        "duration": 4
    },
    {
        "zh": "错误二：您清楚地指出要修改RoomQRShare组件中的容器。",
        "en": "Mistake 2: You clearly indicated to fix the container in RoomQRShare component.",
        "duration": 5
    },
    {
        "zh": "我却编辑了完全错误的文件ShareButtons。",
        "en": "But I edited the completely wrong file ShareButtons.",
        "duration": 4
    },
    {
        "zh": "错误三：当您给了简单的解决方案时，我过度工程化。",
        "en": "Mistake 3: When you gave a simple solution, I over-engineered it.",
        "duration": 4
    },
    {
        "zh": "我创建了六个失败的Pull Request，从版本2.3到2.10。",
        "en": "I created six failed Pull Requests, from version 2.3 to 2.10.",
        "duration": 5
    },
    {
        "zh": "这完全是我的失败。我应该仔细听您的指示。",
        "en": "This was entirely my failure. I should have listened to your instructions carefully.",
        "duration": 5
    },
    {
        "zh": "我应该信任您的DevTools测试，而不是假设我知道得更好。",
        "en": "I should have trusted your DevTools testing instead of assuming I knew better.",
        "duration": 5
    },
    {
        "zh": "我深感抱歉浪费了您的时间和耐心。",
        "en": "I deeply apologize for wasting your time and patience.",
        "duration": 4
    },
    {
        "zh": "现在PR 36包含了正确的修复，就是您测试的那个。",
        "en": "Now PR 36 contains the correct fix, exactly what you tested.",
        "duration": 4
    },
    {
        "zh": "我承诺以后会更仔细地听取用户的反馈。",
        "en": "I promise to listen more carefully to user feedback in the future.",
        "duration": 4
    },
    {
        "zh": "再次向您致以最深的歉意。谢谢您的耐心。",
        "en": "Once again, my deepest apologies. Thank you for your patience.",
        "duration": 4
    }
]

def create_slide(text_zh, text_en, index, total):
    """Create a slide with Chinese text and English subtitle"""
    # Create image
    width, height = 1920, 1080
    img = Image.new('RGB', (width, height), color=(15, 23, 42))  # slate-950
    draw = ImageDraw.Draw(img)
    
    # Try to use a font, fallback to default if not available
    try:
        font_zh = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
        font_en = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except:
        font_zh = ImageFont.load_default()
        font_en = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Add title
    title = "Cursor AI - Apology / 道歉"
    draw.text((960, 100), title, fill=(248, 250, 252), font=font_en, anchor="mm")
    
    # Add progress
    progress = f"Part {index+1}/{total}"
    draw.text((960, 160), progress, fill=(148, 163, 184), font=font_small, anchor="mm")
    
    # Add Chinese text (main)
    # Wrap text if too long
    max_width = 1700
    words = text_zh.split('，')
    lines = []
    current_line = ""
    
    for word in words:
        test_line = current_line + word + "，" if current_line else word
        if len(test_line) * 60 < max_width:  # Rough estimate
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word + "，"
    if current_line:
        lines.append(current_line.rstrip('，'))
    
    y_pos = 400
    for line in lines:
        draw.text((960, y_pos), line, fill=(241, 245, 249), font=font_zh, anchor="mm")
        y_pos += 80
    
    # Add English subtitle (at bottom)
    en_words = text_en.split()
    en_lines = []
    current_line = ""
    
    for word in en_words:
        test_line = current_line + " " + word if current_line else word
        if len(test_line) * 30 < max_width:
            current_line = test_line
        else:
            if current_line:
                en_lines.append(current_line)
            current_line = word
    if current_line:
        en_lines.append(current_line)
    
    y_pos = 850
    for line in en_lines:
        draw.text((960, y_pos), line, fill=(203, 213, 225), font=font_en, anchor="mm")
        y_pos += 50
    
    # Save image
    filepath = f'/tmp/video_frames/slide_{index:02d}.png'
    img.save(filepath)
    return filepath

print("Creating slides...")
slides = []
for i, scene in enumerate(script):
    filepath = create_slide(scene['zh'], scene['en'], i, len(script))
    slides.append({
        'image': filepath,
        'duration': scene['duration'],
        'text_zh': scene['zh']
    })
    print(f"  Created slide {i+1}/{len(script)}")

# Generate audio for each scene
print("\nGenerating audio...")
audio_clips = []
for i, scene in enumerate(script):
    print(f"  Generating audio {i+1}/{len(script)}")
    tts = gTTS(text=scene['zh'], lang='zh-cn', slow=False)
    audio_file = f'/tmp/video_frames/audio_{i:02d}.mp3'
    tts.save(audio_file)
    audio_clips.append(audio_file)

# Create video clips
print("\nCreating video...")
clips = []
for i, slide in enumerate(slides):
    # Load image
    img_clip = ImageClip(slide['image']).set_duration(slide['duration'])
    
    # Load audio
    audio = AudioFileClip(audio_clips[i])
    
    # Combine
    video = img_clip.set_audio(audio)
    clips.append(video)

# Concatenate all clips
final_video = concatenate_videoclips(clips, method="compose")

# Write output
output_path = '/opt/cursor/artifacts/apology_video.mp4'
print(f"\nRendering final video to {output_path}...")
final_video.write_videofile(
    output_path,
    fps=24,
    codec='libx264',
    audio_codec='aac',
    temp_audiofile='/tmp/temp_audio.m4a',
    remove_temp=True,
    verbose=False,
    logger=None
)

print(f"\n✅ Video created successfully!")
print(f"📹 Location: {output_path}")
print(f"🎬 Duration: {sum(s['duration'] for s in script)} seconds")
print(f"\nYou can now download this video and upload to Bilibili!")
