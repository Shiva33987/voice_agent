import re

TELUGU_NUMS = {
    1: "ఒకటి", 2: "రెండు", 3: "మూడు", 4: "నాలుగు", 5: "ఐదు",
    6: "ఆరు", 7: "ఏడు", 8: "ఎనిమిది", 9: "తొమ్మిది", 10: "పది",
    11: "పదకొండు", 12: "పన్నెండు"
}

def telugu_time_tts_filter(text: str) -> str:
    if not text:
        return text
    # Check if text contains Telugu script
    if not re.search(r'[\u0c00-\u0c7f]', text):
        return text

    # 1. Clean accidental Hindi words in Telugu text
    text = re.sub(r'(\d+)\s*(?:baje|బజే|बजे)', r'\1 గంటలకు', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(?:subah|सुबह)\b', 'ఉదయం', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(?:dopahar|दोपहर)\b', 'మధ్యాహ్నం', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(?:shaam|शाम)\b', 'సాయంత్రం', text, flags=re.IGNORECASE)

    # 2. Format times without colons
    def format_time_telugu(match):
        h = int(match.group(1))
        m = int(match.group(2))
        
        if h == 0:
            dh = 12
        elif h > 12:
            dh = h - 12
        else:
            dh = h

        rest = match.string[match.end():match.end()+15]
        already_has_ganta = "గంట" in rest

        if m == 0:
            return f"{dh} గంటలకు" if not already_has_ganta else str(dh)
        elif m == 30:
            return f"{dh}న్నర గంటలకు" if not already_has_ganta else f"{dh}న్నర"
        else:
            return f"{dh} గంటల {m} నిమిషాలకు" if not already_has_ganta else f"{dh} గంటల {m} నిమిషాలు"

    # Match time like 9:00, 09:00, 16:30, 4:30
    text = re.sub(r'\b(\d{1,2}):(\d{2})\b', format_time_telugu, text)
    return text

test1 = "నవంబర్ 2వ తేదీన orthopedic doctor కి ఉదయం 9:00 నుండి సాయంత్రం 4:30 వరకు slots అందుబాటులో ఉన్నాయి. మీకు ఏ టైమ్ వీలవుతుంది?"
test2 = "సరే, నెక్స్ట్ slot కి వెళ్దాం. 9:30 టైమ్ బుక్ చేయమంటారా? లేక ఇంకేదైనా టైమ్ కావాలా?"

print("Test 1 Filtered:")
print(telugu_time_tts_filter(test1))
print("Test 2 Filtered:")
print(telugu_time_tts_filter(test2))

