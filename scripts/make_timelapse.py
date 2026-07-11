#!/usr/bin/env python3
import os
import sys
import subprocess

def open_file_picker():
    # Try native Linux zenity file picker first
    try:
        cmd = [
            'zenity', '--file-selection', 
            '--title=Select Raw Drawing Video',
            '--file-filter=Video files (*.mp4 *.mov *.m4v *.avi *.mkv *.webm) | *.mp4 *.mov *.m4v *.avi *.mkv *.webm'
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
    except FileNotFoundError:
        pass
        
    # Fallback to terminal input if zenity is not installed or closed
    print("GUI File Picker not available. Please enter the path manually:")
    file_path = input("Raw Video Path: ").strip()
    if file_path.startswith(('"', "'")) and file_path.endswith(('"', "'")):
        file_path = file_path[1:-1]
    return file_path

def get_video_duration(video_path):
    try:
        cmd = [
            'ffprobe', '-v', 'error', 
            '-show_entries', 'format=duration', 
            '-of', 'default=noprint_wrappers=1:nokey=1', 
            video_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Error getting video duration: {e}")
        return None

def main():
    print("Opening video file picker...")
    input_path = open_file_picker()
    
    if not input_path or not os.path.exists(input_path):
        print("No valid file selected. Exiting.")
        sys.exit(0)
        
    print(f"Selected: {input_path}")
    
    # Suggest output path
    dir_name = os.path.dirname(input_path)
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(dir_name, f"{base_name}_timelapse.mp4")
    
    # Ask for target duration
    try:
        duration_input = input("Enter target timelapse duration in seconds (default: 20): ").strip()
        target_duration = float(duration_input) if duration_input else 20.0
    except ValueError:
        print("Invalid duration. Using 20.0s.")
        target_duration = 20.0
        
    # Get video duration
    duration = get_video_duration(input_path)
    if duration is None:
        print("Could not retrieve video duration. Defaulting speedup factor to 20x.")
        factor = 20.0
    else:
        factor = duration / target_duration
        print(f"Input video duration: {duration:.2f}s, Target: {target_duration}s, Speedup Factor: {factor:.2f}x")
        
    # Build ffmpeg command
    if factor <= 1.0:
        print("Video is already shorter than target. Copying video without speedup.")
        cmd = [
            'ffmpeg', '-y', '-i', input_path, 
            '-vf', "scale='min(1080,iw)':-2", 
            '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 
            '-profile:v', 'main', '-level:v', '4.0', 
            '-crf', '23', '-preset', 'medium', output_path
        ]
    else:
        cmd = [
            'ffmpeg', '-y', '-i', input_path, 
            '-vf', f"setpts=PTS/{factor},scale='min(1080,iw)':-2", 
            '-r', '30', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 
            '-profile:v', 'main', '-level:v', '4.0', 
            '-crf', '23', '-preset', 'medium', output_path
        ]
        
    print("\nRunning FFmpeg timelapse encoding...")
    try:
        subprocess.run(cmd, check=True)
        print(f"\nSuccess! Generated timelapse at:\n👉 {output_path}\n")
        
        # Display GUI success message box via Zenity
        try:
            subprocess.run(['zenity', '--info', f'--text=Timelapse video generated successfully!\n\nPath: {output_path}'], check=False)
        except FileNotFoundError:
            pass
            
    except subprocess.CalledProcessError as e:
        print(f"Error: FFmpeg execution failed. {e}")

if __name__ == '__main__':
    main()
