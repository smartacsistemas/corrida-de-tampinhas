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

    // "toc" curto e seco - peteleco
    peteleco() {
        this.iniciar();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    },

    // "tac" mais grave e oco - colisão
    colisao() {
        this.iniciar();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
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
};

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

        const CORES = [0xff0000, 0x3498db];
        const NOMES = ['Vermelha', 'Azul (IA)'];

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

        for (let i = 0; i < 2; i++) {
            const t = this.add.circle(this.PISTA.x + 50, posY[i], 30, CORES[i]);
            this.physics.add.existing(t);
            t.body.setCircle(30);
            t.body.setDamping(true);
            t.body.setDrag(0.98);
            t.body.setBounce(0.6);
            t.nome = NOMES[i];

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

        // botão de voltar ao menu
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
        if (this.vencedor) return;

        this.tampinhas.forEach(t => {
            if (t.x >= this.xChegada) {
                this.vencedor = t.nome;
            }
        });

        if (this.vencedor) {
            SomFX.vitoria();
            this.textoVencedor.setText('🏆 Tampinha ' + this.vencedor + ' venceu!');
            this.textoVencedor.setVisible(true);
            this.botaoReiniciar.setVisible(true);
            this.botaoMenu.setVisible(true);
            this.tampinhas.forEach(t => t.body.setVelocity(0, 0));
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: "game",
    backgroundColor: "#8b8b8b",
    physics: {
        default: "arcade",
        arcade: {
            debug: false
        }
    },
    scene: [MenuScene, CorridaScene]
};

const game = new Phaser.Game(config);