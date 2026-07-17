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
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

let tampinhas = [];
let isDragging = false;
let dragStart = null;
let dragAlvo = null;
let linhaForca = null;
let vencedor = null;
let textoVencedor;
let textoContagem;
let botaoReiniciar;
let corridaLiberada = false;

const PISTA = {
    x: 100,
    y: 150,
    largura: 600,
    altura: 300
};

const FORCA_MAXIMA = 600;
const DISTANCIA_MAXIMA = 120;

const CORES = [0xff0000, 0x3498db];
const NOMES = ['Vermelha', 'Azul'];

function preload() {

}

function create() {
    this.add.rectangle(400, 300, 800, 600, 0x999999);

    this.add.rectangle(
        PISTA.x + PISTA.largura / 2,
        PISTA.y + PISTA.altura / 2,
        PISTA.largura,
        PISTA.altura,
        0xffffff,
        0.2
    );

    const paredes = this.physics.add.staticGroup();
    const espessura = 10;
    paredes.add(this.add.rectangle(PISTA.x + PISTA.largura / 2, PISTA.y, PISTA.largura, espessura, 0xffffff, 0).setOrigin(0.5));
    paredes.add(this.add.rectangle(PISTA.x + PISTA.largura / 2, PISTA.y + PISTA.altura, PISTA.largura, espessura, 0xffffff, 0).setOrigin(0.5));
    paredes.add(this.add.rectangle(PISTA.x, PISTA.y + PISTA.altura / 2, espessura, PISTA.altura, 0xffffff, 0).setOrigin(0.5));
    paredes.add(this.add.rectangle(PISTA.x + PISTA.largura, PISTA.y + PISTA.altura / 2, espessura, PISTA.altura, 0xffffff, 0).setOrigin(0.5));

    const xChegada = PISTA.x + PISTA.largura - 40;
    this.add.rectangle(xChegada, PISTA.y + PISTA.altura / 2, 6, PISTA.altura, 0x2ecc71);
    for (let i = 0; i < PISTA.altura / 20; i++) {
        this.add.rectangle(xChegada, PISTA.y + i * 20 + 10, 6, 10, i % 2 === 0 ? 0x000000 : 0xffffff);
    }
    this.xChegada = xChegada;

    // cria as duas tampinhas, uma em cima da outra (raias diferentes)
    tampinhas = [];
    const posY = [PISTA.y + 100, PISTA.y + 200];

    for (let i = 0; i < 2; i++) {
        const t = this.add.circle(PISTA.x + 50, posY[i], 30, CORES[i]);
        this.physics.add.existing(t);
        t.body.setCircle(30);
        t.body.setDamping(true);
        t.body.setDrag(0.98);
        t.body.setBounce(0.6);
        t.nome = NOMES[i];
        t.posInicial = { x: t.x, y: t.y };

        t.setInteractive(
            new Phaser.Geom.Circle(30, 30, 30),
            Phaser.Geom.Circle.Contains
        );
        this.input.setDraggable(t);

        tampinhas.push(t);
    }

    // colisão entre as tampinhas
    this.physics.add.collider(tampinhas[0], tampinhas[1]);
    // colisão com as paredes
    tampinhas.forEach(t => this.physics.add.collider(t, paredes));

    // eventos de arrastar (compartilhados por qualquer tampinha)
    this.input.on('dragstart', (pointer, gameObject) => {
        if (vencedor || !corridaLiberada) return;
        isDragging = true;
        dragAlvo = gameObject;
        dragStart = { x: gameObject.x, y: gameObject.y };
        linhaForca.setVisible(true);
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (vencedor || !corridaLiberada) return;
        const dx = dragX - dragStart.x;
        const dy = dragY - dragStart.y;
        const distancia = Phaser.Math.Distance.Between(0, 0, dx, dy);

        if (distancia > DISTANCIA_MAXIMA) {
            const angulo = Math.atan2(dy, dx);
            gameObject.x = dragStart.x + Math.cos(angulo) * DISTANCIA_MAXIMA;
            gameObject.y = dragStart.y + Math.sin(angulo) * DISTANCIA_MAXIMA;
        } else {
            gameObject.x = dragX;
            gameObject.y = dragY;
        }

        linhaForca.setTo(dragStart.x, dragStart.y, gameObject.x, gameObject.y);
    });

    this.input.on('dragend', (pointer, gameObject) => {
        if (vencedor || !corridaLiberada) return;
        isDragging = false;
        linhaForca.setVisible(false);

        const dx = dragStart.x - gameObject.x;
        const dy = dragStart.y - gameObject.y;
        const distancia = Phaser.Math.Distance.Between(0, 0, dx, dy);

        const forca = Phaser.Math.Clamp(
            (distancia / DISTANCIA_MAXIMA) * FORCA_MAXIMA,
            0,
            FORCA_MAXIMA
        );

        const angulo = Math.atan2(dy, dx);

        gameObject.body.setVelocity(
            Math.cos(angulo) * forca,
            Math.sin(angulo) * forca
        );

        gameObject.x = dragStart.x;
        gameObject.y = dragStart.y;
    });

    linhaForca = this.add.line(0, 0, 0, 0, 0, 0, 0xffff00);
    linhaForca.setLineWidth(3);
    linhaForca.setVisible(false);

    textoVencedor = this.add.text(400, 80, '', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffff00',
        backgroundColor: '#000000',
        padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setVisible(false);

    textoContagem = this.add.text(400, 300, '', {
        fontSize: '80px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // botão de reiniciar (HTML simples via texto clicável do Phaser)
    botaoReiniciar = this.add.text(400, 550, '🔄 Reiniciar', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

    botaoReiniciar.on('pointerdown', () => {
        this.scene.restart();
        vencedor = null;
        corridaLiberada = false;
    });

    // contagem regressiva antes de liberar a corrida
    iniciarContagem(this);
}

function iniciarContagem(scene) {
    const passos = ['3', '2', '1', 'Vai!'];
    let i = 0;

    textoContagem.setText(passos[i]);

    scene.time.addEvent({
        delay: 800,
        repeat: passos.length - 1,
        callback: () => {
            i++;
            if (i < passos.length) {
                textoContagem.setText(passos[i]);
            }
            if (i === passos.length - 1) {
                corridaLiberada = true;
                scene.time.delayedCall(600, () => textoContagem.setText(''));
            }
        }
    });
}

function update() {
    if (vencedor) return;

    tampinhas.forEach(t => {
        if (t.x >= this.xChegada) {
            vencedor = t.nome;
        }
    });

    if (vencedor) {
        textoVencedor.setText('🏆 Tampinha ' + vencedor + ' venceu!');
        textoVencedor.setVisible(true);
        botaoReiniciar.setVisible(true);
        tampinhas.forEach(t => t.body.setVelocity(0, 0));
    }
}