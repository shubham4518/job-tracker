from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, engine, get_db
from .security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------- auth ----------

@app.post("/api/auth/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.scalar(select(models.User).where(models.User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = models.User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.email == form.username.lower()))
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return schemas.Token(access_token=create_access_token(user.id))


@app.get("/api/auth/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user


# ---------- applications ----------

def _get_owned(db: Session, app_id: int, user: models.User) -> models.Application:
    obj = db.get(models.Application, app_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return obj


@app.get("/api/applications", response_model=list[schemas.ApplicationOut])
def list_applications(
    status_filter: schemas.Status | None = Query(None, alias="status"),
    q: str | None = Query(None, description="Search company or role"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    stmt = select(models.Application).where(models.Application.user_id == user.id)
    if status_filter:
        stmt = stmt.where(models.Application.status == status_filter)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            models.Application.company.ilike(like) | models.Application.role.ilike(like)
        )
    stmt = stmt.order_by(models.Application.created_at.desc())
    return db.scalars(stmt).all()


@app.post("/api/applications", response_model=schemas.ApplicationOut, status_code=201)
def create_application(
    payload: schemas.ApplicationCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    obj = models.Application(**payload.model_dump(), user_id=user.id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.patch("/api/applications/{app_id}", response_model=schemas.ApplicationOut)
def update_application(
    app_id: int,
    payload: schemas.ApplicationUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    obj = _get_owned(db, app_id, user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/applications/{app_id}", status_code=204)
def delete_application(
    app_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    obj = _get_owned(db, app_id, user)
    db.delete(obj)
    db.commit()
    return Response(status_code=204)


@app.get("/api/stats")
def stats(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    rows = db.execute(
        select(models.Application.status, func.count())
        .where(models.Application.user_id == user.id)
        .group_by(models.Application.status)
    ).all()
    by_status = {s: 0 for s in models.STATUSES}
    by_status.update({s: c for s, c in rows})
    total = sum(by_status.values())
    applied_or_beyond = total - by_status["wishlist"]
    progressed = by_status["interview"] + by_status["offer"]
    due = db.scalar(
        select(func.count())
        .select_from(models.Application)
        .where(
            models.Application.user_id == user.id,
            models.Application.follow_up.is_not(None),
            models.Application.follow_up <= date.today(),
            models.Application.status.in_(["applied", "interview"]),
        )
    )
    return {
        "total": total,
        "by_status": by_status,
        "response_rate": round(progressed / applied_or_beyond * 100, 1) if applied_or_beyond else 0.0,
        "follow_ups_due": due or 0,
    }
