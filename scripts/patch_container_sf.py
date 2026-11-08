with open("scripts/container_sf.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import
target_import = "from pipecat.utils.text.xml_function_tag_filter import XMLFunctionTagFilter"
new_import = "from pipecat.utils.text.base_text_filter import BaseTextFilter\nfrom pipecat.utils.text.xml_function_tag_filter import XMLFunctionTagFilter"
assert target_import in content, "target_import not found"
content = content.replace(target_import, new_import, 1)

# 2. Add TeluguTimeTextFilter class above create_tts_service
filter_class = '''
class TeluguTimeTextFilter(BaseTextFilter):
    """Normalizes time expressions and converts accidental Hindi time phrasing to Telugu."""

    async def filter(self, text: str) -> str:
        if not text or not re.search(r'[\\u0c00-\\u0c7f]', text):
            return text

        # 1. Clean accidental Hindi time words in Telugu text
        text = re.sub(r'(\\d+)\\s*(?:baje|బజే|बजे)', r'\\1 గంటలకు', text, flags=re.IGNORECASE)
        text = re.sub(r'\\b(?:subah|सुबह)\\b', 'ఉదయం', text, flags=re.IGNORECASE)
        text = re.sub(r'\\b(?:dopahar|दोपहर)\\b', 'మధ్యాహ్నం', text, flags=re.IGNORECASE)
        text = re.sub(r'\\b(?:shaam|शाम)\\b', 'సాయంత్రం', text, flags=re.IGNORECASE)

        # 2. Format digital times (e.g. 9:00, 4:30) into pure Telugu words so TTS never says Hindi "baje"
        def format_time_telugu(match):
            h = int(match.group(1))
            m = int(match.group(2))
            if h == 0:
                dh = 12
            elif h > 12:
                dh = h - 12
            else:
                dh = h

            rest = match.string[match.end():match.end() + 15]
            already_has_ganta = "గంట" in rest

            if m == 0:
                return f"{dh} గంటలకు" if not already_has_ganta else str(dh)
            elif m == 30:
                return f"{dh}న్నర గంటలకు" if not already_has_ganta else f"{dh}న్నర"
            else:
                return f"{dh} గంటల {m} నిమిషాలకు" if not already_has_ganta else f"{dh} గంటల {m} నిమిషాలు"

        return re.sub(r'\\b(\\d{1,2}):(\\d{2})\\b', format_time_telugu, text)

'''
target_def = "@_report_service_factory_failures(ErrorSource.TTS, config_section=\"tts\")\ndef create_tts_service("
assert target_def in content, "target_def not found"
content = content.replace(target_def, filter_class + "\n" + target_def, 1)

# 3. Add filter to SarvamTTSService text_filters
sarvam_target = "return SarvamTTSService(\n            api_key=user_config.tts.api_key,\n            settings=SarvamTTSSettings(**settings_kwargs),\n            text_filters=[xml_function_tag_filter],"
sarvam_replacement = "return SarvamTTSService(\n            api_key=user_config.tts.api_key,\n            settings=SarvamTTSSettings(**settings_kwargs),\n            text_filters=[xml_function_tag_filter, TeluguTimeTextFilter()],"
assert sarvam_target in content, "sarvam_target not found"
content = content.replace(sarvam_target, sarvam_replacement, 1)

with open("scripts/container_sf_patched.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully created scripts/container_sf_patched.py!")

