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
        scene.physics.add.collider(tampinhas, bordas, (tampinha, borda) => {
            if (!tampinha || !tampinha.body) return;

            const vx = tampinha.body.velocity.x;
            const vy = tampinha.body.velocity.y;
            const speed = Math.hypot(vx, vy);
            const angle = borda.rotation;
            const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
            let normal = { x: -tangent.y, y: tangent.x };
            const toTampinha = { x: tampinha.x - borda.x, y: tampinha.y - borda.y };
            const dot = toTampinha.x * normal.x + toTampinha.y * normal.y;
            if (dot < 0) {
                normal.x *= -1;
                normal.y *= -1;
            }

            const normalSpeed = vx * normal.x + vy * normal.y;
            const tangentSpeed = vx * tangent.x + vy * tangent.y;

            // resposta mais natural: preserve o componente tangencial e ajuste o normal.
            const bounceFactor = speed > 240 ? 0.9 : speed > 140 ? 0.64 : 0.25;
            const newNormalSpeed = -normalSpeed * bounceFactor;
            const newVx = tangent.x * tangentSpeed + normal.x * newNormalSpeed;
            const newVy = tangent.y * tangentSpeed + normal.y * newNormalSpeed;

            tampinha.body.setVelocity(newVx, newVy);

            if (speed > 240) {
                // pancada forte: empurra levemente para fora da pista e mantém energia.
                tampinha.x += normal.x * 10;
                tampinha.y += normal.y * 10;
            } else if (speed > 140) {
                tampinha.x += normal.x * 6;
                tampinha.y += normal.y * 6;
            }
        });
    }
};

if (typeof module !== 'undefined') module.exports = CollisionManager;
window.CollisionManager = CollisionManager;
