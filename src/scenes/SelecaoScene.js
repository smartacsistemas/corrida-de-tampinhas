class SelecaoScene extends Phaser.Scene {
    constructor() {
        super('SelecaoScene');
    }

    create() {
        this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

        this.add.text(400, 40, 'ESCOLHA SUA TAMPINHA', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        let marcaSelecionada = MARCAS_DISPONIVEIS.find(m => m.nome === JogoState.marcaJogador) || MARCAS_DISPONIVEIS[0];

        // ---------- preview grande no topo ----------
        const chavePreview = criarTexturaTampinha(this, marcaSelecionada);
        const preview = this.add.image(400, 150, chavePreview).setScale(1.1);

        const previewTexto = this.add.text(400, 215, marcaSelecionada.nome, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        // ---------- grade de opções ----------
        const colunas = 4;
        const espacamento = 100;
        const inicioX = 400 - ((colunas - 1) * espacamento) / 2;
        const y = 320;

        const opcoes = [];

        MARCAS_DISPONIVEIS.forEach((marca, i) => {
            const col = i % colunas;
            const linha = Math.floor(i / colunas);
            const x = inicioX + col * espacamento;
            const yPos = y + linha * 110;

            const chave = criarTexturaTampinha(this, marca);

            // anel de seleção (atrás da imagem, fica visível só quando selecionado)
            const anel = this.add.circle(x, yPos, 36, 0xffff00, 0)
                .setStrokeStyle(4, 0xffff00)
                .setVisible(marca.nome === marcaSelecionada.nome);

            const img = this.add.image(x, yPos, chave)
                .setInteractive({ useHandCursor: true });

            const rotulo = this.add.text(x, yPos + 45, marca.nome, {
                fontSize: '11px',
                fontFamily: 'Arial',
                color: '#cccccc',
                align: 'center',
                wordWrap: { width: 85 }
            }).setOrigin(0.5);

            const selecionar = () => {
                marcaSelecionada = marca;
                preview.setTexture(chave);
                previewTexto.setText(marca.nome);

                opcoes.forEach(o => o.anel.setVisible(o.marca.nome === marcaSelecionada.nome));
            };

            img.on('pointerover', () => img.setScale(1.1));
            img.on('pointerout', () => img.setScale(1));
            img.on('pointerdown', selecionar);

            opcoes.push({ img, anel, rotulo, marca });
        });

        // ---------- botão confirmar ----------
        const botaoConfirmar = this.add.text(650, 550, '✅ CONFIRMAR', {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#000000',
            backgroundColor: '#2ecc71',
            padding: { x: 18, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        botaoConfirmar.on('pointerover', () => botaoConfirmar.setStyle({ backgroundColor: '#27ae60' }));
        botaoConfirmar.on('pointerout', () => botaoConfirmar.setStyle({ backgroundColor: '#2ecc71' }));

        botaoConfirmar.on('pointerdown', () => {
            JogoState.corJogador = marcaSelecionada.cor;
            JogoState.marcaJogador = marcaSelecionada.nome;
            this.scene.start('CorridaScene');
        });

        // ---------- botão voltar ----------
        const botaoVoltar = this.add.text(150, 550, '← Voltar', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        botaoVoltar.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }
}