from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict

Status = Literal["wishlist", "applied", "interview", "offer", "rejected"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ApplicationBase(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=200)
    status: Status = "wishlist"
    link: str | None = None
    notes: str | None = None
    follow_up: date | None = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    company: str | None = None
    role: str | None = None
    status: Status | None = None
    link: str | None = None
    notes: str | None = None
    follow_up: date | None = None


class ApplicationOut(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
