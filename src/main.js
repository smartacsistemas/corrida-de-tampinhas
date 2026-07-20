// ---------- Estado global do jogo (persiste entre scenes) ----------
const JogoState = {
    corJogador: 0xe74c3c,       // cor da marca padrão (Cola Max)
    marcaJogador: 'Cola Max'    // nome da marca padrão, na primeira vez
};

// ---------- Gerador de sons sintetizados ----------
const SomFX = {
    ctx: null,

    iniciar() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    criarRuido(duracao) {
        const tamanho = this.ctx.sampleRate * duracao;
        const buffer = this.ctx.createBuffer(1, tamanho, this.ctx.sampleRate);
        const dados = buffer.getChannelData(0);
        for (let i = 0; i < tamanho; i++) {
            dados[i] = Math.random() * 2 - 1;
        }
        return buffer;
    },

    peteleco() {
        this.iniciar();
        const t = this.ctx.currentTime;

        const ruido = this.ctx.createBufferSource();
        ruido.buffer = this.criarRuido(0.05);

        const filtroAgudo = this.ctx.createBiquadFilter();
        filtroAgudo.type = 'highpass';
        filtroAgudo.frequency.setValueAtTime(3000, t);

        const gainRuido = this.ctx.createGain();
        gainRuido.gain.setValueAtTime(0.5, t);
        gainRuido.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        ruido.connect(filtroAgudo).connect(gainRuido).connect(this.ctx.destination);
        ruido.start(t);
        ruido.stop(t + 0.05);

        const osc = this.ctx.createOscillator();
        const gainOsc = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);

        gainOsc.gain.setValueAtTime(0.15, t);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gainOsc).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
    },

    colisao() {
        this.iniciar();
        const t = this.ctx.currentTime;

        const ruido = this.ctx.createBufferSource();
        ruido.buffer = this.criarRuido(0.15);

        const filtroBanda = this.ctx.createBiquadFilter();
        filtroBanda.type = 'bandpass';
        filtroBanda.frequency.setValueAtTime(2500, t);
        filtroBanda.Q.setValueAtTime(6, t);

        const gainRuido = this.ctx.createGain();
        gainRuido.gain.setValueAtTime(0.4, t);
        gainRuido.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        ruido.connect(filtroBanda).connect(gainRuido).connect(this.ctx.destination);
        ruido.start(t);
        ruido.stop(t + 0.15);

        [1800, 2650].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.1);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12 - i * 0.02);

            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    },

    vitoria() {
        this.iniciar();
        const notas = [523.25, 659.25, 783.99, 1046.5];

        notas.forEach((freq, i) => {
            const t = this.ctx.currentTime + i * 0.12;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.4);
        });
    },

    // "shhhlip" — água da mangueira fazendo a tampinha escorregar
    escorregar() {
        this.iniciar();
        const t = this.ctx.currentTime;

        const ruido = this.ctx.createBufferSource();
        ruido.buffer = this.criarRuido(0.3);

        const filtro = this.ctx.createBiquadFilter();
        filtro.type = 'bandpass';
        filtro.frequency.setValueAtTime(1800, t);
        filtro.frequency.exponentialRampToValueAtTime(500, t + 0.3);
        filtro.Q.setValueAtTime(1.2, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        ruido.connect(filtro).connect(gain).connect(this.ctx.destination);
        ruido.start(t);
        ruido.stop(t + 0.3);
    },

    // dois tons descendentes — "ops, saiu da pista"
    foraDaPista() {
        this.iniciar();
        const t = this.ctx.currentTime;
        [420, 300].forEach((freq, i) => {
            const inicio = t + i * 0.09;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, inicio);

            gain.gain.setValueAtTime(0.0001, inicio);
            gain.gain.linearRampToValueAtTime(0.1, inicio + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.13);

            osc.connect(gain).connect(this.ctx.destination);
            osc.start(inicio);
            osc.stop(inicio + 0.14);
        });
    },

    // piado curto, 2 ou 3 bicadas de pitch subindo/descendo — passarinho no quintal
    passarinho() {
        this.iniciar();
        const t = this.ctx.currentTime;
        const bicos = Phaser.Math.Between(2, 3);

        for (let i = 0; i < bicos; i++) {
            const inicio = t + i * 0.09;
            const freqBase = Phaser.Math.Between(2200, 3200);

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freqBase, inicio);
            osc.frequency.exponentialRampToValueAtTime(freqBase * 1.4, inicio + 0.03);
            osc.frequency.exponentialRampToValueAtTime(freqBase * 0.8, inicio + 0.07);

            gain.gain.setValueAtTime(0.0001, inicio);
            gain.gain.linearRampToValueAtTime(0.12, inicio + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.08);

            osc.connect(gain).connect(this.ctx.destination);
            osc.start(inicio);
            osc.stop(inicio + 0.1);
        }
    }
};

// ---------- Marcas fictícias disponíveis (fonte única, usada por todas as scenes) ----------
const MARCAS_DISPONIVEIS = [
    { nome: 'Cola Max',    cor: 0xe74c3c, corTexto: '#ffffff', icone: 'raio' },
    { nome: 'Refri Pop',   cor: 0x3498db, corTexto: '#ffffff', icone: 'onda' },
    { nome: 'Cerva Gold',  cor: 0xf1c40f, corTexto: '#000000', icone: 'coroa' },
    { nome: 'Turbo Cola',  cor: 0x2c3e50, corTexto: '#ffffff', icone: 'diamante' },
    { nome: 'Ice Beer',    cor: 0x1abc9c, corTexto: '#000000', icone: 'gota' },
    { nome: 'Limão Fresh', cor: 0x2ecc71, corTexto: '#000000', icone: 'estrela' },
    { nome: 'Roxo Bomba',  cor: 0x9b59b6, corTexto: '#ffffff', icone: 'trevo' },
    { nome: 'Laranjito',   cor: 0xe67e22, corTexto: '#000000', icone: 'sol' }
];

// ---------- Gerador de logos e texturas de tampinha (100% por código, sem imagens externas) ----------
function desenharEstrela(g, cx, cy, pontas, raioExterno, raioInterno) {
    const passos = pontas * 2;
    const pontos = [];
    for (let i = 0; i < passos; i++) {
        const r = (i % 2 === 0) ? raioExterno : raioInterno;
        const angulo = (Math.PI / pontas) * i - Math.PI / 2;
        pontos.push({ x: cx + Math.cos(angulo) * r, y: cy + Math.sin(angulo) * r });
    }
    g.fillPoints(pontos, true);
}

function desenharIcone(g, tipo, cx, cy, tam, corHex) {
    const cor = Phaser.Display.Color.HexStringToColor(corHex).color;
    g.fillStyle(cor, 0.95);
    g.lineStyle(3, cor, 0.95);

    switch (tipo) {
        case 'raio':
            g.fillPoints([
                { x: cx - 2, y: cy - tam },
                { x: cx + 5, y: cy - tam },
                { x: cx - 1, y: cy },
                { x: cx + 6, y: cy },
                { x: cx - 6, y: cy + tam },
                { x: cx - 1, y: cy + 2 },
                { x: cx - 7, y: cy + 2 }
            ], true);
            break;

        case 'estrela':
            desenharEstrela(g, cx, cy, 5, tam, tam / 2.2);
            break;

        case 'onda':
            g.beginPath();
            g.moveTo(cx - tam, cy + tam / 3);
            g.lineTo(cx - tam / 2, cy - tam / 3);
            g.lineTo(cx, cy + tam / 3);
            g.lineTo(cx + tam / 2, cy - tam / 3);
            g.lineTo(cx + tam, cy + tam / 3);
            g.strokePath();
            break;

        case 'gota':
            g.fillCircle(cx, cy + tam / 3, tam / 2);
            g.fillTriangle(cx - tam / 2, cy, cx + tam / 2, cy, cx, cy - tam);
            break;

        case 'diamante':
            g.fillPoints([
                { x: cx, y: cy - tam },
                { x: cx + tam * 0.7, y: cy },
                { x: cx, y: cy + tam },
                { x: cx - tam * 0.7, y: cy }
            ], true);
            break;

        case 'trevo':
            g.fillCircle(cx - tam / 2, cy - tam / 3, tam / 2.4);
            g.fillCircle(cx + tam / 2, cy - tam / 3, tam / 2.4);
            g.fillCircle(cx, cy + tam / 3, tam / 2.4);
            break;

        case 'coroa':
            g.fillPoints([
                { x: cx - tam, y: cy + tam / 2 },
                { x: cx - tam, y: cy - tam / 4 },
                { x: cx - tam / 2, y: cy + tam / 4 },
                { x: cx, y: cy - tam / 2 },
                { x: cx + tam / 2, y: cy + tam / 4 },
                { x: cx + tam, y: cy - tam / 4 },
                { x: cx + tam, y: cy + tam / 2 }
            ], true);
            break;

        case 'sol':
            for (let i = 0; i < 8; i++) {
                const ang = (Math.PI / 4) * i;
                g.lineBetween(
                    cx + Math.cos(ang) * (tam / 2),
                    cy + Math.sin(ang) * (tam / 2),
                    cx + Math.cos(ang) * tam,
                    cy + Math.sin(ang) * tam
                );
            }
            g.fillCircle(cx, cy, tam / 2.2);
            break;

        default:
            g.fillCircle(cx, cy, tam / 2);
    }
}

function criarTexturaTampinha(scene, marca) {
    const chave = 'tampinha_' + marca.nome.replace(/\s+/g, '_');
    if (scene.textures.exists(chave)) return chave;

    const tamanho = 76;
    const raio = 33;
    const centro = tamanho / 2;
    const g = scene.add.graphics();

    const dentes = 16;
    g.fillStyle(0xb8b8b8, 0.6);
    g.beginPath();
    for (let i = 0; i < dentes * 2; i++) {
        const angulo = (Math.PI * 2 / (dentes * 2)) * i;
        const r = (i % 2 === 0) ? raio : raio - 6;
        const x = centro + Math.cos(angulo) * r;
        const y = centro + Math.sin(angulo) * r;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();

    g.fillStyle(marca.cor, 1);
    g.fillCircle(centro, centro, raio - 7);

    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(centro - 12, centro - 14, 26, 14);

    desenharIcone(g, marca.icone, centro, centro + 6, 16, marca.corTexto);

    g.generateTexture(chave, tamanho, tamanho);
    g.destroy();

    return chave;
}

function criarTexturaParticula(scene, chave, cor) {
    if (scene.textures.exists(chave)) return chave;

    const g = scene.add.graphics();
    g.fillStyle(cor, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture(chave, 16, 16);
    g.destroy();

    return chave;
}
// ---------- Tema "quintal": cimento, giz e decoração ----------
function criarTexturaCimento(scene) {
    const chave = 'fundo_cimento';
    if (scene.textures.exists(chave)) return chave;

    const w = 800, h = 600;
    const g = scene.add.graphics();

    g.fillStyle(0xb5b0a6, 1);
    g.fillRect(0, 0, w, h);

    // granulado do cimento
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const tom = Phaser.Math.Between(-14, 14);
        const base = 181 + tom;
        const cor = Phaser.Display.Color.GetColor(base, base - 5, base - 12);
        g.fillStyle(cor, 0.4);
        g.fillRect(x, y, 2, 2);
    }

    // rachaduras
    g.lineStyle(2, 0x8f8a7d, 0.5);
    for (let c = 0; c < 5; c++) {
        let x = Math.random() * w;
        let y = Math.random() * h;
        g.beginPath();
        g.moveTo(x, y);
        const segmentos = Phaser.Math.Between(4, 7);
        for (let s = 0; s < segmentos; s++) {
            x += Phaser.Math.Between(-30, 30);
            y += Phaser.Math.Between(-30, 30);
            g.lineTo(x, y);
        }
        g.strokePath();
    }

    // manchas suaves (umidade, sujeira antiga) — poucas e bem sutis
    for (let m = 0; m < 6; m++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const raio = Phaser.Math.Between(18, 45);
        g.fillStyle(0x8a8378, Phaser.Math.FloatBetween(0.04, 0.09));
        g.fillEllipse(x, y, raio * 1.6, raio);
    }

    // vestígio de giz apagado — um risco antigo de uma brincadeira anterior
    g.lineStyle(3, 0xffffff, 0.06);
    for (let gz = 0; gz < 2; gz++) {
        let x = Math.random() * w;
        let y = Math.random() * h;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
            x += Phaser.Math.Between(-40, 40);
            y += Phaser.Math.Between(-15, 15);
            g.lineTo(x, y);
        }
        g.strokePath();
    }

    g.generateTexture(chave, w, h);
    g.destroy();
    return chave;
}

function criarTexturaFolha(scene) {
    const chave = 'decor_folha';
    if (scene.textures.exists(chave)) return chave;

    const g = scene.add.graphics();
    g.fillStyle(0xc97a2b, 1);
    g.fillEllipse(10, 10, 16, 10);
    g.lineStyle(1, 0x8b4513, 0.8);
    g.lineBetween(3, 10, 17, 10);
    g.generateTexture(chave, 20, 20);
    g.destroy();
    return chave;
}

function criarTexturaPedra(scene) {
    const chave = 'decor_pedra';
    if (scene.textures.exists(chave)) return chave;

    const g = scene.add.graphics();
    g.fillStyle(0x7a7a7a, 1);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0x9a9a9a, 0.6);
    g.fillCircle(6, 6, 3);
    g.generateTexture(chave, 16, 16);
    g.destroy();
    return chave;
}
function criarTexturaMadeira(scene) {
    const chave = 'fundo_madeira';
    if (scene.textures.exists(chave)) return chave;

    const w = 800, h = 600;
    const g = scene.add.graphics();

    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(0, 0, w, h);

    // veios da madeira (linhas onduladas)
    for (let i = 0; i < 40; i++) {
        const y = Math.random() * h;
        const tom = Phaser.Math.Between(-20, 20);
        const base = 90 + tom;
        const cor = Phaser.Display.Color.GetColor(base + 50, base + 20, base - 10);
        g.lineStyle(Phaser.Math.Between(1, 2), cor, 0.25);
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += 40) {
            g.lineTo(x, y + Math.sin(x / 60 + i) * 6);
        }
        g.strokePath();
    }

    // emendas de tábuas (linhas verticais mais escuras)
    g.lineStyle(2, 0x5b3a1f, 0.4);
    for (let x = 160; x < w; x += 160) {
        g.lineBetween(x, 0, x, h);
    }

    g.generateTexture(chave, w, h);
    g.destroy();
    return chave;
}

// desenha a pista como se fosse riscada de giz (borda levemente irregular)
// devolve um ponto sobre uma elipse centrada em (cx, cy), no ângulo dado (radianos)
function pontoNaElipse(cx, cy, raioX, raioY, angulo) {
    return {
        x: cx + Math.cos(angulo) * raioX,
        y: cy + Math.sin(angulo) * raioY
    };
}

// desenha a pista curvilínea como se fosse riscada de giz: um anel entre a borda externa e a "ilha"
// central, ambas com raio variável por ângulo (pista.raioXExt/raioYExt/raioXInt/raioYInt), o que
// cria as curvas — bem diferente de uma oval simples e lisa.
function desenharPista(scene, pista) {
    const { centro } = pista;
    const passos = 160;

    // leve tingimento do anel (a pista em si), sem poluir o fundo de cimento
    const fundo = scene.add.graphics();
    fundo.fillStyle(0xffffff, 0.05);
    const pontosExt = [];
    const pontosInt = [];
    for (let i = 0; i <= passos; i++) {
        const angulo = (Math.PI * 2 / passos) * i;
        pontosExt.push(pontoNaElipse(centro.x, centro.y, pista.raioXExt(angulo), pista.raioYExt(angulo), angulo));
    }
    fundo.fillPoints(pontosExt, true);
    fundo.fillStyle(0x000000, 0.12);
    for (let i = 0; i <= passos; i++) {
        const angulo = (Math.PI * 2 / passos) * i;
        pontosInt.push(pontoNaElipse(centro.x, centro.y, pista.raioXInt(angulo), pista.raioYInt(angulo), angulo));
    }
    fundo.fillPoints(pontosInt, true);

    const contorno = (raioXFn, raioYFn) => {
        const g = scene.add.graphics();
        g.lineStyle(4, 0xffffff, 0.85);
        g.beginPath();
        for (let i = 0; i <= passos; i++) {
            const angulo = (Math.PI * 2 / passos) * i;
            const p = pontoNaElipse(centro.x, centro.y, raioXFn(angulo), raioYFn(angulo), angulo);
            const jx = p.x + Phaser.Math.Between(-2, 2);
            const jy = p.y + Phaser.Math.Between(-2, 2);
            if (i === 0) g.moveTo(jx, jy); else g.lineTo(jx, jy);
        }
        g.strokePath();
    };

    contorno(pista.raioXExt, pista.raioYExt);
    contorno(pista.raioXInt, pista.raioYInt);

    // linha de chegada — risco perpendicular à pista, no ângulo 0
    const externo = pontoNaElipse(centro.x, centro.y, pista.raioXExt(0), pista.raioYExt(0), 0);
    const interno = pontoNaElipse(centro.x, centro.y, pista.raioXInt(0), pista.raioYInt(0), 0);
    const segmentos = 8;
    for (let i = 0; i < segmentos; i++) {
        const t0 = i / segmentos;
        const t1 = (i + 1) / segmentos;
        const x0 = Phaser.Math.Linear(interno.x, externo.x, t0);
        const y0 = Phaser.Math.Linear(interno.y, externo.y, t0);
        const x1 = Phaser.Math.Linear(interno.x, externo.x, t1);
        const y1 = Phaser.Math.Linear(interno.y, externo.y, t1);
        const g = scene.add.graphics();
        g.lineStyle(6, i % 2 === 0 ? 0x000000 : 0xffffff, 0.9);
        g.lineBetween(x0, y0, x1, y1);
    }
}

// desenha a poça d'água + mangueira que atravessa a pista numa faixa angular estreita
function desenharZonaAgua(scene, pista, zona) {
    const { centro } = pista;
    const passos = 16;

    const g = scene.add.graphics();
    g.fillStyle(0x3f9fd6, 0.3);
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

    // reflexo ondulado da luz na água
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

    // mangueira enrolada do lado de fora, perto do bico
    const posMangueira = pontoNaElipse(centro.x, centro.y, pista.raioXExt(zona.angulo) + 34, pista.raioYExt(zona.angulo) + 34, zona.angulo);
    scene.add.image(posMangueira.x, posMangueira.y, criarTexturaMangueira(scene));

    // bico da mangueira na borda externa da pista, apontando pra dentro
    const pExt = pontoNaElipse(centro.x, centro.y, pista.raioXExt(zona.angulo), pista.raioYExt(zona.angulo), zona.angulo);
    scene.add.image(pExt.x, pExt.y, criarTexturaBicoMangueira(scene)).setRotation(zona.angulo + Math.PI / 2).setDepth(1);
}

// vasinho de planta — decoração de quintal de verdade
function criarTexturaVaso(scene) {
    const chave = 'decor_vaso';
    if (scene.textures.exists(chave)) return chave;

    const w = 28, h = 34;
    const g = scene.add.graphics();

    // vaso de barro (trapézio)
    g.fillStyle(0xb0602f, 1);
    g.fillPoints([
        { x: 6, y: h - 2 }, { x: w - 6, y: h - 2 },
        { x: w - 4, y: h - 16 }, { x: 4, y: h - 16 }
    ], true);
    g.lineStyle(2, 0x8a4a22, 0.7);
    g.lineBetween(4, h - 16, w - 4, h - 16);

    // planta (folhas verdes irregulares saindo do vaso)
    g.fillStyle(0x3f8f3f, 1);
    [[-8, -4], [0, -10], [8, -3], [-3, -8]].forEach(([dx, dy]) => {
        g.fillEllipse(w / 2 + dx, h - 16 + dy, 12, 8);
    });
    g.fillStyle(0x5cb85c, 0.9);
    g.fillEllipse(w / 2, h - 22, 10, 7);

    g.generateTexture(chave, w, h);
    g.destroy();
    return chave;
}

// tijolo — usado como bordinha decorativa do quintal
function criarTexturaTijolo(scene) {
    const chave = 'decor_tijolo';
    if (scene.textures.exists(chave)) return chave;

    const g = scene.add.graphics();
    g.fillStyle(0xa8492f, 1);
    g.fillRoundedRect(0, 0, 22, 11, 2);
    g.lineStyle(1, 0x7a3320, 0.6);
    g.strokeRoundedRect(0, 0, 22, 11, 2);
    g.generateTexture(chave, 22, 11);
    g.destroy();
    return chave;
}

// chinelo havaiana esquecido no quintal
function criarTexturaChinelo(scene) {
    const chave = 'decor_chinelo';
    if (scene.textures.exists(chave)) return chave;

    const g = scene.add.graphics();
    g.fillStyle(0x2980b9, 1);
    g.fillEllipse(12, 15, 18, 26);
    g.lineStyle(2, 0xf1c40f, 0.9);
    g.beginPath();
    g.moveTo(12, 6);
    g.lineTo(5, 15);
    g.moveTo(12, 6);
    g.lineTo(19, 15);
    g.strokePath();
    g.generateTexture(chave, 24, 30);
    g.destroy();
    return chave;
}

// touceira de grama — tufo de grama crescendo entre as rachaduras do cimento
function criarTexturaTouceira(scene) {
    const chave = 'decor_touceira';
    if (scene.textures.exists(chave)) return chave;

    const g = scene.add.graphics();
    for (let i = 0; i < 7; i++) {
        const x = 3 + i * 2.4 + Phaser.Math.FloatBetween(-1, 1);
        const alt = Phaser.Math.Between(8, 16);
        g.lineStyle(2, Phaser.Display.Color.GetColor(
            Phaser.Math.Between(60, 90), Phaser.Math.Between(120, 160), Phaser.Math.Between(40, 70)
        ), 0.85);
        g.beginPath();
        g.moveTo(x, 20);
        g.lineTo(x + Phaser.Math.FloatBetween(-3, 3), 20 - alt);
        g.strokePath();
    }
    g.generateTexture(chave, 20, 20);
    g.destroy();
    return chave;
}

// mangueira de jardim enrolada — fica do lado de fora da pista, perto do bico que molha a pista
function criarTexturaMangueira(scene) {
    const chave = 'decor_mangueira';
    if (scene.textures.exists(chave)) return chave;

    const tam = 46;
    const g = scene.add.graphics();
    g.lineStyle(6, 0x1e7a3a, 1);
    g.beginPath();
    g.arc(tam / 2, tam / 2, 16, 0, Math.PI * 1.7);
    g.strokePath();
    g.lineStyle(6, 0x249c4a, 1);
    g.beginPath();
    g.arc(tam / 2, tam / 2, 9, Math.PI * 0.2, Math.PI * 2);
    g.strokePath();
    g.fillStyle(0xcccccc, 1);
    g.fillCircle(tam / 2, tam / 2, 4);
    g.generateTexture(chave, tam, tam);
    g.destroy();
    return chave;
}

// bico da mangueira, bem na beira da pista, de onde sai o fiozinho d'água
function criarTexturaBicoMangueira(scene) {
    const chave = 'decor_bico_mangueira';
    if (scene.textures.exists(chave)) return chave;

    const g = scene.add.graphics();
    g.fillStyle(0x555555, 1);
    g.fillRoundedRect(0, 4, 20, 8, 3);
    g.fillStyle(0x333333, 1);
    g.fillCircle(18, 8, 5);
    g.generateTexture(chave, 24, 16);
    g.destroy();
    return chave;
}

// espalha folhas, pedrinhas, vasos, tijolos, chinelo e grama nas margens ao redor da pista —
// deixando o quintal com cara de quintal de verdade, não só de fundo cinza vazio.
function espalharDecoracao(scene) {
    const miudos = [criarTexturaFolha(scene), criarTexturaPedra(scene)];

    for (let i = 0; i < 14; i++) {
        const zona = Phaser.Math.Between(0, 3);
        let x, y;

        if (zona === 0) { x = Phaser.Math.Between(10, 790); y = Phaser.Math.Between(8, 78); }
        else if (zona === 1) { x = Phaser.Math.Between(10, 790); y = Phaser.Math.Between(512, 592); }
        else if (zona === 2) { x = Phaser.Math.Between(4, 30); y = Phaser.Math.Between(90, 510); }
        else { x = Phaser.Math.Between(770, 796); y = Phaser.Math.Between(90, 510); }

        const tipo = Phaser.Utils.Array.GetRandom(miudos);
        scene.add.image(x, y, tipo)
            .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
            .setAlpha(0.85);
    }

    // touceiras de grama crescendo pelas fresta do cimento
    for (let i = 0; i < 8; i++) {
        const zona = Phaser.Math.Between(0, 3);
        let x, y;
        if (zona === 0) { x = Phaser.Math.Between(20, 780); y = Phaser.Math.Between(4, 40); }
        else if (zona === 1) { x = Phaser.Math.Between(20, 780); y = Phaser.Math.Between(560, 596); }
        else if (zona === 2) { x = Phaser.Math.Between(2, 20); y = Phaser.Math.Between(100, 500); }
        else { x = Phaser.Math.Between(780, 798); y = Phaser.Math.Between(100, 500); }
        scene.add.image(x, y, criarTexturaTouceira(scene)).setAlpha(0.9);
    }

    // vasos de planta e um chinelo esquecido, só nos cantos, sem atrapalhar a pista
    const cantos = [
        { x: 34, y: 34 }, { x: 766, y: 34 }, { x: 34, y: 566 }, { x: 766, y: 566 }
    ];
    Phaser.Utils.Array.Shuffle(cantos).slice(0, 3).forEach(pos => {
        scene.add.image(pos.x, pos.y, criarTexturaVaso(scene)).setRotation(Phaser.Math.FloatBetween(-0.08, 0.08));
    });
    const cantoChinelo = cantos[3] || { x: 766, y: 566 };
    scene.add.image(cantoChinelo.x + 14, cantoChinelo.y + 6, criarTexturaChinelo(scene))
        .setRotation(Phaser.Math.FloatBetween(-0.5, 0.5)).setAlpha(0.9);

    // fileira de tijolinhos decorando um canto, como bordinha de jardim
    const chaveTijolo = criarTexturaTijolo(scene);
    const cantoTijolo = Phaser.Utils.Array.GetRandom(['topo', 'base']);
    for (let i = 0; i < 5; i++) {
        const x = 60 + i * 24;
        const y = cantoTijolo === 'topo' ? 14 : 586;
        scene.add.image(x, y, chaveTijolo).setRotation(Phaser.Math.FloatBetween(-0.05, 0.05));
    }
}

// decora a ilha central com um vasinho e algumas pedrinhas, dando vida ao miolo da pista
function decorarIlhaCentral(scene, pista) {
    const raioMedioX = (pista.raioXInt(0) + pista.raioXInt(Math.PI / 2)) / 2 * 0.5;
    const raioMedioY = (pista.raioYInt(0) + pista.raioYInt(Math.PI / 2)) / 2 * 0.5;

    scene.add.image(pista.centro.x, pista.centro.y - raioMedioY * 0.3, criarTexturaVaso(scene)).setScale(0.9);

    for (let i = 0; i < 4; i++) {
        const angulo = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const r = Phaser.Math.FloatBetween(0.2, 0.7);
        const x = pista.centro.x + Math.cos(angulo) * raioMedioX * r;
        const y = pista.centro.y + Math.sin(angulo) * raioMedioY * r;
        scene.add.image(x, y, criarTexturaPedra(scene)).setAlpha(0.8)
            .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }
}
class CorridaScene extends Phaser.Scene {
    constructor() {
        super('CorridaScene');
    }

    create() {
        this.tampinhas = [];
        this.isDragging = false;
        this.dragStart = null;
        this.vencedor = null;
        this.corridaLiberada = false;

        // pista grande e cheia de curvas: um anel entre uma borda externa ondulada e a "ilha"
        // central (decorativa, sem bloquear a passagem), com largura generosa e constante para
        // as tampinhas sempre terem espaço de sobra pra passar.
        const centro = { x: 400, y: 300 };
        const LARGURA_X = 150;
        const LARGURA_Y = 108;

        const raioXExt = (angulo) => 300 + 50 * Math.sin(2 * angulo + 0.4) + 22 * Math.sin(5 * angulo - 0.8);
        const raioYExt = (angulo) => 205 + 38 * Math.sin(3 * angulo - 0.3) + 16 * Math.sin(6 * angulo + 1.1);
        const raioXInt = (angulo) => raioXExt(angulo) - LARGURA_X;
        const raioYInt = (angulo) => raioYExt(angulo) - LARGURA_Y;

        this.pista = { centro, raioXExt, raioYExt, raioXInt, raioYInt };

        // faixa estreita, num ponto do trajeto, onde a mangueira liga e molha a pista:
        // devagar ali, a tampinha escorrega pro lado; com um peteleco decidido ela atravessa numa boa.
        this.zonaAgua = { angulo: Math.PI * 0.5, meiaLargura: 0.11, limiarVelocidade: 130 };

        this.FORCA_MAXIMA = 600;
        this.DISTANCIA_MAXIMA = 120;
        this.VELOCIDADE_MINIMA_PARADA = 4;
        this.RETROCESSO_FORA_DA_PISTA = 0.3; // ~17°, "alguns metros" de volta quando sai da pista

        const marcasParaIA = MARCAS_DISPONIVEIS.filter(m => m.nome !== JogoState.marcaJogador);
        const marcaIA = Phaser.Utils.Array.GetRandom(marcasParaIA);
        const marcaJogador = MARCAS_DISPONIVEIS.find(m => m.nome === JogoState.marcaJogador) || MARCAS_DISPONIVEIS[0];

        const MARCAS_CORRIDA = [marcaJogador, marcaIA];

        this.add.image(400, 300, criarTexturaCimento(this));
        espalharDecoracao(this);
        desenharPista(this, this.pista);
        decorarIlhaCentral(this, this.pista);
        desenharZonaAgua(this, this.pista, this.zonaAgua);

        // ---------- paredes físicas do anel (invisíveis, seguem o desenho de giz) ----------
        // nada de pedras soltas no meio do caminho — só as bordas da própria pista, então a
        // tampinha sempre tem passagem livre; a única coisa que atrapalha agora é a pista
        // (e a poça d'água) em si, não obstáculos artificiais.
        const paredes = this.physics.add.staticGroup();

        const criarParedeCurva = (raioXFn, raioYFn, quantidade, raioColisor) => {
            for (let i = 0; i < quantidade; i++) {
                const angulo = (Math.PI * 2 / quantidade) * i;
                const p = pontoNaElipse(this.pista.centro.x, this.pista.centro.y, raioXFn(angulo), raioYFn(angulo), angulo);
                const bloco = this.add.circle(p.x, p.y, raioColisor, 0xffffff, 0);
                this.physics.add.existing(bloco, true);
                bloco.body.setCircle(raioColisor);
                paredes.add(bloco);
            }
        };

        // parede externa (não deixa fugir da pista) e parede da ilha central — mais segmentos
        // que antes porque a pista agora faz curvas, então precisa de mais "tijolinhos" de
        // colisão pra acompanhar direitinho o contorno sem deixar brecha.
        criarParedeCurva(this.pista.raioXExt, this.pista.raioYExt, 140, 22);
        criarParedeCurva(this.pista.raioXInt, this.pista.raioYInt, 100, 18);

        // ---------- tampinhas na largada, lado a lado, no ângulo 180° ----------
        const anguloLargada = Math.PI;
        const pontoLargadaExterno = pontoNaElipse(this.pista.centro.x, this.pista.centro.y, this.pista.raioXExt(anguloLargada), this.pista.raioYExt(anguloLargada), anguloLargada);
        const pontoLargadaInterno = pontoNaElipse(this.pista.centro.x, this.pista.centro.y, this.pista.raioXInt(anguloLargada), this.pista.raioYInt(anguloLargada), anguloLargada);

        const posicoesLargada = [
            { x: Phaser.Math.Linear(pontoLargadaInterno.x, pontoLargadaExterno.x, 0.35), y: Phaser.Math.Linear(pontoLargadaInterno.y, pontoLargadaExterno.y, 0.35) },
            { x: Phaser.Math.Linear(pontoLargadaInterno.x, pontoLargadaExterno.x, 0.65), y: Phaser.Math.Linear(pontoLargadaInterno.y, pontoLargadaExterno.y, 0.65) }
        ];

        for (let i = 0; i < 2; i++) {
            const marca = MARCAS_CORRIDA[i];
            const pos = posicoesLargada[i];

            const sombra = this.add.circle(pos.x + 4, pos.y + 6, 30, 0x000000, 0.25);

            const chave = criarTexturaTampinha(this, marca);
            const t = this.add.image(pos.x, pos.y, chave);
            this.physics.add.existing(t);
            t.body.setCircle(30, 8, 8);
            t.body.setDamping(true);
            t.body.setDrag(0.98);
            t.body.setBounce(0.6);
            t.nome = marca.nome;
            t.corBase = marca.cor;
            t.sombra = sombra;
            t.voltaAcumulada = 0;
            t.anguloAnterior = Math.atan2(pos.y - this.pista.centro.y, pos.x - this.pista.centro.x);
            t.posicaoSegura = { x: pos.x, y: pos.y, angulo: t.anguloAnterior };
            t.emPenalidade = false;
            t.molhando = false;

            t.rastro = this.add.particles(0, 0, criarTexturaParticula(this, 'particulaRastro_' + marca.nome.replace(/\s+/g, '_'), marca.cor), {
                lifespan: 250,
                speed: { min: 0, max: 20 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.4, end: 0 },
                quantity: 1,
                frequency: 40,
                follow: t
            });
            t.rastro.stop();

            this.tampinhas.push(t);
        }

        this.jogador = this.tampinhas[0];
        this.ia = this.tampinhas[1];

        this.jogador.setInteractive(
            new Phaser.Geom.Circle(38, 38, 33),
            Phaser.Geom.Circle.Contains
        );
        this.input.setDraggable(this.jogador);
        this.atualizarInteratividadeJogador();

        this.physics.add.collider(this.tampinhas[0], this.tampinhas[1], () => {
            SomFX.colisao();
            this.cameras.main.shake(120, 0.006);
        });
        this.tampinhas.forEach(t => this.physics.add.collider(t, paredes, () => SomFX.colisao()));

        // ---------- sistema de turnos: um peteleco por vez, alternando ----------
        this.turnoAtual = Phaser.Utils.Array.GetRandom(['jogador', 'ia']);
        this.aguardandoParada = false;

        const podeJogadorJogar = () =>
            this.turnoAtual === 'jogador' && !this.aguardandoParada && this.corridaLiberada && !this.vencedor;

        this.input.on('dragstart', (pointer, gameObject) => {
            if (!podeJogadorJogar()) return;
            this.isDragging = true;
            this.dragStart = { x: gameObject.x, y: gameObject.y };
            this.linhaForca.setVisible(true);
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!podeJogadorJogar()) return;
            const dx = dragX - this.dragStart.x;
            const dy = dragY - this.dragStart.y;
            const distancia = Phaser.Math.Distance.Between(0, 0, dx, dy);

            if (distancia > this.DISTANCIA_MAXIMA) {
                const angulo = Math.atan2(dy, dx);
                gameObject.x = this.dragStart.x + Math.cos(angulo) * this.DISTANCIA_MAXIMA;
                gameObject.y = this.dragStart.y + Math.sin(angulo) * this.DISTANCIA_MAXIMA;
            } else {
                gameObject.x = dragX;
                gameObject.y = dragY;
            }

            this.linhaForca.setTo(this.dragStart.x, this.dragStart.y, gameObject.x, gameObject.y);
        });

        this.input.on('dragend', (pointer, gameObject) => {
            if (!podeJogadorJogar()) return;
            this.isDragging = false;
            this.linhaForca.setVisible(false);

            SomFX.peteleco();

            const dx = this.dragStart.x - gameObject.x;
            const dy = this.dragStart.y - gameObject.y;
            const distancia = Phaser.Math.Distance.Between(0, 0, dx, dy);

            const forca = Phaser.Math.Clamp(
                (distancia / this.DISTANCIA_MAXIMA) * this.FORCA_MAXIMA,
                0,
                this.FORCA_MAXIMA
            );

            const angulo = Math.atan2(dy, dx);

            gameObject.body.setVelocity(
                Math.cos(angulo) * forca,
                Math.sin(angulo) * forca
            );

            gameObject.x = this.dragStart.x;
            gameObject.y = this.dragStart.y;

            this.aguardandoParada = true;
        });

        this.linhaForca = this.add.line(0, 0, 0, 0, 0, 0, 0xffff00);
        this.linhaForca.setLineWidth(3);
        this.linhaForca.setVisible(false);

        this.textoVencedor = this.add.text(400, 60, '', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setVisible(false);

        this.textoTurno = this.add.text(400, 30, '', {
            fontSize: '20px',
            fontFamily: FONTE_TITULO || 'Arial',
            fontStyle: '600',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setVisible(false);

        this.textoContagem = this.add.text(400, 330, '', {
            fontSize: '80px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.botaoReiniciar = this.add.text(400, 570, '🔄 Reiniciar', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

        this.botaoReiniciar.on('pointerdown', () => {
            this.scene.restart();
        });

        this.botaoMenu = this.add.text(600, 570, '🏠 Menu', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

        this.botaoMenu.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        this.iniciarContagem();
    }

    atualizarInteratividadeJogador() {
        const podeJogar = this.turnoAtual === 'jogador' && this.corridaLiberada && !this.vencedor;
        if (podeJogar) {
            this.jogador.setInteractive(); // reaproveita a hit area circular já configurada
            this.input.setDraggable(this.jogador);
        } else {
            this.jogador.disableInteractive();
        }
    }

    iniciarContagem() {
        const passos = ['3', '2', '1', 'Vai!'];
        let i = 0;

        this.textoContagem.setText(passos[i]);

        this.time.addEvent({
            delay: 800,
            repeat: passos.length - 1,
            callback: () => {
                i++;
                if (i < passos.length) {
                    this.textoContagem.setText(passos[i]);
                }
                if (i === passos.length - 1) {
                    this.corridaLiberada = true;
                    this.time.delayedCall(600, () => this.textoContagem.setText(''));
                    this.atualizarTextoTurno();
                    this.atualizarInteratividadeJogador();

                    if (this.turnoAtual === 'ia') {
                        this.time.delayedCall(Phaser.Math.Between(500, 900), () => this.iaFazerJogada());
                    }
                }
            }
        });
    }

    atualizarTextoTurno() {
        if (this.vencedor) { this.textoTurno.setVisible(false); return; }
        this.textoTurno.setText(this.turnoAtual === 'jogador' ? '🎯 Sua vez!' : '⏳ Vez do adversário...');
        this.textoTurno.setVisible(true);
    }

    // um peteleco só, mirando aproximadamente na direção de avanço da pista (tangente ao anel)
    iaFazerJogada() {
        if (this.vencedor) return;

        const anguloAtual = Math.atan2(this.ia.y - this.pista.centro.y, this.ia.x - this.pista.centro.x);
        const sentido = -1; // sentido horário ao redor do anel
        const anguloTangente = anguloAtual + (Math.PI / 2) * sentido + Phaser.Math.FloatBetween(-0.3, 0.3);
        const forca = Phaser.Math.Between(320, 560);

        this.ia.body.setVelocity(
            Math.cos(anguloTangente) * forca,
            Math.sin(anguloTangente) * forca
        );

        SomFX.peteleco();
        this.aguardandoParada = true;
    }

    // detecta quando as tampinhas pararam de se mover pra liberar o próximo turno
    verificarFimDeTurno() {
        if (!this.aguardandoParada || this.vencedor) return;

        const todasPararam = this.tampinhas.every(t => {
            const v = Phaser.Math.Distance.Between(0, 0, t.body.velocity.x, t.body.velocity.y);
            return v < this.VELOCIDADE_MINIMA_PARADA;
        });
        if (!todasPararam) return;

        this.tampinhas.forEach(t => t.body.setVelocity(0, 0));
        this.aguardandoParada = false;
        this.turnoAtual = (this.turnoAtual === 'jogador') ? 'ia' : 'jogador';
        this.atualizarTextoTurno();
        this.atualizarInteratividadeJogador();

        if (this.turnoAtual === 'ia') {
            this.time.delayedCall(Phaser.Math.Between(500, 900), () => this.iaFazerJogada());
        }
    }

    // mantém um ângulo dentro de [-π, π]
    normalizarAngulo(a) {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }

    // verifica se um ponto (x,y) está dentro do anel da pista naquele ângulo específico —
    // como a pista é curvilínea, o raio "aceitável" muda a cada ângulo.
    calcularStatusNaPista(x, y) {
        const dx = x - this.pista.centro.x;
        const dy = y - this.pista.centro.y;
        const theta = Math.atan2(dy, dx);

        const rx = this.pista.raioXExt(theta), ry = this.pista.raioYExt(theta);
        const rxi = this.pista.raioXInt(theta), ryi = this.pista.raioYInt(theta);

        const nExt = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
        const nInt = Math.sqrt((dx / rxi) ** 2 + (dy / ryi) ** 2);

        return { theta, nExt, nInt, dentro: nExt <= 1.03 && nInt >= 0.97 };
    }

    // a tampinha saiu da pista: toca o efeito, treme a câmera e a puxa de volta alguns "metros"
    // no sentido contrário ao avanço — isso é o que desestimula petelecos fortes demais.
    aplicarPenalidadeForaDaPista(t, status) {
        t.emPenalidade = true;
        SomFX.foraDaPista();
        this.cameras.main.shake(150, 0.008);

        const anguloDePartida = t.posicaoSegura ? t.posicaoSegura.angulo : status.theta;
        const anguloRecuo = anguloDePartida - this.RETROCESSO_FORA_DA_PISTA;

        const rMedioX = (this.pista.raioXExt(anguloRecuo) + this.pista.raioXInt(anguloRecuo)) / 2;
        const rMedioY = (this.pista.raioYExt(anguloRecuo) + this.pista.raioYInt(anguloRecuo)) / 2;
        const novaPos = pontoNaElipse(this.pista.centro.x, this.pista.centro.y, rMedioX, rMedioY, anguloRecuo);

        const deltaRecuo = this.normalizarAngulo(anguloRecuo - status.theta);
        t.voltaAcumulada += deltaRecuo;
        t.anguloAnterior = anguloRecuo;
        t.posicaoSegura = { x: novaPos.x, y: novaPos.y, angulo: anguloRecuo };

        t.body.setVelocity(0, 0);
        t.x = novaPos.x;
        t.y = novaPos.y;

        // borrifo de partículas marcando o "escorregão"
        const respingo = this.add.particles(status.theta !== undefined ? t.x : t.x, t.y,
            criarTexturaParticula(this, 'particulaAgua', 0x3f9fd6), {
                lifespan: 400, speed: { min: 60, max: 160 }, scale: { start: 0.8, end: 0 },
                alpha: { start: 0.8, end: 0 }, quantity: 12, emitting: false
            });
        respingo.explode(12);

        this.time.delayedCall(400, () => { t.emPenalidade = false; });
    }

    update() {
        this.tampinhas.forEach(t => {
            if (t.sombra) {
                t.sombra.x = t.x + 4;
                t.sombra.y = t.y + 6;
            }

            if (t.body && t.rastro) {
                const velocidade = Phaser.Math.Distance.Between(0, 0, t.body.velocity.x, t.body.velocity.y);
                if (velocidade > 60) {
                    t.rastro.start();
                } else {
                    t.rastro.stop();
                }
            }
        });

        if (this.vencedor) return;

        this.verificarFimDeTurno();

        // progresso na volta: acumula o ângulo percorrido ao redor do centro da pista.
        // uma volta completa (2π líquidos) = vitória. Vai e vem se cancela — só conta avanço de verdade.
        this.tampinhas.forEach(t => {
            const status = this.calcularStatusNaPista(t.x, t.y);

            // fora da pista → penaliza e volta alguns metros, sem contar o avanço normal deste quadro
            if (!status.dentro && !t.emPenalidade) {
                this.aplicarPenalidadeForaDaPista(t, status);
                return;
            }
            if (status.dentro) {
                t.posicaoSegura = { x: t.x, y: t.y, angulo: status.theta };
            }

            // zona molhada da mangueira: devagar ali, a água empurra a tampinha pra fora da pista
            if (status.dentro && t.body) {
                const diffZona = this.normalizarAngulo(status.theta - this.zonaAgua.angulo);
                if (Math.abs(diffZona) < this.zonaAgua.meiaLargura) {
                    const velocidade = Phaser.Math.Distance.Between(0, 0, t.body.velocity.x, t.body.velocity.y);
                    if (velocidade > 4 && velocidade < this.zonaAgua.limiarVelocidade) {
                        const fatorEscorregao = 1 - (velocidade / this.zonaAgua.limiarVelocidade);
                        const direcaoRadial = Math.atan2(t.y - this.pista.centro.y, t.x - this.pista.centro.x);
                        const empurrao = fatorEscorregao * 5.5;
                        t.body.velocity.x += Math.cos(direcaoRadial) * empurrao;
                        t.body.velocity.y += Math.sin(direcaoRadial) * empurrao;

                        if (!t.molhando) {
                            t.molhando = true;
                            SomFX.escorregar();
                            this.time.delayedCall(500, () => { t.molhando = false; });
                        }
                    }
                }
            }

            const anguloAtual = status.theta;
            let delta = anguloAtual - t.anguloAnterior;
            if (delta > Math.PI) delta -= Math.PI * 2;
            if (delta < -Math.PI) delta += Math.PI * 2;
            t.voltaAcumulada += delta;
            t.anguloAnterior = anguloAtual;

            if (Math.abs(t.voltaAcumulada) >= Math.PI * 2 && !this.vencedor) {
                this.vencedor = t.nome;
                this.tampinhaVencedora = t;
                this.atualizarInteratividadeJogador();
            }
        });

        if (this.vencedor) {
            SomFX.vitoria();

            const corVencedor = this.tampinhaVencedora.corBase;
            const explosao = this.add.particles(
                this.tampinhaVencedora.x,
                this.tampinhaVencedora.y,
                criarTexturaParticula(this, 'particulaExplosao', corVencedor),
                {
                    lifespan: 700,
                    speed: { min: 100, max: 300 },
                    scale: { start: 1, end: 0 },
                    alpha: { start: 1, end: 0 },
                    quantity: 30,
                    emitting: false
                }
            );
            explosao.explode(30);

            this.textoTurno.setVisible(false);
            this.textoVencedor.setText('🏆 ' + this.vencedor + ' venceu!');
            this.textoVencedor.setVisible(true);
            this.botaoReiniciar.setVisible(true);
            this.botaoMenu.setVisible(true);
            this.tampinhas.forEach(t => {
                t.body.setVelocity(0, 0);
                if (t.rastro) t.rastro.stop();
            });
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: "game",
    backgroundColor: "#8b8b8b",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: "arcade",
        arcade: {
            debug: false
        }
    },
    scene: [MenuScene, SelecaoScene, CorridaScene]
};

function iniciarJogo() {
    window.game = new Phaser.Game(config);
}

// garante que a fonte "Fredoka" já esteja pronta antes do Phaser desenhar o primeiro texto
if (document.fonts && document.fonts.load) {
    Promise.race([
        Promise.all([
            document.fonts.load('600 40px Fredoka'),
            document.fonts.load('700 48px Fredoka')
        ]),
        new Promise(resolve => setTimeout(resolve, 500)) // trava de segurança
    ]).then(iniciarJogo);
} else {
    iniciarJogo();
}