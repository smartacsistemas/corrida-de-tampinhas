/* CapPhysics: controla a desaceleração em duas fases das tampinhas.
   Uso:
     CapPhysics.init(scene);
     CapPhysics.onImpulse(tampinha, speed); // registrar novo impulso
     CapPhysics.updateAll(scene, tampinhas);
*/

const CapPhysics = {
    init(scene) {
        this.scene = scene;
        // duração (s) da fase 1 — comportamento "normal" após o peteleco
        this.fase1 = 0.35;
        // duração (s) da fase 2 — perda rápida de força
        this.fase2 = 1.2;
        // fatores de decaimento por fase (multiplicadores aplicados por frame)
        this.dragFase1 = 0.997; // leve
        this.dragFase2 = 0.96;  // forte
        this.dragFase3 = 0.86;  // quase parada
        this.limiarParada = 8; // px/s
    },

    onImpulse(t, speed) {
        t._cap_lastImpulse = this.scene ? this.scene.time.now : Date.now();
        t._cap_impulseSpeed = speed || Math.hypot(t.body.velocity.x, t.body.velocity.y);
    },

    updateAll(scene, tampinhas) {
        const now = scene.time.now;
        tampinhas.forEach(t => {
            if (!t.body) return;
            const vx = t.body.velocity.x;
            const vy = t.body.velocity.y;
            let v = Math.hypot(vx, vy);
            if (v < 0.5) { // parada imediata para evitar micro-deslizamentos
                t.body.setVelocity(0, 0);
                return;
            }

            const impulseAt = t._cap_lastImpulse || (now - 10000);
            const elapsed = Math.max(0, (now - impulseAt) / 1000);

            let factor = 1;
            if (elapsed <= this.fase1) {
                factor = Math.pow(this.dragFase1, 1);
            } else if (elapsed <= this.fase1 + this.fase2) {
                factor = Math.pow(this.dragFase2, 1);
            } else {
                factor = Math.pow(this.dragFase3, 1);
            }

            t.body.velocity.x *= factor;
            t.body.velocity.y *= factor;

            v = Math.hypot(t.body.velocity.x, t.body.velocity.y);
            if (v < this.limiarParada) {
                t.body.setVelocity(0, 0);
            }
        });
    }
};

if (typeof module !== 'undefined') module.exports = CapPhysics; // CommonJS fallback

window.CapPhysics = CapPhysics;
