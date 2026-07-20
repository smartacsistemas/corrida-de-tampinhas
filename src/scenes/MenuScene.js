class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // fundo tema quintal
        this.add.image(400, 300, criarTexturaCimento(this));
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.35);
        espalharDecoracao(this);

        // título
        this.add.text(400, 150, 'CORRIDA DE', {
            fontSize: '40px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.add.text(400, 200, 'TAMPINHAS', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // tampinha decorativa: usa a marca já escolhida pelo jogador (ou a padrão)
        const marcaAtual = MARCAS_DISPONIVEIS.find(m => m.nome === JogoState.marcaJogador) || MARCAS_DISPONIVEIS[0];
        const chaveTampinha = criarTexturaTampinha(this, marcaAtual);
        const tampinhaDecor = this.add.image(400, 320, chaveTampinha).setScale(1.3);

        this.tweens.add({
            targets: tampinhaDecor,
            angle: 360,
            duration: 4000,
            repeat: -1
        });

        // botão jogar
        const botaoJogar = this.add.text(400, 430, '▶  JOGAR', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#000000',
            backgroundColor: '#2ecc71',
            padding: { x: 30, y: 14 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        botaoJogar.on('pointerover', () => botaoJogar.setStyle({ backgroundColor: '#27ae60' }));
        botaoJogar.on('pointerout', () => botaoJogar.setStyle({ backgroundColor: '#2ecc71' }));

        botaoJogar.on('pointerdown', () => {
            this.scene.start('SelecaoScene');
        });

        // rodapé
        this.add.text(400, 550, 'Projeto Giz — protótipo', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#cccccc'
        }).setOrigin(0.5);
    }
}