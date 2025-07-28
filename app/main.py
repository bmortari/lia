from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.routes import projects_routes, home_routes, dfd_routes, pdp_routes
from app.database import init_async_db
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_async_db()
    yield


app = FastAPI(
    title="LIA",
    version="1.0.0",
    description="Sua nova assistente de licitações e contratos no TRE-AC.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ Em produção, troque "*" por allow_origins=["https://lia.tre-ac.jus.br", "https://authelia.tre-ac.jus.br",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

app.include_router(home_routes.router)
app.include_router(projects_routes.router)
app.include_router(dfd_routes.router)
app.include_router(pdp_routes.router)