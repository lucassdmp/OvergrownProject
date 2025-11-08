import statistics
import random
from collections import defaultdict

# Definição das armas com suas rolagens de dados
armas = {
    # Armas Brancas
    "Adaga": {"dados": [(4, 2)], "atributo": "Grace"},
    "Bo": {"dados": [(10, 1)], "atributo": "Grace"},
    "Clava": {"dados": [(4, 2)], "atributo": "Might"},
    "Espada de uma mão": {"dados": [(6, 2)], "atributo": "Might"},
    "Foice": {"dados": [(8, 2), (4, 1)], "atributo": "Might"},
    "Lança": {"dados": [(8, 1), (6, 2)], "atributo": "Might"},
    "Machado de duas mãos": {"dados": [(6, 1), (4, 3)], "atributo": "Might"},
    "Mangual": {"dados": [(6, 1), (4, 1)], "atributo": "Might"},
    "Martelo de guerra": {"dados": [(6, 4)], "atributo": "Might"},
    "Martelo leve": {"dados": [(4, 2)], "atributo": "Might"},
    "Maça": {"dados": [(4, 2)], "atributo": "Might"},
    "Rapiera/Florete": {"dados": [(4, 1), (6, 1)], "atributo": "Grace"},
    "Socos": {"dados": [(6, 1)], "atributo": "Might"},
    
    # Armas de Longo Alcance
    "Arco Curto": {"dados": [(4, 2)], "atributo": "Grace"},
    "Arco Longo/Arco composto": {"dados": [(6, 3)], "atributo": "Grace"},
    "Besta": {"dados": [(6, 2), (4, 1)], "atributo": "Grace"},
    "Pistola de pólvora": {"dados": [(6, 1), (4, 2)], "atributo": "Grace"},
    "Rifle de pólvora": {"dados": [(8, 3), (4, 1)], "atributo": "Grace"},
}

def calcular_dano_medio(dados):
    """Calcula o dano médio esperado de uma arma"""
    dano_medio = 0
    for faces, quantidade in dados:
        # Média de um dado = (1 + faces) / 2
        media_dado = (1 + faces) / 2
        dano_medio += media_dado * quantidade
    return dano_medio

def calcular_dano_minimo(dados):
    """Calcula o dano mínimo possível"""
    return sum(quantidade for _, quantidade in dados)

def calcular_dano_maximo(dados):
    """Calcula o dano máximo possível"""
    return sum(faces * quantidade for faces, quantidade in dados)

def simular_rolagens(dados, num_simulacoes=10000):
    """Simula múltiplas rolagens para análise estatística"""
    resultados = []
    for _ in range(num_simulacoes):
        dano_total = 0
        for faces, quantidade in dados:
            for _ in range(quantidade):
                dano_total += random.randint(1, faces)
        resultados.append(dano_total)
    return resultados

def calcular_probabilidade_ranges(resultados):
    """Calcula a probabilidade de diferentes ranges de dano"""
    total = len(resultados)
    ranges = {
        "1-5": 0,
        "6-10": 0,
        "11-15": 0,
        "16-20": 0,
        "21-25": 0,
        "26+": 0
    }
    
    for valor in resultados:
        if valor <= 5:
            ranges["1-5"] += 1
        elif valor <= 10:
            ranges["6-10"] += 1
        elif valor <= 15:
            ranges["11-15"] += 1
        elif valor <= 20:
            ranges["16-20"] += 1
        elif valor <= 25:
            ranges["21-25"] += 1
        else:
            ranges["26+"] += 1
    
    # Converter para porcentagens
    for key in ranges:
        ranges[key] = (ranges[key] / total) * 100
    
    return ranges

# Análise das armas
print("=" * 80)
print("ANÁLISE PROBABILÍSTICA DAS ARMAS - OVERGROWN SISTEMA")
print("=" * 80)
print()

resultados_armas = []

for nome, info in armas.items():
    dados = info["dados"]
    atributo = info["atributo"]
    
    dano_min = calcular_dano_minimo(dados)
    dano_max = calcular_dano_maximo(dados)
    dano_medio = calcular_dano_medio(dados)
    
    # Simulação
    simulacoes = simular_rolagens(dados)
    dano_mediano = statistics.median(simulacoes)
    desvio_padrao = statistics.stdev(simulacoes)
    
    resultados_armas.append({
        "nome": nome,
        "atributo": atributo,
        "dano_min": dano_min,
        "dano_max": dano_max,
        "dano_medio": dano_medio,
        "dano_mediano": dano_mediano,
        "desvio_padrao": desvio_padrao,
        "simulacoes": simulacoes
    })

# Ordenar por dano médio (decrescente)
resultados_armas.sort(key=lambda x: x["dano_medio"], reverse=True)

print("\n📊 RANKING DE ARMAS POR DANO MÉDIO (sem modificadores de atributo)\n")
print(f"{'#':<3} {'Arma':<25} {'Atrib':<7} {'Min':<5} {'Médio':<8} {'Mediano':<9} {'Max':<5} {'Desvio':<7}")
print("-" * 80)

for i, arma in enumerate(resultados_armas, 1):
    print(f"{i:<3} {arma['nome']:<25} {arma['atributo']:<7} "
          f"{arma['dano_min']:<5} {arma['dano_medio']:<8.2f} "
          f"{arma['dano_mediano']:<9.2f} {arma['dano_max']:<5} "
          f"{arma['desvio_padrao']:<7.2f}")

# Análise por categoria
print("\n" + "=" * 80)
print("ANÁLISE POR CATEGORIA")
print("=" * 80)

# Armas Might
print("\n🗡️  ARMAS MIGHT:")
armas_might = [a for a in resultados_armas if a["atributo"] == "Might"]
for i, arma in enumerate(armas_might, 1):
    print(f"  {i}. {arma['nome']:<25} - Média: {arma['dano_medio']:.2f} | Range: {arma['dano_min']}-{arma['dano_max']}")

# Armas Grace
print("\n🏹 ARMAS GRACE:")
armas_grace = [a for a in resultados_armas if a["atributo"] == "Grace"]
for i, arma in enumerate(armas_grace, 1):
    print(f"  {i}. {arma['nome']:<25} - Média: {arma['dano_medio']:.2f} | Range: {arma['dano_min']}-{arma['dano_max']}")

# Top 5 armas mais fortes
print("\n" + "=" * 80)
print("🏆 TOP 5 ARMAS MAIS FORTES (por dano médio)")
print("=" * 80)
for i, arma in enumerate(resultados_armas[:5], 1):
    print(f"\n{i}. {arma['nome']} ({arma['atributo']})")
    print(f"   Dano Médio: {arma['dano_medio']:.2f}")
    print(f"   Range: {arma['dano_min']} - {arma['dano_max']}")
    print(f"   Desvio Padrão: {arma['desvio_padrao']:.2f}")
    
    # Probabilidade por ranges
    ranges = calcular_probabilidade_ranges(arma['simulacoes'])
    print(f"   Distribuição de dano:")
    for range_key, prob in ranges.items():
        if prob > 0:
            barra = "█" * int(prob / 2)
            print(f"      {range_key}: {prob:5.1f}% {barra}")

# Análise de consistência
print("\n" + "=" * 80)
print("📈 ANÁLISE DE CONSISTÊNCIA (menor desvio padrão = mais consistente)")
print("=" * 80)

armas_por_consistencia = sorted(resultados_armas, key=lambda x: x["desvio_padrao"])
print("\nArmas Mais Consistentes:")
for i, arma in enumerate(armas_por_consistencia[:5], 1):
    print(f"  {i}. {arma['nome']:<25} - Desvio: {arma['desvio_padrao']:.2f} | Média: {arma['dano_medio']:.2f}")

print("\nArmas Menos Consistentes (mais variáveis):")
for i, arma in enumerate(reversed(armas_por_consistencia[-5:]), 1):
    print(f"  {i}. {arma['nome']:<25} - Desvio: {arma['desvio_padrao']:.2f} | Média: {arma['dano_medio']:.2f}")

# Comparação com modificadores
print("\n" + "=" * 80)
print("💪 SIMULAÇÃO COM MODIFICADORES DE ATRIBUTO")
print("=" * 80)
print("\nConsiderando modificadores de +2, +4 e +6:")

modificadores = [2, 4, 6]
print(f"\n{'Arma':<25} {'Mod +2':<10} {'Mod +4':<10} {'Mod +6':<10}")
print("-" * 65)
for arma in resultados_armas[:10]:  # Top 10
    valores = [f"{arma['dano_medio'] + mod:.1f}" for mod in modificadores]
    print(f"{arma['nome']:<25} {valores[0]:<10} {valores[1]:<10} {valores[2]:<10}")

print("\n" + "=" * 80)
print("✅ Análise concluída!")
print("=" * 80)
