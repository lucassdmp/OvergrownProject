import statistics

# Definição das armas com suas rolagens de dados E requisitos
armas = {
    # Armas Brancas - SEM REQUISITOS
    "Adaga": {
        "dados": [(4, 2)], 
        "atributo": "Grace",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    "Bo": {
        "dados": [(10, 1)], 
        "atributo": "Grace",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    "Clava": {
        "dados": [(4, 2)], 
        "atributo": "Might",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    "Espada de uma mão": {
        "dados": [(6, 2)], 
        "atributo": "Might",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    "Mangual": {
        "dados": [(6, 1), (4, 1)], 
        "atributo": "Might",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    "Martelo leve": {
        "dados": [(4, 2)], 
        "atributo": "Might",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    "Maça": {
        "dados": [(4, 2)], 
        "atributo": "Might",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    "Rapiera/Florete": {
        "dados": [(4, 1), (6, 1)], 
        "atributo": "Grace",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    "Socos": {
        "dados": [(6, 1)], 
        "atributo": "Might",
        "requisitos": [],
        "categoria": "Arma Branca Básica"
    },
    
    # Armas Brancas - COM REQUISITO DE MASTREIA
    "Foice": {
        "dados": [(8, 2), (4, 1)], 
        "atributo": "Might",
        "requisitos": ["Nó de Mastreia em Machado"],
        "categoria": "Arma Branca Avançada"
    },
    "Lança": {
        "dados": [(8, 1), (6, 2)], 
        "atributo": "Might",
        "requisitos": ["Nó de Mastreia em Machado"],
        "categoria": "Arma Branca Avançada"
    },
    "Machado de duas mãos": {
        "dados": [(6, 1), (4, 3)], 
        "atributo": "Might",
        "requisitos": ["Nó de Mastreia em Machado"],
        "categoria": "Arma Branca Avançada"
    },
    "Martelo de guerra": {
        "dados": [(6, 4)], 
        "atributo": "Might",
        "requisitos": ["Nó de Mastreia em Martelo"],
        "categoria": "Arma Branca Avançada"
    },
    
    # Armas de Longo Alcance - SEM REQUISITOS
    "Arco Curto": {
        "dados": [(4, 2)], 
        "atributo": "Grace",
        "requisitos": [],
        "categoria": "Arma de Alcance Básica"
    },
    
    # Armas de Longo Alcance - COM REQUISITO DE MASTREIA
    "Arco Longo/Arco composto": {
        "dados": [(6, 4)], 
        "atributo": "Grace",
        "requisitos": ["Nó de Mastreia em Arco"],
        "categoria": "Arma de Alcance Avançada"
    },
    
    # Armas de Longo Alcance - COM RECARGA
    "Besta": {
        "dados": [(6, 2), (4, 1)], 
        "atributo": "Grace",
        "requisitos": ["Recarga"],
        "categoria": "Arma de Alcance com Recarga"
    },
    "Pistola de pólvora": {
        "dados": [(6, 1), (4, 2)], 
        "atributo": "Grace",
        "requisitos": ["Recarga"],
        "categoria": "Arma de Alcance com Recarga"
    },
    
    # Armas de Longo Alcance - COM RECARGA + MASTREIA
    "Rifle de pólvora": {
        "dados": [(8, 3), (4, 1)], 
        "atributo": "Grace",
        "requisitos": ["Recarga", "Nó de Mastreia em Armas de Longo Alcance"],
        "categoria": "Arma de Alcance Elite"
    },
}

def calcular_dano_medio(dados):
    """Calcula o dano médio esperado de uma arma"""
    dano_medio = 0
    for faces, quantidade in dados:
        media_dado = (1 + faces) / 2
        dano_medio += media_dado * quantidade
    return dano_medio

def calcular_dano_minimo(dados):
    """Calcula o dano mínimo possível"""
    return sum(quantidade for _, quantidade in dados)

def calcular_dano_maximo(dados):
    """Calcula o dano máximo possível"""
    return sum(faces * quantidade for faces, quantidade in dados)

def calcular_pontuacao_requisito(requisitos):
    """Calcula pontuação de penalidade baseado nos requisitos"""
    pontuacao = 0
    if "Recarga" in requisitos:
        pontuacao += 1  # Recarga = penalidade mecânica
    if any("Mastreia" in req or "Nó" in req for req in requisitos):
        pontuacao += 1  # Mastreia = investimento de progressão
    return pontuacao

# Análise das armas
print("=" * 100)
print("ANÁLISE DE BALANCEAMENTO - CONSIDERANDO PRÉ-REQUISITOS E PENALIDADES")
print("=" * 100)
print()

resultados = []

for nome, info in armas.items():
    dados = info["dados"]
    requisitos = info["requisitos"]
    categoria = info["categoria"]
    
    dano_medio = calcular_dano_medio(dados)
    dano_min = calcular_dano_minimo(dados)
    dano_max = calcular_dano_maximo(dados)
    pontuacao_req = calcular_pontuacao_requisito(requisitos)
    
    # Valor esperado: quanto dano a arma DEVERIA ter baseado nos requisitos
    # Armas básicas: 5.0 de base
    # +3.0 por cada requisito
    dano_esperado_min = 5.0 + (pontuacao_req * 3.0)
    
    # Comparar dano real vs esperado
    diferenca = dano_medio - dano_esperado_min
    
    resultados.append({
        "nome": nome,
        "categoria": categoria,
        "dano_medio": dano_medio,
        "dano_min": dano_min,
        "dano_max": dano_max,
        "requisitos": requisitos,
        "num_requisitos": pontuacao_req,
        "dano_esperado": dano_esperado_min,
        "diferenca": diferenca,
        "balanceado": diferenca >= 0
    })

# Agrupar por categoria
categorias = {}
for r in resultados:
    cat = r["categoria"]
    if cat not in categorias:
        categorias[cat] = []
    categorias[cat].append(r)

# Análise por categoria
print("📊 ANÁLISE POR CATEGORIA E REQUISITOS\n")
print("=" * 100)

ordem_categorias = [
    "Arma Branca Básica",
    "Arma Branca Avançada", 
    "Arma de Alcance Básica",
    "Arma de Alcance Avançada",
    "Arma de Alcance com Recarga",
    "Arma de Alcance Elite"
]

for cat in ordem_categorias:
    if cat not in categorias:
        continue
        
    armas_cat = sorted(categorias[cat], key=lambda x: x["dano_medio"], reverse=True)
    
    print(f"\n{'='*100}")
    print(f"📌 {cat}")
    print(f"{'='*100}")
    
    # Determinar requisitos da categoria
    exemplo = armas_cat[0]
    if exemplo["num_requisitos"] == 0:
        print("   Requisitos: NENHUM")
        print("   Dano Esperado Mínimo: 5.0")
    elif exemplo["num_requisitos"] == 1:
        if "Recarga" in exemplo["requisitos"]:
            print("   Requisitos: Recarga (Penalidade de Ação)")
            print("   Dano Esperado Mínimo: 8.0")
        else:
            print("   Requisitos: Nó de Mastreia (Investimento de Progressão)")
            print("   Dano Esperado Mínimo: 8.0")
    elif exemplo["num_requisitos"] == 2:
        print("   Requisitos: Recarga + Nó de Mastreia (Penalidade + Investimento)")
        print("   Dano Esperado Mínimo: 11.0")
    
    print(f"\n   {'Arma':<30} {'Dano Médio':<12} {'Range':<12} {'Status':<15} {'Diferença':<10}")
    print(f"   {'-'*95}")
    
    for arma in armas_cat:
        status = "✅ BOM" if arma["balanceado"] else "❌ FRACO"
        cor_dif = "+" if arma["diferenca"] >= 0 else ""
        print(f"   {arma['nome']:<30} {arma['dano_medio']:<12.2f} "
              f"{arma['dano_min']}-{arma['dano_max']:<9} {status:<15} "
              f"{cor_dif}{arma['diferenca']:.2f}")

# Resumo de problemas de balanceamento
print(f"\n\n{'='*100}")
print("⚠️  PROBLEMAS DE BALANCEAMENTO IDENTIFICADOS")
print(f"{'='*100}\n")

problemas = [r for r in resultados if not r["balanceado"]]
if problemas:
    problemas.sort(key=lambda x: x["diferenca"])
    for p in problemas:
        print(f"❌ {p['nome']}")
        print(f"   Categoria: {p['categoria']}")
        print(f"   Requisitos: {', '.join(p['requisitos']) if p['requisitos'] else 'Nenhum'}")
        print(f"   Dano Atual: {p['dano_medio']:.2f} | Dano Esperado: {p['dano_esperado']:.2f}")
        print(f"   DÉFICIT: {abs(p['diferenca']):.2f} de dano")
        print(f"   Recomendação: Aumentar o dano em ~{abs(p['diferenca']):.0f} pontos\n")
else:
    print("✅ Nenhum problema crítico encontrado!\n")

# Comparação direta entre armas similares
print(f"\n{'='*100}")
print("🔄 COMPARAÇÕES DIRETAS (armas do mesmo tipo/atributo)")
print(f"{'='*100}\n")

print("🗡️  ARMAS MIGHT - BÁSICAS vs AVANÇADAS:")
print("-" * 100)
basicas_might = [r for r in resultados if r["categoria"] == "Arma Branca Básica" and armas[r["nome"]]["atributo"] == "Might"]
avancadas_might = [r for r in resultados if r["categoria"] == "Arma Branca Avançada"]

media_basicas = sum(r["dano_medio"] for r in basicas_might) / len(basicas_might)
media_avancadas = sum(r["dano_medio"] for r in avancadas_might) / len(avancadas_might)

print(f"Média Armas Básicas: {media_basicas:.2f}")
print(f"Média Armas Avançadas (com Mastreia): {media_avancadas:.2f}")
print(f"Diferença: +{media_avancadas - media_basicas:.2f} ({((media_avancadas/media_basicas - 1) * 100):.1f}% mais forte)")
if media_avancadas >= media_basicas + 3:
    print("✅ Balanceado - Armas avançadas justificam o investimento")
else:
    print("⚠️  Armas avançadas deveriam ser ~3+ pontos mais fortes")

print("\n🏹 ARMAS GRACE - BÁSICAS vs COM RECARGA vs ELITE:")
print("-" * 100)
basicas_grace = [r for r in resultados if r["categoria"] == "Arma de Alcance Básica"]
recarga_grace = [r for r in resultados if r["categoria"] == "Arma de Alcance com Recarga"]
elite_grace = [r for r in resultados if r["categoria"] == "Arma de Alcance Elite"]

media_basicas_g = sum(r["dano_medio"] for r in basicas_grace) / len(basicas_grace) if basicas_grace else 0
media_recarga = sum(r["dano_medio"] for r in recarga_grace) / len(recarga_grace) if recarga_grace else 0
media_elite = sum(r["dano_medio"] for r in elite_grace) / len(elite_grace) if elite_grace else 0

print(f"Média Armas Básicas: {media_basicas_g:.2f}")
print(f"Média Armas com Recarga: {media_recarga:.2f} (Diferença: +{media_recarga - media_basicas_g:.2f})")
print(f"Média Armas Elite (Recarga + Mastreia): {media_elite:.2f} (Diferença: +{media_elite - media_basicas_g:.2f})")

if media_recarga >= media_basicas_g + 3:
    print("✅ Recarga está bem compensada")
else:
    print("⚠️  Recarga deveria adicionar ~3+ de dano")

if media_elite >= media_basicas_g + 6:
    print("✅ Requisitos duplos bem compensados")
else:
    print("⚠️  Requisitos duplos deveriam adicionar ~6+ de dano")

# Análise de progressão
print(f"\n\n{'='*100}")
print("📈 ANÁLISE DE PROGRESSÃO DE PODER")
print(f"{'='*100}\n")

print("Tier 0 (Sem Requisitos): 2.5 - 7.0 de dano médio")
print("Tier 1 (1 Requisito):    8.0 - 12.0 de dano médio (esperado)")
print("Tier 2 (2 Requisitos):   11.0+ de dano médio (esperado)")

print("\nDistribuição Real:")
tier0 = [r for r in resultados if r["num_requisitos"] == 0]
tier1 = [r for r in resultados if r["num_requisitos"] == 1]
tier2 = [r for r in resultados if r["num_requisitos"] == 2]

if tier0:
    print(f"Tier 0: {min(r['dano_medio'] for r in tier0):.1f} - {max(r['dano_medio'] for r in tier0):.1f}")
if tier1:
    print(f"Tier 1: {min(r['dano_medio'] for r in tier1):.1f} - {max(r['dano_medio'] for r in tier1):.1f}")
if tier2:
    print(f"Tier 2: {min(r['dano_medio'] for r in tier2):.1f} - {max(r['dano_medio'] for r in tier2):.1f}")

print("\n" + "=" * 100)
print("✅ ANÁLISE COMPLETA!")
print("=" * 100)
