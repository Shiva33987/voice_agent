import re

def telugu_time_tts_filter(text: str) -> str:
    if not text:
        return text
    # Check if text contains Telugu characters
    if not re.search(r'[\u0c00-\u0c7f]', text):
        return text

    # 1. Replace Hindi words that might have slipped into Telugu text
    text = re.sub(r'(\d+)\s*(?:baje|బజే|बजे)', r'\1 గంటలకు', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(?:subah|सुबह)\b', 'ఉదయం', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(?:dopahar|दोपहर)\b', 'మధ్యాహ్నం', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(?:shaam|शाम)\b', 'సాయంత్రం', text, flags=re.IGNORECASE)

    # 2. Convert time formats like 9:00 or 4:30 or 14:00 into Telugu format
    def format_time_telugu(match):
        h = int(match.group(1))
        m = int(match.group(2))
        
        # Determine 12-hour display
        if h == 0:
            dh = 12
        elif h > 12:
            dh = h - 12
        else:
            dh = h

        # If already followed by గంట or గంటలకు, don't repeat
        rest = match.string[match.end():match.end()+15]
        suffix = "" if "గంట" in rest else " గంటలకు"

        if m == 0:
            return f"{dh}{suffix}"
        elif m == 30:
            return f"{dh}:30{suffix}"
        else:
            return f"{dh}:{m:02d}{suffix}"

    # Match time like 9:00 or 09:00 or 16:30
    text = re.sub(r'\b(\d{1,2}):(\d{2})\b', format_time_telugu, text)
    return text

# Test cases:
test1 = "నవంబర్ 2వ తేదీన orthopedic doctor కి ఉదయం 9:00 నుండి సాయంత్రం 4:30 వరకు slots అందుబాటులో ఉన్నాయి. మీకు ఏ టైమ్ వీలవుతుంది?"
test2 = "సరే, నెక్స్ట్ slot కి వెళ్దాం. 9:30 టైమ్ బుక్ చేయమంటారా? లేక ఇంకేదైనా టైమ్ కావాలా?"
test3 = "రేపు 10 baje కి రండి."
test4 = "English text 9:00 AM should stay untouched."

print("Test 1:")
print("Original:", test1)
print("Filtered:", telugu_time_tts_filter(test1))
print()
print("Test 2:")
print("Original:", test2)
print("Filtered:", telugu_time_tts_filter(test2))
print()
print("Test 3:")
print("Original:", test3)
print("Filtered:", telugu_time_tts_filter(test3))
print()
print("Test 4:")
print("Original:", test4)
print("Filtered:", telugu_time_tts_filter(test4))

