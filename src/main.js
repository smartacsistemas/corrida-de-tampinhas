// ---------- Estado global do jogo (persiste entre scenes) ----------
const JogoState = {
    corJogador: 0xe74c3c,       // cor da marca padrão (Cola Max)
    marcaJogador: 'Cola Max'    // nome da marca padrão, na primeira vez
};
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

    // cria um buffer de ruído branco (base pra sons percussivos/metálicos)
    criarRuido(duracao) {
        const tamanho = this.ctx.sampleRate * duracao;
        const buffer = this.ctx.createBuffer(1, tamanho, this.ctx.sampleRate);
        const dados = buffer.getChannelData(0);
        for (let i = 0; i < tamanho; i++) {
            dados[i] = Math.random() * 2 - 1;
        }
        return buffer;
    },

    // peteleco: "flick" seco - ruído agudo bem curto + um leve "toc" de corpo
    peteleco() {
        this.iniciar();
        const t = this.ctx.currentTime;

        // camada 1: estalo agudo (o "flick" do dedo)
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

        // camada 2: corpo curto e seco (o "toc" da tampinha saindo)
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

    // colisão: "clink" metálico de tampinha batendo em tampinha
    colisao() {
        this.iniciar();
        const t = this.ctx.currentTime;

        // camada 1: impacto de ruído filtrado em banda estreita (dá o "corpo" metálico)
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

        // camada 2: dois "pings" metálicos com frequências próximas (batimento = som de metal)
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

    // fanfarra ascendente - vitória
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

    }

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

// gera (uma vez só, cacheada) uma textura de tampinha com borda serrilhada + logo
function criarTexturaTampinha(scene, marca) {
    const chave = 'tampinha_' + marca.nome.replace(/\s+/g, '_');
    if (scene.textures.exists(chave)) return chave;

    const tamanho = 100;
    const raio = 45;
    const centro = tamanho / 2;
    const g = scene.add.graphics();

    // borda serrilhada (efeito de tampinha de garrafa)
    const dentes = 16;
    g.fillStyle(0x000000, 0.35);
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

    // corpo colorido
    g.fillStyle(marca.cor, 1);
    g.fillCircle(centro, centro, raio - 7);

    // brilho superior (efeito 3D leve)
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(centro - 12, centro - 14, 26, 14);

    // ícone/logo no centro
    desenharIcone(g, marca.icone, centro, centro + 6, 16, marca.corTexto);

    g.generateTexture(chave, tamanho, tamanho);
    g.destroy();

    return chave;
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

        // lista de marcas fictícias disponíveis (mesma da tela de seleção)
const MARCAS_DISPONIVEIS = [
    { nome: 'Cola Max',    cor: 0xe74c3c },
    { nome: 'Refri Pop',   cor: 0x3498db },
    { nome: 'Cerva Gold',  cor: 0xf1c40f },
    { nome: 'Turbo Cola',  cor: 0x2c3e50 },
    { nome: 'Ice Beer',    cor: 0x1abc9c },
    { nome: 'Limão Fresh', cor: 0x2ecc71 },
    { nome: 'Roxo Bomba',  cor: 0x9b59b6 },
    { nome: 'Laranjito',   cor: 0xe67e22 }
];

// sorteia uma marca pra IA, diferente da marca escolhida pelo jogador
const marcasParaIA = MARCAS_DISPONIVEIS.filter(m => m.nome !== JogoState.marcaJogador);
const marcaIA = Phaser.Utils.Array.GetRandom(marcasParaIA);

const CORES = [JogoState.corJogador, marcaIA.cor];
const NOMES = [JogoState.marcaJogador, marcaIA.nome];

        this.add.rectangle(400, 300, 800, 600, 0x999999);

        this.add.rectangle(
            this.PISTA.x + this.PISTA.largura / 2,
            this.PISTA.y + this.PISTA.altura / 2,
            this.PISTA.largura,
            this.PISTA.altura,
            0xffffff,
            0.2
        );

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

        // ---------- criação das tampinhas com sombra ----------
        for (let i = 0; i < 2; i++) {
            // sombra: um círculo cinza escuro, um pouco deslocado, atrás da tampinha
            const sombra = this.add.circle(this.PISTA.x + 50 + 4, posY[i] + 6, 30, 0x000000, 0.25);

            const t = this.add.circle(this.PISTA.x + 50, posY[i], 30, CORES[i]);
            this.physics.add.existing(t);
            t.body.setCircle(30);
            t.body.setDamping(true);
            t.body.setDrag(0.98);
            t.body.setBounce(0.6);
            t.nome = NOMES[i];
            t.sombra = sombra;

            // rastro: emissor de partículas sutil, sempre criado mas emitindo só em alta velocidade
            t.rastro = this.add.particles(0, 0, criarTexturaParticula(this, 'particulaRastro', CORES[i]), {
                lifespan: 250,
                speed: { min: 0, max: 20 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.4, end: 0 },
                quantity: 1,
                frequency: 40,
                follow: t
            });
            t.rastro.stop(); // liga/desliga conforme velocidade no update

            this.tampinhas.push(t);
        }

        this.jogador = this.tampinhas[0];
        this.ia = this.tampinhas[1];

        this.jogador.setInteractive(
            new Phaser.Geom.Circle(30, 30, 30),
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
        // ---------- atualiza sombra e rastro de cada tampinha ----------
        this.tampinhas.forEach(t => {
            // sombra segue a tampinha com leve deslocamento
            if (t.sombra) {
                t.sombra.x = t.x + 4;
                t.sombra.y = t.y + 6;
            }

            // rastro liga/desliga conforme velocidade
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

            // explosão de partículas na cor da tampinha vencedora
            const corVencedor = this.tampinhaVencedora.fillColor;
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

            this.textoVencedor.setText('🏆 Tampinha ' + this.vencedor + ' venceu!');
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

// ---------- utilitário: cria uma textura circular simples pra usar em partículas ----------
function criarTexturaParticula(scene, chave, cor) {
    if (scene.textures.exists(chave)) return chave;

    const g = scene.add.graphics();
    g.fillStyle(cor, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture(chave, 16, 16);
    g.destroy();

    return chave;
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

const game = new Phaser.Game(config);