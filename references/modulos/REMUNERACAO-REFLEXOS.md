# Módulo: remuneração e reflexos

Carregue sempre que houver históricos salariais, bases de cálculo ou reflexos. Resultado:
`contrato.remuneracoes`, `historicosSalariais` (com `origem`), `base` e `reflexos` das verbas.

## Conferências

1. **Vigências**: cada valor salarial com documento (holerite, CTPS, acordo coletivo) e vigência. A
   auditoria recusa valor fora da vigência ou diferente dela.
2. **Componentes separados**, um histórico por componente:
   - salário fixo;
   - adicionais fixos (periculosidade, gratificação);
   - variáveis (comissões, horas extras pagas, prêmios);
   - remuneração substitutiva de afastamento;
   - mero campo de base de contribuição.

   Incidências de INSS e FGTS corretas em cada um.

   Base derivada (soma de componentes, média, base de contribuição) lista os `componentes` (ids das
   remunerações documentais), a `formula` e o `arredondamento`. A auditoria recalcula a soma a partir dos
   componentes e confere a vigência de cada um; copiar a mesma base no JSON e no contrato não é
   conferência. Mudar só o valor derivado, preservando a fonte, é detectado.
3. **ÚLTIMA REMUNERAÇÃO**: decida `calculo.historicoUltimaRemuneracao.criar`. Com históricos reais
   costuma ser `false`.
4. **Bases**: a base de cada verba conforme o título (salário-base, remuneração, piso). Evite:
   - **dupla média**: o reflexo já faz a média de uma parcela que também está no histórico da base;
   - **dupla integração**: a mesma parcela como verba e dentro da base de outra.

   A auditoria acusa base repetida e verba de base que já incide sobre o mesmo histórico.
5. **Reflexos**: comportamento (valor mensal ou média), período da média, fração de mês, característica
   e exclusões de faltas/férias — tudo informado no objeto do reflexo quando diferir do padrão, porque
   muda a média e a base previdenciária.
6. **Proporcionalidade**: a caixa "proporcionalizar" (devido, base e quantidade) conforme o título;
   indenizações em geral não proporcionalizam.


## Diferenças de parcelas salariais (insalubridade, periculosidade e outras verbas do catálogo)

- Consulte `catalogo_verbas` e prefira a verba Expresso correspondente, com os parâmetros do título. Não substitua uma verba calculável por uma verba manual que contenha apenas o saldo líquido.
- Em diferenças de insalubridade, apure o adicional integral devido no grau, base e período fixados. Registre o adicional efetivamente pago nos holerites, por competência, em `ocorrencias[].pago` com a origem em `contrato.pagamentos`. Alternativamente use um histórico de pagamentos exclusivo em `valorPago` calculado, documentando os valores e verificando a proporcionalidade. Não faça ambos para o mesmo pagamento.
- Mantenha o valor devido, pago e diferença separados. Não preencha `ocorrencias[].devido` com a diferença já deduzida. Competência sem prova de pagamento não equivale automaticamente a valor zero.
- Ative os reflexos deferidos no catálogo e configure `gerarReflexo`, incidências, médias, avos e eventual pagamento do próprio reflexo de acordo com o título. Evite reflexos não deferidos e dedução duplicada. FGTS e multa devem ser tratados no bloco próprio quando aplicáveis.
- Uma verba manual é excepcional: justifique a impossibilidade do modelo nativo ou o comando expresso em valor informado e preserve a memória de cálculo e os reflexos aplicáveis. A auditoria sinaliza diferenças de insalubridade sem modelo nativo ou com devido informado e reprova reflexos contratuais reconhecidos que estejam ausentes da especificação vinculada.
- No plano de interpretação, demonstre a base, percentual, devido, pago, diferença e reflexos por competência; após liquidar, confira o PJC e o relatório de ocorrências, não apenas o total do resumo.

## Conferência dos números

A conferência independente recalcula cada ocorrência: base ÷ divisor × multiplicador × quantidade
(× 2 na dobra). Ela também confere os avos de 13º e a cobertura dos meses. Comece por quantidades e
valores nominais; só depois olhe correção e juros.
