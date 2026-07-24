import os
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))
prompt = 'Break down the following big goal into 3 to 5 actionable steps:\nGoal: "Launch a new SaaS product called \'Agenta Pro\' including market research, building a landing page, setting up Stripe billing, and running a Face'

class TaskItemLLM(BaseModel):
    title: str = Field(description='A concise title for the task')
    description: str = Field(description='A detailed description of how to complete this task')
    estimated_minutes: int = Field(description='Estimated time to complete the task in minutes')

class TaskBreakdownResponseLLM(BaseModel):
    tasks: list[TaskItemLLM] = Field(description='List of 3-5 tasks that break down the goal')

try:
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type='application/json',
            response_schema=TaskBreakdownResponseLLM,
            temperature=0.2,
        ),
    )
    print('SUCCESS')
    print(response.text)
except Exception as e:
    print('ERROR')
    import traceback
    traceback.print_exc()
