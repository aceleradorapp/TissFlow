# Especificação Técnica: Correção de Navegação nos Cards do Dashboard

## 1. Objetivo
Garantir que os botões "Acessar" contidos nos cards de ferramentas disponíveis do Dashboard redirecionem o usuário para suas respectivas telas operacionais, sincronizando com as rotas já existentes no menu lateral.

## 2. Ajustes no Frontend (`Dashboard.jsx`)
- Localizar o mapeamento dos cards de ferramentas disponíveis no painel do usuário.
- Substituir a ação ou tag do botão "Acessar" para utilizar o componente `<Link to="...">` do `react-router-dom` ou um `navigate(...)` do hook `useNavigate`.
- Mapeamento de rotas esperado por recurso (slug):
  * `swagger-visual` -> Redirecionar para `/tools/swagger` (ou a rota ativa do Swagger)
  * `xml-generator` -> Redirecionar para `/tools/generator` (ou a rota ativa do Gerador)