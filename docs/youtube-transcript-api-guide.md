# YouTube Transcript API Guide

This guide documents how to use the `youtube-transcript-api` Python package to fetch transcripts from YouTube videos.

## Installation

### Issue: Externally Managed Environment

On macOS (and some Linux systems), Python is externally managed, preventing system-wide package installation. You'll encounter this error:

```
error: externally-managed-environment
```

### Solution: Use a Virtual Environment

```bash
# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# Install the package
pip install youtube-transcript-api
```

## Basic Usage

### 1. Import the Package

```python
import youtube_transcript_api
```

### 2. Extract Video ID from YouTube URL

For a URL like `https://www.youtube.com/watch?v=4nthc76rSl8`, the video ID is `4nthc76rSl8`.

```python
video_id = '4nthc76rSl8'
```

### 3. Fetch the Transcript

**Important API Notes:**
- The API uses an **instance-based** approach, not static methods
- Use the `list()` method to get available transcripts
- Use the `fetch()` method on a transcript object to get the actual data

```python
# Create an API instance
api = youtube_transcript_api.YouTubeTranscriptApi()

# List all available transcripts for the video
transcript_list = api.list(video_id)

# Iterate through available transcripts and fetch the first available one
transcript = None
for t in transcript_list:
    try:
        transcript = t.fetch()
        print(f"Found transcript: {t.language} - {t.language_code}")
        break
    except:
        continue

if not transcript:
    raise Exception("No transcript available for this video")
```

### 4. Access Transcript Data

Transcripts are returned as a collection of `FetchedTranscriptSnippet` objects with the following properties:

- `snippet.text` - The transcript text
- `snippet.start` - Start time in seconds (float)
- `snippet.duration` - Duration of the snippet in seconds (float)

```python
for snippet in transcript:
    text = snippet.text
    start_time = snippet.start

    # Convert seconds to MM:SS format
    minutes = int(start_time // 60)
    seconds = int(start_time % 60)
    timestamp = f"{minutes:02d}:{seconds:02d}"

    print(f"[{timestamp}] {text}")
```

## Complete Example Script

```python
#!/usr/bin/env python3
import youtube_transcript_api

# Video ID from URL: https://www.youtube.com/watch?v=VIDEO_ID
video_id = 'YOUR_VIDEO_ID_HERE'

try:
    # Create API instance and list available transcripts
    api = youtube_transcript_api.YouTubeTranscriptApi()
    transcript_list = api.list(video_id)

    # Get the first available transcript
    transcript = None
    for t in transcript_list:
        try:
            transcript = t.fetch()
            print(f"Found transcript: {t.language} - {t.language_code}")
            break
        except:
            continue

    if not transcript:
        raise Exception("No transcript available for this video")

    # Format as markdown
    markdown_content = f"# YouTube Video Transcript\n\n"
    markdown_content += f"**Video ID:** {video_id}\n"
    markdown_content += f"**URL:** https://www.youtube.com/watch?v={video_id}\n\n"
    markdown_content += "---\n\n"

    # Add transcript entries with timestamps
    for snippet in transcript:
        text = snippet.text
        start_time = snippet.start

        # Convert seconds to MM:SS format
        minutes = int(start_time // 60)
        seconds = int(start_time % 60)
        timestamp = f"{minutes:02d}:{seconds:02d}"

        markdown_content += f"**[{timestamp}]** {text}\n\n"

    # Save to file
    with open('transcript.md', 'w', encoding='utf-8') as f:
        f.write(markdown_content)

    print("Transcript saved successfully to transcript.md")
    print(f"Total entries: {len(transcript)}")

except Exception as e:
    print(f"Error fetching transcript: {e}")
```

## Common Pitfalls

### ❌ Incorrect: Using as a class method
```python
# This will NOT work
transcript = YouTubeTranscriptApi.get_transcript(video_id)
```

### ❌ Incorrect: Accessing snippet data as dictionary
```python
# This will NOT work
text = entry['text']
```

### ✅ Correct: Using instance method and object properties
```python
# This WILL work
api = youtube_transcript_api.YouTubeTranscriptApi()
transcript_list = api.list(video_id)
transcript = transcript_list[0].fetch()  # or iterate as shown above

for snippet in transcript:
    text = snippet.text
    start_time = snippet.start
```

## Available Transcript Languages

The API will return all available transcripts for a video, which may include:
- Auto-generated transcripts (e.g., "English (auto-generated)")
- Manual/human-created transcripts
- Translated transcripts in various languages

You can filter for specific languages:

```python
# Get English transcript specifically
for t in transcript_list:
    if t.language_code == 'en':
        transcript = t.fetch()
        break
```

## Error Handling

Common exceptions from the package:
- `NoTranscriptFound` - Video has no transcripts available
- `VideoUnavailable` - Video doesn't exist or is private
- `TranscriptsDisabled` - Transcripts are disabled for the video

```python
try:
    transcript = t.fetch()
except youtube_transcript_api.NoTranscriptFound:
    print("No transcript found for this video")
except youtube_transcript_api.VideoUnavailable:
    print("Video is unavailable")
```

## Running the Script

```bash
# Activate virtual environment
source .venv/bin/activate

# Run the script
python3 fetch_transcript.py

# Deactivate when done
deactivate
```

## Resources

- **GitHub Repository:** https://github.com/jdepoix/youtube-transcript-api
- **PyPI Package:** https://pypi.org/project/youtube-transcript-api/

## Notes for Claude Code

When using this package in future sessions:
1. Always create a virtual environment first
2. Use the instance-based API pattern (`api.list()` then `fetch()`)
3. Access transcript data using object properties (`.text`, `.start`), not dictionary keys
4. Handle multiple available transcripts by iterating through the list
5. The returned transcript is iterable and contains `FetchedTranscriptSnippet` objects
