"""Gera src/app/icon.svg e src/app/apple-icon.png a partir do logótipo (só retângulos).

Sem dependências: o PNG é escrito à mão (zlib + struct). Uso: python3 scripts/gerar-icone.py
Manter as formas iguais às de src/components/ui/Logo.tsx (grelha 100×100).
"""
import struct
import zlib
from pathlib import Path

FUNDO = (0x1C, 0x1C, 0x1E)
BASE = (0xFF, 0xFF, 0xFF)
DESTAQUE = (0x3C, 0xC2, 0xB0)

# Retângulos (x0, y0, x1, y1, cor) na grelha 100×100.
MOLDURA = [(0, 0, 100, 12), (0, 88, 100, 100), (0, 12, 12, 88), (88, 12, 100, 88)]
LETRA_F = [(26, 26, 36, 74), (36, 26, 58, 36), (36, 45, 52, 54)]
LETRA_L = [(62, 26, 72, 74), (72, 64, 80, 74)]
RETANGULOS = [(*r, BASE) for r in MOLDURA + LETRA_F] + [(*r, DESTAQUE) for r in LETRA_L]

RAIZ = Path(__file__).resolve().parent.parent


def svg() -> str:
    hexa = lambda c: '#%02X%02X%02X' % c
    rects = ''.join(
        f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" fill="{hexa(c)}"/>' for x0, y0, x1, y1, c in RETANGULOS
    )
    # Fundo escuro com margem: o ícone ocupa 70% do quadrado.
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 140 140">'
        f'<rect x="-20" y="-20" width="140" height="140" rx="24" fill="{hexa(FUNDO)}"/>{rects}</svg>\n'
    )


def png(tamanho: int) -> bytes:
    escala = tamanho * 0.7 / 100
    margem = tamanho * 0.15
    pixeis = [[FUNDO] * tamanho for _ in range(tamanho)]
    for x0, y0, x1, y1, cor in RETANGULOS:
        for y in range(round(margem + y0 * escala), round(margem + y1 * escala)):
            for x in range(round(margem + x0 * escala), round(margem + x1 * escala)):
                pixeis[y][x] = cor
    cru = b''.join(b'\x00' + bytes(v for p in linha for v in p) for linha in pixeis)

    def bloco(tipo: bytes, dados: bytes) -> bytes:
        return struct.pack('>I', len(dados)) + tipo + dados + struct.pack('>I', zlib.crc32(tipo + dados) & 0xFFFFFFFF)

    cabecalho = struct.pack('>IIBBBBB', tamanho, tamanho, 8, 2, 0, 0, 0)  # RGB, 8 bits
    return b'\x89PNG\r\n\x1a\n' + bloco(b'IHDR', cabecalho) + bloco(b'IDAT', zlib.compress(cru, 9)) + bloco(b'IEND', b'')


if __name__ == '__main__':
    (RAIZ / 'src/app/icon.svg').write_text(svg())
    (RAIZ / 'src/app/apple-icon.png').write_bytes(png(180))
    print('icon.svg e apple-icon.png gerados.')
