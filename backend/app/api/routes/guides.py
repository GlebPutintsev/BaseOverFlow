from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status, Depends
from app.api.deps import GuideServiceDep
from app.models.guide import GuideType, PublishStatus
from app.models.user import User, UserRole
from app.schemas import GuideCreate, GuideUpdate, GuideResponse, GuideList
from app.api.routes.auth import get_current_user
from app.services.moderation_service import ModerationService
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("", response_model=list[GuideList])
async def list_guides(
    guide_service: GuideServiceDep,
    service_id: Optional[int] = None,
    guide_type: Optional[GuideType] = None,
    tag_ids: Optional[str] = Query(None, description="Comma-separated tag IDs"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    tag_id_list = [int(t) for t in tag_ids.split(",")] if tag_ids else None
    guides, _ = await guide_service.get_all(
        service_id=service_id,
        guide_type=guide_type,
        tag_ids=tag_id_list,
        limit=limit,
        offset=offset,
    )
    return guides


@router.get("/pinned", response_model=list[GuideList])
async def get_pinned_guides(
    guide_service: GuideServiceDep,
    service_id: Optional[int] = None,
):
    return await guide_service.get_pinned(service_id)


@router.get("/recent", response_model=list[GuideResponse])
async def get_recent_guides(
    guide_service: GuideServiceDep,
    limit: int = Query(10, ge=1, le=50),
):
    """Получить последние гайды."""
    return await guide_service.get_recent(limit)


@router.get("/top-rated", response_model=list[GuideResponse])
async def get_top_rated_guides(
    guide_service: GuideServiceDep,
    limit: int = Query(10, ge=1, le=50),
):
    return await guide_service.get_top_rated(limit)


@router.get("/slug/{slug}", response_model=GuideResponse)
async def get_guide_by_slug(slug: str, guide_service: GuideServiceDep):
    result = await guide_service.get_by_slug(slug)
    if not result:
        raise HTTPException(status_code=404, detail="Guide not found")
    await guide_service.increment_views(result.id)
    return await guide_service.get_by_id(result.id)


@router.get("/{guide_id}", response_model=GuideResponse)
async def get_guide(guide_id: int, guide_service: GuideServiceDep):
    result = await guide_service.get_by_id(guide_id)
    if not result:
        raise HTTPException(status_code=404, detail="Guide not found")
    await guide_service.increment_views(guide_id)
    return await guide_service.get_by_id(guide_id)


@router.post("", response_model=GuideResponse, status_code=status.HTTP_201_CREATED)
async def create_guide(
    data: GuideCreate,
    guide_service: GuideServiceDep,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in [UserRole.ADMIN, UserRole.REVIEWER]:
        publish_status = PublishStatus.PUBLISHED
    else:
        publish_status = PublishStatus.PENDING
    
    guide = await guide_service.create(
        data,
        author_id=current_user.id,
        author_name=current_user.display_name or current_user.username,
        publish_status=publish_status,
    )
    
    if publish_status == PublishStatus.PENDING:
        moderation_service = ModerationService(db)
        await moderation_service.notify_reviewers_new_item(
            item_type="гайд",
            item_title=guide.title,
            item_link=f"/guide/{guide.slug}",
        )
    
    return guide


@router.put("/{guide_id}", response_model=GuideResponse)
async def update_guide(
    guide_id: int,
    data: GuideUpdate,
    guide_service: GuideServiceDep,
    current_user: User = Depends(get_current_user),
):
    guide = await guide_service.get_by_id(guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    if guide.author_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this guide")
    
    result = await guide_service.update(guide_id, data)
    return result


@router.delete("/{guide_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_guide(
    guide_id: int,
    guide_service: GuideServiceDep,
    current_user: User = Depends(get_current_user),
):
    # Only admins and reviewers can delete
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Only admins and reviewers can delete guides")
    
    deleted = await guide_service.delete(guide_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Guide not found")

