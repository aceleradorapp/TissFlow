# Especificação Técnica: Wizard de Correção XML Guiada (Modo Foco)

## 1. Objetivo
Implementar um modal interativo de passo a passo (Wizard) que isole cada erro detectado no XML, apresentando uma explicação simplificada e os inputs estritamente necessários para a correção individual, antes de guiar o usuário para o próximo item.

## 2. Arquitetura de Fluxo de UI/UX
- **Gatilho:** Na barra de ferramentas do `XmlEditor.jsx`, adicionar o botão `🪄 Assistente de Correção` (com efeito glow sutil).
- **Isolamento de Erro:** O modal deve ler a lista `currentErrors`. Para cada item, exibe o índice atual (`Erro X de Y`), a descrição amigável e renderiza dinamicamente apenas o input correspondente àquele nó do XML.
- **Ação Rápida:** Erros conhecidos como `hash-integrity-validation` devem exibir um botão único de ação `[ Auto-Corrigir Hash ]` que resolve o problema com 1 clique e já avança de slide.
- **Botão Pular:** Permitir avançar caso o erro seja estrutural ou o usuário prefira editá-lo no formulário completo.