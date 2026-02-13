from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.vote import VoteType, TargetType
from app.services.vote_service import VoteService
from app.api.routes.auth import get_current_user, get_current_user_optional

router = APIRouter()


class VoteRequest(BaseModel):
    vote_type: VoteType  


class VoteResponse(BaseModel):
    score: int
    user_vote: str | None  


async def get_vote_service(db: AsyncSession = Depends(get_db)) -> VoteService:
    return VoteService(db)


@router.post("/incidents/{incident_id}/vote", response_model=VoteResponse)
async def vote_incident(
    incident_id: int,
    data: VoteRequest,
    user: User = Depends(get_current_user),
    vote_service: VoteService = Depends(get_vote_service),
):
    try:
        result = await vote_service.vote(
            user=user,
            target_type=TargetType.INCIDENT,
            target_id=incident_id,
            vote_type=data.vote_type,
        )
        return VoteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/guides/{guide_id}/vote", response_model=VoteResponse)
async def vote_guide(
    guide_id: int,
    data: VoteRequest,
    user: User = Depends(get_current_user),
    vote_service: VoteService = Depends(get_vote_service),
):
    try:
        result = await vote_service.vote(
            user=user,
            target_type=TargetType.GUIDE,
            target_id=guide_id,
            vote_type=data.vote_type,
        )
        return VoteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/incidents/{incident_id}/votes")
async def get_incident_votes(
    incident_id: int,
    user: User | None = Depends(get_current_user_optional),
    vote_service: VoteService = Depends(get_vote_service),
):
    result = await vote_service.get_item_votes(TargetType.INCIDENT, incident_id)
    
    user_vote = None
    if user:
        vote = await vote_service.get_user_vote(user.id, TargetType.INCIDENT, incident_id)
        if vote:
            user_vote = vote.vote_type.value
    
    return {**result, "user_vote": user_vote}


@router.get("/guides/{guide_id}/votes")
async def get_guide_votes(
    guide_id: int,
    user: User | None = Depends(get_current_user_optional),
    vote_service: VoteService = Depends(get_vote_service),
):
    result = await vote_service.get_item_votes(TargetType.GUIDE, guide_id)
    
    user_vote = None
    if user:
        vote = await vote_service.get_user_vote(user.id, TargetType.GUIDE, guide_id)
        if vote:
            user_vote = vote.vote_type.value
    
    return {**result, "user_vote": user_vote}
