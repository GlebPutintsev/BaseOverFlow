from fastapi import APIRouter, HTTPException, status
from app.api.deps import ServiceServiceDep
from app.schemas import ServiceCreate, ServiceUpdate, ServiceResponse, ServiceWithStats
from app.schemas.service import ServiceTree, ServiceWithDepth

router = APIRouter()


@router.get("", response_model=list[ServiceWithStats])
async def list_services(service: ServiceServiceDep):
    return await service.get_all_with_counts()


@router.get("/tree", response_model=list[ServiceTree])
async def get_services_tree(service: ServiceServiceDep):
    return await service.get_tree_with_counts()


@router.get("/flat", response_model=list[ServiceWithDepth])
async def get_services_flat_with_depth(service: ServiceServiceDep):
    return await service.get_flat_with_depth()


@router.get("/slug/{slug}", response_model=ServiceResponse)
async def get_service_by_slug(slug: str, service: ServiceServiceDep):
    result = await service.get_by_slug(slug)
    if not result:
        raise HTTPException(status_code=404, detail="Service not found")
    return result


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, service: ServiceServiceDep):
    result = await service.get_by_id(service_id)
    if not result:
        raise HTTPException(status_code=404, detail="Service not found")
    return result


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(data: ServiceCreate, service: ServiceServiceDep):
    return await service.create(data)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    data: ServiceUpdate,
    service: ServiceServiceDep,
):
    result = await service.update(service_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Service not found")
    return result


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(service_id: int, service: ServiceServiceDep):
    deleted = await service.delete(service_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Service not found")

