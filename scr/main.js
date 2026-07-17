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

let tampinha;
let tampinha2;
let isDragging = false;
let dragStart = null;
let linhaForca = null;
let linhaChegada;
let vencedor = null;
let textoVencedor;

// Limites da pista (não da tela inteira)
const PISTA = {
    x: 100,
    y: 150,
    largura: 600,
    altura: 300
};

const FORCA_MAXIMA = 600;
const DISTANCIA_MAXIMA = 120;
const ATRITO = 0.98;

function preload() {

}

function create() {
    // chão (tela toda, só decorativo)
    this.add.rectangle(400, 300, 800, 600, 0x999999);

    // pista de giz (área jogável)
    this.add.rectangle(
        PISTA.x + PISTA.largura / 2,
        PISTA.y + PISTA.altura / 2,
        PISTA.largura,
        PISTA.altura,
        0xffffff,
        0.2
    );

    // bordas físicas da pista (invisíveis, só pra colisão)
    const paredes = this.physics.add.staticGroup();

    const espessura = 10;
    // topo
    paredes.add(this.add.rectangle(PISTA.x + PISTA.largura / 2, PISTA.y, PISTA.largura, espessura, 0xffffff, 0).setOrigin(0.5));
    // base
    paredes.add(this.add.rectangle(PISTA.x + PISTA.largura / 2, PISTA.y + PISTA.altura, PISTA.largura, espessura, 0xffffff, 0).setOrigin(0.5));
    // esquerda
    paredes.add(this.add.rectangle(PISTA.x, PISTA.y + PISTA.altura / 2, espessura, PISTA.altura, 0xffffff, 0).setOrigin(0.5));
    // direita
    paredes.add(this.add.rectangle(PISTA.x + PISTA.largura, PISTA.y + PISTA.altura / 2, espessura, PISTA.altura, 0xffffff, 0).setOrigin(0.5));

    // linha de chegada (perto da borda direita da pista)
    const xChegada = PISTA.x + PISTA.largura - 40;
    linhaChegada = this.add.rectangle(
        xChegada,
        PISTA.y + PISTA.altura / 2,
        6,
        PISTA.altura,
        0x2ecc71
    );
    // listras (efeito xadrez simples)
    for (let i = 0; i < PISTA.altura / 20; i++) {
        this.add.rectangle(
            xChegada,
            PISTA.y + i * 20 + 10,
            6,
            10,
            i % 2 === 0 ? 0x000000 : 0xffffff
        );
    }

    // primeira tampinha (vermelha)
    tampinha = this.add.circle(PISTA.x + 50, PISTA.y + PISTA.altura / 2, 30, 0xff0000);
    this.physics.add.existing(tampinha);
    tampinha.body.setCircle(30);
    tampinha.body.setDamping(true);
    tampinha.body.setDrag(0.98);
    tampinha.body.setBounce(0.6);

    // segunda tampinha (azul)
    tampinha2 = this.add.circle(PISTA.x + 250, PISTA.y + PISTA.altura / 2, 30, 0x3498db);
    this.physics.add.existing(tampinha2);
    tampinha2.body.setCircle(30);
    tampinha2.body.setDamping(true);
    tampinha2.body.setDrag(0.98);
    tampinha2.body.setBounce(0.6);

    // colisões
    this.physics.add.collider(tampinha, tampinha2);
    this.physics.add.collider(tampinha, paredes);
    this.physics.add.collider(tampinha2, paredes);

    // texto de vencedor (escondido no início)
    textoVencedor = this.add.text(400, 80, '', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffff00',
        backgroundColor: '#000000',
        padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setVisible(false);

    // linha de força
    linhaForca = this.add.line(0, 0, 0, 0, 0, 0, 0xffff00);
    linhaForca.setLineWidth(3);
    linhaForca.setVisible(false);

    // tampinha vermelha jogável
    tampinha.setInteractive(
        new Phaser.Geom.Circle(30, 30, 30),
        Phaser.Geom.Circle.Contains
    );

    this.input.setDraggable(tampinha);

    tampinha.on('dragstart', () => {
        if (vencedor) return; // trava o jogo depois que alguém vence
        isDragging = true;
        dragStart = { x: tampinha.x, y: tampinha.y };
        linhaForca.setVisible(true);
    });

    tampinha.on('drag', (pointer, dragX, dragY) => {
        if (vencedor) return;
        const dx = dragX - dragStart.x;
        const dy = dragY - dragStart.y;
        const distancia = Phaser.Math.Distance.Between(0, 0, dx, dy);

        if (distancia > DISTANCIA_MAXIMA) {
            const angulo = Math.atan2(dy, dx);
            tampinha.x = dragStart.x + Math.cos(angulo) * DISTANCIA_MAXIMA;
            tampinha.y = dragStart.y + Math.sin(angulo) * DISTANCIA_MAXIMA;
        } else {
            tampinha.x = dragX;
            tampinha.y = dragY;
        }

        linhaForca.setTo(dragStart.x, dragStart.y, tampinha.x, tampinha.y);
    });

    tampinha.on('dragend', () => {
        if (vencedor) return;
        isDragging = false;
        linhaForca.setVisible(false);

        const dx = dragStart.x - tampinha.x;
        const dy = dragStart.y - tampinha.y;
        const distancia = Phaser.Math.Distance.Between(0, 0, dx, dy);

        const forca = Phaser.Math.Clamp(
            (distancia / DISTANCIA_MAXIMA) * FORCA_MAXIMA,
            0,
            FORCA_MAXIMA
        );

        const angulo = Math.atan2(dy, dx);

        tampinha.body.setVelocity(
            Math.cos(angulo) * forca,
            Math.sin(angulo) * forca
        );

        tampinha.x = dragStart.x;
        tampinha.y = dragStart.y;
    });

    // guarda a coordenada de chegada pra usar no update
    this.xChegada = xChegada;
}

function update() {
    if (vencedor) return;

    if (tampinha.x >= this.xChegada) {
        vencedor = 'Vermelha';
    } else if (tampinha2.x >= this.xChegada) {
        vencedor = 'Azul';
    }

    if (vencedor) {
        textoVencedor.setText('🏆 Tampinha ' + vencedor + ' venceu!');
        textoVencedor.setVisible(true);
        tampinha.body.setVelocity(0, 0);
        tampinha2.body.setVelocity(0, 0);
    }
}