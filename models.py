from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    title = Column(String, index=True)
    description = Column(String)
    estimated_minutes = Column(Integer)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    eisenhower_quadrant = Column(String, nullable=True)
    blocked_by_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    
    microsteps = relationship("MicroStep", back_populates="task", cascade="all, delete-orphan")
    parent = relationship("Task", remote_side=[id], back_populates="subtasks", foreign_keys=[parent_id])
    subtasks = relationship("Task", back_populates="parent", cascade="all, delete-orphan", foreign_keys=[parent_id])

class MicroStep(Base):
    __tablename__ = "micro_steps"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    title = Column(String)
    is_completed = Column(Boolean, default=False)
    resource_links = Column(String, nullable=True) # JSON encoded string
    
    task = relationship("Task", back_populates="microsteps")

class MeetingNote(Base):
    __tablename__ = "meeting_notes"

    id = Column(Integer, primary_key=True, index=True)
    raw_transcript = Column(String)
    ai_summary = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserProfile(Base):
    __tablename__ = "user_profile"

    id = Column(Integer, primary_key=True, index=True)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
