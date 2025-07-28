from fastapi import Request, HTTPException, status

ALLOWED_GROUPS = ["tribunal", "servidores", "GEST", "TI", "LIA"]  # ordem de prioridade

class RemoteUser:
    def __init__(self, username: str, group: str):
        self.username = username
        self.group = group  # apenas 1 grupo permitido

async def get_current_remote_user(request: Request) -> RemoteUser:
    username = request.headers.get("remote-user")  # nginx converte para lowercase
    raw_groups = request.headers.get("remote-groups", "")

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não autenticado"
        )

    groups = [g.strip() for g in raw_groups.split(",") if g.strip()]

    # Encontra o primeiro grupo permitido
    matched_group = next((g for g in ALLOWED_GROUPS if g in groups), None)

    if not matched_group:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: grupo não autorizado"
        )

    return RemoteUser(username=username, group=matched_group)