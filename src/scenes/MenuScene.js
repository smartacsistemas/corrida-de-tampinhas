class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // fundo
        this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

        // título
        this.add.text(400, 150, 'CORRIDA DE', {
            fontSize: '40px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(400, 200, 'TAMPINHAS', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // tampinha decorativa (só visual, gira devagar)
        const tampinhaDecor = this.add.circle(400, 320, 40, 0xff0000);
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

        // efeito de hover simples
        botaoJogar.on('pointerover', () => botaoJogar.setStyle({ backgroundColor: '#27ae60' }));
        botaoJogar.on('pointerout', () => botaoJogar.setStyle({ backgroundColor: '#2ecc71' }));

        botaoJogar.on('pointerdown', () => {
            this.scene.start('SelecaoScene');
        });

        // rodapé
        this.add.text(400, 550, 'Projeto Giz — protótipo', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
    }
}