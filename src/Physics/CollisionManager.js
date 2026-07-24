/* CollisionManager: cria bordas visuais da pista e gerencia resposta opcional.
   A implementação aqui mantém as bordas apenas visuais para permitir que as tampinhas
   sejam empurradas para fora da pista; a lógica de penalidade por sair da pista fica em
   `GameScene.aplicarPenalidadeForaDaPista`.
*/

const CollisionManager = {
    // cria apenas elementos visuais que representam a borda da pista.
    // NÃO criamos corpos físicos aqui para que as tampinhas possam sair da pista
    // quando um impacto forte as empurra além da linha — o jogo usa a lógica
    // de penalidade em `GameScene.aplicarPenalidadeForaDaPista` para reposicionar.
    createBorders(scene, pista, opts = {}) {
        const passos = opts.passos || 60;
        const espessura = opts.espessura || 18;
        const deslocamento = opts.deslocamento || 10;
        const bordasVisuais = [];

        const criarSegmento = (pA, pB, lado) => {
            const dx = pB.x - pA.x;
            const dy = pB.y - pA.y;
            const comprimento = Phaser.Math.Distance.Between(pA.x, pA.y, pB.x, pB.y) + 2;
            const comprimentoRecip = 1 / comprimento;
            const normal = { x: -dy * comprimentoRecip, y: dx * comprimentoRecip };
            const x = (pA.x + pB.x) / 2 + normal.x * deslocamento * lado;
            const y = (pA.y + pB.y) / 2 + normal.y * deslocamento * lado;
            // retângulo apenas para referência visual / depuração — sem física
            const rect = scene.add.rectangle(x, y, comprimento, espessura, 0x000000, 0).setVisible(false);
            rect.setRotation(Phaser.Math.Angle.BetweenPoints(pA, pB));
            bordasVisuais.push(rect);
        };

        for (let i = 0; i < passos; i++) {
            const a = (Math.PI * 2 / passos) * i;
            const an = (Math.PI * 2 / passos) * (i + 1);

            const extA = pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXExt(a), pista.raioYExt(a), a);
            const extB = pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXExt(an), pista.raioYExt(an), an);
            criarSegmento(extA, extB, 1);

            const intA = pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXInt(a), pista.raioYInt(a), a);
            const intB = pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXInt(an), pista.raioYInt(an), an);
            criarSegmento(intA, intB, -1);
        }

        return bordasVisuais;
    },

    // Sem colisores físicos: bordas são visuais para que as tampinhas possam
    // cruzar a linha. A penalidade por sair da pista é tratada em GameScene.
    addBorderColliders() {
        // intentionally empty
    }
};

if (typeof module !== 'undefined') module.exports = CollisionManager;
window.CollisionManager = CollisionManager;
