/* CollisionManager: cria bordas físicas e gerencia resposta aos impactos. */

const CollisionManager = {
    createBorders(scene, pista, opts = {}) {
        const passos = opts.passos || 120;
        const espessura = opts.espessura || 28;
        const grupo = scene.physics.add.staticGroup();

        const criarSegmento = (pA, pB) => {
            const x = (pA.x + pB.x) / 2;
            const y = (pA.y + pB.y) / 2;
            const comprimento = Phaser.Math.Distance.Between(pA.x, pA.y, pB.x, pB.y) + 2;
            const rect = scene.add.rectangle(x, y, comprimento, espessura, 0x000000, 0).setVisible(false);
            rect.setRotation(Phaser.Math.Angle.BetweenPoints(pA, pB));
            scene.physics.add.existing(rect, true);
            grupo.add(rect);
        };

        for (let i = 0; i < passos; i++) {
            const a = (Math.PI * 2 / passos) * i;
            const an = (Math.PI * 2 / passos) * (i + 1);

            const extA = pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXExt(a), pista.raioYExt(a), a);
            const extB = pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXExt(an), pista.raioYExt(an), an);
            criarSegmento(extA, extB);

            const intA = pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXInt(a), pista.raioYInt(a), a);
            const intB = pontoNaElipse(pista.centro.x, pista.centro.y, pista.raioXInt(an), pista.raioYInt(an), an);
            criarSegmento(intA, intB);
        }

        return grupo;
    },

    addBorderColliders(scene, tampinhas, bordas) {
        scene.physics.add.collider(tampinhas, bordas, (tampinha) => {
            if (!tampinha || !tampinha.body) return;
            const v = Math.hypot(tampinha.body.velocity.x, tampinha.body.velocity.y);
            // colisões suaves: reduza velocidade; só impactos externos muito fortes causam saída
            if (v > 260) {
                // forte — perde menos, pode ser jogada para fora
                tampinha.body.velocity.x *= 0.78;
                tampinha.body.velocity.y *= 0.78;
            } else if (v > 120) {
                tampinha.body.velocity.x *= 0.6;
                tampinha.body.velocity.y *= 0.6;
            } else {
                tampinha.body.velocity.x *= 0.28;
                tampinha.body.velocity.y *= 0.28;
            }
        });
    }
};

if (typeof module !== 'undefined') module.exports = CollisionManager;
window.CollisionManager = CollisionManager;
