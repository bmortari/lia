import os
import re
import shutil
import requests
from sentence_transformers import SentenceTransformer
import torch
from sentence_transformers.util import cos_sim
from typing import List, Dict, Tuple, Optional
import logging
from urllib.parse import unquote
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class DocumentoResultado:
    """Classe para representar um documento encontrado"""
    orgao: str
    objeto: str
    tipo: str
    url_visualizacao: str
    url_download: Optional[str]
    filepath: Optional[str] = None
    similaridade: Optional[float] = None

class PNCPSearcher:
    def __init__(self, download_dir: str = "app/temp/docs/downloads_pncp", 
                 similar_files_dir: str = "app/temp/docs/similares"):
        self.download_dir = download_dir
        self.similar_files_dir = similar_files_dir
        self.base_url = "https://pncp.gov.br/api/search/"
        self.model = None
        self._setup_directories()
        
        # Dicionários de mapeamento para validação
        self.ESTADOS_BRASIL = [
            'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
            'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
            'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        ]
        
        self.ESFERAS = {
            'distrital': 'D',
            'estadual': 'E', 
            'federal': 'F',
            'municipal': 'M'
        }
        
        self.MODALIDADES = {
            'concorrencia_eletronica': '4',
            'concorrencia_presencial': '7',
            'credenciamento': '12',
            'dispensa': '8',
            'inexigibilidade': '9',
            'leilao_eletronico': '1',
            'leilao_presencial': '13',
            'pre_qualificacao': '11',
            'pregao_eletronico': '6',
            'pregao_presencial': '5'
        }
    
    def _setup_directories(self):
        """Cria os diretórios necessários"""
        for directory in [self.download_dir, self.similar_files_dir]:
            os.makedirs(directory, exist_ok=True)
    
    def _load_model(self):
        """Carrega o modelo de embedding otimizado para português"""
        if self.model is None:
            logger.info("Carregando modelo Sentence Transformer...")
            # Tentativa de usar modelos em português, com fallback para inglês
            models_to_try = [
                'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',  # Multilingual
                'sentence-transformers/distiluse-base-multilingual-cased',      # Multilingual
                'all-MiniLM-L6-v2'  # Fallback inglês
            ]
            
            for model_name in models_to_try:
                try:
                    self.model = SentenceTransformer(model_name)
                    logger.info(f"✅ Modelo carregado com sucesso: {model_name}")
                    break
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao carregar {model_name}: {e}")
                    continue
            
            if self.model is None:
                raise Exception("Não foi possível carregar nenhum modelo de embedding")
    
    def _validar_parametros(self, ufs: List[str] = None, esferas: List[str] = None, 
                           modalidades: List[str] = None):
        """Valida os parâmetros de entrada"""
        if ufs:
            ufs_invalidas = [uf for uf in ufs if uf.upper() not in self.ESTADOS_BRASIL]
            if ufs_invalidas:
                raise ValueError(f"UFs inválidas: {ufs_invalidas}. Use: {self.ESTADOS_BRASIL}")
        
        if esferas:
            esferas_validas = list(self.ESFERAS.keys()) + list(self.ESFERAS.values())
            esferas_invalidas = [e for e in esferas if e.lower() not in esferas_validas and e.upper() not in esferas_validas]
            if esferas_invalidas:
                raise ValueError(f"Esferas inválidas: {esferas_invalidas}. Use: {list(self.ESFERAS.keys())} ou {list(self.ESFERAS.values())}")
        
        if modalidades:
            modalidades_validas = list(self.MODALIDADES.keys()) + list(self.MODALIDADES.values())
            modalidades_invalidas = [m for m in modalidades if m.lower() not in modalidades_validas and m not in modalidades_validas]
            if modalidades_invalidas:
                raise ValueError(f"Modalidades inválidas: {modalidades_invalidas}. Use: {list(self.MODALIDADES.keys())} ou {list(self.MODALIDADES.values())}")
    
    def _processar_esferas(self, esferas: List[str]) -> str:
        """Converte nomes de esferas para códigos e retorna string concatenada"""
        codigos_esferas = []
        for esfera in esferas:
            if esfera.lower() in self.ESFERAS:
                codigos_esferas.append(self.ESFERAS[esfera.lower()])
            elif esfera.upper() in self.ESFERAS.values():
                codigos_esferas.append(esfera.upper())
        return '|'.join(codigos_esferas)
    
    def _processar_modalidades(self, modalidades: List[str]) -> str:
        """Converte nomes de modalidades para códigos e retorna string separada por pipe"""
        codigos_modalidades = []
        for modalidade in modalidades:
            if modalidade.lower() in self.MODALIDADES:
                codigos_modalidades.append(self.MODALIDADES[modalidade.lower()])
            elif modalidade in self.MODALIDADES.values():
                codigos_modalidades.append(modalidade)
        return '|'.join(codigos_modalidades)
    
    def _processar_ufs(self, ufs: List[str]) -> str:
        """Processa lista de UFs e retorna string separada por pipe"""
        # Converte para maiúsculo e junta com pipe
        return '|'.join([uf.upper() for uf in ufs])
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitiza nome de arquivo para ser válido no sistema de arquivos"""
        # Remove caracteres inválidos
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limita o tamanho
        logger.info(filename)
        return filename[:100] if len(filename) > 100 else filename
    
    def search_documents(self, palavras: str, tipos_documento: List[str] = None, 
                        max_documentos: int = 300, tam_pagina: int = 10,
                        ufs: List[str] = None, esferas: List[str] = None, 
                        modalidades: List[str] = None, ordenacao: str = "-data") -> List[DocumentoResultado]:
        """
        Busca documentos na API do PNCP com paginação (sem baixar arquivos)
        
        Args:
            palavras: Termos de busca
            tipos_documento: Lista de tipos de documento (apenas 'ata' e 'contrato' são aceitos)
            max_documentos: Número máximo de documentos a buscar
            tam_pagina: Número de resultados por página (limitado pela API)
            ufs: Lista de UFs (estados) para filtrar ['SP', 'RJ', etc.]
            esferas: Lista de esferas ['federal', 'estadual', 'municipal', 'distrital'] ou ['F', 'E', 'M', 'D']
            modalidades: Lista de modalidades ['pregao_eletronico', 'concorrencia_eletronica', etc.] ou códigos ['6', '4', etc.]
            ordenacao: Critério de ordenação ('-data' para mais recente, 'relevancia' para relevância)
        """
        if tipos_documento is None:
            tipos_documento = ['ata', 'contrato']
        
        # Filtra apenas atas e contratos
        tipos_validos = ['ata', 'contrato']
        tipos_documento = [tipo for tipo in tipos_documento if tipo.lower() in tipos_validos]
        
        if not tipos_documento:
            logger.warning("Nenhum tipo de documento válido especificado. Usando padrão: ['ata', 'contrato']")
            tipos_documento = ['ata', 'contrato']
        
        logger.info(f"🎯 Tipos de documento a buscar: {tipos_documento}")
        
        # Valida parâmetros
        self._validar_parametros(ufs, esferas, modalidades)
        
        todos_documentos = []
        documentos_por_tipo = max_documentos // len(tipos_documento)  # Divide igualmente entre tipos
        
        for tipo in tipos_documento:
            logger.info(f"🔎 Buscando por '{palavras}' (tipo: {tipo}) - Meta: {documentos_por_tipo} documentos")
            logger.info(f"  📅 Ordenação: {ordenacao} (mais recente primeiro)" if ordenacao == "-data" else f"  📊 Ordenação: {ordenacao}")
            
            # Log dos filtros aplicados
            filtros_log = []
            if ufs:
                filtros_log.append(f"UFs: {ufs}")
            if esferas:
                filtros_log.append(f"Esferas: {esferas}")
            if modalidades:
                filtros_log.append(f"Modalidades: {modalidades}")
            
            if filtros_log:
                logger.info(f"  🔧 Filtros aplicados: {' | '.join(filtros_log)}")
            
            documentos_tipo = []
            pagina = 1
            total_paginas_estimado = None
            
            while len(documentos_tipo) < documentos_por_tipo:
                params = {
                    "q": palavras,
                    "tipos_documento": tipo,
                    "ordenacao": ordenacao,
                    "pagina": str(pagina),
                    "tam_pagina": str(tam_pagina),
                    "status": "vigente"
                }
                
                # Adiciona filtros opcionais - CORREÇÃO AQUI
                if ufs:
                    params["ufs"] = self._processar_ufs(ufs)  # Mudança: usar pipe ao invés de vírgula
                
                if esferas:
                    params["esferas"] = self._processar_esferas(esferas)
                
                if modalidades:
                    params["modalidades"] = self._processar_modalidades(modalidades)
                
                # Debug: mostra parâmetros da requisição
                logger.debug(f"  🔧 Parâmetros da requisição: {params}")
                
                try:
                    logger.info(f"  📄 Buscando página {pagina}...")
                    response = requests.get(self.base_url, params=params, timeout=30)
                    response.raise_for_status()
                    
                    dados = response.json()
                    resultados = dados.get("items", [])
                    total_resultados = dados.get("total", 0)
                    
                    # Debug: mostra tipos de documentos retornados
                    if resultados and pagina == 1:  # Só na primeira página para não poluir o log
                        tipos_encontrados = set()
                        for doc in resultados[:5]:  # Apenas os primeiros 5 para debug
                            doc_type = doc.get('document_type', 'N/D')
                            tipos_encontrados.add(doc_type)
                        logger.info(f"  🔍 Tipos de documentos retornados pela API: {list(tipos_encontrados)}")
                    
                    # Calcula total de páginas na primeira chamada
                    if total_paginas_estimado is None:
                        total_paginas_estimado = (total_resultados + tam_pagina - 1) // tam_pagina
                        logger.info(f"  Total de resultados disponíveis: {total_resultados} (≈{total_paginas_estimado} páginas)")
                    
                    if not resultados:
                        logger.info(f"  Página {pagina} retornou vazia. Parando busca para {tipo}")
                        break
                    
                    logger.info(f"  Página {pagina}: {len(resultados)} documentos encontrados")
                    
                    # Processa documentos da página atual
                    documentos_processados = 0
                    documentos_aceitos = 0
                    
                    for doc in resultados:
                        if len(documentos_tipo) >= documentos_por_tipo:
                            break
                        
                        documentos_processados += 1
                        documento = self._parse_document(doc, tipo)
                        if documento:
                            documentos_tipo.append(documento)
                            documentos_aceitos += 1
                    
                    logger.info(f"  Processados: {documentos_processados} | Aceitos: {documentos_aceitos} | Filtrados: {documentos_processados - documentos_aceitos}")
                    
                    # Verifica se deve continuar
                    if len(resultados) < tam_pagina:
                        logger.info(f"  Página {pagina} retornou menos que {tam_pagina} resultados. Fim da busca para {tipo}")
                        break
                    
                    pagina += 1
                    
                    # Pequena pausa entre requisições para não sobrecarregar a API
                    import time
                    time.sleep(0.1)
                        
                except requests.RequestException as e:
                    logger.error(f"Erro na busca para {tipo}, página {pagina}: {e}")
                    break
            
            logger.info(f"✅ Coletados {len(documentos_tipo)} documentos para {tipo}")
            todos_documentos.extend(documentos_tipo)
        
        logger.info(f"🎯 Total de documentos coletados: {len(todos_documentos)}")
        return todos_documentos
    
    
    
    
    
    
    
    
    
    
    
    def test_url_construction(self, palavras: str, tipos_documento: List[str] = None, 
                          ufs: List[str] = None, esferas: List[str] = None, 
                          modalidades: List[str] = None, ordenacao: str = "-data"):
        """
        Função de teste para visualizar como as URLs são construídas
        """
        import urllib.parse
        import requests
        
        if tipos_documento is None:
            tipos_documento = ['ata', 'contrato']
        
        print("🧪 TESTE DE CONSTRUÇÃO DE URL")
        print("=" * 80)
        
        for tipo in tipos_documento:
            print(f"\n📋 TIPO: {tipo.upper()}")
            print("-" * 40)
            
            # Constrói os parâmetros exatamente como no método original
            params = {
                "q": palavras,
                "tipos_documento": tipo,
                "ordenacao": ordenacao,
                "pagina": "1",
                "tam_pagina": "10",
                "status": "vigente"
            }
            
            # Adiciona filtros opcionais
            if ufs:
                params["ufs"] = self._processar_ufs(ufs)
                print(f"🌍 UFs processadas: {ufs} → {params['ufs']}")
            
            if esferas:
                params["esferas"] = self._processar_esferas(esferas)
                print(f"🏛️  Esferas processadas: {esferas} → {params['esferas']}")
            
            if modalidades:
                params["modalidades"] = self._processar_modalidades(modalidades)
                print(f"📝 Modalidades processadas: {modalidades} → {params['modalidades']}")
            
            # Mostra os parâmetros
            print(f"\n📋 PARÂMETROS:")
            for key, value in params.items():
                print(f"   {key}: {value}")
            
            # Constrói a URL final de duas maneiras
            print(f"\n🔗 MÉTODOS DE CONSTRUÇÃO:")
            
            # Método 1: urllib.parse.urlencode
            url_metodo1 = self.base_url + "?" + urllib.parse.urlencode(params)
            print(f"1. urllib.parse.urlencode:")
            print(f"   {url_metodo1}")
            
            # Método 2: requests.Request.prepare() (mais preciso)
            prepared_request = requests.Request('GET', self.base_url, params=params).prepare()
            url_metodo2 = prepared_request.url
            print(f"\n2. requests.Request.prepare() (EXATO):")
            print(f"   {url_metodo2}")
            
            print("\n" + "=" * 80)
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    def _parse_document(self, doc: Dict, tipo: str) -> Optional[DocumentoResultado]:
        """Extrai informações do documento da resposta da API"""
        try:
            # Filtragem rigorosa: só processa se for realmente ata ou contrato
            document_type = doc.get('document_type', '').lower()
            
            # Lista de tipos aceitos
            tipos_aceitos = ['ata', 'contrato']
            
            # Se o tipo do documento não está na lista aceita, ignora
            if not any(tipo_aceito in document_type for tipo_aceito in tipos_aceitos):
                logger.debug(f"Documento ignorado - tipo não aceito: {document_type}")
                return None
            
            # Verifica se é nota de empenho e rejeita
            if 'empenho' in document_type or 'nota' in document_type:
                logger.debug(f"Documento ignorado - nota de empenho: {document_type}")
                return None
            
            orgao = doc.get('orgao_nome', 'N/D')
            objeto = doc.get('description', "Não informado")
            tipo_doc_api = doc.get('document_type', "Não informado")
            item_url_relativo = doc.get('item_url')
            
            url_visualizacao = f"https://pncp.gov.br{item_url_relativo}" if item_url_relativo else "Não disponível"
            url_download = self._build_download_url(doc, tipo)
            
            return DocumentoResultado(
                orgao=orgao,
                objeto=objeto,
                tipo=tipo_doc_api,
                url_visualizacao=url_visualizacao,
                url_download=url_download
            )
        except Exception as e:
            logger.error(f"Erro ao processar documento: {e}")
            return None
    
    def _build_download_url(self, doc: Dict, tipo: str) -> Optional[str]:
        """Constrói a URL de download do documento"""
        orgao_cnpj = doc.get('orgao_cnpj')
        ano = doc.get('ano')
        
        if tipo == 'ata':
            num_seq_compra_ata = doc.get('numero_sequencial_compra_ata')
            num_seq_ata = doc.get('numero_sequencial')
            
            if all([orgao_cnpj, ano, num_seq_compra_ata, num_seq_ata]):
                return f"https://pncp.gov.br/pncp-api/v1/orgaos/{orgao_cnpj}/compras/{ano}/{num_seq_compra_ata}/atas/{num_seq_ata}/arquivos/1"
        
        elif tipo == 'contrato':
            numero_sequencial = doc.get('numero_sequencial')
            
            if all([orgao_cnpj, ano, numero_sequencial]):
                return f"https://pncp.gov.br/pncp-api/v1/orgaos/{orgao_cnpj}/contratos/{ano}/{numero_sequencial}/arquivos/1"
        
        return None
    
    def find_similar_documents_by_object(self, documentos: List[DocumentoResultado], 
                                       texto_similaridade: str, 
                                       max_similares: int = 10) -> List[Tuple[DocumentoResultado, float]]:
        """
        Encontra documentos mais similares usando apenas o campo 'objeto' dos documentos
        
        Args:
            documentos: Lista de documentos para analisar
            texto_similaridade: Texto para buscar similaridade
            max_similares: Número máximo de documentos similares a retornar
        
        Returns:
            Lista de tuplas (documento, similaridade) ordenada por similaridade
        """
        self._load_model()
        
        # Filtra documentos que têm objeto válido
        documentos_validos = []
        objetos_texto = []
        
        for doc in documentos:
            if doc.objeto and doc.objeto.strip() and doc.objeto != "Não informado":
                documentos_validos.append(doc)
                objetos_texto.append(doc.objeto.strip())
        
        if not documentos_validos:
            logger.warning("Nenhum documento com objeto válido encontrado")
            return []
        
        logger.info(f"🔍 Analisando similaridade de {len(documentos_validos)} documentos usando campo 'objeto'...")
        
        # Calcula embeddings
        embeddings_objetos = self.model.encode(objetos_texto)
        embedding_busca = self.model.encode([texto_similaridade])
        
        # Calcula similaridades
        similaridades = cos_sim(torch.tensor(embedding_busca), torch.tensor(embeddings_objetos))[0].tolist()
        
        # Ordena por similaridade
        resultados_ordenados = sorted(
            zip(documentos_validos, similaridades), 
            key=lambda item: item[1], 
            reverse=True
        )
        
        # Log dos resultados
        logger.info(f"📊 Top {min(max_similares, len(resultados_ordenados))} documentos mais similares a '{texto_similaridade}':")
        for i, (doc, sim) in enumerate(resultados_ordenados[:max_similares], 1):
            logger.info(f"  {i}. {doc.orgao} - {doc.objeto[:60]}... (Similaridade: {sim:.4f})")
        
        return resultados_ordenados[:max_similares]
    
    def download_document(self, documento: DocumentoResultado) -> bool:
        """
        Baixa um documento individual
        
        Returns:
            bool: True se o download foi bem-sucedido
        """
        if not documento.url_download:
            logger.warning(f"URL de download não disponível para {documento.objeto}")
            return False
        
        try:
            logger.info(f"📥 Baixando: {documento.objeto[:50]}...")
            
            response = requests.get(documento.url_download, stream=True, timeout=60)
            response.raise_for_status()
            
            # Determina o nome do arquivo
            filename = self._get_filename_from_response(response, documento)
            filepath = os.path.join(self.download_dir, filename)
            
            # Salva o arquivo
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            documento.filepath = filepath
            logger.info(f"✅ Arquivo salvo: {filename}")
            return True
            
        except requests.RequestException as e:
            logger.error(f"❌ Erro ao baixar {documento.objeto}: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Erro inesperado no download: {e}")
            return False
    
    def _get_filename_from_response(self, response, documento: DocumentoResultado) -> str:
        """Extrai ou gera nome do arquivo a partir da resposta HTTP"""
        # Tenta obter do cabeçalho Content-Disposition
        content_disposition = response.headers.get('content-disposition')
        if content_disposition:
            fname_match = re.search(r'filename\*?=(?:UTF-8\'\')?([^;]+)', content_disposition, re.IGNORECASE)
            if fname_match:
                filename = unquote(fname_match.group(1).strip('" '))
                return self.sanitize_filename(filename)
        
        # Determina extensão pelo Content-Type
        content_type = response.headers.get('content-type', '').lower()
        if 'pdf' in content_type:
            extension = '.pdf'
        elif 'zip' in content_type:
            extension = '.zip'
        elif 'xml' in content_type:
            extension = '.xml'
        else:
            extension = '.pdf'  # Default
        
        # Gera nome baseado no conteúdo do documento
        orgao_clean = self.sanitize_filename(documento.orgao)[:20]
        objeto_clean = self.sanitize_filename(documento.objeto)[:30]
        filename = f"{orgao_clean}_{objeto_clean}_{documento.tipo}{extension}"
        
        return filename
    
    def download_similar_documents(self, documentos_similares: List[Tuple[DocumentoResultado, float]], 
                                 max_workers: int = 3) -> List[DocumentoResultado]:
        """
        Baixa apenas os documentos similares selecionados
        
        Args:
            documentos_similares: Lista de tuplas (documento, similaridade)
            max_workers: Número máximo de downloads simultâneos
        """
        documentos_baixados = []
        documentos_para_baixar = [doc for doc, _ in documentos_similares if doc.url_download]
        
        logger.info(f"📥 Baixando {len(documentos_para_baixar)} documentos similares...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submete todos os downloads
            future_to_doc = {executor.submit(self.download_document, doc): doc 
                           for doc in documentos_para_baixar}
            
            # Coleta os resultados
            for future in as_completed(future_to_doc):
                documento = future_to_doc[future]
                try:
                    success = future.result()
                    if success:
                        documentos_baixados.append(documento)
                except Exception as e:
                    logger.error(f"Erro no download paralelo: {e}")
        
        logger.info(f"✅ {len(documentos_baixados)} documentos baixados com sucesso!")
        return documentos_baixados
    
    def copy_similar_documents(self, documentos_similares: List[Tuple[DocumentoResultado, float]]):
        """Copia os documentos mais similares para pasta específica e renomeia por tipo"""
        # Limpa arquivos existentes (ATA e CONTRATOS)
        logger.info("🧹 Limpando arquivos existentes...")
        
        # Remove atas existentes
        for i in range(1, 21):  # Até ATA_20
            existing_file = os.path.join(self.similar_files_dir, f"ATA_{i}.pdf")
            if os.path.exists(existing_file):
                try:
                    os.remove(existing_file)
                    logger.info(f"  Removido: ATA_{i}.pdf")
                except Exception as e:
                    logger.error(f"  Erro ao remover ATA_{i}.pdf: {e}")
        
        # Remove contratos existentes
        for i in range(1, 21):  # Até CONTRATOS_20
            existing_file = os.path.join(self.similar_files_dir, f"CONTRATOS_{i}.pdf")
            if os.path.exists(existing_file):
                try:
                    os.remove(existing_file)
                    logger.info(f"  Removido: CONTRATOS_{i}.pdf")
                except Exception as e:
                    logger.error(f"  Erro ao remover CONTRATOS_{i}.pdf: {e}")
        
        # Separa documentos por tipo
        atas = []
        contratos = []
        
        for documento, similaridade in documentos_similares:
            if hasattr(documento, 'filepath') and documento.filepath and os.path.exists(documento.filepath):
                doc_type = documento.tipo.lower()
                if 'ata' in doc_type:
                    atas.append((documento, similaridade))
                elif 'contrato' in doc_type:
                    contratos.append((documento, similaridade))
                else:
                    # Fallback: tenta identificar pelo URL ou outros campos
                    logger.warning(f"Tipo não identificado para {documento.objeto[:40]}... - Tipo: {documento.tipo}")
        
        # Copia e renomeia atas
        logger.info("📋 Copiando ATAS...")
        for i, (documento, similaridade) in enumerate(atas, 1):
            dest_path = os.path.join(self.similar_files_dir, f"ATA_{i}.pdf")
            
            try:
                shutil.copy2(documento.filepath, dest_path)
                logger.info(f"  {i}. ATA copiada: {documento.objeto[:40]}... -> ATA_{i}.pdf (Similaridade: {similaridade:.4f})")
                logger.info(f"     📄 Órgão: {documento.orgao}")
                if documento.url_download:
                    logger.info(f"     🔗 URL Download: {documento.url_download}")
                else:
                    logger.warning(f"     ⚠️  URL Download não disponível")
                logger.info(f"     🌐 URL Visualização: {documento.url_visualizacao}")
                print("-" * 80)
            except Exception as e:
                logger.error(f"  Erro ao copiar ATA {i}: {e}")
        
        # Copia e renomeia contratos
        logger.info("📋 Copiando CONTRATOS...")
        for i, (documento, similaridade) in enumerate(contratos, 1):
            dest_path = os.path.join(self.similar_files_dir, f"CONTRATOS_{i}.pdf")
            
            try:
                shutil.copy2(documento.filepath, dest_path)
                logger.info(f"  {i}. CONTRATO copiado: {documento.objeto[:40]}... -> CONTRATOS_{i}.pdf (Similaridade: {similaridade:.4f})")
                logger.info(f"     📄 Órgão: {documento.orgao}")
                if documento.url_download:
                    logger.info(f"     🔗 URL Download: {documento.url_download}")
                else:
                    logger.warning(f"     ⚠️  URL Download não disponível")
                logger.info(f"     🌐 URL Visualização: {documento.url_visualizacao}")
                print("-" * 80)
            except Exception as e:
                logger.error(f"  Erro ao copiar CONTRATO {i}: {e}")
        
        # Resumo final
        total_atas = len(atas)
        total_contratos = len(contratos)
        logger.info(f"✅ Resumo da cópia:")
        logger.info(f"   📋 ATAS copiadas: {total_atas}")
        logger.info(f"   📋 CONTRATOS copiados: {total_contratos}")
        logger.info(f"   📋 Total de documentos: {total_atas + total_contratos}")
    
    def cleanup_downloads(self):
        """Remove todos os arquivos baixados para limpeza"""
        if os.path.exists(self.download_dir):
            try:
                shutil.rmtree(self.download_dir)
                logger.info(f"✅ Diretório {self.download_dir} removido com sucesso")
            except Exception as e:
                logger.error(f"❌ Erro ao remover diretório {self.download_dir}: {e}")
    
    def pesquisar_mercado(self, palavras_busca: str, texto_similaridade: str, 
                         tipos_documento: List[str] = None, max_documentos: int = 300,
                         max_similares: int = 10, limpar_downloads: bool = True,
                         ufs: List[str] = None, esferas: List[str] = None, 
                         modalidades: List[str] = None, ordenacao: str = "-data") -> List[Tuple[DocumentoResultado, float]]:
        """
        Método principal que executa todo o processo de pesquisa de mercado otimizado
        
        ALGORITMO:
        1. Busca documentos na API (sem baixar) com filtros opcionais
        2. Analisa similaridade usando campo 'objeto' 
        3. Baixa apenas os documentos mais similares
        
        Args:
            palavras_busca: Termos para buscar documentos
            texto_similaridade: Texto para calcular similaridade
            tipos_documento: Tipos de documento a buscar (apenas 'ata' e 'contrato')
            max_documentos: Número máximo de documentos a buscar na API
            max_similares: Número de documentos similares a baixar
            limpar_downloads: Se deve apagar os downloads ao final
            ufs: Lista de UFs para filtrar ['SP', 'RJ', etc.]
            esferas: Lista de esferas ['federal', 'estadual', etc.] ou ['F', 'E', etc.]
            modalidades: Lista de modalidades ['pregao_eletronico', etc.] ou códigos ['6', etc.]
            ordenacao: Critério de ordenação ('-data' para mais recente, 'relevancia' para relevância)
        
        Returns:
            Lista com os documentos mais similares e suas pontuações
        """
        try:
            # 1. Busca documentos na API (SEM BAIXAR) com filtros
            logger.info("🚀 Iniciando pesquisa de mercado otimizada...")
            documentos = self.search_documents(
                palavras_busca, tipos_documento, max_documentos, 
                ufs=ufs, esferas=esferas, modalidades=modalidades, ordenacao=ordenacao
            )
            
            if not documentos:
                logger.warning("Nenhum documento encontrado na busca")
                return []
            
            # 2. Análise de similaridade usando campo 'objeto'
            logger.info("🔍 Analisando similaridade usando campo 'objeto'...")
            documentos_similares = self.find_similar_documents_by_object(
                documentos, texto_similaridade, max_similares
            )
            
            if not documentos_similares:
                logger.warning("Nenhum documento similar encontrado")
                return []
            
            # 3. Baixa APENAS os documentos similares
            documentos_baixados = self.download_similar_documents(documentos_similares)
            
            if not documentos_baixados:
                logger.warning("Nenhum documento foi baixado com sucesso")
                return []
            
            # 4. Copia documentos similares
            self.copy_similar_documents(documentos_similares)
            
            # 5. Limpeza (opcional)
            if limpar_downloads:
                logger.info("🧹 Limpando arquivos temporários...")
                self.cleanup_downloads()
            
            logger.info("✅ Pesquisa de mercado concluída!")
            return documentos_similares
            
        except Exception as e:
            logger.error(f"❌ Erro na pesquisa de mercado: {e}")
            return []