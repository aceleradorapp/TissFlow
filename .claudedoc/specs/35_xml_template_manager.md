# Especificação Técnica: Gestor e Construtor de Modelos XML Personalizados

## 1. Objetivo
Implementar um construtor de templates XML baseado em XSD onde o usuário pode ligar/desligar tags opcionais via checkboxes, salvar os modelos em um repositório particular vinculado à sua conta, e gerenciar os registros (ativar, desativar, deletar).

## 2. Interface do Usuário (UI/UX)
- **Visualizador Interativo:** Renderizar o esqueleto XML na direita onde cada elemento opcional possui um switch/checkbox. Ao desmarcar, a linha sofre um fade-out e é excluída do payload final.
- **Área de Gestão (CRUD):** Criar uma sub-tela ou aba "Meus Modelos Salvos" mostrando uma tabela/grid premium com badges de status (Ativo/Inativo), permitindo download rápido, alteração de status ou exclusão definitiva (Destroy).
- **Contraste:** Seguir estritamente o `system_rules.md`.

## 3. Integração Cross-Tool (O Gancho Próximo)
- O endpoint `GET /api/user/xml-templates` deve listar os modelos ativos do usuário. Essa mesma API será consumida pelo botão "Carregar Lista Particular" na ferramenta `class-generator`.