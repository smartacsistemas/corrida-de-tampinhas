/* AIRacer: decisões estratégicas para adversários.
   API: AIRacer.decideMove(ia, pista, nivel, outros)
*/

const AIRacer = {
    // nivel: 'Fácil'|'Médio'|'Difícil'
    decideMove(ia, pista, nivel = 'Médio', outros = []) {
        const status = calcularStatusNaPista(pista, ia.x, ia.y);
        const ang = status.theta;
        const sentido = -1;

        // amostra curtinha para estimar curvatura: variação do raio médio
        const sample = (da) => {
            const a = ang + da;
            const rx = (pista.raioXExt(a) + pista.raioXInt(a)) / 2;
            const ry = (pista.raioYExt(a) + pista.raioYInt(a)) / 2;
            return (rx + ry) * 0.5;
        };
        const r0 = sample(0);
        const rF = sample(0.3 * sentido);
        const curv = Math.abs(rF - r0) / Math.max(1, r0);

        const niveis = {
            'Fácil': { forcaMin: 420, forcaMax: 600, agressividade: 0.5 },
            'Médio': { forcaMin: 480, forcaMax: 720, agressividade: 0.8 },
            'Difícil': { forcaMin: 540, forcaMax: 860, agressividade: 1.1 }
        };
        const cfg = niveis[nivel] || niveis['Médio'];

        // decisão de força reduz em curvas maiores
        const curvFactor = Phaser.Math.Clamp(1 - curv * 6, 0.45, 1);

        // se houver alguém muito à frente no mesmo segmento angular, tente ultrapassar
        let incrementoUltrapassagem = 0;
        outros.forEach(o => {
            if (o === ia) return;
            const st = calcularStatusNaPista(pista, o.x, o.y);
            const diff = normalizarAngulo(st.theta - ang);
            if (Math.abs(diff) < 0.18) {
                // oponente à frente
                const velO = Math.hypot(o.body.velocity.x, o.body.velocity.y);
                const velI = Math.hypot(ia.body.velocity.x, ia.body.velocity.y);
                if (velO > velI - 20) incrementoUltrapassagem = 0.18 * cfg.agressividade;
            }
        });

        // base: tangente ao anel
        const angTang = ang + (Math.PI / 2) * sentido;
        let dirX = Math.cos(angTang);
        let dirY = Math.sin(angTang);

        // correção ao centro: empurra levemente para manter na faixa
        const rxMedio = (pista.raioXExt(ang) + pista.raioXInt(ang)) / 2;
        const ryMedio = (pista.raioYExt(ang) + pista.raioYInt(ang)) / 2;
        const ideal = pontoNaElipse(pista.centro.x, pista.centro.y, rxMedio, ryMedio, ang);
        const corrX = (ideal.x - ia.x);
        const corrY = (ideal.y - ia.y);
        const corrMag = Math.hypot(corrX, corrY) || 1;
        const corrNormX = corrX / corrMag * 0.2 * cfg.agressividade;
        const corrNormY = corrY / corrMag * 0.2 * cfg.agressividade;

        dirX += corrNormX + incrementoUltrapassagem;
        dirY += corrNormY;

        const norm = Math.hypot(dirX, dirY) || 1;
        dirX /= norm; dirY /= norm;

        const força = Phaser.Math.Between(cfg.forcaMin, cfg.forcaMax) * curvFactor;

        return { dirX, dirY, força };
    }
};

if (typeof module !== 'undefined') module.exports = AIRacer;
window.AIRacer = AIRacer;
