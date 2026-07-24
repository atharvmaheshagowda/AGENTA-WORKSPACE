from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# DB Representation Schemas
class TaskBase(BaseModel):
    title: str
    description: str
    estimated_minutes: int
    parent_id: Optional[int] = None
    eisenhower_quadrant: Optional[str] = None
    blocked_by_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class MicroStepBase(BaseModel):
    title: str
    resource_links: Optional[str] = None

class MicroStepCreate(MicroStepBase):
    pass

class MicroStep(MicroStepBase):
    id: int
    task_id: int
    is_completed: bool

    class Config:
        from_attributes = True

class Task(TaskBase):
    id: int
    is_completed: bool
    created_at: datetime
    completed_at: Optional[datetime] = None
    subtasks: List['Task'] = []
    microsteps: List[MicroStep] = []

    class Config:
        from_attributes = True

class MeetingNoteBase(BaseModel):
    raw_transcript: str

class MeetingNote(MeetingNoteBase):
    id: int
    ai_summary: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# API Request Schemas
class GoalBreakdownRequest(BaseModel):
    goal: str

class TranscriptSummarizeRequest(BaseModel):
    transcript: str

class AssistantChatRequest(BaseModel):
    message: str
    context_tasks: List[Task] = []

class AssistantCommandRequest(BaseModel):
    command: str

# LLM Structured Output Schemas (for google-genai)
class TaskItemLLM(BaseModel):
    title: str = Field(description="A concise title for the task")
    description: str = Field(description="A detailed description of how to complete this task")
    estimated_minutes: int = Field(description="Estimated time to complete the task in minutes")

class TaskBreakdownResponseLLM(BaseModel):
    tasks: list[TaskItemLLM] = Field(description="List of 3-5 tasks that break down the goal")

class MicroStepItemLLM(BaseModel):
    title: str = Field(description="A highly actionable micro-step under 10 words")
    resource_links: List[str] = Field(description="List of 1-3 Google Search query URLs (e.g., 'https://www.google.com/search?q=your+query+here') relevant to completing this step. You must ONLY generate Google Search URLs to avoid dead links.", default_factory=list)

class PomodoroBreakdownLLM(BaseModel):
    micro_steps: list[MicroStepItemLLM] = Field(description="List of 3-5 micro steps to complete the task")

class ActionItemLLM(BaseModel):
    title: str = Field(description="Title of the action item")
    description: str = Field(description="Details of the action item")
    estimated_minutes: int = Field(description="Estimated time in minutes, default to 15 if unsure")

class MeetingSummaryLLM(BaseModel):
    summary: str = Field(description="A short executive summary of the meeting")
    action_items: list[ActionItemLLM] = Field(description="Extracted action items from the meeting")

class TaskQuadrant(BaseModel):
    task_id: int
    quadrant: str

class UserProfileSchema(BaseModel):
    id: int
    xp: int
    level: int
    
    class Config:
        from_attributes = True

class ScheduleItemLLM(BaseModel):
    task_id: int = Field(description="The ID of the task")
    title: str = Field(description="The title of the task")
    start_time: str = Field(description="Start time (e.g. '09:00 AM')")
    end_time: str = Field(description="End time (e.g. '09:45 AM')")

class DailyScheduleLLM(BaseModel):
    schedule: List[ScheduleItemLLM] = Field(description="List of scheduled tasks for the day")

class EisenhowerSortLLM(BaseModel):
    sortings: list[TaskQuadrant]

Task.model_rebuild()
