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
let isDragging = false;
let dragStart = null;
let linhaForca = null;

// Constantes de ajuste da física
const FORCA_MAXIMA = 600;       // limite de velocidade do peteleco
const DISTANCIA_MAXIMA = 120;   // distância máxima de "puxada" considerada
const ATRITO = 0.98;            // quanto a tampinha desacelera por frame

function preload() {

}

function create() {
    // chão
    this.add.rectangle(400, 300, 800, 600, 0x999999);

    // pista de giz
    this.add.rectangle(400, 300, 600, 300, 0xffffff, 0.2);

    // primeira tampinha
    tampinha = this.add.circle(200, 300, 30, 0xff0000);
    this.physics.add.existing(tampinha);
    tampinha.body.setCircle(30);
    tampinha.body.setDamping(true);
    tampinha.body.setDrag(0.98);
    tampinha.body.setBounce(0.4);
    tampinha.body.setCollideWorldBounds(true);

    // linha que mostra a força (invisível no início)
    linhaForca = this.add.line(0, 0, 0, 0, 0, 0, 0xffff00);
    linhaForca.setLineWidth(3);
    linhaForca.setVisible(false);

    // torna a tampinha interativa (clicável/arrastável)
    tampinha.setInteractive(
        new Phaser.Geom.Circle(30, 30, 30),
        Phaser.Geom.Circle.Contains
    );

    this.input.setDraggable(tampinha);

    // eventos de arrastar
    tampinha.on('dragstart', () => {
        isDragging = true;
        dragStart = { x: tampinha.x, y: tampinha.y };
        linhaForca.setVisible(true);
    });

    tampinha.on('drag', (pointer, dragX, dragY) => {
        // limita o quanto pode puxar
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

        // atualiza a linha de força (do centro original até a posição atual)
        linhaForca.setTo(dragStart.x, dragStart.y, tampinha.x, tampinha.y);
    });

    tampinha.on('dragend', () => {
        isDragging = false;
        linhaForca.setVisible(false);

        const dx = dragStart.x - tampinha.x;
        const dy = dragStart.y - tampinha.y;
        const distancia = Phaser.Math.Distance.Between(0, 0, dx, dy);

        // força proporcional à distância puxada (invertida = solta pra frente)
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

        // volta a tampinha pra posição real (soltou do "estilingue")
        tampinha.x = dragStart.x;
        tampinha.y = dragStart.y;
    });
}

function update() {

}