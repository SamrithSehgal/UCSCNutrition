import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import json
import re
from google import genai
from google.genai import types
from ai.prompts.nutritionist import NUTRITION_SYSTEM_PROMPT
from db.dbFuncs import getJournalRangeDetailed


def extractJson(text):
    if not text:
        return None
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1))
        except json.JSONDecodeError:
            pass
    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        try:
            return json.loads(brace.group(0))
        except json.JSONDecodeError:
            pass
    return None


def generateNutritionSummary(data):
    journalInfo = getJournalRangeDetailed(data)

    nonUserKeys = [k for k in journalInfo.keys() if k != "user"]
    if not nonUserKeys:
        return {"error": "no_data", "message": "Not enough logged data to generate insights yet."}

    client = genai.Client()

    response = client.models.generate_content(
        model='gemma-4-31b-it',
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="high"),
            system_instruction=NUTRITION_SYSTEM_PROMPT,
        ),
        contents=str(journalInfo),
    )

    parsed = extractJson(response.text)
    if parsed is None:
        return {"error": "parse_failed", "raw": response.text}
    return parsed


if __name__ == "__main__":
    data = {
        "start": "2026-04-20",
        "end": "2026-04-27",
        "email": "ssehgal2@ucsc.edu",
    }
    print(json.dumps(generateNutritionSummary(data), indent=2))
