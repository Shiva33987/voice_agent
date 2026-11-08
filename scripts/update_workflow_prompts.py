import json
import subprocess

# 1. Fetch current definition id 6 from postgres
res = subprocess.check_output([
    "docker", "exec", "dograh-main-postgres-1", "psql", "-U", "postgres", "-d", "postgres",
    "-t", "-A", "-c", "SELECT workflow_json FROM workflow_definitions WHERE id = 6;"
], text=True, encoding="utf-8")

data = json.loads(res.strip())

telugu_time_global_rule = """
   - If the caller speaks in **Telugu (తెలుగు)**, you MUST reply and continue strictly in **Telugu (తెలుగులో)**.
   - **MANDATORY TELUGU TIME PRONUNCIATION (తెలుగులో సమయం)**:
     When speaking in Telugu, NEVER use Hindi time words like 'baje', 'dopahar', 'subah', or 'shaam'!
     NEVER write raw digits with colons like '9:00' or '4:30' without Telugu time words!
     ALWAYS express time in pure Telugu words:
     * 'ఉదయం 9 గంటలకు' (for 9:00 AM)
     * 'ఉదయం 9న్నర గంటలకు' or 'ఉదయం 9:30 గంటలకు' (for 9:30 AM)
     * 'ఉదయం 10 గంటలకు' (for 10:00 AM)
     * 'ఉదయం 11:30 గంటలకు' or 'ఉదయం 11న్నర గంటలకు' (for 11:30 AM)
     * 'మధ్యాహ్నం 1 గంటకు' (for 1:00 PM)
     * 'మధ్యాహ్నం 2 గంటలకు' (for 2:00 PM)
     * 'సాయంత్రం 4:30 గంటలకు' or 'సాయంత్రం 4న్నర గంటలకు' (for 4:30 PM)
     * ALWAYS say 'గంటలకు' (gantalaku). NEVER say 'baje' (బజే)!"""

telugu_time_node2_rule = """
## LANGUAGE CONTINUITY RULE:
- You MUST speak in the language detected from the caller (Hindi, Telugu, Hinglish, English, etc.).
- When reporting available slots, asking for patient details, or confirming appointment IDs, speak naturally in the caller's language.
- **CRITICAL FOR TELUGU (తెలుగులో సమయం మరియు స్లాట్స్)**:
  When speaking in Telugu, NEVER use Hindi words like 'baje' or 'subah' and NEVER write raw colons like '9:00' or '4:30'!
  Always use pure Telugu time words:
  * Reporting slots in Telugu: 'నవంబర్ 2వ తేదీన ఉదయం 9 గంటల నుండి సాయంత్రం 4న్నర గంటల వరకు సమయం అందుబాటులో ఉంది. మీకు ఏ సమయం వీలవుతుంది?'
  * Asking for slot in Telugu: 'సరే, 9న్నర గంటలకు బుక్ చేయమంటారా? లేక ఇంకేదైనా సమయం కావాలా?'
  * Confirming booking in Telugu: 'మీ అపాయింట్‌మెంట్ రేపు ఉదయం 10 గంటలకు ఖరారైంది. మీ అపాయింట్‌మెంట్ ఐడీ APT-1001.'
  * Reporting slots in Hindi: 'जी, कल 31 अक्टूबर को सुबह 9 बजे और 10 बजे का समय उपलब्ध है। क्या मैं आपका अपॉइंटमेंट बुक कर दूँ?'
"""

telugu_time_node4_rule = """## LANGUAGE CONTINUITY RULE:
- Say your polite goodbye in the SAME language the caller used during the call.
- Telugu example: 'శ్రీకార హాస్పిటల్‌కు కాల్ చేసినందుకు ధన్యవాదాలు. మీకు శుభదినం కలగాలని కోరుకుంటున్నాము, నమస్కారం!'
- Hindi example: 'श्रीकारा अस्पताल में संपर्क करने के लिए धन्यवाद। आपका दिन शुभ हो, नमस्ते।'
- English example: 'Thank you for calling Srikara Hospital. Have a wonderful day, goodbye!'
"""

for node in data.get("nodes", []):
    nid = node.get("id")
    prompt = node.get("data", {}).get("prompt", "")
    
    if nid == "0":  # Global node
        # Replace Telugu policy line
        target = "- If the caller speaks in **Telugu (తెలుగు)**, you MUST reply and continue strictly in **Telugu (తెలుగులో)**."
        if target in prompt:
            prompt = prompt.replace(target, telugu_time_global_rule.strip())
            node["data"]["prompt"] = prompt
            print("Updated Node 0 prompt.")
            
    elif nid == "2":  # Main agenda node
        target_rule = "## LANGUAGE CONTINUITY RULE:\n- You MUST speak in the language detected from the caller (Hindi, Telugu, Hinglish, English, etc.).\n- When reporting available slots, asking for patient details, or confirming appointment IDs, speak naturally in the caller's language (e.g. in Hindi: 'जी, कल 31 अक्टूबर को सुबह 9 बजे और 10 बजे का समय उपलब्ध है। क्या मैं आपका अपॉइंटमेंट बुक कर दूँ?')."
        if target_rule in prompt:
            prompt = prompt.replace(target_rule, telugu_time_node2_rule.strip())
            node["data"]["prompt"] = prompt
            print("Updated Node 2 prompt.")
        else:
            # Append to prompt
            prompt += "\n\n" + telugu_time_node2_rule.strip()
            node["data"]["prompt"] = prompt
            print("Appended to Node 2 prompt.")
            
    elif nid == "4":  # End call node
        target_end = "## LANGUAGE CONTINUITY RULE:\n- Say your polite goodbye in the SAME language the caller used during the call.\n- Hindi example: 'श्रीकारा अस्पताल में संपर्क करने के लिए धन्यवाद। आपका दिन शुभ हो, नमस्ते。'\n- English example: 'Thank you for calling Srikara Hospital. Have a wonderful day, goodbye!'"
        # Check if Hindi example is present
        if "Hindi example" in prompt:
            lines = prompt.split("## LANGUAGE CONTINUITY RULE:")
            prompt = lines[0] + telugu_time_node4_rule.strip()
            node["data"]["prompt"] = prompt
            print("Updated Node 4 prompt.")

# Save updated json
new_json_str = json.dumps(data, ensure_ascii=False)
with open("scripts/updated_wf3.json", "w", encoding="utf-8") as f:
    f.write(new_json_str)

# Update postgres workflow_definitions and workflows
with open("scripts/updated_wf3.json", "r", encoding="utf-8") as f:
    escaped_json = f.read().replace("'", "''")

update_sql = f"""
UPDATE workflow_definitions SET workflow_json = '{escaped_json}'::json WHERE id = 6;
UPDATE workflows SET workflow_definition = '{escaped_json}'::json WHERE id = 3;
"""

with open("scripts/update_wf3.sql", "w", encoding="utf-8") as f:
    f.write(update_sql)

print("Generated update_wf3.sql successfully!")

