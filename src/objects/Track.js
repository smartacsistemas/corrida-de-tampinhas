// ---------- Pista grande: geometria e zonas especiais ----------
// A pista é um anel entre uma borda externa e uma "ilha" central, com raio variável
// por ângulo (várias harmônicas de seno) — isso cria muitas curvas, retas e "esses",
// como uma pista de giz bem comprida desenhada de verdade num quintal grande.
//
// Importante: a pista NÃO tem paredes físicas. As linhas são só risco de giz — se a
// tampinha passar da linha (por um peteleco forte ou por ter sido empurrada numa batida),
// é falta: ela volta um pouquinho (RETROCESSO_DISTANCIA) pra trás de onde saiu, sem
// nenhuma barreira sólida no caminho. Isso é o que permite tirar o adversário da pista
// na porrada, em vez de ele simplesmente "bater numa parede" e ficar preso do lado de dentro.

const MUNDO_LARGURA = 3000;
const MUNDO_ALTURA = 2400;

function pontoNaElipse(cx, cy, raioX, raioY, angulo) {
    return {
        x: cx + Math.cos(angulo) * raioX,
        y: cy + Math.sin(angulo) * raioY
    };
}

// devolve a definição completa da pista (centro + funções de raio por ângulo)
function construirPista() {
    const centro = { x: MUNDO_LARGURA / 2, y: MUNDO_ALTURA / 2 - 50 };
    // Largura aumentada ~30% para dar espaço a ultrapassagens
    const LARGURA_X = 260; // 200 * 1.3
    const LARGURA_Y = 188; // 145 * 1.3

    // curvas mais amplas e suaves — menos harmônicos muito altos
    const raioXExt = (a) => 1000
        + 238 * Math.sin(2 * a + 0.4)   // ampliado ~40%
        + 126 * Math.sin(4 * a - 0.6)   // frequência um pouco menor para suavizar
        + 48  * Math.sin(7 * a + 1.0);

    const raioYExt = (a) => 760
        + 182 * Math.sin(3 * a - 0.3)
        + 91  * Math.sin(5 * a + 0.9)
        + 49  * Math.sin(8 * a + 0.5);

    const raioXInt = (a) => raioXExt(a) - LARGURA_X;
    const raioYInt = (a) => raioYExt(a) - LARGURA_Y;

    return { centro, raioXExt, raioYExt, raioXInt, raioYInt, larguraX: LARGURA_X, larguraY: LARGURA_Y };
}

// mantém um ângulo dentro de [-π, π]
function normalizarAngulo(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}

// verifica se um ponto (x,y) está dentro do anel da pista naquele ângulo específico
function calcularStatusNaPista(pista, x, y) {
    const dx = x - pista.centro.x;
    const dy = y - pista.centro.y;
    const theta = Math.atan2(dy, dx);

    const rx = pista.raioXExt(theta), ry = pista.raioYExt(theta);
    const rxi = pista.raioXInt(theta), ryi = pista.raioYInt(theta);

    const nExt = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
    const nInt = Math.sqrt((dx / rxi) ** 2 + (dy / ryi) ** 2);

    return { theta, nExt, nInt, dentro: nExt <= 1.03 && nInt >= 0.97 };
}

// raio "local" aproximado da pista num ângulo (usado só pra converter uma distância em
// metros/pixels numa variação de ângulo equivalente — não precisa ser exato)
function raioLocalPista(pista, angulo) {
    return (pista.raioXExt(angulo) + pista.raioYExt(angulo)) / 2;
}

// vetor tangente (não normalizado) à pista num ângulo — usado pra saber se a tampinha
// estava indo "no sentido horário" ou "anti-horário" no instante em que saiu da pista.
function tangentePista(pista, angulo) {
    return {
        x: -Math.sin(angulo) * pista.raioXExt(angulo),
        y: Math.cos(angulo) * pista.raioYExt(angulo)
    };
}

// desenha a pista riscada de giz: fundo tingido do anel + contornos irregulares + linha de chegada
function desenharPista(scene, pista) {
    const { centro } = pista;
    const passos = 360;

    const fundo = scene.add.graphics();
    fundo.fillStyle(0xffffff, 0.05);
    const pontosExt = [];
    for (let i = 0; i <= passos; i++) {
        const angulo = (Math.PI * 2 / passos) * i;
        pontosExt.push(pontoNaElipse(centro.x, centro.y, pista.raioXExt(angulo), pista.raioYExt(angulo), angulo));
    }
    fundo.fillPoints(pontosExt, true);

    fundo.fillStyle(0x000000, 0.12);
    const pontosInt = [];
    for (let i = 0; i <= passos; i++) {
        const angulo = (Math.PI * 2 / passos) * i;
        pontosInt.push(pontoNaElipse(centro.x, centro.y, pista.raioXInt(angulo), pista.raioYInt(angulo), angulo));
    }
    fundo.fillPoints(pontosInt, true);

    const contorno = (raioXFn, raioYFn) => {
        const g = scene.add.graphics();
        g.lineStyle(5, 0xffffff, 0.85);
        g.beginPath();
        for (let i = 0; i <= passos; i++) {
            const angulo = (Math.PI * 2 / passos) * i;
            const p = pontoNaElipse(centro.x, centro.y, raioXFn(angulo), raioYFn(angulo), angulo);
            // jitter sutil para dar aparência de giz sem criar quinas.
            const jx = p.x + Phaser.Math.FloatBetween(-1.5, 1.5);
            const jy = p.y + Phaser.Math.FloatBetween(-1.5, 1.5);
            if (i === 0) g.moveTo(jx, jy); else g.lineTo(jx, jy);
        }
        g.strokePath();
    };

    contorno(pista.raioXExt, pista.raioYExt);
    contorno(pista.raioXInt, pista.raioYInt);

    // linha de chegada — risco perpendicular à pista, no ângulo 0
    const externo = pontoNaElipse(centro.x, centro.y, pista.raioXExt(0), pista.raioYExt(0), 0);
    const interno = pontoNaElipse(centro.x, centro.y, pista.raioXInt(0), pista.raioYInt(0), 0);
    const segmentos = 10;
    for (let i = 0; i < segmentos; i++) {
        const t0 = i / segmentos;
        const t1 = (i + 1) / segmentos;
        const x0 = Phaser.Math.Linear(interno.x, externo.x, t0);
        const y0 = Phaser.Math.Linear(interno.y, externo.y, t0);
        const x1 = Phaser.Math.Linear(interno.x, externo.x, t1);
        const y1 = Phaser.Math.Linear(interno.y, externo.y, t1);
        const g = scene.add.graphics();
        g.lineStyle(8, i % 2 === 0 ? 0x000000 : 0xffffff, 0.9);
        g.lineBetween(x0, y0, x1, y1);
    }

    // placas de "faixa" a cada 90° pra ajudar a se localizar numa pista tão grande
    const marcos = ['LARGADA', '1/4 DA VOLTA', 'METADE DA VOLTA', '3/4 DA VOLTA'];
    for (let i = 0; i < 4; i++) {
        if (i === 0) continue; // a largada já tem a faixa quadriculada
        const angulo = (Math.PI / 2) * i;
        const pExt = pontoNaElipse(centro.x, centro.y, pista.raioXExt(angulo) + 60, pista.raioYExt(angulo) + 60, angulo);
        scene.add.text(pExt.x, pExt.y, marcos[i], {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#00000055',
            padding: { x: 6, y: 3 }
        }).setOrigin(0.5).setAlpha(0.8);
    }
}

// desenha uma zona especial (poça d'água ou grama/areia) que atravessa a pista numa faixa angular
function desenharZonaEspecial(scene, pista, zona, cor, alpha) {
    const { centro } = pista;
    const passos = 20;

    const g = scene.add.graphics();
    g.fillStyle(cor, alpha);
    const pontos = [];
    for (let i = 0; i <= passos; i++) {
        const a = zona.angulo - zona.meiaLargura + (2 * zona.meiaLargura) * (i / passos);
        pontos.push(pontoNaElipse(centro.x, centro.y, pista.raioXExt(a), pista.raioYExt(a), a));
    }
    for (let i = passos; i >= 0; i--) {
        const a = zona.angulo - zona.meiaLargura + (2 * zona.meiaLargura) * (i / passos);
        pontos.push(pontoNaElipse(centro.x, centro.y, pista.raioXInt(a), pista.raioYInt(a), a));
    }
    g.fillPoints(pontos, true);
    return g;
}

// poça d'água + mangueira — devagar ali a tampinha escorrega pro lado
function desenharZonaAgua(scene, pista, zona) {
    const { centro } = pista;
    desenharZonaEspecial(scene, pista, zona, 0x3f9fd6, 0.3);

    const passos = 16;
    const g = scene.add.graphics();
    g.lineStyle(2, 0xffffff, 0.4);
    for (let l = 0; l < 3; l++) {
        g.beginPath();
        for (let i = 0; i <= passos; i++) {
            const t = i / passos;
            const a = zona.angulo - zona.meiaLargura * 0.7 + zona.meiaLargura * 1.4 * t;
            const frac = 0.28 + l * 0.22;
            const rx = Phaser.Math.Linear(pista.raioXInt(a), pista.raioXExt(a), frac);
            const ry = Phaser.Math.Linear(pista.raioYInt(a), pista.raioYExt(a), frac);
            const p = pontoNaElipse(centro.x, centro.y, rx, ry, a);
            if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
        }
        g.strokePath();
    }

    const posMangueira = pontoNaElipse(centro.x, centro.y, pista.raioXExt(zona.angulo) + 34, pista.raioYExt(zona.angulo) + 34, zona.angulo);
    scene.add.image(posMangueira.x, posMangueira.y, criarTexturaMangueira(scene));

    const pExt = pontoNaElipse(centro.x, centro.y, pista.raioXExt(zona.angulo), pista.raioYExt(zona.angulo), zona.angulo);
    scene.add.image(pExt.x, pExt.y, criarTexturaBicoMangueira(scene)).setRotation(zona.angulo + Math.PI / 2).setDepth(1);
}

// trecho de grama/areia — mais atrito, a tampinha perde força mais rápido ali
function desenharZonaAreia(scene, pista, zona) {
    desenharZonaEspecial(scene, pista, zona, 0x9c8a4e, 0.35);

    for (let i = 0; i < 10; i++) {
        const a = zona.angulo - zona.meiaLargura + Phaser.Math.FloatBetween(0, 2 * zona.meiaLargura);
        const frac = Phaser.Math.FloatBetween(0.15, 0.85);
        const rx = Phaser.Math.Linear(pista.raioXInt(a), pista.raioXExt(a), frac);
        const ry = Phaser.Math.Linear(pista.raioYInt(a), pista.raioYExt(a), frac);
        const p = pontoNaElipse(pista.centro.x, pista.centro.y, rx, ry, a);
        scene.add.image(p.x, p.y, criarTexturaTouceira(scene)).setAlpha(0.85)
            .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }
}

// espalha decoração ao longo de toda a borda externa da pista grande (não mais nos "cantos da tela")
function espalharDecoracaoNaPista(scene, pista) {
    const miudos = [criarTexturaFolha(scene), criarTexturaPedra(scene)];
    const voltas = 90;

    for (let i = 0; i < voltas; i++) {
        const angulo = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const margem = Phaser.Math.Between(50, 170);
        const p = pontoNaElipse(
            pista.centro.x, pista.centro.y,
            pista.raioXExt(angulo) + margem, pista.raioYExt(angulo) + margem,
            angulo
        );
        if (p.x < 0 || p.x > MUNDO_LARGURA || p.y < 0 || p.y > MUNDO_ALTURA) continue;

        const tipo = Phaser.Utils.Array.GetRandom(miudos);
        scene.add.image(p.x, p.y, tipo)
            .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
            .setAlpha(0.85);
    }

    for (let i = 0; i < 45; i++) {
        const angulo = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const margem = Phaser.Math.Between(20, 90);
        const p = pontoNaElipse(
            pista.centro.x, pista.centro.y,
            pista.raioXExt(angulo) + margem, pista.raioYExt(angulo) + margem,
            angulo
        );
        if (p.x < 0 || p.x > MUNDO_LARGURA || p.y < 0 || p.y > MUNDO_ALTURA) continue;
        scene.add.image(p.x, p.y, criarTexturaTouceira(scene)).setAlpha(0.9);
    }

    // vasos e chinelo espalhados ao redor, só decorando, longe da pista
    const pontosDecor = [];
    for (let i = 0; i < 6; i++) {
        const angulo = (Math.PI * 2 / 6) * i + Phaser.Math.FloatBetween(-0.2, 0.2);
        const margem = Phaser.Math.Between(120, 200);
        pontosDecor.push(pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXExt(angulo) + margem, pista.raioYExt(angulo) + margem, angulo));
    }
    Phaser.Utils.Array.Shuffle(pontosDecor).slice(0, 4).forEach(pos => {
        if (pos.x < 20 || pos.x > MUNDO_LARGURA - 20 || pos.y < 20 || pos.y > MUNDO_ALTURA - 20) return;
        scene.add.image(pos.x, pos.y, criarTexturaVaso(scene)).setRotation(Phaser.Math.FloatBetween(-0.08, 0.08));
    });
    const cantoChinelo = pontosDecor[4] || pontosDecor[0];
    scene.add.image(cantoChinelo.x + 14, cantoChinelo.y + 6, criarTexturaChinelo(scene))
        .setRotation(Phaser.Math.FloatBetween(-0.5, 0.5)).setAlpha(0.9);
}

// decora a ilha central com um vasinho e algumas pedrinhas
function decorarIlhaCentral(scene, pista) {
    const raioMedioX = (pista.raioXInt(0) + pista.raioXInt(Math.PI / 2)) / 2 * 0.5;
    const raioMedioY = (pista.raioYInt(0) + pista.raioYInt(Math.PI / 2)) / 2 * 0.5;

    scene.add.image(pista.centro.x, pista.centro.y - raioMedioY * 0.3, criarTexturaVaso(scene)).setScale(1.4);

    for (let i = 0; i < 10; i++) {
        const angulo = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const r = Phaser.Math.FloatBetween(0.15, 0.75);
        const x = pista.centro.x + Math.cos(angulo) * raioMedioX * r;
        const y = pista.centro.y + Math.sin(angulo) * raioMedioY * r;
        scene.add.image(x, y, criarTexturaPedra(scene)).setAlpha(0.8)
            .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }

    scene.add.text(pista.centro.x, pista.centro.y + raioMedioY * 0.35, '🏁', { fontSize: '40px' }).setOrigin(0.5).setAlpha(0.9);
}
