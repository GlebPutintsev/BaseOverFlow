from fastapi import APIRouter, HTTPException, status
from app.api.deps import TagServiceDep
from app.schemas import TagCreate, TagResponse

router = APIRouter()


@router.get("", response_model=list[TagResponse])
async def list_tags(tag_service: TagServiceDep):
    return await tag_service.get_all()


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(tag_id: int, tag_service: TagServiceDep):
    result = await tag_service.get_by_id(tag_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tag not found")
    return result


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(data: TagCreate, tag_service: TagServiceDep):
    existing = await tag_service.get_by_name(data.name)
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    return await tag_service.create(data)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: int, tag_service: TagServiceDep):
    deleted = await tag_service.delete(tag_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tag not found")

