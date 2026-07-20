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
function desenharPistaGiz(scene, pista) {
    const g = scene.add.graphics();
    g.lineStyle(4, 0xffffff, 0.85);

    const pontos = [
        { x: pista.x, y: pista.y },
        { x: pista.x + pista.largura, y: pista.y },
        { x: pista.x + pista.largura, y: pista.y + pista.altura },
        { x: pista.x, y: pista.y + pista.altura },
        { x: pista.x, y: pista.y }
    ];

    g.beginPath();
    g.moveTo(pontos[0].x, pontos[0].y);
    for (let i = 1; i < pontos.length; i++) {
        const p0 = pontos[i - 1];
        const p1 = pontos[i];
        const passos = 6;
        for (let s = 1; s <= passos; s++) {
            const t = s / passos;
            const x = Phaser.Math.Linear(p0.x, p1.x, t) + Phaser.Math.Between(-2, 2);
            const y = Phaser.Math.Linear(p0.y, p1.y, t) + Phaser.Math.Between(-2, 2);
            g.lineTo(x, y);
        }
    }
    g.strokePath();

    g.fillStyle(0xffffff, 0.05);
    g.fillRect(pista.x, pista.y, pista.largura, pista.altura);
}

// espalha folhas e pedrinhas nas margens ao redor da pista
function espalharDecoracao(scene) {
    const decorTipos = [criarTexturaFolha(scene), criarTexturaPedra(scene)];

    for (let i = 0; i < 10; i++) {
        const zona = Phaser.Math.Between(0, 3);
        let x, y;

        if (zona === 0) { x = Phaser.Math.Between(10, 790); y = Phaser.Math.Between(10, 75); }
        else if (zona === 1) { x = Phaser.Math.Between(10, 790); y = Phaser.Math.Between(515, 590); }
        else if (zona === 2) { x = Phaser.Math.Between(5, 32); y = Phaser.Math.Between(95, 505); }
        else { x = Phaser.Math.Between(768, 795); y = Phaser.Math.Between(95, 505); }

        const tipo = Phaser.Utils.Array.GetRandom(decorTipos);
        scene.add.image(x, y, tipo)
            .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
            .setAlpha(0.85);
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

        this.PISTA = {
            x: 100,
            y: 150,
            largura: 600,
            altura: 300
        };

        this.FORCA_MAXIMA = 600;
        this.DISTANCIA_MAXIMA = 120;

        const marcasParaIA = MARCAS_DISPONIVEIS.filter(m => m.nome !== JogoState.marcaJogador);
        const marcaIA = Phaser.Utils.Array.GetRandom(marcasParaIA);
        const marcaJogador = MARCAS_DISPONIVEIS.find(m => m.nome === JogoState.marcaJogador) || MARCAS_DISPONIVEIS[0];

        const MARCAS_CORRIDA = [marcaJogador, marcaIA];

     this.add.image(400, 300, criarTexturaCimento(this));
        espalharDecoracao(this);
        desenharPistaGiz(this, this.PISTA);
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
        const paredes = this.physics.add.staticGroup();
        const espessura = 10;
        paredes.add(this.add.rectangle(this.PISTA.x + this.PISTA.largura / 2, this.PISTA.y, this.PISTA.largura, espessura, 0xffffff, 0).setOrigin(0.5));
        paredes.add(this.add.rectangle(this.PISTA.x + this.PISTA.largura / 2, this.PISTA.y + this.PISTA.altura, this.PISTA.largura, espessura, 0xffffff, 0).setOrigin(0.5));
        paredes.add(this.add.rectangle(this.PISTA.x, this.PISTA.y + this.PISTA.altura / 2, espessura, this.PISTA.altura, 0xffffff, 0).setOrigin(0.5));
        paredes.add(this.add.rectangle(this.PISTA.x + this.PISTA.largura, this.PISTA.y + this.PISTA.altura / 2, espessura, this.PISTA.altura, 0xffffff, 0).setOrigin(0.5));

        this.xChegada = this.PISTA.x + this.PISTA.largura - 40;
        this.add.rectangle(this.xChegada, this.PISTA.y + this.PISTA.altura / 2, 6, this.PISTA.altura, 0x2ecc71);
        for (let i = 0; i < this.PISTA.altura / 20; i++) {
            this.add.rectangle(this.xChegada, this.PISTA.y + i * 20 + 10, 6, 10, i % 2 === 0 ? 0x000000 : 0xffffff);
        }

        const posY = [this.PISTA.y + 100, this.PISTA.y + 200];

        for (let i = 0; i < 2; i++) {
            const marca = MARCAS_CORRIDA[i];

            const sombra = this.add.circle(this.PISTA.x + 50 + 4, posY[i] + 6, 30, 0x000000, 0.25);

            const chave = criarTexturaTampinha(this, marca);
            const t = this.add.image(this.PISTA.x + 50, posY[i], chave);
            this.physics.add.existing(t);
            t.body.setCircle(30, 8, 8);
            t.body.setDamping(true);
            t.body.setDrag(0.98);
            t.body.setBounce(0.6);
            t.nome = marca.nome;
            t.corBase = marca.cor;
            t.sombra = sombra;

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

        this.physics.add.collider(this.tampinhas[0], this.tampinhas[1], () => {
            SomFX.colisao();
            this.cameras.main.shake(120, 0.006);
        });
        this.tampinhas.forEach(t => this.physics.add.collider(t, paredes));

        this.input.on('dragstart', (pointer, gameObject) => {
            if (this.vencedor || !this.corridaLiberada) return;
            this.isDragging = true;
            this.dragStart = { x: gameObject.x, y: gameObject.y };
            this.linhaForca.setVisible(true);
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (this.vencedor || !this.corridaLiberada) return;
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
            if (this.vencedor || !this.corridaLiberada) return;
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
        });

        this.linhaForca = this.add.line(0, 0, 0, 0, 0, 0, 0xffff00);
        this.linhaForca.setLineWidth(3);
        this.linhaForca.setVisible(false);

        this.textoVencedor = this.add.text(400, 80, '', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setVisible(false);

        this.textoContagem = this.add.text(400, 300, '', {
            fontSize: '80px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.botaoReiniciar = this.add.text(400, 550, '🔄 Reiniciar', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

        this.botaoReiniciar.on('pointerdown', () => {
            this.scene.restart();
        });

        this.botaoMenu = this.add.text(600, 550, '🏠 Menu', {
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
        this.iaJogar();
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
                }
            }
        });
    }

    iaJogar() {
        const agendarProximoPeteleco = () => {
            const espera = Phaser.Math.Between(800, 1800);

            this.time.delayedCall(espera, () => {
                if (this.vencedor) return;

                if (this.corridaLiberada) {
                    const forca = Phaser.Math.Between(300, 550);
                    const anguloVariacao = Phaser.Math.FloatBetween(-0.2, 0.2);

                    this.ia.body.setVelocity(
                        Math.cos(anguloVariacao) * forca,
                        Math.sin(anguloVariacao) * forca
                    );

                    SomFX.peteleco();
                }

                agendarProximoPeteleco();
            });
        };

        agendarProximoPeteleco();
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

        this.tampinhas.forEach(t => {
            if (t.x >= this.xChegada) {
                this.vencedor = t.nome;
                this.tampinhaVencedora = t;
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