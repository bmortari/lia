from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse


router = APIRouter()

templates = Jinja2Templates(directory="frontend/templates")
templates_projetos = Jinja2Templates(directory="frontend/templates/projeto")
templates_dfd = Jinja2Templates(directory="frontend/templates/dfd")


@router.get("/favicon.ico")
async def get_favicon():
    return FileResponse("frontend/static/assets/img/favicon.ico")

@router.get("/")
async def get_chat_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/criar_projeto")
def create_project_page(request: Request):
    return templates_projetos.TemplateResponse("projeto-criar.html", {"request": request})

@router.get("/listar_projetos")
def list_projects_page(request: Request):
    return templates_projetos.TemplateResponse("projeto-historico.html", {"request": request})
