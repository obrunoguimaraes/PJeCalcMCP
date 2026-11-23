# Contingencia Assistida - primeira etapa

## Objetivo

Usar o formato de especificacao do PJeCalcMCP para preparar cenarios tecnicos de exposicao trabalhista, sem alterar os calculos originais ou calcular automaticamente risco de perda.

Esta primeira etapa implementa a ferramenta MCP `contingencia_preparar_cenarios`, que somente prepara especificacoes, registra diferencas e devolve o resultado de `validarEspecificacao`. Nao gera .PJC, nao liquida e nao altera dados do PJe-Calc.

## Como usar

1. Identifique os pedidos da peticao inicial, os periodos e documentos disponiveis.
2. Prepare uma especificacao-base no formato de `calculo_modelo_json`.
3. Defina um ou mais cenarios (maximo dez por chamada), cada um com id, nome, justificativa e alteracoes.
4. Para cada alteracao informe `fundamento`, evitando qualquer premissa implicita.
5. Chame `contingencia_preparar_cenarios` com `especificacao` e `cenarios`.
6. Examine os campos `alteracoes`, `validacao`, `revisaoHumanaObrigatoria` e `especificacao` de cada cenario.
7. Revise a especificacao e o plano de interpretacao com um calculista antes de chamar o fluxo existente para gerar e liquidar .PJC.
8. Compare o resultado com um calculo manual de referencia na mesma data-base.

## Exemplo (somente o argumento cenarios)

```json
[
  {
    "id": "integral",
    "nome": "Exposicao integral",
    "justificativa": "Considerar integralmente as parcelas parametrizadas",
    "alteracoes": []
  },
  {
    "id": "jornada-alternativa",
    "nome": "Jornada alternativa",
    "justificativa": "Hipotese baseada em cartoes de ponto validados",
    "alteracoes": [
      {
        "tipo": "ajustar_verba",
        "verba": "HORAS EXTRAS 50%",
        "campo": "quantidade",
        "valor": 12,
        "fundamento": "Exemplo ficticio: substituir por quantidade apurada e documentada"
      }
    ]
  }
]
```

Para excluir uma verba, use `tipo: excluir_verba` e informe `verba` e `fundamento`. Para alterar parametros basicos use `tipo: ajustar_calculo`, `campo`, `valor` e `fundamento`. A lista de campos permitidos consta de `server/lib/contingencia.mjs`.

## Regras e limites

- Cada cenario parte de uma copia independente da especificacao-base.
- A aprovacao anterior do plano (`contrato.aprovacao`) e invalidada em todas as copias; nao herdar uma aprovacao sem revisao.
- Os valores dos cenarios nao sao calculados pela ferramenta. A validacao indica apenas a consistencia tecnica da especificacao com o gerador.
- Excluir verbas pode impactar bases, reflexos, FGTS, INSS e honorarios. Revise todos os vinculos antes de calcular.
- Uma mesma verba repetida com identificacao ambigua nao pode ser alterada: utilize nomes unicos.
- A leitura da inicial, definicao das teses defensivas e criterio de contingencia permanecem atividades com revisao humana.
- Exposicao economica e provisao contabil nao sao sinonimos; aplicar os criterios do CPC 25 separadamente.
- Os testes offline nao substituem testes com PJe-Calc no Windows nem validacao de valores por competencia.

## Plano de validacao

1. Executar `node scripts/test-contingencia.mjs` e `node scripts/test-mcp.mjs`.
2. Reproduzir dez casos historicos anonimizados da AG em ambiente de testes.
3. Comparar cada verba, incidencia, reflexo, juros e valor final com os calculos manuais.
4. Medir tempo de preparacao e intervencoes exigidas do calculista.
5. Somente apos resultados equivalentes, planejar lote operacional, modelos de contingencia e relatorios consolidados.