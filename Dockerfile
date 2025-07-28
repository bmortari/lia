# Etapa base: imagem oficial do Python
FROM python:3.12.3

# Define o diretório de trabalho
WORKDIR /lia

# Copia arquivos de dependências
COPY requirements.txt .

# Instala dependências do sistema e do Python
RUN apt-get update && apt-get install -y ca-certificates \
    build-essential \
    libpq-dev \
    curl \
 && pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
 && apt-get purge -y build-essential \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Copia o restante da aplicação
COPY . .

# Expondo a porta interna (sem conflito)
EXPOSE 8001

# Comando de execução
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
