import sys
import re

# Patch workflow_client.py
with open("/app/api/db/workflow_client.py", "r") as f:
    client_code = f.read()

# Add delete to sqlalchemy imports if missing
if "from sqlalchemy import func, update" in client_code and "delete" not in client_code[:500]:
    client_code = client_code.replace(
        "from sqlalchemy import func, update",
        "from sqlalchemy import delete, func, update"
    )
elif "from sqlalchemy import" in client_code and "delete" not in client_code[:500]:
    client_code = client_code.replace(
        "from sqlalchemy import ",
        "from sqlalchemy import delete, "
    )

# Remove any old delete_workflow definitions (whether at module level or indented)
client_code = re.sub(r'\n(    )?async def delete_workflow[\s\S]*?return True', '', client_code)

method_code = '''
    async def delete_workflow(
        self,
        workflow_id: int,
        organization_id: int,
    ) -> bool:
        """Permanently delete a workflow and its definitions, runs, and associated data."""
        from sqlalchemy import delete, update
        from api.db.models import (
            CampaignModel,
            TelephonyPhoneNumberModel,
            WorkflowDefinitionModel,
            WorkflowRunModel,
            WorkflowModel,
        )

        async with self.async_session() as session:
            await ModelConnectionClient._lock_catalog(self, session, organization_id)
            query = select(WorkflowModel).where(
                WorkflowModel.id == workflow_id,
                WorkflowModel.organization_id == organization_id,
            )
            result = await session.execute(query)
            workflow = result.scalars().first()
            if not workflow:
                raise ValueError(f"Workflow with ID {workflow_id} not found")

            # 1. Clear circular reference
            workflow.released_definition_id = None
            await session.flush()

            # 2. Clear telephony numbers pointing to this workflow
            await session.execute(
                update(TelephonyPhoneNumberModel)
                .where(TelephonyPhoneNumberModel.inbound_workflow_id == workflow_id)
                .values(inbound_workflow_id=None)
            )

            # 3. Delete runs for this workflow
            await session.execute(
                delete(WorkflowRunModel).where(WorkflowRunModel.workflow_id == workflow_id)
            )

            # 4. Delete campaigns for this workflow
            await session.execute(
                delete(CampaignModel).where(CampaignModel.workflow_id == workflow_id)
            )

            # 5. Delete workflow definitions
            await session.execute(
                delete(WorkflowDefinitionModel).where(
                    WorkflowDefinitionModel.workflow_id == workflow_id
                )
            )

            # 6. Delete workflow
            await session.delete(workflow)
            await session.commit()
            return True
'''

client_code = client_code.rstrip() + "\n" + method_code
with open("/app/api/db/workflow_client.py", "w") as f:
    f.write(client_code)
print("Updated delete_workflow in workflow_client.py with proper 4-space method indentation!")

# Patch workflow.py
with open("/app/api/routes/workflow.py", "r") as f:
    route_code = f.read()

if '@router.delete("/{workflow_id}")' not in route_code:
    endpoint_code = '''

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    user: UserModel = Depends(get_user),
):
    """Permanently delete a workflow."""
    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")
    try:
        await db_client.delete_workflow(
            workflow_id=workflow_id,
            organization_id=user.selected_organization_id,
        )
        return {"success": True, "message": "Workflow deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting workflow {workflow_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''
    route_code += "\n" + endpoint_code
    with open("/app/api/routes/workflow.py", "w") as f:
        f.write(route_code)
    print("Patched routes/workflow.py successfully!")
else:
    print("routes/workflow.py already has delete route")

# Patch organization_usage.py
with open("/app/api/routes/organization_usage.py", "r") as f:
    usage_code = f.read()

if '@router.delete("/usage/runs")' not in usage_code and 'delete_usage_runs' not in usage_code:
    usage_delete_code = '''

class DeleteRunsRequest(BaseModel):
    run_ids: Optional[List[int]] = None
    delete_all: bool = False


@router.delete("/usage/runs")
@router.post("/usage/runs/delete")
async def delete_usage_runs(
    request: DeleteRunsRequest,
    user: UserModel = Depends(get_user),
):
    """Delete specific or all workflow runs (recordings) for the organization."""
    from sqlalchemy import delete, select
    from api.db.models import WorkflowModel, WorkflowRunModel

    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    async with db_client.async_session() as session:
        subquery = (
            select(WorkflowRunModel.id)
            .join(WorkflowModel, WorkflowRunModel.workflow_id == WorkflowModel.id)
            .where(WorkflowModel.organization_id == user.selected_organization_id)
        )
        if not request.delete_all and request.run_ids:
            subquery = subquery.where(WorkflowRunModel.id.in_(request.run_ids))
        elif not request.delete_all and not request.run_ids:
            return {"success": True, "deleted_count": 0}

        res = await session.execute(subquery)
        valid_ids = res.scalars().all()
        if not valid_ids:
            return {"success": True, "deleted_count": 0}

        await session.execute(
            delete(WorkflowRunModel).where(WorkflowRunModel.id.in_(valid_ids))
        )
        await session.commit()
        return {"success": True, "deleted_count": len(valid_ids)}


@router.delete("/usage/runs/{run_id}")
async def delete_single_run(
    run_id: int,
    user: UserModel = Depends(get_user),
):
    """Delete a single workflow run by ID."""
    from sqlalchemy import delete, select
    from api.db.models import WorkflowModel, WorkflowRunModel

    if not user.selected_organization_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    async with db_client.async_session() as session:
        query = (
            select(WorkflowRunModel.id)
            .join(WorkflowModel, WorkflowRunModel.workflow_id == WorkflowModel.id)
            .where(
                WorkflowModel.organization_id == user.selected_organization_id,
                WorkflowRunModel.id == run_id,
            )
        )
        res = await session.execute(query)
        target = res.scalars().first()
        if not target:
            raise HTTPException(status_code=404, detail="Run not found")

        await session.execute(
            delete(WorkflowRunModel).where(WorkflowRunModel.id == target)
        )
        await session.commit()
        return {"success": True, "deleted_count": 1}
'''
    usage_code += "\n" + usage_delete_code
    with open("/app/api/routes/organization_usage.py", "w") as f:
        f.write(usage_code)
    print("Patched routes/organization_usage.py with run deletion routes successfully!")
else:
    print("routes/organization_usage.py already has run deletion routes")

# Patch model_connection_client.py
with open("/app/api/db/model_connection_client.py", "r") as f:
    conn_client_code = f.read()

if "delete_provider_connection_permanently" not in conn_client_code:
    if "from sqlalchemy import select" in conn_client_code:
        conn_client_code = conn_client_code.replace(
            "from sqlalchemy import select",
            "from sqlalchemy import delete, select"
        )
    methods = '''
    async def delete_provider_connection_permanently(
        self, organization_id, connection_uuid
    ):
        from sqlalchemy import delete
        from api.db.models import ProviderConnectionModel
        uuid = str(connection_uuid)
        async with self.async_session() as session:
            await session.execute(
                delete(ProviderConnectionModel).where(
                    ProviderConnectionModel.organization_id == organization_id,
                    ProviderConnectionModel.uuid == uuid,
                )
            )
            await session.commit()

    async def delete_named_model_configuration_permanently(
        self, organization_id, configuration_uuid
    ):
        from sqlalchemy import delete
        from api.db.models import NamedModelConfigurationModel
        uuid = str(configuration_uuid)
        async with self.async_session() as session:
            await session.execute(
                delete(NamedModelConfigurationModel).where(
                    NamedModelConfigurationModel.organization_id == organization_id,
                    NamedModelConfigurationModel.uuid == uuid,
                )
            )
            await session.commit()
'''
    conn_client_code = conn_client_code.rstrip() + "\n" + methods
    with open("/app/api/db/model_connection_client.py", "w") as f:
        f.write(conn_client_code)
    print("Patched db/model_connection_client.py with permanent delete methods successfully!")
else:
    print("db/model_connection_client.py already has permanent delete methods")

# Patch model_connections.py
with open("/app/api/routes/model_connections.py", "r") as f:
    conn_routes_code = f.read()

if "delete_connection_permanently" not in conn_routes_code:
    # Replace archive_connection to support permanent flag + add /permanent endpoint
    old_archive_func = '''@router.delete(
    "/provider-connections/{connection_uuid}",
    status_code=204,
    operation_id="archive_provider_connection",
)
async def archive_connection(connection_uuid: str, user: UserModel = Auth):
    await _write(
        db_client.archive_provider_connection(
            user.selected_organization_id, connection_uuid
        )
    )
    return Response(status_code=204)'''

    new_archive_func = '''@router.delete(
    "/provider-connections/{connection_uuid}",
    status_code=204,
    operation_id="archive_provider_connection",
)
async def archive_connection(
    connection_uuid: str,
    permanent: bool = False,
    user: UserModel = Auth,
):
    if permanent:
        await _write(
            db_client.delete_provider_connection_permanently(
                user.selected_organization_id, connection_uuid
            )
        )
    else:
        await _write(
            db_client.archive_provider_connection(
                user.selected_organization_id, connection_uuid
            )
        )
    return Response(status_code=204)


@router.delete(
    "/provider-connections/{connection_uuid}/permanent",
    status_code=204,
)
async def delete_connection_permanently(
    connection_uuid: str,
    user: UserModel = Auth,
):
    await _write(
        db_client.delete_provider_connection_permanently(
            user.selected_organization_id, connection_uuid
        )
    )
    return Response(status_code=204)'''

    if old_archive_func in conn_routes_code:
        conn_routes_code = conn_routes_code.replace(old_archive_func, new_archive_func)

    # Replace archive_configuration to support permanent flag + add /permanent endpoint
    old_archive_config = '''@router.delete(
    "/model-configurations/{configuration_uuid}",
    status_code=204,
    operation_id="archive_named_model_configuration",
)
async def archive_configuration(configuration_uuid: str, user: UserModel = Auth):
    await _write(
        db_client.archive_named_model_configuration(
            user.selected_organization_id, configuration_uuid
        )
    )
    return Response(status_code=204)'''

    new_archive_config = '''@router.delete(
    "/model-configurations/{configuration_uuid}",
    status_code=204,
    operation_id="archive_named_model_configuration",
)
async def archive_configuration(
    configuration_uuid: str,
    permanent: bool = False,
    user: UserModel = Auth,
):
    if permanent:
        await _write(
            db_client.delete_named_model_configuration_permanently(
                user.selected_organization_id, configuration_uuid
            )
        )
    else:
        await _write(
            db_client.archive_named_model_configuration(
                user.selected_organization_id, configuration_uuid
            )
        )
    return Response(status_code=204)


@router.delete(
    "/model-configurations/{configuration_uuid}/permanent",
    status_code=204,
)
async def delete_configuration_permanently(
    configuration_uuid: str,
    user: UserModel = Auth,
):
    await _write(
        db_client.delete_named_model_configuration_permanently(
            user.selected_organization_id, configuration_uuid
        )
    )
    return Response(status_code=204)'''

    if old_archive_config in conn_routes_code:
        conn_routes_code = conn_routes_code.replace(old_archive_config, new_archive_config)

    with open("/app/api/routes/model_connections.py", "w") as f:
        f.write(conn_routes_code)
    print("Patched routes/model_connections.py with permanent delete endpoints successfully!")
else:
    print("routes/model_connections.py already has permanent delete endpoints")
